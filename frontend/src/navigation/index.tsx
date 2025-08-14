import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "@/screens/Home";
import Search from "@/screens/Search";
import ListingDetail from "@/screens/Listing/Detail";
import Chat from "@/screens/Chat";
const Stack = createNativeStackNavigator();
export default function RootNav(){
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="ListingDetail" component={ListingDetail} />
        <Stack.Screen name="Chat" component={Chat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
