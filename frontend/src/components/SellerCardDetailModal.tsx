import React, { useEffect, useRef, useState, useMemo } from "react";
import { Modal, View, Text, Image, StyleSheet, Pressable, ScrollView, TextInput, Alert, FlatList } from "react-native";
import { updateUploadedCard, API_BASE } from "@/api/client";
import { useAuth } from "@/store/useAuth";

type PokemonCatalog = {
  rarities: string[];
  languages: string[];
  sets: {
    english: { series: { name: string; sets?: string[] }[] };
    korean: { series: { name: string; sets?: string[] }[] };
  };
  sets_flat: string[];
};

type AnyCard = {
  id?: string | number;
  imageUrl?: string;
  image_url?: string;
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  uploadDate?: string;
  createdAt?: string;
  card_name?: string;
  rarity?: string;
  language?: string;
  set?: string;
  card_num?: string | number;
  quality_rating?: string;
  sports?: any;
  pokemon?: any;
  yugioh?: any;
  uploadedBy?: number | string;
  // optional seller name variants that may come from API
  seller_name?: string;
  sellerName?: string;
  uploaderName?: string;
  uploadedByName?: string;
  username?: string;
  userName?: string;
  name?: string;
  seller?: { name?: string } | any;
  user?: { name?: string; username?: string; displayName?: string } | any;
  profile?: { name?: string; displayName?: string } | any;
} | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  card: AnyCard;
  onCardUpdated?: () => void; // callback to refresh the cards list
};

export default function SellerCardDetailModal({ visible, onClose, card, onCardUpdated }: Props) {
  // Cache the last non-null card to keep content stable during fade-out
  const [lastCard, setLastCard] = useState<AnyCard>(card ?? null);
  const scrollRef = useRef<ScrollView | null>(null);
  const me = useAuth((s) => s.user);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSet, setEditSet] = useState("");
  const [editRarity, setEditRarity] = useState("");
  const [editQualityRating, setEditQualityRating] = useState("");
  const [editQualityScale, setEditQualityScale] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [editCardNum, setEditCardNum] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Catalog and picker state
  const [catalog, setCatalog] = useState<PokemonCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerOnSelect, setPickerOnSelect] = useState<(value: string) => void>(() => () => {});

  // Region for set selection
  const [editRegion, setEditRegion] = useState<"english" | "korean" | null>(null);

  useEffect(() => {
    if (card) setLastCard(card);
  }, [card]);

  const displayedCard = card ?? lastCard;

