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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { API_BASE, api } from "../api/client";
import CardDetailModal from "../components/CardDetailModal";
import type { CardItem } from "../data/dummy";

type Step =
  | "management"
  | "camera"
  | "confirm-photo"
  | "title-input"
  | "form"
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

export default function SellerPage() {
  // camera
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // steps
  const [step, setStep] = useState<Step>("management");
  const [currentFormStep, setCurrentFormStep] = useState<FormStep>("category");

  // seller cards management
  const [sellerCards, setSellerCards] = useState<SellerCard[]>([
    {
      id: "1",
      title: "피카츄 V",
      description: "좋은 상태의 피카츄 카드입니다",
      category: "pokemon",
      status: "listed"
    },
    {
      id: "2", 
      title: "리자몽 프로모",
      description: "한정판 프로모 카드",
      category: "pokemon",
      status: "draft"
    }
  ]);

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

  // animation for form steps
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // dropdown modal for sets/rarity/language
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerOnSelect, setPickerOnSelect] = useState<(value: string) => void>(() => () => {});

  // preview modal uses existing CardDetailModal
  const [previewVisible, setPreviewVisible] = useState(false);

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
    
    // Reset all steps after the changed one
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
          setDescription("");
          break;
      }
    }
    
    // Set current step to the next incomplete step
    const nextIncompleteStep = getNextIncompleteStep(changedStep);
    if (nextIncompleteStep) {
      setCurrentFormStep(nextIncompleteStep);
      // Trigger fade animation for the new current step
      Animated.sequence([
        Animated.timing(fadeAnim, { duration: 150, toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { duration: 300, toValue: 1, useNativeDriver: true }),
      ]).start();
    }
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
    load();
  }, []);

  const cardForPreview: CardItem | null = useMemo(() => {
    if (!photoUri || !setName || !rarity || !language || !cardTitle || !price) return null;
    return {
      id: "temp",
      imageUrl: photoUri,
      title: cardTitle,
      description,
      price: parseFloat(price) || 0,
      category: "pokemon",
      data: [],
      pokemon: {
        rarity,
        set: setName,
        language,
      },
    } as CardItem;
  }, [photoUri, setName, rarity, language, description, cardTitle, price]);

  const submit = async () => {
    setStep("submitting");
    try {
      // For now, map to /listings API until uploadedCards endpoint exists
      const payload = {
        title: cardTitle || "Pokemon Card",
        description,
        category: "pokemon",
        set_name: setName,
        base: region || undefined,
        card_type: "pokemon",
        price: parseFloat(price) || 0,
      };
      await api("/listings", { method: "POST", body: JSON.stringify(payload) });
      setStep("done");
      Alert.alert("업로드 완료", "카드 정보가 업로드되었습니다.");
    } catch (e: any) {
      Alert.alert("업로드 실패", e?.message || "다시 시도해 주세요.");
      setStep("preview");
    }
  };

  const takePhoto = async () => {
    try {
      const cam: any = cameraRef.current;
      if (!cam) return;
      const pic = await cam.takePictureAsync?.({ quality: 0.8, skipProcessing: Platform.OS === "android" });
      if (pic?.uri) {
        setPhotoUri(pic.uri);
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
    if (!q) return pickerOptions;
    return pickerOptions.filter((o) => o.toLowerCase().includes(q));
  }, [pickerOptions, pickerQuery]);

  const wordsCount = useMemo(() => description.trim().split(/\s+/).filter(Boolean).length, [description]);

  // UI blocks
  const CameraOverlay = () => (
    <View style={styles.overlayWrap} pointerEvents="none">
      <View style={styles.instructions}>
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
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SellerCardItem card={item} />}
            style={styles.cardList}
            contentContainerStyle={styles.cardListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {step === "camera" && (
        <View style={styles.flex1}>
          {!permission?.granted ? (
            <View style={styles.center}>
              <Text style={styles.title}>카메라 권한이 필요합니다</Text>
              <Pressable style={styles.primaryBtn} onPress={() => requestPermission()}>
                <Text style={styles.primaryBtnText}>권한 허용</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView style={styles.camera} ref={cameraRef} facing="back" />
              <CameraOverlay />
              <View style={styles.cameraActions}>
                <Pressable style={styles.shutterBtn} onPress={takePhoto}>
                  <View style={styles.shutterInner} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {step === "confirm-photo" && (
        <View style={[styles.flex1, styles.pad16]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.center}><Text>이미지가 없습니다.</Text></View>
          )}
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("camera")}> 
              <Text style={styles.secondaryBtnText}>다시 촬영</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setStep("title-input")}>
              <Text style={styles.primaryBtnText}>확인</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "title-input" && (
        <View style={[styles.flex1, styles.pad16]}>
          <Text style={styles.title}>카드 제목 입력</Text>
          <Text style={styles.helper}>판매 게시글에 표시될 카드 제목을 입력하세요</Text>
          <TextInput
            value={cardTitle}
            onChangeText={setCardTitle}
            placeholder="예: 피카츄 V 프로모 카드"
            style={styles.titleInput}
            autoFocus
          />
          <View style={styles.rowGap12}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("confirm-photo")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable 
              style={[styles.primaryBtn, { opacity: cardTitle.trim().length === 0 ? 0.5 : 1 }]} 
              disabled={cardTitle.trim().length === 0}
              onPress={() => setStep("form")}
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
          )}          {/* Set Step */}
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
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("form")}>
              <Text style={styles.secondaryBtnText}>이전</Text>
            </Pressable>
            <Pressable 
              style={[styles.primaryBtn, { opacity: price.trim().length === 0 ? 0.5 : 1 }]} 
              disabled={price.trim().length === 0}
              onPress={() => setStep("preview")}
            >
              <Text style={styles.primaryBtnText}>미리보기</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "preview" && (
        <View style={styles.formWrap}>
          <Text style={styles.question}>미리보기</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setPreviewVisible(true)}>
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

      {/* Preview using existing modal */}
      <CardDetailModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        card={cardForPreview}
      />
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
});
