import { View, FlatList } from "react-native";
import CardListItem from "../../components/CardListItem";

const cards = [
	{
		id: "1",
		imageUrl: "https://placehold.co/100x80",
		title: "블랙 로터스",
		description: "매직 더 개더링의 전설적인 카드입니다.",
		price: 1000000,
	},
	{
		id: "2",
		imageUrl: "https://placehold.co/100x80",
		title: "청룡의 기사",
		description: "희귀 카드, 상태 최상. 빠른 거래 원합니다.",
		price: 250000,
	},
	// ...더 많은 카드 데이터...
];

export default function BuyerPage() {
	return (
		<View style={{ flex: 1, backgroundColor: "#f8f8f8", padding: 16 }}>
			<FlatList
				data={cards}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<CardListItem
						imageUrl={item.imageUrl}
						title={item.title}
						description={item.description}
						price={item.price}
					/>
				)}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}