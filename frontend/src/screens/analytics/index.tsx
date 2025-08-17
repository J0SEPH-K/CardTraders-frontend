import React, { useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import AnalyticsCardListItem from "../../components/AnalyticsCardListItem";
import SearchBar from "../../components/SearchBar";

const CATEGORIES = [
	{ key: "all", label: "전체" },
	{ key: "pokemon", label: "포켓몬" },
	{ key: "yugioh", label: "유희왕" },
	{ key: "sports", label: "스포츠" },
];

const analyticsItems = [
	{
		id: "a1",
		imageUrl: "https://placehold.co/100x130",
		title: "블랙 로터스",
		data: Array.from({ length: 30 }, (_, i) => 1000 + Math.round(Math.sin(i / 3) * 50 + i * 2)),
		category: "yugioh",
	},
	{
		id: "a2",
		imageUrl: "https://placehold.co/100x130",
		title: "청룡의 기사",
		data: Array.from({ length: 30 }, (_, i) => 800 + Math.round(Math.cos(i / 4) * 30 + i)),
		category: "yugioh",
	},
	{
		id: "a3",
		imageUrl: "https://placehold.co/100x130",
		title: "피카츄 - 시장 동향",
		data: Array.from({ length: 30 }, (_, i) => 600 + Math.round(Math.sin(i / 5) * 20 + i * 0.5)),
		category: "pokemon",
	},
	{
		id: "a4",
		imageUrl: "https://placehold.co/100x130",
		title: "야구 카드 - 시장 동향",
		data: Array.from({ length: 30 }, (_, i) => 1200 + Math.round(Math.cos(i / 6) * 40 - i)),
		category: "sports",
	},
	{
		id: "a5",
		imageUrl: "https://placehold.co/100x130",
		title: "다크 매지션",
		data: Array.from({ length: 30 }, (_, i) => 420 + Math.round(Math.sin(i / 2) * 25 + i)),
		category: "yugioh",
	},
];

export default function AnalyticsPage() {
	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const handleSearch = () => {
		// kept for SearchBar onSearch compatibility
	};

	const toggleCategory = (key: string) => {
		setSelectedCategory((prev) => (prev === key ? "all" : key));
	};

	const displayed = analyticsItems.filter((it) => {
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