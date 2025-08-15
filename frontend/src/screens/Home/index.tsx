import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BuyerPage from "../buyerPage";

type RootStackParamList = {
  Home: undefined;
  SellerPage: undefined;
  BuyerPage: undefined;
  ProfilePage: undefined;
};

export default function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<"판매" | "구매" | "내 프로필">("구매");

  return (
    <View className="flex-1 bg-white dark:bg-black p-6">
      <Text className="text-3xl font-bold">CardTraders</Text>
      <Text className="text-base mt-2 text-gray-500">쉽고 안전한 카드 거래</Text>
      <Pressable className="mt-6 px-4 py-3 rounded-2xl bg-black">
        <Text className="text-white text-center">검색</Text>
      </Pressable>

      {/* Main Content */}
      <View style={{ flex: 1, marginTop: 16 }}>
        {selectedTab === "구매" && <BuyerPage />}
        {/* 판매/내 프로필 탭에 맞는 내용 추가 가능 */}
      </View>

      {/* Tab Bar */}
      <View
        className="absolute left-0 right-0 bottom-0 flex-row bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800"
        style={{ height: 70 }}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          onPress={() => setSelectedTab("판매")}
        >
          <Text className="text-base font-semibold">판매</Text>
        </Pressable>
        <Pressable
          className="flex-1 justify-center items-center"
          onPress={() => setSelectedTab("구매")}
        >
          <Text className="text-base font-semibold">구매</Text>
        </Pressable>
        <Pressable
          className="flex-1 justify-center items-center"
          onPress={() => setSelectedTab("내 프로필")}
        >
          <Text className="text-base font-semibold">내 프로필</Text>
        </Pressable>
      </View>
    </View>
  );
}
