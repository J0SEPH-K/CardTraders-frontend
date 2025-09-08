import React, { useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import AnalyticsCardListItem from "../components/AnalyticsCardListItem";
import SearchBar from "../components/SearchBar";
import { CATEGORIES, cards } from "../data/dummy";

export default function AnalyticsPage() {
	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const handleSearch = () => {
		// kept for SearchBar onSearch compatibility
	};

	const toggleCategory = (key: string) => {
		setSelectedCategory((prev) => (prev === key ? "all" : key));
	};

		const displayed = cards.filter((it) => {
		const matchesCategory = selectedCategory === "all" || it.category === selectedCategory;
		const q = query.trim().toLowerCase();
		const matchesQuery = q === "" || it.title.toLowerCase().includes(q);
		return matchesCategory && matchesQuery;
	});

	return (
		<View style={styles.container}>
			<SearchBar value={query} onChangeText={setQuery} onSearch={handleSearch} placeholder="Search analytics" />

			<View style={styles.filterRow}>
				{CATEGORIES.map((cat) => {
					const active = selectedCategory === cat.key;
					return (
						<Pressable
							key={cat.key}
							onPress={() => toggleCategory(cat.key)}
							style={[styles.filterButton, active && styles.filterButtonActive]}
						>
							<Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{cat.label}</Text>
						</Pressable>
					);
				})}
			</View>

			<FlatList
				data={displayed}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<AnalyticsCardListItem imageUrl={item.imageUrl} title={item.title} data={item.data} graphWidth={160} graphHeight={100} />
				)}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FAF9F6",
	},
	filterRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingBottom: 8,
		paddingTop: 4,
	},
	filterButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: "transparent",
		marginRight: 8,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	filterButtonActive: {
		backgroundColor: "#f93414",
		borderColor: "#f93414",
	},
	filterLabel: {
		color: "#111827",
		fontSize: 13,
		fontWeight: "600",
	},
	filterLabelActive: {
		color: "#fff",
	},
});