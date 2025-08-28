import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeProfileGoogle } from "@/api/client";
import { useAuth } from "@/store/useAuth";

export default function CompleteProfilePage({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const setUser = useAuth((s) => s.setUser);
  const idToken: string = route?.params?.idToken;
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const canSubmit = username.trim().length > 0 && address.trim().length > 0;

  const submit = async () => {
    try {
      const { user } = await completeProfileGoogle(idToken, username.trim(), address.trim());
      setUser(user);
      navigation.goBack();
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  submitBtn: { backgroundColor: "#f93414", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "800" },
});
