import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import CardListItem from "../components/CardListItem";
import SearchBar from "../components/SearchBar";
import { CATEGORIES } from "../data/dummy";
import { API_BASE } from "../api/client";

type Props = {
	setSelectedCard?: (card: any) => void;
};

export default function BuyerPage({ setSelectedCard }: Props) {
	const [query, setQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [items, setItems] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);

	const load = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
			if (query.trim()) params.set("q", query.trim());
			const r = await fetch(`${API_BASE}/uploaded-cards?${params.toString()}`);
			if (!r.ok) throw new Error(await r.text());
			const data = await r.json();
			setItems(Array.isArray(data) ? data : []);
		} catch (e) {
			console.error("load uploaded-cards failed", e);
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCategory]);

	const handleSearch = () => {
		// Search runs from query state; no additional action required here.
		// Kept for SearchBar onSearch prop compatibility.
	};

	const toggleCategory = (key: string) => {
		setSelectedCategory((prev) => (prev === key ? "all" : key));
	};

	const displayed = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter((c) => {
			const matchesQuery = !q || String(c.card_name || "").toLowerCase().includes(q);
			return matchesQuery;
		});
	}, [items, query]);

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
				keyExtractor={(item) => String(item.id)}
					renderItem={({ item }) => {
						let priceNum = 0;
						if (typeof item.price === 'number') {
							priceNum = item.price;
						} else if (typeof item.price === 'string') {
							const parsed = Number(item.price.replace(/,/g, '').trim());
							if (Number.isFinite(parsed)) priceNum = parsed;
						}
						const rawTitle = item.card_name || item.title || `${item.category} card`;
						const cleanTitle = String(rawTitle).replace(/\s*#\d+\b/g, "");
						const absoluteImageUrl = item.image_url ? `${API_BASE}${item.image_url}` : "https://placehold.co/100x130";
						return (
							<CardListItem
								imageUrl={absoluteImageUrl}
								title={cleanTitle}
								description={item.description || (item.set ? `${item.set}${item.card_num ? ` • ${item.card_num}` : ""}` : "")}
								price={priceNum}
							sellerAddress={item.seller_address}
							uploadDate={item.uploadDate || item.createdAt}
								onPress={() => {
									// Provide absolute URL for detail modal compatibility and normalize title
									const selected = {
										...item,
										imageUrl: absoluteImageUrl,
										image_url: absoluteImageUrl,
										title: cleanTitle,
										price: priceNum,
									};
									setSelectedCard?.(selected);
								}}
							/>
						);
					}}
				refreshing={loading}
				onRefresh={load}
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