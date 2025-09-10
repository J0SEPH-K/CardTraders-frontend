import React from "react";
import { View, TextInput, StyleSheet } from "react-native";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSearch: () => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChangeText, onSearch, placeholder }: Props) {
  return (
    <View style={styles.searchRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "검색"}
        returnKeyType="search"
        onSubmitEditing={onSearch}
        style={styles.searchInput}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
});