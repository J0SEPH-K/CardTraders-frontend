import React, { useMemo, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import ChatBlock, { Conversation } from "@/components/ChatBlock";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MessagePage() {
	const insets = useSafeAreaInsets();
	const navigation = useNavigation<any>();
	// TODO: Replace with real data from API
	const [items, setItems] = useState<Conversation[]>([
		{
			id: "c1",
			title: "Pikachu (Illustration Rare)",
			imageUrl: "https://placehold.co/128x128",
			latestMessage: "감사합니다.",
			latestSenderMe: true,
			notificationsEnabled: true,
		},
		{
			id: "c2",
			title: "Charizard EX",
			imageUrl: "https://placehold.co/128x128",
			latestMessage: "내일 거래 가능하세요?",
			latestSenderMe: false,
			notificationsEnabled: false,
		},
	]);

	const onPress = (convo: Conversation) => {
		navigation.navigate("PrivateMessage", { convoId: convo.id, title: convo.title, imageUrl: convo.imageUrl });
	};

	const toggleNotif = (id: string, next: boolean) => {
		setItems(prev => prev.map(x => (x.id === id ? { ...x, notificationsEnabled: next } : x)));
	};

	const deleteChat = (id: string) => {
		setItems(prev => prev.filter(x => x.id !== id));
	};

	return (
		<View style={[styles.container, { paddingBottom: insets.bottom }] }>
			<FlatList
				data={items}
				keyExtractor={(it) => it.id}
				renderItem={({ item }) => (
					<ChatBlock convo={item} onPress={onPress} onToggleNotification={toggleNotif} onDelete={deleteChat} />
				)}
				ItemSeparatorComponent={() => <View style={styles.sep} />}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	sep: { height: 1, backgroundColor: "#f1f5f9" },
});

