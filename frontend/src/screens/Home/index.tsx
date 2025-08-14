import { View, Text, Pressable } from "react-native";
export default function Home(){
  return (
    <View className="flex-1 bg-white dark:bg-black p-6">
      <Text className="text-3xl font-bold">CardTraders</Text>
      <Text className="text-base mt-2 text-gray-500">쉽고 안전한 카드 거래</Text>
      <Pressable className="mt-6 px-4 py-3 rounded-2xl bg-black">
        <Text className="text-white text-center">검색</Text>
      </Pressable>
    </View>
  );
}
