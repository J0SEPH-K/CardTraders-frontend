import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable, Animated, NativeSyntheticEvent, NativeScrollEvent, RefreshControl, Platform } from "react-native";
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

	// Fixed overlay header under the app title; list pulls-to-refresh beneath it
	const headerTranslateY = useRef(new Animated.Value(0)).current;
	const [headerHeight, setHeaderHeight] = useState(0);
	const lastY = useRef(0);
	const isHidden = useRef(false);
	const upAccum = useRef(0);
	const downAccum = useRef(0);
	const isUserDragging = useRef(false);

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

	// Handle scroll: hide/show only when the user is actively dragging with a finger
	const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const y = e.nativeEvent.contentOffset.y;
		const dy = y - lastY.current;

		// If not user-dragging (momentum/bounce), ignore direction to prevent accidental show/hide
		if (!isUserDragging.current) {
			// Still ensure header becomes visible when near the very top
			if (y < 5 && isHidden.current) {
				isHidden.current = false;
				upAccum.current = 0;
				downAccum.current = 0;
				Animated.timing(headerTranslateY, { toValue: 0, duration: 150, useNativeDriver: true }).start();
			}
			lastY.current = y;
			return;
		}
		if (dy > 0) {
			downAccum.current += dy;
			upAccum.current = 0;
			if (!isHidden.current && downAccum.current > 8 && y > 0) {
				isHidden.current = true;
				Animated.timing(headerTranslateY, { toValue: -headerHeight, duration: 180, useNativeDriver: true }).start();
			}
		} else if (dy < 0) {
			upAccum.current += -dy;
			downAccum.current = 0;
			if (isHidden.current && upAccum.current > 8) {
				isHidden.current = false;
				Animated.timing(headerTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
			}
		}
		// Always show when very near top
		if (y < 12 && isHidden.current) {
			isHidden.current = false;
			upAccum.current = 0;
			downAccum.current = 0;
			Animated.timing(headerTranslateY, { toValue: 0, duration: 150, useNativeDriver: true }).start();
		}
		lastY.current = y;
	};

	const onScrollBeginDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		isUserDragging.current = true;
		lastY.current = e.nativeEvent.contentOffset.y;
		// Reset accumulators at the start of a user drag for clean detection
		upAccum.current = 0;
		downAccum.current = 0;
	};

	const onScrollEndDrag = () => {
		isUserDragging.current = false;
	};

	return (
		<View style={styles.container}>
			{/* Fixed search header (does not move during pull-to-refresh) */}
			<Animated.View
				style={[styles.headerOverlay, { transform: [{ translateY: headerTranslateY }] }]}
				onLayout={(e) => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}
			>
				<View style={styles.headerInner}>
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
				</View>
			</Animated.View>

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
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={load}
						progressViewOffset={Platform.OS === 'android' ? headerHeight : 0}
					/>
				}
				onScroll={onScroll}
				onScrollBeginDrag={onScrollBeginDrag}
				onScrollEndDrag={onScrollEndDrag}
				showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 24, paddingTop: Platform.OS === 'android' ? headerHeight : 0 }}
					{...(Platform.OS === 'ios' ? { contentInset: { top: headerHeight }, scrollIndicatorInsets: { top: headerHeight } } : {})}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FAF9F6",
	},
	headerOverlay: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		backgroundColor: "#FAF9F6",
		zIndex: 1,
	},
	headerInner: {
		marginTop: 0,
		paddingTop: 0,
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