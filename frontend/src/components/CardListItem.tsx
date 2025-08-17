import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type Props = {
  imageUrl: string;
  title: string;
  description: string;
  price: number;
};

export default function CardListItem({ imageUrl, title, price }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <View style={styles.priceWrapper}>
          <Text style={styles.price}>{`₩${price.toLocaleString()}`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#fff",
    // shadow for iOS (all around) and Android (elevation)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 }, // center shadow so it drops evenly on all sides
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16, // side margins so items don't touch screen edges
    alignItems: "center",
    overflow: "visible", // ensure shadow is visible outside rounded corners
  },
  imageWrapper: {
    width: 100,
    height: 130,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f3f3",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textWrapper: {
    flex: 1,
    justifyContent: "space-between",
    height: 120,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "left",
    paddingLeft: 10,
  },
  priceWrapper: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingRight: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
  },
});