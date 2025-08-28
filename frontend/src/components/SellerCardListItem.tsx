import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";

type Props = {
  imageUrl: string;
  title: string;
  description: string;
  price: number;
  onPress?: () => void;
};

export default function SellerCardListItem({ imageUrl, title, description, price, onPress }: Props) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
        <View style={styles.textWrapper}>
          <View style={styles.topBlock}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            <View style={styles.priceWrapper}>
              <Text style={styles.price}>{`${price.toLocaleString()}원`}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    // shadow for iOS (all around) and Android (elevation)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 }, // center shadow so it drops evenly on all sides
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: 8,
    marginHorizontal: 16, // side margins so items don't touch screen edges
    overflow: "visible", // ensure shadow visible
  },
  content: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden", // clip children to rounded corners
    minHeight: 130,
    alignItems: "stretch",
  },
  imageWrapper: {
    width: 110,
    alignSelf: "stretch",
    backgroundColor: "#f3f3f3",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
  textWrapper: {
    flex: 1,
    justifyContent: "space-between",
    padding: 12,
  },
  topBlock: {
    // stacks title and price
  },
  title: {
    fontSize: 20,
    fontFamily: 'GothicA1_400Regular',
    textAlign: "left",
    paddingLeft: 4,
  },
  priceWrapper: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: "300",
    color: "#007AFF",
    paddingLeft: 4,
  },
});
