import React from "react";
import { Modal, View, Text, Image, StyleSheet, Pressable } from "react-native";

type Card = {
  imageUrl: string;
  title: string;
  description: string;
  price: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  card: Card | null;
};

export default function CardDetailModal({ visible, onClose, card }: Props) {
  if (!visible || !card) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <Image source={{ uri: card.imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.body}>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={styles.price}>{`₩${card.price.toLocaleString()}`}</Text>
            {card.description ? (
              <Text style={styles.description}>{card.description}</Text>
            ) : null}
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 260,
    backgroundColor: "#f3f3f3",
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
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
  closeButton: {
    backgroundColor: "#f93414",
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});