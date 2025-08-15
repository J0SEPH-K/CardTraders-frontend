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
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    padding: 12,
    marginVertical: 6,
    alignItems: "center",
  },
  imageWrapper: {
    flex: 3,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    height: 80,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textWrapper: {
    flex: 7,
    justifyContent: "space-between",
    height: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  priceWrapper: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
});