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
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { API_BASE, api, createUploadedCard } from "../api/client";
import SellerCardListItem from "../components/SellerCardListItem";
import SellerCardDetailModal from "../components/SellerCardDetailModal";
import { useAuth } from "@/store/useAuth";
import type { CardItem } from "../data/dummy";

type Step =
  | "management"
  | "camera"
  | "confirm-photo"
  | "manual-input" // new single-page manual input flow
  | "price-input"
  | "preview"
  | "submitting"
  | "done";

// Removed step-by-step animated form; we now show a single manual input page.

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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  // camera
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // steps
  const [step, setStep] = useState<Step>("management");
  // preview is rendered as a full-screen modal in this step

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
  const [qualityRating, setQualityRating] = useState<string | null>(null);
  const [qualityScale, setQualityScale] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [cardTitle, setCardTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  // No external search; manual entry only.

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

  // dropdown modal for sets/rarity/language
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerOnSelect, setPickerOnSelect] = useState<(value: string) => void>(() => () => {});

  // seller card detail modal
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardDetailVisible, setCardDetailVisible] = useState(false);

  // preview modal controlled by parent via openCardPreview

  const regionSets = useMemo(() => {
    if (!catalog || !region) return [] as string[];
    const series = region === "english" ? catalog.sets.english.series : catalog.sets.korean.series;
    const result: string[] = [];
    series.forEach((g) => (g.sets || []).forEach((s) => result.push(s)));
    return result;
  }, [catalog, region]);

  // Removed step-by-step logic and animations; manual page shows all inputs together.

  // Reset form when starting new card
  const resetForm = () => {
    setCategory("pokemon");
    setRegion(null);
    setSetName(null);
    setRarity(null);
    setQualityRating(null);
    setQualityScale(null);
    setLanguage(null);
    setDescription("");
    setCardTitle("");
    setPrice("");
    setPhotoUri(null);
  };

  // No animation initialization required.
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

// Static fallback catalog data (same as SellerCardDetailModal)
const STATIC_CATALOG: PokemonCatalog = {
  rarities: [
    "Promo", "Common", "Uncommon", "Rare", "Rare Holo", "Rare Holo EX",
    "Rare Holo GX", "Ultra Rare", "Radiant Rare", "Art Rare", "Special Art Rare", 
    "Shiny Rare", "Shiny Ultra Rare", "Hyper Rare", "Amazing"
  ],
  languages: ["Japanese", "English", "Korean", "French", "German", "Italian"],
  sets: {
    english: { 
      series: [
        { name: "Original", sets: ["Base Set", "Jungle", "Fossil", "Team Rocket"] },
        { name: "Neo", sets: ["Neo Genesis", "Neo Discovery", "Neo Revelation", "Neo Destiny"] },
        { name: "EX", sets: ["EX Ruby & Sapphire", "EX FireRed & LeafGreen", "EX Emerald"] },
        { name: "Diamond & Pearl", sets: ["Diamond & Pearl", "Mysterious Treasures", "Secret Wonders"] },
        { name: "Platinum", sets: ["Platinum", "Rising Rivals", "Supreme Victors"] },
        { name: "HeartGold & SoulSilver", sets: ["HeartGold & SoulSilver", "Unleashed", "Undaunted"] },
        { name: "Black & White", sets: ["Black & White", "Emerging Powers", "Noble Victories"] },
        { name: "XY", sets: ["XY", "Flashfire", "Furious Fists", "Phantom Forces"] },
        { name: "Sun & Moon", sets: ["Sun & Moon", "Guardians Rising", "Burning Shadows", "Crimson Invasion"] },
        { name: "Sword & Shield", sets: ["Sword & Shield", "Rebel Clash", "Darkness Ablaze", "Vivid Voltage"] },
        { name: "Scarlet & Violet", sets: ["Scarlet & Violet", "Paldea Evolved", "Obsidian Flames"] }
      ] 
    },
    korean: { 
      series: [
        { name: "오리지널", sets: ["베이스 세트", "정글", "화석", "로켓단"] },
        { name: "네오", sets: ["네오 제네시스", "네오 디스커버리", "네오 레벨레이션", "네오 데스티니"] },
        { name: "e카드", sets: ["익스페디션 베이스 세트", "아쿠아 폴리스", "스카이 릿지"] },
        { name: "XY", sets: ["XY", "와일드 블레이즈", "라이징 피스트", "팬텀 게이트"] },
        { name: "썬 & 문", sets: ["썬 컬렉션", "문 컬렉션", "알로라의 햇빛", "알로라의 달빛"] },
        { name: "소드 & 실드", sets: ["소드", "실드", "반역 크래시", "폭염 워커", "무한 존"] },
        { name: "스칼렛 & 바이올렛", sets: ["스칼렛 ex", "바이올렛 ex", "트리플렛 비트", "스노 해저드"] }
      ] 
    }
  },
  sets_flat: ["Base Set", "Rebel Clash", "베이스 세트", "반역 크래시"]
};

