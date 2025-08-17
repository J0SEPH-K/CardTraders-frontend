import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SellerPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>to be developed...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    color: "#9CA3AF", // gray
    fontSize: 16,
  },
});