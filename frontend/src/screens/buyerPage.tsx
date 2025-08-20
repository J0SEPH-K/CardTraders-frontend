import React, { useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import CardListItem from "../components/CardListItem";
import SearchBar from "../components/SearchBar";
import { CATEGORIES, cards } from "../data/dummy";

type Props = {
	setSelectedCard?: (card: any) => void;
};

export default function BuyerPage({ setSelectedCard }: Props) {
	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const handleSearch = () => {
		// Search runs from query state; no additional action required here.
		// Kept for SearchBar onSearch prop compatibility.
	};

	const toggleCategory = (key: string) => {
		setSelectedCategory((prev) => (prev === key ? "all" : key));
	};

	const displayed = cards.filter((c) => {
		const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
		const q = query.trim().toLowerCase();
		const matchesQuery = q === "" || c.title.toLowerCase().includes(q);
		return matchesCategory && matchesQuery;
	});

	return (
		<View style={styles.container}>
			<SearchBar value={query} onChangeText={setQuery} onSearch={handleSearch} placeholder="카드 검색" />

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
						<CardListItem
							imageUrl={item.imageUrl}
							title={item.title}
							description={item.description}
							price={item.price}
							onPress={() => setSelectedCard?.(item)}
						/>
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
		backgroundColor: "#fff",
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