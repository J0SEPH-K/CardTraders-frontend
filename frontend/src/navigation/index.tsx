import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "@/screens/home";
import ProfilePage from "@/screens/profilePage";
import SettingsPage from "@/screens/settingsPage";
import AnnouncementsPage from "@/screens/announcementsPage";
import MessagePage from "@/screens/messagePage";
import PrivateMessagePage from "@/screens/privateMessagePage";
import LoginPage from "@/screens/loginPage";
import { useAuth } from "@/store/useAuth";
import SignUpPage from "@/screens/signUpPage";
import CompleteProfilePage from "@/screens/completeProfilePage";
const Stack = createNativeStackNavigator();
export default function RootNav(){
  const user = useAuth((s)=>s.user);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginPage} />
            <Stack.Screen name="SignUp" component={SignUpPage} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfilePage} />
          </>
        ) : null}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Profile" component={ProfilePage} />
        <Stack.Screen name="Settings" component={SettingsPage} />
        <Stack.Screen name="Announcements" component={AnnouncementsPage} />
  <Stack.Screen name="Messages" component={MessagePage} />
  <Stack.Screen name="PrivateMessage" component={PrivateMessagePage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
