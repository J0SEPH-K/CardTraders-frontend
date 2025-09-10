import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeProfileGoogle, acceptTermsAndConditions } from "@/api/client";
import { useAuth } from "@/store/useAuth";
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";

export default function CompleteProfilePage({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const setUser = useAuth((s) => s.setUser);
  const idToken: string = route?.params?.idToken;
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const canSubmit = username.trim().length > 0 && address.trim().length > 0;

  const checkTermsAndSetUser = (user: any) => {
    // Check if user has accepted terms and conditions
    if (!user?.terms_and_conditions) {
      // User hasn't accepted terms, show modal
      setPendingUser(user);
      setShowTermsModal(true);
    } else {
      // User has already accepted terms, proceed with login
      setUser(user);
      navigation.goBack();
    }
  };

  const handleAcceptTerms = async () => {
    try {
      if (!pendingUser?.userId) {
        Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
        return;
      }
      const { user } = await acceptTermsAndConditions(pendingUser.userId);
      setShowTermsModal(false);
      setPendingUser(null);
      setUser(user);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("오류", "약관 동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setPendingUser(null);
    Alert.alert("알림", "약관에 동의하셔야 서비스를 이용하실 수 있습니다.");
  };

  const submit = async () => {
    try {
      const { user } = await completeProfileGoogle(idToken, username.trim(), address.trim());
      checkTermsAndSetUser(user);
    } catch (e: any) {
      Alert.alert("실패", e?.message || "프로필 저장 실패");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}> 
      <Text style={styles.title}>프로필 완료</Text>
      <TextInput value={username} onChangeText={setUsername} placeholder="사용자명" style={styles.input} />
      <TextInput value={address} onChangeText={setAddress} placeholder="주소" style={styles.input} />
      <Pressable style={[styles.submitBtn, { opacity: canSubmit ? 1 : 0.5 }]} disabled={!canSubmit} onPress={submit}>
        <Text style={styles.submitText}>저장</Text>
      </Pressable>
      
      <TermsAndConditionsModal
        visible={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6", paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, backgroundColor: "#FAF9F6" },
  submitBtn: { backgroundColor: "#f93414", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "800" },
});