// Quality Rating options
const QUALITY_RATINGS = {
  "PSA": [
    "AA : AUTHENTIC ALTERED", "N0 : AUTHENTIC", "PSA 1 : POOR", "PSA 1.5 : FAIR", "PSA 2 : GOOD", 
    "PSA 2.5 : GOOD +", "PSA 3 : VG", "PSA 3.5 : VG +", "PSA 4 : VG-EX", "PSA 4.5 : VG-EX +", 
    "PSA 5 : EX", "PSA 5.5 : EX +", "PSA 6 : EX-MT", "PSA 6.5 : EX-MT +", "PSA 7 : NM", 
    "PSA 7.5 : NM +", "PSA 8 : NM-MT", "PSA 8.5 : NM-MT +", "PSA 9 : MINT", "PSA 10 : GEM MINT"
  ],
  "BGS": [
    "BGS 1 : POOR", "BGS 1.5 : FAIR", "BGS 2 : GOOD", "BGS 2.5 : GOOD +", "BGS 3 : VG", 
    "BGS 3.5 : VG +", "BGS 4 : VG-EX", "BGS 4.5 : VG-EX +", "BGS 5 : EXCELLENT", "BGS 5.5 : EXCELLENT +", 
    "BGS 6 : EX-MT", "BGS 6.5 : EX-MT +", "BGS 7 : NEAR MINT", "BGS 7.5 : NEAR MINT +", 
    "BGS 8 : NM-MT", "BGS 8.5 : NM-MT", "BGS 9 : MINT", "BGS 9.5 : GEM MINT", "BGS 10 : PRISTINE", "BGS 10 : BLACK LABEL PRISTINE"
  ],
  "CGC": [
    "CGC 0.5 : POOR", "CGC 1 : FAIR", "CGC 1.5 : FA-G", "CGC 1.8 : GOOD -", "CGC 2 : GOOD", 
    "CGC 2.5 : GOOD +", "CGC 3 : G-VG", "CGC 3.5 : VG -", "CGC 4 : VG", "CGC 4.5 : VG +", 
    "CGC 5 : VG-FN", "CGC 5.5 : FN -", "CGC 6 : FN", "CGC 6.5 : FN +", "CGC 7 : FN-VF", 
    "CGC 7.5 : VF -", "CGC 8 : VF", "CGC 8.5 : VF +", "CGC 9 : VF-NM", "CGC 9.2 : NM -", 
    "CGC 9.4 : NM", "CGC 9.6 : NM +", "CGC 9.8 : NM-MT", "CGC 9.9 : MINT", "CGC 10 : GEM MINT"
  ],
  "SGC": [
    "SGC 1 : POOR", "SGC 1.5 : FAIR", "SGC 2 : GOOD", "SGC 2.5 : GOOD +", "SGC 3 : VG", 
    "SGC 3.5 : VG +", "SGC 4 : VG-EX", "SGC 4.5 : VG-EX +", "SGC 5 : EX", "SGC 5.5 : EX +", 
    "SGC 6 : EX-NM", "SGC 6.5 : EX-NM +", "SGC 7 : NM", "SGC 7.5 : NM +", "SGC 8 : NM-MT", 
    "SGC 8.5 : NM-MT", "SGC 9 : MINT", "SGC 9.5 : MINT +", "SGC 10 GM : GEM MINT", "SGC 10 PR : PRISTINE"
  ],
  "HGA": [
    "HGA 1.0 : POOR", "HGA 1.5 : FAIR", "HGA 2.0 : GOOD", "HGA 2.5 : GOOD +", "HGA 3.0 : VG", 
    "HGA 3.5 : VG +", "HGA 4.0 : VG-EX", "HGA 4.5 : VG-EX +", "HGA 5.0 : EX", "HGA 5.5 : EX +", 
    "HGA 6.0 : EX-NM", "HGA 6.5 : EX-NM +", "HGA 7.0 : NM", "HGA 7.5 : NM +", "HGA 8.0 : NM-MT", 
    "HGA 8.5 : NM-MT +", "HGA 9 : MINT", "HGA 10 GM : GEM MT", "HGA 10 FL : FLAWLESS"
  ]
};

  // load catalog on demand (before form) to reduce wait
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCatalog(true);
        setCatalogError(null);
        const res = await fetch(`${API_BASE}/catalog/pokemon`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PokemonCatalog;
        setCatalog(data);
      } catch (e: any) {
        console.warn("Failed to load catalog from API, using static fallback:", e.message);
        setCatalog(STATIC_CATALOG);
        setCatalogError(null); // Clear error since we have fallback
      } finally {
        setLoadingCatalog(false);
      }
    };
    // Keep catalog load for legacy form, but it's not required for new pokemon flow
    load();
  }, []);

  const cardForPreview: CardItem | null = useMemo(() => {
    if (!photoUri || !price) return null;
    const titleFromInput = cardTitle?.trim();
    if (!titleFromInput) return null;
    const pokemonInfo: any = {};
    if (rarity) pokemonInfo.rarity = rarity;
    if (setName) pokemonInfo.set = setName;
    if (language) pokemonInfo.language = language as any;
    if (qualityRating) pokemonInfo.quality_rating = qualityRating;
    pokemonInfo.game = "Pokemon TCG";
    if (!pokemonInfo.language) pokemonInfo.language = region === "korean" ? "ko" : "en";
    return {
      id: "temp",
      imageUrl: photoUri,
      title: titleFromInput,
      description,
      price: parseFloat(price) || 0,
      category: "pokemon",
      data: [],
      uploadDate: new Date().toISOString(),
      pokemon: pokemonInfo,
    } as CardItem;
  }, [photoUri, price, cardTitle, description, rarity, setName, language, region, qualityRating]);

  // no external auto-open; preview is shown inline as a full-screen modal when step === 'preview'

  const submit = async () => {
    setStep("submitting");
    try {
      // Build payload for uploadedCards
      const payload: any = {
        category: "pokemon",
        card_name: cardTitle?.trim() || undefined,
        rarity: rarity || undefined,
        variants: undefined,
        language: language || (region === "korean" ? "ko" : "en"),
        set: setName || undefined,
        card_num: undefined,
        quality_rating: qualityRating || undefined,
        price: parseFloat(price) || 0,
        description: description?.trim() || undefined,
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

  const handleCardPress = (card: any) => {
    setSelectedCard(card);
    setCardDetailVisible(true);
  };

  const handleCloseCardDetail = () => {
    setCardDetailVisible(false);
    setSelectedCard(null);
  };

  const handleCardUpdated = () => {
    // Refresh the cards list when a card is updated
    reloadSellerCards();
  };

  const filteredOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const base = pickerOptions;
    const unique = Array.from(new Set(base));
    if (!q) return unique;
    return unique.filter((o) => o.toLowerCase().includes(q));
  }, [pickerOptions, pickerQuery]);

  const wordsCount = useMemo(() => description.trim().split(/\s+/).filter(Boolean).length, [description]);
  const hasDescription = useMemo(() => description.trim().length > 0, [description]);

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
              <View style={styles.buttonGroup}>
                {/* 홍보하기: temporarily disabled with overlay label */}
                <View style={{ position: 'relative' }}>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: '#f93414', opacity: 0.7 }]}
                    disabled
                    onPress={() => { /* disabled: coming soon */ }}
                  >
                    <Text style={[styles.addBtnText, { color: '#fff' }]}>홍보하기</Text>
                  </Pressable>
                  <View style={styles.disabledOverlay} pointerEvents="none">
                    <Text style={styles.disabledOverlayText}>베타-곧 제공됩니다</Text>
                  </View>
                </View>
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
                const rawTitle = item.card_name || item.title || "";
                const cleanTitle = (rawTitle ? String(rawTitle).replace(/\s*#\d+\b/g, "") : "정보 없음");
                return (
                  <SellerCardListItem
                    imageUrl={item.image_url ? `${API_BASE}${item.image_url}` : "https://placehold.co/100x130"}
                    title={cleanTitle}
                    description={(item.description && String(item.description).trim()) ||
                      ((item.set || item.card_num) ? `${item.set ?? ""}${item.card_num ? ` • ${item.card_num}` : ""}` : "정보 없음")}
                    price={priceNum}
                    onPress={() => handleCardPress(item)}
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
          <View style={styles.headerWithCancel}>
            <Pressable style={styles.cancelBtn} onPress={() => {
              resetForm();
              setStep("management");
            }}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
          </View>
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
            <Pressable style={styles.primaryBtn} onPress={() => { setStep("manual-input"); }}>
              <Text style={styles.primaryBtnText}>확인</Text>
            </Pressable>
          </View>
        </View>
      )}
      {step === "manual-input" && (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.formContent}>
          <View style={styles.headerWithCancel}>
            <Pressable style={styles.cancelBtn} onPress={() => {
              resetForm();
              setStep("management");
            }}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>상품명 (*)</Text>
          {/* Card Title at top */}
          <TextInput
            value={cardTitle}
            onChangeText={setCardTitle}
            placeholder="예: 피카츄 EX #045 • Scarlet & Violet"
            style={styles.titleInput}
            autoFocus
          />
          {/* Region selection */}
          <Text style={[styles.stepTitle, { marginTop: 16 }]}>발매 언어</Text>
          <View style={styles.rowGap12}>
            <Pressable 
              style={[styles.optionBtn, region === "korean" && styles.optionBtnSelected]}
              onPress={() => setRegion("korean")}
            >
              <Text style={styles.optionText}>한국어</Text>
            </Pressable>
            <Pressable 
              style={[styles.optionBtn, region === "english" && styles.optionBtnSelected]}
              onPress={() => setRegion("english")}
            >
              <Text style={styles.optionText}>영어</Text>
            </Pressable>
          </View>

          {/* Set selection */}
          <Text style={[styles.stepTitle, { marginTop: 16 }]}>세트</Text>
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
                  (v) => { setSetName(v); setPickerVisible(false); },
                  true
                )
              }
            >
              <Text style={styles.selectBtnText}>{setName || "세트 검색 및 선택"}</Text>
            </Pressable>
          )}

          {/* Rarity */}
          <Text style={[styles.stepTitle, { marginTop: 16 }]}>카드 레어리티</Text>
          <Pressable
            style={[styles.selectBtn, rarity && styles.selectBtnSelected]}
            onPress={() => openPicker("레어리티 선택", catalog?.rarities || [], (v) => { setRarity(v); setPickerVisible(false); })}
          >
            <Text style={styles.selectBtnText}>{rarity || "레어리티 선택"}</Text>
          </Pressable>

          {/* Quality Rating Scale */}
          <Text style={[styles.stepTitle, { marginTop: 16 }]}>품질 등급 기관</Text>
          <Pressable
            style={[styles.selectBtn, qualityScale && styles.selectBtnSelected]}
            onPress={() => openPicker("등급 기관 선택", Object.keys(QUALITY_RATINGS), (v) => { 
              setQualityScale(v); 
              setQualityRating(null); // Reset rating when scale changes
              setPickerVisible(false); 
            })}
          >
            <Text style={styles.selectBtnText}>{qualityScale || "등급 기관 선택 (PSA, BGS, CGC 등)"}</Text>
          </Pressable>

          {/* Quality Rating - only show if scale is selected */}
          {qualityScale && (
            <>
              <Text style={[styles.stepTitle, { marginTop: 16 }]}>품질 등급</Text>
              <Pressable
                style={[styles.selectBtn, qualityRating && styles.selectBtnSelected]}
                onPress={() => openPicker("품질 등급 선택", QUALITY_RATINGS[qualityScale as keyof typeof QUALITY_RATINGS] || [], (v) => { 
                  setQualityRating(v); 
                  setPickerVisible(false); 
                })}
              >
                <Text style={styles.selectBtnText}>{qualityRating || "품질 등급 선택"}</Text>
              </Pressable>
            </>
          )}

          {/* Description */}
          <Text style={[styles.stepTitle, { marginTop: 16 }]}>상세 설명 (*) (최대 500 단어)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="상세 설명을 입력하세요"
            style={styles.textArea}
            multiline
          />
          <Text style={styles.helper}>{wordsCount} / 500 단어</Text>

          <View style={[styles.rowGap12, { marginTop: 12 }]}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("confirm-photo")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { opacity: (cardTitle.trim().length === 0 || !hasDescription || wordsCount > 500) ? 0.5 : 1 }]}
              disabled={cardTitle.trim().length === 0 || !hasDescription || wordsCount > 500}
              onPress={() => setStep("price-input")}
            >
              <Text style={styles.primaryBtnText}>다음</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {step === "price-input" && (
        <View style={[styles.flex1, styles.pad16]}>
          <View style={styles.headerWithCancel}>
            <Pressable style={styles.cancelBtn} onPress={() => {
              resetForm();
              setStep("management");
            }}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
          </View>
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
                setStep("manual-input");
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

      {/* Inline Preview modal for the preview step (matches CardDetailModal layout) */}
      <Modal
        visible={step === "preview"}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setStep("price-input")}
      >
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewBackdrop} onPress={() => setStep("price-input")} accessibilityRole="button" />

          <View style={styles.previewContainer}>
            <ScrollView
              contentContainerStyle={styles.previewScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {cardForPreview ? (
                <>
                  {/* Image area */}
                  <View style={styles.previewImageWrap}>
                    <Image
                      source={{ uri: cardForPreview.imageUrl || "https://placehold.co/1000x600" }}
                      style={styles.previewImageFull}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Body matching screenshot */}
                  <View style={styles.previewBody}>
                    <Text style={styles.previewTitle}>{cardForPreview.title}</Text>
                    {typeof cardForPreview.price === 'number' ? (
                      <Text style={styles.previewPrice}>{`₩${Math.round(cardForPreview.price).toLocaleString()}`}</Text>
                    ) : null}

                    <Text style={styles.previewMetaText}>업로드한 유저: {user?.username || ""}</Text>
                    <Text style={styles.previewMetaText}>업로드 날짜: {(() => {
                      const d = cardForPreview?.uploadDate ? new Date(cardForPreview.uploadDate) : new Date();
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      return `${yyyy}/${mm}/${dd}`;
                    })()}</Text>

                    <Text style={[styles.previewSectionTitle, { marginTop: 12 }]}>포켓몬 카드 정보</Text>

                    <View style={styles.detailRow}><Text style={styles.detailLabel}>세트</Text><Text style={styles.detailValue}>{setName || ''}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>희귀도</Text><Text style={styles.detailValue}>{rarity || ''}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>언어</Text><Text style={styles.detailValue}>{(() => {
                      const lang = language || (region === 'korean' ? 'ko' : region === 'english' ? 'en' : '');
                      if (lang === 'Korean') return 'ko';
                      if (lang === 'English') return 'en';
                      return lang;
                    })()}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>품질 등급</Text><Text style={styles.detailValue}>{qualityRating || ''}</Text></View>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>

          {/* Fixed bottom actions while previewing */}
          <View style={[
            styles.previewActionsBar,
            { paddingBottom: Math.max(12, insets.bottom + 8) }
          ]}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setStep("price-input")}>
                <Text style={styles.secondaryBtnText}>이전</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={submit}>
                <Text style={styles.primaryBtnText}>업로드</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
                  {/* Cancel button in camera */}
                  <View style={[styles.cameraCancel, { top: insets.top > 0 ? insets.top + 12 : 28 }]}>
                    <Pressable style={styles.cameraCancelBtn} onPress={() => {
                      resetForm();
                      setStep("management");
                    }}>
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </Pressable>
                  </View>
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

      {/* Seller Card Detail Modal */}
      <SellerCardDetailModal
        visible={cardDetailVisible}
        onClose={handleCloseCardDetail}
        card={selectedCard}
        onCardUpdated={handleCardUpdated}
      />

  {/** Modal is rendered at Home level via openCardPreview */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6" },
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
  modalCard: { width: "100%", backgroundColor: "#FAF9F6", borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, marginBottom: 8 },
  optionItem: { paddingVertical: 10 },
  sep: { height: 1, backgroundColor: "#F3F4F6" },
  errorText: { color: "#DC2626" },
  textArea: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, minHeight: 120, textAlignVertical: "top" },
  
  // New styles for management and form
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  buttonGroup: { flexDirection: "row", gap: 4 },
  addBtn: { backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  disabledOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlayText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
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
  
  // Cancel button styles
  headerWithCancel: { 
    flexDirection: "row", 
    justifyContent: "flex-start", 
    alignItems: "center", 
    paddingBottom: 16,
    marginTop: 8
  },
  cameraCancel: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  cancelBtn: { 
    backgroundColor: "#E5E7EB", 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  cameraCancelBtn: {
    backgroundColor: "rgba(229, 231, 235, 0.9)",
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  cancelBtnText: { 
    color: "#374151", 
    fontWeight: "600", 
    fontSize: 14 
  },
  // Fixed bottom bar for preview actions (이전/업로드)
  previewActionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FAF9F6",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  // Preview modal (match CardDetailModal)
  previewOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  previewContainer: {
    width: "100%",
    backgroundColor: "#FAF9F6",
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 32,
    marginBottom: 24,
    maxHeight: "85%",
  },
  previewScrollContent: {
    paddingBottom: 20,
  },
  previewCloseFloating: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewCloseFloatingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  previewImageFull: {
    width: "100%",
    height: 600,
    backgroundColor: "#f3f3f3",
  },
  previewImageWrap: {
    position: "relative",
  },
  previewBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 16,
    color: "#444",
  },
  // Meta + detail rows (for screenshot parity)
  previewMetaText: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  detailValue: {
    fontSize: 16,
    color: "#111",
  },
});
