import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Image, StyleSheet, Pressable, ScrollView } from "react-native";
import type { CardItem } from "../data/dummy";

type Props = {
  visible: boolean;
  onClose: () => void;
  card: CardItem | null;
};

export default function CardDetailModal({ visible, onClose, card }: Props) {
  // Cache the last non-null card to keep content stable during fade-out
  const [lastCard, setLastCard] = useState<CardItem | null>(card ?? null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (card) setLastCard(card);
  }, [card]);

  const displayedCard = card ?? lastCard;

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
                <Image source={{ uri: displayedCard.imageUrl }} style={styles.image} resizeMode="cover" />
                <View style={styles.body}>
                  <Text style={styles.title}>{displayedCard.title}</Text>
                  <Text style={styles.price}>{`₩${displayedCard.price.toLocaleString()}`}</Text>
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

                  {/* Pokemon metadata if available */}
                  {displayedCard.category === "pokemon" && displayedCard.pokemon ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>포켓몬 카드 정보</Text>
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
                      <Row label="카드 번호" value={displayedCard.pokemon.cardNumber} />
                    </View>
                  ) : null}

                  {/* Yugioh metadata if available */}
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
    backgroundColor: "#fff",
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
  // removed bottom close button
});