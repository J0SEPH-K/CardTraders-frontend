import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";

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
        placeholder={placeholder ?? "Search"}
        returnKeyType="search"
        onSubmitEditing={onSearch}
        style={styles.searchInput}
        placeholderTextColor="#9CA3AF"
      />
      <Pressable onPress={onSearch} style={styles.searchButton}>
        <Text style={styles.searchButtonText}>검색</Text>
      </Pressable>
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
  searchButton: {
    marginLeft: 8,
    backgroundColor: "#f93414",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});