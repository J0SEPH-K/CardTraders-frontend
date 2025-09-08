import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Image, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getOrCreateConversation } from "@/api/client";
import { useAuth } from "@/store/useAuth";
type AnyCard = {
  id?: string | number;
  imageUrl?: string;
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
  showUploadDate?: boolean; // when true, display upload date below the price
  onMessageSeller?: (sellerId: number | string | undefined, cardId?: number | string) => void;
};

export default function CardDetailModal({ visible, onClose, card, showUploadDate = true, onMessageSeller }: Props) {
  // Cache the last non-null card to keep content stable during fade-out
  const [lastCard, setLastCard] = useState<AnyCard>(card ?? null);
  const scrollRef = useRef<ScrollView | null>(null);
  const navigation = useNavigation<any>();
  const me = useAuth((s)=>s.user);

  useEffect(() => {
    if (card) setLastCard(card);
  }, [card]);

  const displayedCard = card ?? lastCard;

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

  const handleMessageSeller = async () => {
    const sellerId = displayedCard?.uploadedBy as number | string | undefined;
    const cardId = displayedCard?.id as number | string | undefined;
    // Close the modal before opening chat
    onClose?.();
    if (onMessageSeller) {
      onMessageSeller(sellerId, cardId);
      return;
    }
    try {
      const title = (displayedCard?.title || (displayedCard as any)?.card_name || "대화") as string;
      const imageUrl = (displayedCard?.imageUrl || "https://placehold.co/1000x600") as string;
      const buyerId = me?.userId;
      const sellerUserId = (typeof sellerId === 'number' ? String(sellerId) : String(sellerId || "")).trim();
      if (!buyerId || !sellerUserId) throw new Error("missing user ids");
  const conv = await getOrCreateConversation([buyerId, sellerUserId], String(cardId ?? ""));
      navigation.navigate("PrivateMessage", { convoId: conv.id, sellerId, cardId, title, imageUrl });
    } catch {
      // no-op if route missing; parent can pass onMessageSeller to handle
    }
  };

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
                  const uri = displayedCard.imageUrl || "https://placehold.co/1000x600";
                  const hasSeller = displayedCard.uploadedBy !== undefined && displayedCard.uploadedBy !== null && displayedCard.uploadedBy !== "";
                  return (
                    <View style={styles.imageWrap}>
                      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                      <Pressable
                        onPress={handleMessageSeller}
                        disabled={!hasSeller}
                        style={[styles.messageButton, !hasSeller && styles.messageButtonDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel="message seller"
                      >
                        <Text style={styles.messageButtonText}>Message Seller</Text>
                      </Pressable>
                    </View>
                  );
                })()}
                <View style={styles.body}>
                  <Text style={styles.title}>{displayedCard.title || displayedCard.card_name || "카드"}</Text>
                  {typeof displayedCard.price === 'number' ? (
                    <Text style={styles.price}>{`₩${Math.round(displayedCard.price).toLocaleString()}`}</Text>
                  ) : null}
                  {sellerName ? (
                    <Text style={styles.sellerText}>{`업로드한 유저: ${sellerName}`}</Text>
                  ) : null}
                  {showUploadDate && formattedUploadDate ? (
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
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
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
  messageButton: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  messageButtonDisabled: {
    opacity: 0.5,
  },
  messageButtonText: {
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
  // removed bottom close button
});