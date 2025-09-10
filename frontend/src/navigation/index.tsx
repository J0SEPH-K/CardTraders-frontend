import React from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "@/screens/home";
import ProfilePage from "@/screens/profilePage";
import SettingsPage from "@/screens/settingsPage";
import AnnouncementsPage from "@/screens/announcementsPage";
import MessagePage from "@/screens/messagePage";
import PrivateMessagePage from "@/screens/privateMessagePage";
import ConversationsPage from "@/screens/conversationsPage";
import LoginPage from "@/screens/loginPage";
import { useAuth } from "@/store/useAuth";
import SignUpPage from "@/screens/signUpPage";
import CompleteProfilePage from "@/screens/completeProfilePage";
import StartAnimationPage from "@/screens/startAnimationPage";
import PaymentsPage from "@/screens/payments";
import AddBankAccountPage from "@/screens/addBankAccountPage";
import AdvertiseSetupPage from "@/screens/AdvertiseSetupPage";
import AdPaymentPage from "@/screens/AdPaymentPage";
const Stack = createNativeStackNavigator();
export default function RootNav(){
  const user = useAuth((s)=>s.user);
  const [showStart, setShowStart] = React.useState(true);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        {!user && showStart ? (
          <Stack.Screen name="Start">
            {(props: any) => <StartAnimationPage {...props} onFinish={() => setShowStart(false)} />}
          </Stack.Screen>
        ) : null}
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginPage} options={{ animation: 'none' }} />
            <Stack.Screen name="SignUp" component={SignUpPage} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfilePage} />
          </>
        ) : null}
        <Stack.Screen name="Home" component={Home} options={{ animation: 'none' }} />
        <Stack.Screen name="Profile" component={ProfilePage} />
        <Stack.Screen name="Settings" component={SettingsPage} />
        <Stack.Screen name="Announcements" component={AnnouncementsPage} />
        <Stack.Screen name="AdvertiseSetup" component={AdvertiseSetupPage} />
        <Stack.Screen name="AdPayment" component={AdPaymentPage} />
  <Stack.Screen name="Payments" component={PaymentsPage} />
  <Stack.Screen name="AddBankAccount" component={AddBankAccountPage} />
  <Stack.Screen name="Messages" component={MessagePage} />
  <Stack.Screen name="PrivateMessage" component={PrivateMessagePage} />
  <Stack.Screen name="Conversations" component={ConversationsPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
