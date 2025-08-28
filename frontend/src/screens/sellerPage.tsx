import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { API_BASE, api, createUploadedCard } from "../api/client";
import SellerCardListItem from "../components/SellerCardListItem";
import { useAuth } from "@/store/useAuth";
import { searchTcgDexCards, getTcgDexCard, type TcgDexCardBrief, type TcgDexCard } from "../api/tcgdex";
import type { CardItem } from "../data/dummy";

type Step =
  | "management"
  | "camera"
  | "confirm-photo"
  | "pokemon-search"
  | "description-input"
  | "title-input" // legacy, kept for non-pokemon flows if needed
  | "form" // legacy pokemon form, no longer used in new pokemon flow
  | "price-input"
  | "preview"
  | "submitting"
  | "done";

type FormStep =
  | "category"
  | "region"
  | "set"
  | "rarity"
  | "language"
  | "description";

type SellerCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUri?: string;
  status: "draft" | "listed";
};

type PokemonCatalog = {
  rarities: string[];
  languages: string[];
  sets: {
    english: { series: { name: string; sets?: string[] }[] };
    korean: { series: { name: string; sets?: string[] }[] };
  };
  sets_flat: string[];
};

type Props = {
  openCardPreview?: (card: CardItem | null) => void;
};

export default function SellerPage({ openCardPreview }: Props) {
  const user = useAuth((s)=>s.user);
  const insets = useSafeAreaInsets();
  // camera
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // steps
  const [step, setStep] = useState<Step>("management");
  const [currentFormStep, setCurrentFormStep] = useState<FormStep>("category");

  // seller cards management
  const [sellerCards, setSellerCards] = useState<any[]>([]);
  const [loadingSellerCards, setLoadingSellerCards] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  // catalog
  const [catalog, setCatalog] = useState<PokemonCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // form state
  const [category, setCategory] = useState<"pokemon">("pokemon");
  const [region, setRegion] = useState<"english" | "korean" | null>(null);
  const [setName, setSetName] = useState<string | null>(null);
  const [rarity, setRarity] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [cardTitle, setCardTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  // pokemon search state
  const [pkSearchQuery, setPkSearchQuery] = useState("");
  const [pkLoading, setPkLoading] = useState(false);
  const [pkError, setPkError] = useState<string | null>(null);
  const [pkResults, setPkResults] = useState<TcgDexCardBrief[]>([]);
  const [pkSelected, setPkSelected] = useState<TcgDexCardBrief | null>(null);
  const [pkSelectedFull, setPkSelectedFull] = useState<TcgDexCard | null>(null);
  const [pkDetailLoading, setPkDetailLoading] = useState(false);
  // track whether user is using API search or manual entry
  const [entryMode, setEntryMode] = useState<"api" | "manual">("api");

  // key helpers
  const itemKey = (item: any, idx?: number) =>
    String(
      item?.id ??
        `${item?.uploadedBy ?? ""}-${item?.uploadDate ?? item?.createdAt ?? ""}-${item?.card_num ?? ""}-${idx ?? ""}`
    );
  const uniqueByKey = (arr: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    arr.forEach((it, i) => {
      const k = itemKey(it, i);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(it);
      }
    });
    return out;
  };

  // animation for form steps
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // dropdown modal for sets/rarity/language
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerOnSelect, setPickerOnSelect] = useState<(value: string) => void>(() => () => {});

  // preview modal controlled by parent via openCardPreview

  const regionSets = useMemo(() => {
    if (!catalog || !region) return [] as string[];
    const series = region === "english" ? catalog.sets.english.series : catalog.sets.korean.series;
    const result: string[] = [];
    series.forEach((g) => (g.sets || []).forEach((s) => result.push(s)));
    return result;
  }, [catalog, region]);

  // Form step progression logic
  const getNextFormStep = (current: FormStep): FormStep | null => {
    const steps: FormStep[] = ["category", "region", "set", "rarity", "language", "description"];
    const currentIndex = steps.indexOf(current);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  };

  const shouldShowFormStep = (targetStep: FormStep): boolean => {
    const steps: FormStep[] = ["category", "region", "set", "rarity", "language", "description"];
    const targetIndex = steps.indexOf(targetStep);
    const currentIndex = steps.indexOf(currentFormStep);
    return targetIndex <= currentIndex;
  };

  const isFormStepComplete = (targetStep: FormStep): boolean => {
    switch (targetStep) {
      case "category": return !!category;
      case "region": return !!region;
      case "set": return !!setName;
      case "rarity": return !!rarity;
      case "language": return !!language;
      case "description": return description.trim().length > 0;
      default: return false;
    }
  };

  const proceedToNextFormStep = () => {
    const next = getNextFormStep(currentFormStep);
    if (next) {
      setCurrentFormStep(next);
      // Trigger fade animation
      Animated.sequence([
        Animated.timing(fadeAnim, { duration: 150, toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { duration: 300, toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      // Form complete, go to price input
      setStep("price-input");
    }
  };

  // Reset subsequent steps when an earlier step changes
  const resetSubsequentSteps = (changedStep: FormStep) => {
    const steps: FormStep[] = ["category", "region", "set", "rarity", "language", "description"];
    const changedIndex = steps.indexOf(changedStep);
    
    // Reset all steps after the changed one, but preserve description content
    for (let i = changedIndex + 1; i < steps.length; i++) {
      const stepToReset = steps[i];
      switch (stepToReset) {
        case "region":
          setRegion(null);
          break;
        case "set":
          setSetName(null);
          break;
        case "rarity":
          setRarity(null);
          break;
        case "language":
          setLanguage(null);
          break;
        case "description":
          // Don't reset description content - preserve user's input
          break;
      }
    }
    
    // Always set current step to the step immediately after the changed step
    const nextStepIndex = changedIndex + 1;
    if (nextStepIndex < steps.length) {
      setCurrentFormStep(steps[nextStepIndex]);
    } else {
      // If we're at the last step, stay there
      setCurrentFormStep(changedStep);
    }
    
    // Trigger fade animation for the new current step
    Animated.sequence([
      Animated.timing(fadeAnim, { duration: 150, toValue: 0, useNativeDriver: true }),
      Animated.timing(fadeAnim, { duration: 300, toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const getNextIncompleteStep = (fromStep: FormStep): FormStep | null => {
    const steps: FormStep[] = ["category", "region", "set", "rarity", "language", "description"];
    const fromIndex = steps.indexOf(fromStep);
    
    for (let i = fromIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      if (!isFormStepComplete(step)) {
        return step;
      }
    }
    return null;
  };

  // Reset form when starting new card
  const resetForm = () => {
    setCategory("pokemon");
    setRegion(null);
    setSetName(null);
    setRarity(null);
    setLanguage(null);
    setDescription("");
    setCardTitle("");
    setPrice("");
    setCurrentFormStep("category");
    setPhotoUri(null);
    fadeAnim.setValue(1);
  };

  useEffect(() => {
    // Initialize fade animation
    fadeAnim.setValue(1);
  }, []);
  // Load current user's uploaded cards for management list
  const reloadSellerCards = async () => {
    if (!user?.userId) return;
    try {
      setLoadingSellerCards(true);
      setHasMore(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: "0",
        uploadedBy: String(user.userId),
      });
      const r = await fetch(`${API_BASE}/uploaded-cards?${params.toString()}`);
      if (!r.ok) throw new Error(await r.text());
      const first = (await r.json()) as any[];
  setSellerCards(uniqueByKey(first || []));
      setHasMore((first?.length || 0) === PAGE_SIZE);
    } catch (e) {
      setSellerCards([]);
      setHasMore(false);
    } finally {
      setLoadingSellerCards(false);
    }
  };

  const loadMoreSellerCards = async () => {
    if (loadingMore || !hasMore || !user?.userId) return;
    try {
      setLoadingMore(true);
      const offset = sellerCards.length;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        uploadedBy: String(user.userId),
      });
      const r = await fetch(`${API_BASE}/uploaded-cards?${params.toString()}`);
      if (!r.ok) throw new Error(await r.text());
  const next = (await r.json()) as any[];
  setSellerCards((prev) => uniqueByKey([...(prev || []), ...(next || [])]));
      setHasMore((next?.length || 0) === PAGE_SIZE);
    } catch (e) {
      // stop further loads on error to avoid loops
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    reloadSellerCards();
  }, [user?.userId]);

  // When returning to management step, refresh the list
  useEffect(() => {
    if (step === "management") reloadSellerCards();
  }, [step]);


  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // load catalog on demand (before form) to reduce wait
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCatalog(true);
        setCatalogError(null);
        const res = await fetch(`${API_BASE}/catalog/pokemon`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as PokemonCatalog;
        setCatalog(data);
      } catch (e: any) {
        setCatalogError(e?.message || "카탈로그를 불러오지 못했습니다.");
      } finally {
        setLoadingCatalog(false);
      }
    };
    // Keep catalog load for legacy form, but it's not required for new pokemon flow
    load();
  }, []);

  const cardForPreview: CardItem | null = useMemo(() => {
    if (!photoUri || !price) return null;
    // Prefer selected Pokemon card when available
    const titleFromSelection = pkSelectedFull
      ? pkSelectedFull.name
      : pkSelected
      ? pkSelected.name
      : cardTitle;
    if (!titleFromSelection) return null;
    // For manual mode, require at least rarity or set or language to avoid empty metadata
    if (!pkSelected && entryMode === "manual" && !rarity && !setName && !language) {
      return null;
    }
    const pokemonInfo: any = {};
    if (pkSelectedFull) {
      if (pkSelectedFull.name) pokemonInfo.cardName = pkSelectedFull.name;
      if (pkSelectedFull.localId) pokemonInfo.cardNumber = String(pkSelectedFull.localId);
      if (pkSelectedFull.set?.name) pokemonInfo.set = pkSelectedFull.set.name;
      if (pkSelectedFull.rarity) pokemonInfo.rarity = pkSelectedFull.rarity;
  pokemonInfo.game = "Pokemon TCG";
  // Language from selection or region fallback (ko for Korean sets, else en)
  pokemonInfo.language = language || (region === "korean" ? "ko" : "en");
      // New fields
      if (pkSelectedFull.id) pokemonInfo.cardId = pkSelectedFull.id;
      // Variants can be object of flags or string array; normalize to string list
      if (Array.isArray(pkSelectedFull.variants)) {
        pokemonInfo.variants = pkSelectedFull.variants as any;
      } else if (pkSelectedFull.variants && typeof pkSelectedFull.variants === "object") {
        const keys = Object.keys(pkSelectedFull.variants as Record<string, boolean>).filter(
          (k) => (pkSelectedFull.variants as Record<string, boolean>)[k]
        );
        if (keys.length) pokemonInfo.variants = keys;
      }
    } else if (pkSelected) {
      if (pkSelected.name) pokemonInfo.cardName = pkSelected.name;
      if (pkSelected.localId) pokemonInfo.cardNumber = String(pkSelected.localId);
      if (pkSelected.id) pokemonInfo.cardId = pkSelected.id;
      if (pkSelected.set?.name) pokemonInfo.set = pkSelected.set.name;
      if (pkSelected.rarity) pokemonInfo.rarity = pkSelected.rarity as any;
      // Apply language from selection or region
      pokemonInfo.language = language || (region === "korean" ? "ko" : "en");
    } else {
      if (rarity) pokemonInfo.rarity = rarity;
      if (setName) pokemonInfo.set = setName;
      if (language) pokemonInfo.language = language as any;
    }
    return {
      id: "temp",
      imageUrl: photoUri,
      title: titleFromSelection,
      description,
      price: parseFloat(price) || 0,
      category: "pokemon",
      data: [],
      // Set upload date to now for preview; backend will assign actual on submit
      uploadDate: new Date().toISOString(),
      pokemon: pokemonInfo,
    } as CardItem;
  }, [photoUri, price, pkSelected, pkSelectedFull, cardTitle, description, rarity, setName, language]);

  const submit = async () => {
    setStep("submitting");
    try {
      // Build payload for uploadedCards
      const payload: any = {
        category: "pokemon",
        card_name: cardTitle || pkSelectedFull?.name || pkSelected?.name || "Pokemon Card",
        rarity: pkSelectedFull?.rarity || rarity || undefined,
        variants: (Array.isArray(pkSelectedFull?.variants)
          ? pkSelectedFull?.variants
          : pkSelectedFull?.variants && typeof pkSelectedFull?.variants === "object"
            ? Object.keys(pkSelectedFull?.variants as any).filter(k => (pkSelectedFull?.variants as any)[k])
            : undefined) || undefined,
  language: language || (region === "korean" ? "ko" : "en"),
        set: pkSelectedFull?.set?.name || setName || undefined,
  // Use TCGdex global id for card_num (e.g., "swsh3-136")
  card_num: pkSelectedFull?.id ?? pkSelected?.id ?? undefined,
        price: parseFloat(price) || 0,
        description: description || undefined,
        uploadDate: new Date().toISOString(),
        uploadedBy: user?.userId || undefined,
      };
      // Attach image as base64 if available
      if (photoUri) {
        try {
          // RN fetch to blob then to base64 isn't trivial without expo-file-system; use FileSystem if available
          const toBase64 = async (uri: string) => {
            try {
              // Prefer expo-file-system when available in Expo apps
              const FileSystem = require("expo-file-system");
              const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
              return `data:image/jpeg;base64,${b64}`;
            } catch {
              return undefined;
            }
          };
          const dataUrl = await toBase64(photoUri);
          if (dataUrl) {
            if (typeof __DEV__ !== "undefined" && __DEV__) {
              // eslint-disable-next-line no-console
              console.log("[submit] attaching image_base64", { length: dataUrl.length, head: dataUrl.slice(0, 32) });
            }
            payload.image_base64 = dataUrl;
          } else if (typeof __DEV__ !== "undefined" && __DEV__) {
            // eslint-disable-next-line no-console
            console.log("[submit] no image_base64 (toBase64 returned undefined)");
          }
        } catch {}
      }
  await createUploadedCard(payload);
      Alert.alert(
        "업로드 완료",
        "카드 정보가 업로드되었습니다.",
        [
          {
            text: "확인",
            onPress: () => {
              resetForm();
              setStep("management");
      // refresh list after returning
      setTimeout(() => { reloadSellerCards(); }, 0);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("업로드 실패", e?.message || "다시 시도해 주세요.");
      setStep("preview");
    }
  };

  const takePhoto = async () => {
    try {
      const cam: any = cameraRef.current;
      if (!cam) return;
  const pic = await cam.takePictureAsync?.({ quality: 0.7, skipProcessing: Platform.OS === "android" });
      if (pic?.uri) {
        // Crop a small bottom strip off to remove any baked-in timestamp overlays from some devices
        const width = (pic as any).width as number | undefined;
        const height = (pic as any).height as number | undefined;
        let finalUri = pic.uri as string;
        if (width && height && height > 60) {
          try {
            const cropBottom = Math.max(40, Math.floor(height * 0.08)); // ~8% or at least 40px
            const cropHeight = Math.max(1, height - cropBottom);
            const result = await manipulateAsync(
              pic.uri,
              [
                { crop: { originX: 0, originY: 0, width, height: cropHeight } },
              ],
              { compress: 0.9, format: SaveFormat.JPEG }
            );
            if (result?.uri) finalUri = result.uri;
          } catch {}
        }
        // Downscale large images (max width ~1600px) to keep under ~2MB
        try {
          const resized = await manipulateAsync(
            finalUri,
            [ { resize: { width: 1600 } } ],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          if (resized?.uri) finalUri = resized.uri;
        } catch {}
        setPhotoUri(finalUri);
        setStep("confirm-photo");
      }
    } catch (e: any) {
      Alert.alert("촬영 실패", e?.message || "다시 시도해 주세요.");
    }
  };

  const openPicker = (title: string, options: string[], onSelect: (v: string) => void, searchable = false) => {
    setPickerTitle(title);
    setPickerOptions(options);
    setPickerOnSelect(() => onSelect);
    setPickerQuery("");
    setPickerVisible(true);
  };

  const filteredOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const base = pickerOptions;
    const unique = Array.from(new Set(base));
    if (!q) return unique;
    return unique.filter((o) => o.toLowerCase().includes(q));
  }, [pickerOptions, pickerQuery]);

  const wordsCount = useMemo(() => description.trim().split(/\s+/).filter(Boolean).length, [description]);

  // UI blocks
  const CameraOverlay = () => (
    <View style={styles.overlayWrap} pointerEvents="none">
  <View style={[styles.instructions, { top: Math.max(16, insets.top + 8) }]}>
        <Text style={styles.instructionsTitle}>카드를 사각형 안에 맞춰 주세요</Text>
        <Text style={styles.instructionsText}>빛 반사가 적고, 배경이 단색이면 더욱 좋아요.</Text>
      </View>
      <View style={styles.frame} />
    </View>
  );

  const SellerCardItem = ({ card }: { card: SellerCard }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardDesc}>{card.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardCategory}>{card.category}</Text>
          <Text style={[styles.cardStatus, { color: card.status === "listed" ? "#059669" : "#D97706" }]}>
            {card.status === "listed" ? "판매중" : "초안"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
  <StatusBar hidden={step === "camera"} animated />
      <View style={styles.flex1}>
        {step === "management" && (
          <View style={styles.flex1}>
            <View style={styles.header}>
              <Text style={styles.title}>판매 중인 카드</Text>
              <Pressable
                style={styles.addBtn}
                onPress={() => {
                  resetForm();
                  setStep("camera");
                }}
              >
                <Text style={styles.addBtnText}>카드 판매</Text>
              </Pressable>
            </View>
            <FlatList
              data={sellerCards}
              keyExtractor={(item, index) => itemKey(item, index)}
              renderItem={({ item }) => {
                let priceNum = 0;
                if (typeof item.price === "number") priceNum = item.price;
                else if (typeof item.price === "string") {
                  const parsed = Number(item.price.replace(/,/g, "").trim());
                  if (Number.isFinite(parsed)) priceNum = parsed;
                }
                const rawTitle = item.card_name || item.title || `${item.category} card`;
                const cleanTitle = String(rawTitle).replace(/\s*#\d+\b/g, "");
                return (
                  <SellerCardListItem
                    imageUrl={item.image_url ? `${API_BASE}${item.image_url}` : "https://placehold.co/100x130"}
                    title={cleanTitle}
                    description={item.description || (item.set ? `${item.set}${item.card_num ? ` • ${item.card_num}` : ""}` : "")}
                    price={priceNum}
                    onPress={() => {}}
                  />
                );
              }}
              refreshing={loadingSellerCards}
              onRefresh={reloadSellerCards}
              style={styles.cardList}
              contentContainerStyle={styles.cardListContent}
              showsVerticalScrollIndicator={false}
              onEndReachedThreshold={0.3}
              onEndReached={loadMoreSellerCards}
              ListFooterComponent={loadingMore ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator />
                </View>
              ) : null}
            />
          </View>
        )}

  {/* camera is rendered in a full-screen modal below; confirm-photo is inline */}

      {step === "confirm-photo" && (
        <View style={[styles.flex1, styles.pad16]}>
          {photoUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            </View>
          ) : (
            <View style={styles.center}><Text>이미지가 없습니다.</Text></View>
          )}
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("camera")}> 
              <Text style={styles.secondaryBtnText}>다시 촬영</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => { setEntryMode("api"); setPkSelected(null); setPkSelectedFull(null); setStep("pokemon-search"); }}>
              <Text style={styles.primaryBtnText}>확인</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "pokemon-search" && (
        <View style={[styles.flex1, styles.pad16]}>
          <Text style={styles.title}>포켓몬 카드 검색</Text>
          <Text style={styles.helper}>예: pikachu ex</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={pkSearchQuery}
              onChangeText={setPkSearchQuery}
              placeholder="카드명을 입력하세요"
              style={[styles.titleInput, { flex: 1 }]}
              autoFocus
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.primaryBtn, { marginLeft: 8 }]}
              onPress={async () => {
                try {
                  setPkLoading(true);
                  setPkError(null);
                  const ctrl = new AbortController();
                  const data = await searchTcgDexCards(pkSearchQuery, 1, 30, "en", ctrl.signal);
                  setPkResults(data);
                } catch (e: any) {
                  setPkError(e?.message || "검색에 실패했습니다.");
                } finally {
                  setPkLoading(false);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>검색</Text>
            </Pressable>
          </View>
          {pkError ? <Text style={[styles.helper, { color: "#DC2626" }]}>{pkError}</Text> : null}
          {pkLoading ? (
            <View style={[styles.center, { marginTop: 16 }]}><ActivityIndicator /></View>
          ) : (
            <FlatList
              data={pkResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultItem}
                  onPress={async () => {
                    setPkDetailLoading(true);
                    setPkError(null);
                    try {
                      const full = await getTcgDexCard(item.id, "en");
                      setPkSelected(item);
                      setPkSelectedFull(full);
                      setEntryMode("api");
                      const t = `${full.name}`;
                      setCardTitle(t);
                      setStep("description-input");
                    } catch (e: any) {
                      // fallback to brief on error
                      setPkSelected(item);
                      setPkSelectedFull(null);
                      setEntryMode("api");
                      const t = `${item.name}`;
                      setCardTitle(t);
                      setStep("description-input");
                      setPkError(e?.message || "상세 정보를 불러오지 못했습니다.");
                    } finally {
                      setPkDetailLoading(false);
                    }
                  }}
                >
                  <View style={styles.resultThumbWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.resultThumb} />
                    ) : (
                      <View style={[styles.resultThumb, { backgroundColor: "#E5E7EB" }]} />
                    )}
                  </View>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultTitle}>{item.name}</Text>
                    <View style={styles.tagRow}>
                      <View style={styles.tag}><Text style={styles.tagText}>{item.id}</Text></View>
                      {item.set?.name ? (
                        <View style={styles.tag}><Text style={styles.tagText}>{item.set.name}</Text></View>
                      ) : null}
                      {item.rarity ? (
                        <View style={styles.tag}><Text style={styles.tagText}>{item.rarity}</Text></View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              style={{ marginTop: 12 }}
            />
          )}
          {pkDetailLoading ? (
            <View style={[styles.center, { marginTop: 8 }]}>
              <ActivityIndicator />
              <Text style={styles.helper}>카드 상세 불러오는 중...</Text>
            </View>
          ) : null}
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("confirm-photo")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                // Switch to manual entry flow
                setPkSelected(null);
                setPkSelectedFull(null);
                setEntryMode("manual");
                setCardTitle("");
                setCurrentFormStep("category");
                setStep("title-input");
              }}
            >
              <Text style={styles.secondaryBtnText}>찾는 카드가 없나요? 직접 입력</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "title-input" && (
        <View style={[styles.flex1, styles.pad16]}>
          <Text style={styles.title}>카드 이름 입력</Text>
          <TextInput
            value={cardTitle}
            onChangeText={setCardTitle}
            placeholder="예: 피카츄 EX #045 • Scarlet & Violet"
            style={styles.titleInput}
            autoFocus
          />
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => { setEntryMode("api"); setPkSelected(null); setPkSelectedFull(null); setStep("pokemon-search"); }}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { opacity: cardTitle.trim().length === 0 ? 0.5 : 1 }]}
              disabled={cardTitle.trim().length === 0}
              onPress={() => { setCurrentFormStep("category"); setStep("form"); }}
            >
              <Text style={styles.primaryBtnText}>다음</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "description-input" && (
        <View style={[styles.flex1, styles.pad16]}>
          <Text style={styles.title}>상세 설명 (최대 500 단어)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명을 입력하세요"
            style={styles.textArea}
            multiline
            autoFocus
          />
          <Text style={styles.helper}>{wordsCount} / 500 단어</Text>
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("pokemon-search")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { opacity: wordsCount > 500 ? 0.5 : 1 }]}
              disabled={wordsCount > 500}
              onPress={() => setStep("price-input")}
            >
              <Text style={styles.primaryBtnText}>다음</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "form" && (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.formContent}>
          {/* Category Step */}
          {shouldShowFormStep("category") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "category" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>카드 컬렉션 카테고리?</Text>
              <Pressable 
                style={[styles.optionBtn, isFormStepComplete("category") && styles.optionBtnSelected]} 
                onPress={() => { 
                  setCategory("pokemon"); 
                  if (currentFormStep === "category") {
                    proceedToNextFormStep();
                  } else {
                    // Always reset subsequent steps when clicking category from a later step
                    resetSubsequentSteps("category");
                  }
                }}
              >
                <Text style={styles.optionText}>포켓몬</Text>
              </Pressable>
              {isFormStepComplete("category") && currentFormStep !== "category" && <Text style={styles.completeIcon}>✓</Text>}
            </Animated.View>
          )}

          {/* Region Step */}
          {shouldShowFormStep("region") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "region" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>한국어/영어 세트 중 선택</Text>
              <View style={styles.rowGap12}>
                <Pressable 
                  style={[styles.optionBtn, region === "korean" && styles.optionBtnSelected]} 
                  onPress={() => { 
                    setRegion("korean"); 
                    if (currentFormStep === "region") {
                      proceedToNextFormStep();
                    } else {
                      // Always reset subsequent steps when clicking region from a later step
                      resetSubsequentSteps("region");
                    }
                  }}
                >
                  <Text style={styles.optionText}>한국어 세트</Text>
                </Pressable>
                <Pressable 
                  style={[styles.optionBtn, region === "english" && styles.optionBtnSelected]} 
                  onPress={() => { 
                    setRegion("english"); 
                    if (currentFormStep === "region") {
                      proceedToNextFormStep();
                    } else {
                      // Always reset subsequent steps when clicking region from a later step
                      resetSubsequentSteps("region");
                    }
                  }}
                >
                  <Text style={styles.optionText}>영어 세트</Text>
                </Pressable>
              </View>
              {isFormStepComplete("region") && currentFormStep !== "region" && <Text style={styles.completeIcon}>✓</Text>}
            </Animated.View>
          )}

          {/* Set Step */}
          {shouldShowFormStep("set") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "set" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>세트 선택</Text>
              {loadingCatalog ? (
                <ActivityIndicator />
              ) : catalogError ? (
                <Text style={styles.errorText}>{catalogError}</Text>
              ) : (
                <Pressable
                  style={[styles.selectBtn, setName && styles.selectBtnSelected]}
                  onPress={() =>
                    openPicker(
                      "세트 검색",
                      regionSets,
                      (v) => {
                        setSetName(v);
                        setPickerVisible(false);
                        if (currentFormStep === "set") {
                          proceedToNextFormStep();
                        } else {
                          // Always reset subsequent steps when changing set from a later step
                          resetSubsequentSteps("set");
                        }
                      },
                      true
                    )
                  }
                >
                  <Text style={styles.selectBtnText}>{setName || "세트 검색 및 선택"}</Text>
                </Pressable>
              )}
              {isFormStepComplete("set") && currentFormStep !== "set" && <Text style={styles.completeIcon}>✓</Text>}
            </Animated.View>
          )}

          {/* Rarity Step */}
          {shouldShowFormStep("rarity") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "rarity" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>카드 레어리티</Text>
              <Pressable
                style={[styles.selectBtn, rarity && styles.selectBtnSelected]}
                onPress={() =>
                  openPicker("레어리티 선택", catalog?.rarities || [], (v) => { 
                    setRarity(v); 
                    setPickerVisible(false); 
                    if (currentFormStep === "rarity") {
                      proceedToNextFormStep();
                    } else {
                      // Always reset subsequent steps when changing rarity from a later step
                      resetSubsequentSteps("rarity");
                    }
                  })
                }
              >
                <Text style={styles.selectBtnText}>{rarity || "레어리티 선택"}</Text>
              </Pressable>
              {isFormStepComplete("rarity") && currentFormStep !== "rarity" && <Text style={styles.completeIcon}>✓</Text>}
            </Animated.View>
          )}

          {/* Language Step */}
          {shouldShowFormStep("language") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "language" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>카드 언어</Text>
              <Pressable
                style={[styles.selectBtn, language && styles.selectBtnSelected]}
                onPress={() =>
                  openPicker("언어 선택", catalog?.languages || [], (v) => { 
                    setLanguage(v); 
                    setPickerVisible(false); 
                    if (currentFormStep === "language") {
                      proceedToNextFormStep();
                    } else {
                      // Always reset subsequent steps when changing language from a later step
                      resetSubsequentSteps("language");
                    }
                  })
                }
              >
                <Text style={styles.selectBtnText}>{language || "언어 선택"}</Text>
              </Pressable>
              {isFormStepComplete("language") && currentFormStep !== "language" && <Text style={styles.completeIcon}>✓</Text>}
            </Animated.View>
          )}

          {/* Description Step */}
          {shouldShowFormStep("description") && (
            <Animated.View style={[styles.formStep, { opacity: currentFormStep === "description" ? fadeAnim : 1 }]}>
              <Text style={styles.stepTitle}>상세 설명 (최대 500 단어)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="상세 설명을 입력하세요"
                style={styles.textArea}
                multiline
              />
              <Text style={styles.helper}>{wordsCount} / 500 단어</Text>
              {currentFormStep === "description" && (
                <Pressable
                  style={[styles.primaryBtn, { opacity: wordsCount > 500 ? 0.5 : 1 }]}
                  disabled={wordsCount > 500}
                  onPress={() => setStep("price-input")}
                >
                  <Text style={styles.primaryBtnText}>다음</Text>
                </Pressable>
              )}
              {isFormStepComplete("description") && currentFormStep !== "description" && (
                <Text style={styles.completeIcon}>✓</Text>
              )}
            </Animated.View>
          )}
        </ScrollView>
      )}

      {step === "price-input" && (
        <View style={[styles.flex1, styles.pad16]}>
          <Text style={styles.title}>판매 가격 설정</Text>
          <Text style={styles.helper}>카드의 판매 가격을 설정하세요 (원)</Text>
          
          <View style={styles.priceInputContainer}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="예: 50000"
              style={styles.priceInput}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.priceUnit}>원</Text>
          </View>

          <Pressable style={styles.marketPriceBtn} onPress={() => {
            // TODO: Implement market price viewing functionality
            Alert.alert("시세 조회", "시세 조회 기능은 곧 제공됩니다.");
          }}>
            <Text style={styles.marketPriceBtnText}>이 카드 시세 보기</Text>
          </Pressable>

          <View style={styles.rowGap12}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                if (entryMode === "api") {
                  setStep("description-input");
                } else {
                  setCurrentFormStep("description");
                  setStep("form");
                }
              }}
            >
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable 
              style={[styles.primaryBtn, { opacity: price.trim().length === 0 ? 0.5 : 1 }]} 
              disabled={price.trim().length === 0}
              onPress={() => setStep("preview")}
            >
              <Text style={styles.primaryBtnText}>카드 업로드</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "preview" && (
        <View style={styles.formWrap}>
          <Text style={styles.question}>미리보기</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              if (!cardForPreview) return;
              openCardPreview?.(cardForPreview);
            }}
          >
            <Text style={styles.primaryBtnText}>카드 상세 미리보기 열기</Text>
          </Pressable>
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("price-input")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={submit}>
              <Text style={styles.primaryBtnText}>업로드</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "submitting" && (
        <View style={styles.center}> 
          <ActivityIndicator />
          <Text style={styles.helper}>업로드 중...</Text>
        </View>
      )}
      </View>

      {/* Full-screen camera/preview modal to overlay all UI */}
      <Modal
        visible={step === "camera"}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setStep("management")}
      >
        <View style={[styles.flex1, { backgroundColor: "#000" }]}>
          <StatusBar hidden animated />
          {step === "camera" ? (
            <View style={styles.flex1}>
              {!permission?.granted ? (
                <View style={styles.center}>
                  <Text style={[styles.title, { color: "#fff" }]}>카메라 권한이 필요합니다</Text>
                  <Pressable style={styles.primaryBtn} onPress={() => requestPermission()}>
                    <Text style={styles.primaryBtnText}>권한 허용</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <CameraView style={styles.camera} ref={cameraRef} facing="back" />
                  <CameraOverlay />
                  <View style={[
                    styles.cameraActions,
                    { bottom: insets.bottom > 0 ? insets.bottom + 12 : 28 }
                  ]}>
                    <Pressable style={styles.shutterBtn} onPress={takePhoto}>
                      <View style={styles.shutterInner} />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Searchable Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <TextInput
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="검색"
              style={styles.searchInput}
              autoFocus
            />
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable style={styles.optionItem} onPress={() => pickerOnSelect(item)}>
                  <Text style={styles.optionText}>{item}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              style={{ maxHeight: 360 }}
            />
            <Pressable style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={() => setPickerVisible(false)}>
              <Text style={styles.secondaryBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

  {/** Modal is rendered at Home level via openCardPreview */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  helper: { color: "#6B7280", marginTop: 8 },
  camera: { flex: 1 },
  cameraActions: { position: "absolute", bottom: 28, width: "100%", alignItems: "center" },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 58, height: 58, borderRadius: 32, backgroundColor: "#e5e7eb" },
  overlayWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  frame: { width: "80%", aspectRatio: 0.72, borderWidth: 2, borderStyle: "dashed", borderColor: "#fff", borderRadius: 12 },
  instructions: { position: "absolute", top: 40, alignItems: "center" },
  instructionsTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  instructionsText: { color: "#fff", marginTop: 4 },
  pad16: { padding: 16 },
  previewImage: { width: "100%", height: 420, borderRadius: 12, backgroundColor: "#f3f4f6" },
  previewWrap: { position: "relative", width: "100%", height: 420, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f4f6" },
  timestampCover: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56, // cover bottom text overlay
    backgroundColor: "#000",
    opacity: 0.85,
  },
  rowGap12: { width: "100%", gap: 12, marginTop: 16 },
  formWrap: { flex: 1, padding: 16, gap: 12 },
  question: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  optionBtn: { padding: 14, borderRadius: 12, backgroundColor: "#F3F4F6" },
  optionBtnSelected: { backgroundColor: "#DBEAFE", borderWidth: 2, borderColor: "#3B82F6" },
  optionText: { fontSize: 16, fontWeight: "600" },
  primaryBtn: { padding: 14, borderRadius: 12, backgroundColor: "#111827", alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { padding: 14, borderRadius: 12, backgroundColor: "#E5E7EB", alignItems: "center" },
  secondaryBtnText: { color: "#111827", fontWeight: "700" },
  selectBtn: { padding: 14, borderRadius: 12, backgroundColor: "#F3F4F6" },
  selectBtnSelected: { backgroundColor: "#DBEAFE", borderWidth: 2, borderColor: "#3B82F6" },
  selectBtnText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8 },
  optionItem: { paddingVertical: 10 },
  sep: { height: 1, backgroundColor: "#F3F4F6" },
  errorText: { color: "#DC2626" },
  textArea: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, minHeight: 120, textAlignVertical: "top" },
  
  // New styles for management and form
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  addBtn: { backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cardList: { flex: 1 },
  cardListContent: { padding: 16, gap: 12 },
  cardItem: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardDesc: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  cardMeta: { flexDirection: "row", gap: 12 },
  cardCategory: { fontSize: 12, color: "#6B7280", backgroundColor: "#E5E7EB", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardStatus: { fontSize: 12, fontWeight: "600" },
  
  // Form styles
  formContent: { padding: 16 },
  formStep: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  stepTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  completeIcon: { fontSize: 18, color: "#059669", fontWeight: "700", marginTop: 8 },
  
  // New input styles
  titleInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 16, marginTop: 12 },
  priceInputContainer: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  priceInput: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 16 },
  priceUnit: { marginLeft: 8, fontSize: 16, fontWeight: "600", color: "#6B7280" },
  marketPriceBtn: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  marketPriceBtnText: { fontSize: 14, color: "#6B7280", textDecorationLine: "underline" },
  // Search UI styles
  searchRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  resultItem: { flexDirection: "row", paddingVertical: 10, alignItems: "center" },
  resultThumbWrap: { width: 56, height: 56, borderRadius: 8, overflow: "hidden", backgroundColor: "#F3F4F6", marginRight: 12 },
  resultThumb: { width: 56, height: 56 },
  resultMeta: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: "700" },
  resultSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  resultRarity: { fontSize: 12, color: "#111827", marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, color: "#374151", fontWeight: "600" },
});
