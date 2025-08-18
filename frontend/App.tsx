import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './src/screens/home';
//import SellerPage from './src/screens/sellerPage';
import BuyerPage from './src/screens/buyerPage';
// import ProfilePage from './src/screens/profilePage'; // if exists

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        {/* <Stack.Screen name="SellerPage" component={SellerPage} /> */}
        <Stack.Screen name="BuyerPage" component={BuyerPage} />
        {/* <Stack.Screen name="ProfilePage" component={ProfilePage} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}