// Static fallback catalog data (from backend catalog.py)
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

  // Load catalog on mount, with static fallback if API fails
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const res = await fetch(`${API_BASE}/catalog/pokemon`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PokemonCatalog;
        setCatalog(data);
      } catch (e: any) {
        console.warn("Failed to load catalog from API, using static fallback:", e.message);
        // Use comprehensive static catalog instead of minimal fallback
        setCatalog(STATIC_CATALOG);
      } finally {
        setLoadingCatalog(false);
      }
    };
    
    loadCatalog();
  }, []);

  // Compute available sets based on selected region (same as sellerPage.tsx)
  const regionSets = useMemo(() => {
    if (!catalog || !editRegion) return [] as string[];
    const series = editRegion === "english" ? catalog.sets.english.series : catalog.sets.korean.series;
    const result: string[] = [];
    series.forEach((g) => (g.sets || []).forEach((s) => result.push(s)));
    return result;
  }, [catalog, editRegion]);

  // Initialize edit fields when card changes or entering edit mode
  useEffect(() => {
    if (displayedCard && isEditing) {
      setEditTitle(displayedCard.title || displayedCard.card_name || "");
      setEditDescription(displayedCard.description || "");
      setEditPrice(displayedCard.price ? String(displayedCard.price) : "");
      setEditSet(displayedCard.set || "");
      setEditRarity(displayedCard.rarity || "");
      setEditLanguage(displayedCard.language || "");
      setEditCardNum(displayedCard.card_num ? String(displayedCard.card_num) : "");
      
      // Initialize quality rating
      const currentQualityRating = displayedCard.quality_rating || "";
      setEditQualityRating(currentQualityRating);
      
      // Try to extract quality scale from quality rating
      if (currentQualityRating) {
        for (const [scale, ratings] of Object.entries(QUALITY_RATINGS)) {
          if (ratings.some(rating => rating === currentQualityRating || rating.includes(currentQualityRating))) {
            setEditQualityScale(scale);
            break;
          }
        }
      } else {
        setEditQualityScale("");
      }
      
      // Set region based on language
      if (displayedCard.language) {
        if (displayedCard.language === "ko" || displayedCard.language === "korean") {
          console.log("Setting region to korean based on language:", displayedCard.language);
          setEditRegion("korean");
        } else {
          console.log("Setting region to english based on language:", displayedCard.language);
          setEditRegion("english");
        }
      } else {
        console.log("No language found, resetting region");
        setEditRegion(null);
      }
    }
  }, [displayedCard, isEditing]);

  // format date in universal YYYY/MM/DD format regardless of locale
  const formatYMD = (dateLike: string | number | Date | undefined | null): string | null => {
    if (!dateLike) return null;
    try {
      const d = new Date(dateLike);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}/${m}/${day}`;
      }
      if (typeof dateLike === "string") {
        const m = dateLike.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (m) {
          const [, y, mo, da] = m;
          return `${y}/${mo.padStart(2, "0")}/${da.padStart(2, "0")}`;
        }
      }
    } catch {
      // noop, fall through
    }
    return null;
  };

  // Precompute formatted upload date (use uploadDate or createdAt from DB)
  const formattedUploadDate = formatYMD(displayedCard?.uploadDate || displayedCard?.createdAt);

  // Resolve seller name from multiple possible fields
  const sellerName: string | undefined = (() => {
    if (!displayedCard) return undefined;
    const get = (v: unknown) => (typeof v === "string" ? v.trim() || undefined : undefined);
    const fromUploadedByStr = get(displayedCard.uploadedBy);
    const fromSeller = get((displayedCard as any)?.seller?.name);
    const fromUser = get((displayedCard as any)?.user?.displayName) || get((displayedCard as any)?.user?.username) || get((displayedCard as any)?.user?.name);
    const fromProfile = get((displayedCard as any)?.profile?.displayName) || get((displayedCard as any)?.profile?.name);
    const direct =
      get((displayedCard as any)?.seller_name) ||
      get((displayedCard as any)?.sellerName) ||
      get((displayedCard as any)?.uploaderName) ||
      get((displayedCard as any)?.uploadedByName) ||
      get((displayedCard as any)?.username) ||
      get((displayedCard as any)?.userName) ||
      get((displayedCard as any)?.name);
    return direct || fromSeller || fromUser || fromProfile || fromUploadedByStr || (displayedCard.uploadedBy !== undefined && displayedCard.uploadedBy !== null ? String(displayedCard.uploadedBy) : undefined);
  })();

  const handleSave = async () => {
    if (!displayedCard?.id) return;
    
    setIsSaving(true);
    try {
      const updatedData: any = {
        card_name: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
        price: parseFloat(editPrice) || 0,
        set: editSet.trim() || undefined,
        rarity: editRarity.trim() || undefined,
        language: editLanguage || undefined,
        card_num: editCardNum.trim() || undefined,
        quality_rating: editQualityRating.trim() || undefined,
      };

      await updateUploadedCard(displayedCard.id, updatedData);
      
      Alert.alert("저장 완료", "카드 정보가 업데이트되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            setIsEditing(false);
            onCardUpdated?.(); // Refresh the parent list
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("저장 실패", error?.message || "다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset edit fields to original values
    if (displayedCard) {
      setEditTitle(displayedCard.title || displayedCard.card_name || "");
      setEditDescription(displayedCard.description || "");
      setEditPrice(displayedCard.price ? String(displayedCard.price) : "");
      setEditSet(displayedCard.set || "");
      setEditRarity(displayedCard.rarity || "");
      setEditLanguage(displayedCard.language || "");
      setEditCardNum(displayedCard.card_num ? String(displayedCard.card_num) : "");
      
      // Reset region based on language
      if (displayedCard.language) {
        if (displayedCard.language === "ko" || displayedCard.language === "korean") {
          setEditRegion("korean");
        } else {
          setEditRegion("english");
        }
      } else {
        setEditRegion(null);
      }
    }
  };

  // Picker functions
  const openPicker = (title: string, options: string[], onSelect: (v: string) => void) => {
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

  // Always show top when opening or switching cards
  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [visible, displayedCard?.id]);

  // If nothing to show and not visible yet, render nothing
  if (!visible && !displayedCard) return null;

  // helper to render a labeled row
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{String(value)}</Text>
      </View>
    );
  };

  // Editable input component
  const EditableField = ({ 
    label, 
    value, 
    onChangeText, 
    multiline = false, 
    keyboardType = "default" 
  }: { 
    label: string; 
    value: string; 
    onChangeText: (text: string) => void; 
    multiline?: boolean;
    keyboardType?: "default" | "numeric";
  }) => (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={`${label} 입력`}
      />
    </View>
  );

  // Picker field component
  const PickerField = ({ 
    label, 
    value, 
    onPress, 
    placeholder 
  }: { 
    label: string; 
    value: string; 
    onPress: () => void; 
    placeholder: string;
  }) => (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <Pressable
        style={[styles.editInput, styles.pickerInput]}
        onPress={onPress}
      >
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onDismiss={() => setLastCard(null)}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />

        <View style={styles.container}>
          {/* Fixed close button (top-right), stays while scrolling */}
          <Pressable style={styles.closeFloating} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeFloatingText}>✕</Text>
          </Pressable>

          <ScrollView
            ref={scrollRef}
            key={displayedCard?.id ?? "no-card"}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {displayedCard ? (
              <>
                {(() => {
                  const uri = displayedCard.imageUrl || displayedCard.image_url || "https://placehold.co/1000x600";
                  return (
                    <View style={styles.imageWrap}>
                      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                      <View style={styles.buttonGroup}>
                        {!isEditing ? (
                          <Pressable
                            onPress={() => setIsEditing(true)}
                            style={styles.editButton}
                            accessibilityRole="button"
                            accessibilityLabel="카드 정보 수정"
                          >
                            <Text style={styles.editButtonText}>정보 수정</Text>
                          </Pressable>
                        ) : (
                          <>
                            <Pressable
                              onPress={handleCancelEdit}
                              style={styles.cancelButton}
                              accessibilityRole="button"
                              accessibilityLabel="수정 취소"
                            >
                              <Text style={styles.cancelButtonText}>취소</Text>
                            </Pressable>
                            <Pressable
                              onPress={handleSave}
                              disabled={isSaving}
                              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                              accessibilityRole="button"
                              accessibilityLabel="변경사항 저장"
                            >
                              <Text style={styles.saveButtonText}>{isSaving ? "저장 중..." : "저장"}</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })()}
                <View style={styles.body}>
                  {isEditing ? (
                    <>
                      <EditableField
                        label="카드 이름"
                        value={editTitle}
                        onChangeText={setEditTitle}
                      />
                      <EditableField
                        label="가격 (원)"
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                      />
                      <EditableField
                        label="상세 설명"
                        value={editDescription}
                        onChangeText={setEditDescription}
                        multiline
                      />

                      {/* Language selection */}
                      <Text style={styles.editLabel}>발매 언어</Text>
                      <View style={styles.regionButtons}>
                        <Pressable 
                          style={[styles.regionBtn, editRegion === "korean" && styles.regionBtnSelected]}
                          onPress={() => {
                            setEditRegion("korean");
                            setEditLanguage("ko");
                            setEditSet(""); // Reset set when language changes
                            setEditRarity(""); // Reset rarity when language changes
                          }}
                        >
                          <Text style={[styles.regionBtnText, editRegion === "korean" && styles.regionBtnTextSelected]}>
                            한국어
                          </Text>
                        </Pressable>
                        <Pressable 
                          style={[styles.regionBtn, editRegion === "english" && styles.regionBtnSelected]}
                          onPress={() => {
                            setEditRegion("english");
                            setEditLanguage("en");
                            setEditSet(""); // Reset set when language changes
                            setEditRarity(""); // Reset rarity when language changes
                          }}
                        >
                          <Text style={[styles.regionBtnText, editRegion === "english" && styles.regionBtnTextSelected]}>
                            English
                          </Text>
                        </Pressable>
                      </View>

                      {/* Set selection - only show if region is selected */}
                      {editRegion && (
                        <PickerField
                          label="세트"
                          value={editSet}
                          onPress={() => {
                            openPicker(
                              "세트 선택",
                              regionSets.length > 0 ? regionSets : (editRegion === "korean" 
                                ? ["베이스 세트", "반역의 충돌", "어둠의 타오름", "생생한 전압"] 
                                : ["Base Set", "Rebel Clash", "Darkness Ablaze", "Vivid Voltage"]),
                              (v) => {
                                setEditSet(v);
                                setEditRarity(""); // Reset rarity when set changes
                                setPickerVisible(false);
                              }
                            );
                          }}
                          placeholder="세트를 선택하세요"
                        />
                      )}

                      {/* Rarity selection - only show if set is selected */}
                      {editSet && (
                        <PickerField
                          label="희귀도"
                          value={editRarity}
                          onPress={() => {
                            openPicker(
                              "희귀도 선택",
                              (catalog?.rarities && catalog.rarities.length > 0) ? catalog.rarities : ["Common", "Uncommon", "Rare", "Holo Rare", "Ultra Rare", "Secret Rare"],
                              (v) => {
                                setEditRarity(v);
                                setPickerVisible(false);
                              }
                            );
                          }}
                          placeholder="희귀도를 선택하세요"
                        />
                      )}

                      {/* Quality Rating Scale */}
                      <PickerField
                        label="품질 등급 기관"
                        value={editQualityScale}
                        onPress={() => {
                          openPicker(
                            "등급 기관 선택",
                            Object.keys(QUALITY_RATINGS),
                            (v) => {
                              setEditQualityScale(v);
                              setEditQualityRating(""); // Reset rating when scale changes
                              setPickerVisible(false);
                            }
                          );
                        }}
                        placeholder="등급 기관 선택 (PSA, BGS, CGC 등)"
                      />

                      {/* Quality Rating - only show if scale is selected */}
                      {editQualityScale && (
                        <PickerField
                          label="품질 등급"
                          value={editQualityRating}
                          onPress={() => {
                            openPicker(
                              "품질 등급 선택",
                              QUALITY_RATINGS[editQualityScale as keyof typeof QUALITY_RATINGS] || [],
                              (v) => {
                                setEditQualityRating(v);
                                setPickerVisible(false);
                              }
                            );
                          }}
                          placeholder="품질 등급 선택"
                        />
                      )}

                      <EditableField
                        label="카드 번호"
                        value={editCardNum}
                        onChangeText={setEditCardNum}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.title}>{displayedCard.title || displayedCard.card_name || "카드"}</Text>
                      {typeof displayedCard.price === 'number' ? (
                        <Text style={styles.price}>{`₩${Math.round(displayedCard.price).toLocaleString()}`}</Text>
                      ) : null}
                      {sellerName ? (
                        <Text style={styles.sellerText}>{`업로드한 유저: ${sellerName}`}</Text>
                      ) : null}
                      {formattedUploadDate ? (
                        <Text style={styles.uploadDateText}>{`업로드 날짜: ${formattedUploadDate}`}</Text>
                      ) : null}
                      {displayedCard.description ? (
                        <Text style={styles.description}>{displayedCard.description}</Text>
                      ) : null}

                      {/* Sports metadata if available */}
                      {displayedCard.category === "sports" && displayedCard.sports ? (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>스포츠 카드 정보</Text>
                          <Row label="사인한 사람" value={displayedCard.sports.autographedBy} />
                          <Row label="선수(애슬리트)" value={displayedCard.sports.playerAthlete} />
                          <Row label="카드 케이스 종류" value={displayedCard.sports.cardCaseType} />
                          <Row label="스포츠 종류" value={displayedCard.sports.sportType} />
                          <Row label="언어" value={displayedCard.sports.language} />
                          <Row label="제조사" value={displayedCard.sports.manufacturer} />
                          <Row label="팀" value={displayedCard.sports.team} />
                          <Row label="플레이어" value={displayedCard.sports.player} />
                          <Row label="발행량" value={displayedCard.sports.printRun} />
                          <Row label="희귀도" value={displayedCard.sports.rarity} />
                          <Row label="년도" value={displayedCard.sports.year} />
                          <Row label="카드 크기" value={displayedCard.sports.cardSize} />
                          <Row label="세트" value={displayedCard.sports.set} />
                          <Row label="사인 형식" value={displayedCard.sports.autographFormat} />
                          <Row label="제작 연도" value={displayedCard.sports.yearManufactured} />
                          <Row label="빈티지" value={displayedCard.sports.vintage ? "예" : displayedCard.sports.vintage === false ? "아니오" : undefined} />
                          <Row label="패럴렐/바리에이션" value={displayedCard.sports.parallelOrVariety} />
                          <Row label="사인 인증" value={displayedCard.sports.autographAuthentication} />
                          <Row label="리그" value={displayedCard.sports.league} />
                          <Row
                            label="오리지널/공식 리프린트"
                            value={
                              displayedCard.sports.originalOrLicensedReprint === "original"
                                ? "오리지널"
                                : displayedCard.sports.originalOrLicensedReprint === "licensed reprint"
                                ? "공식 리프린트"
                                : undefined
                            }
                          />
                          <Row label="유형" value={displayedCard.sports.type} />
                          <Row label="카드 번호" value={displayedCard.sports.cardNumber} />
                          <Row label="등급" value={displayedCard.sports.grade} />
                          <Row label="인증 번호" value={displayedCard.sports.certificationNumber} />
                          <Row label="감정 기관" value={displayedCard.sports.professionalGrader} />
                        </View>
                      ) : null}

                      {/* Pokemon metadata if available (nested) */}
                      {displayedCard.category === "pokemon" && displayedCard.pokemon ? (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>포켓몬 카드 정보</Text>
                          <Row label="카드 ID" value={displayedCard.pokemon.cardId} />
                          <Row label="상태" value={displayedCard.pokemon.condition} />
                          <Row label="게임" value={displayedCard.pokemon.game} />
                          <Row label="카드 이름" value={displayedCard.pokemon.cardName} />
                          <Row label="캐릭터" value={displayedCard.pokemon.character} />
                          <Row label="세트" value={displayedCard.pokemon.set} />
                          <Row
                            label="특징"
                            value={Array.isArray(displayedCard.pokemon.features)
                              ? displayedCard.pokemon.features.join(", ")
                              : displayedCard.pokemon.features}
                          />
                          <Row label="카드 유형" value={displayedCard.pokemon.cardType} />
                          <Row label="희귀도" value={displayedCard.pokemon.rarity} />
                          <Row label="마감" value={displayedCard.pokemon.finish} />
                          <Row label="제작 연도" value={displayedCard.pokemon.yearManufactured} />
                          <Row label="카드번호" value={displayedCard.pokemon.cardNumber} />
                          <Row label="언어" value={displayedCard.pokemon.language} />
                          <Row
                            label="변형"
                            value={Array.isArray(displayedCard.pokemon.variants)
                              ? displayedCard.pokemon.variants.join(", ")
                              : displayedCard.pokemon.variants}
                          />
                          <Row label="그레이딩" value={displayedCard.pokemon.grading} />
                        </View>
                      ) : null}

                      {/* Pokemon metadata (uploadedCards top-level fallback) */}
                      {displayedCard.category === "pokemon" && !displayedCard.pokemon ? (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>포켓몬 카드 정보</Text>
                          <Row label="세트" value={displayedCard.set} />
                          <Row label="카드번호" value={displayedCard.card_num} />
                          <Row label="희귀도" value={displayedCard.rarity} />
                          <Row label="언어" value={displayedCard.language} />
                        </View>
                      ) : null}

                      {/* Yugioh metadata if available (nested) */}
                      {displayedCard.category === "yugioh" && displayedCard.yugioh ? (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>유희왕 카드 정보</Text>
                          <Row label="상태" value={displayedCard.yugioh.condition} />
                          <Row label="카드 크기" value={displayedCard.yugioh.cardSize} />
                          <Row label="세트" value={displayedCard.yugioh.set} />
                          <Row label="제작 연도" value={displayedCard.yugioh.yearManufactured} />
                          <Row label="빈티지" value={displayedCard.yugioh.vintage ? "예" : displayedCard.yugioh.vintage === false ? "아니오" : undefined} />
                          <Row label="희귀도" value={displayedCard.yugioh.rarity} />
                          <Row label="카드 이름" value={displayedCard.yugioh.cardName} />
                          <Row label="제조사" value={displayedCard.yugioh.manufacturer} />
                          <Row
                            label="특징"
                            value={Array.isArray(displayedCard.yugioh.features)
                              ? displayedCard.yugioh.features.join(", ")
                              : displayedCard.yugioh.features}
                          />
                          <Row label="카드 유형" value={displayedCard.yugioh.cardType} />
                          <Row label="카드 번호" value={displayedCard.yugioh.cardNumber} />
                          <Row label="제조 국가/지역" value={displayedCard.yugioh.countryOfManufacture} />
                          <Row label="마감" value={displayedCard.yugioh.finish} />
                        </View>
                      ) : null}
                      {/* Yugioh metadata (uploadedCards top-level fallback) */}
                      {displayedCard.category === "yugioh" && !displayedCard.yugioh ? (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>유희왕 카드 정보</Text>
                          <Row label="카드 이름" value={displayedCard.card_name} />
                          <Row label="세트" value={displayedCard.set} />
                          <Row label="카드 번호" value={displayedCard.card_num} />
                          <Row label="희귀도" value={displayedCard.rarity} />
                          <Row label="언어" value={displayedCard.language} />
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>

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
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={{ maxHeight: 360 }}
            />
            <Pressable style={styles.cancelModalBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.cancelModalBtnText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  container: {
    width: "100%",
    backgroundColor: "#FAF9F6",
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 32,
    marginBottom: 24,
    maxHeight: "85%",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  closeFloating: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closeFloatingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  image: {
    width: "100%",
    height: 600,
    backgroundColor: "#f3f3f3",
  },
  imageWrap: {
    position: "relative",
  },
  buttonGroup: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  section: {
    marginTop: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLabel: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  description: {
    fontSize: 16,
    color: "#444",
  },
  uploadDateText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  sellerText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },
  // Edit mode styles
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  editInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  // Picker styles
  pickerInput: {
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 16,
    color: "#374151",
  },
  pickerPlaceholder: {
    color: "#9CA3AF",
  },
  // Region selection styles
  regionButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  regionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  regionBtnSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
  regionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  regionBtnTextSelected: {
    color: "#3B82F6",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FAF9F6",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  cancelModalBtn: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  cancelModalBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
