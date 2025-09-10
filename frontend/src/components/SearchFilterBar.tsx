import React, { useMemo } from "react";
import { View, Pressable, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

type Category = { key: string; label: string };

type Props = {
  value: string; // currently selected key, e.g. "all" | "pokemon" | ...
  onChange: (key: string) => void;
  categories?: Category[];
  style?: any;
};

const DEFAULT_CATEGORIES: Category[] = [
  { key: "starred", label: "" },
  { key: "all", label: "전체" },
  { key: "pokemon", label: "포켓몬" },
  { key: "yugioh", label: "유희왕" },
  { key: "sports", label: "스포츠" },
];

export default function SearchFilterBar({ value, onChange, categories = DEFAULT_CATEGORIES, style }: Props) {
  const selectedKey = value ?? "all";

  // Ensure starred filter exists even if parent passes a custom categories list
  const effectiveCategories = useMemo(() => {
    if (!categories) return DEFAULT_CATEGORIES;
    const hasStarred = categories.some((c) => c.key === 'starred');
  if (hasStarred) return categories;
  // prepend the default starred category (keeps its label in sync with DEFAULT_CATEGORIES)
  return [DEFAULT_CATEGORIES[0], ...categories];
  }, [categories]);

  const handlePress = (key: string) => {
    // toggle: selecting the same key returns to 'all'
    if (key === selectedKey) {
      onChange("all");
    } else {
      onChange(key);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
  {effectiveCategories.map((cat) => {
          const active = cat.key === selectedKey;
          return (
            <Pressable
              key={cat.key}
              onPress={() => handlePress(cat.key)}
              style={[styles.button, active && styles.buttonActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`filter-${cat.key}`}
            >
              {cat.key === 'starred' ? (
                // show only a star icon for the starred filter
                <MaterialIcons name={active ? 'star' : 'star-border'} size={18} color={active ? '#fff' : '#F59E0B'} />
              ) : (
                <Text style={[styles.label, active && styles.labelActive]}>{cat.label}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    backgroundColor: "transparent",
  },
  row: {
    alignItems: "center",
  },
  button: {
    paddingHorizontal: 18, // increased horizontal padding to widen
    paddingVertical: 10, // increased vertical padding for larger tappable area
    borderRadius: 999,
    backgroundColor: "transparent",
    marginRight: 12, // slightly wider gap between buttons
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 86, // ensure buttons have minimum width
    justifyContent: "center",
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: "#f93414",
    borderColor: "#f93414",
  },
  label: {
    color: "#111827",
    fontSize: 15, // larger label
    fontWeight: "700",
  },
  labelActive: {
    color: "#fff",
  },
  icon: {
    marginRight: 6,
  },
});
