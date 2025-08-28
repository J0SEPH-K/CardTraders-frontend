import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestPhoneCode, verifyPhoneCode, requestEmailCode, verifyEmailCode, signupApi } from "@/api/client";
import { useAuth } from "@/store/useAuth";

const ACCENT = "#f93414";

export default function SignUpPage() {
  const insets = useSafeAreaInsets();
  const setUser = useAuth((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailTimer, setEmailTimer] = useState<number>(0);
  const emailInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  const [countryCode, setCountryCode] = useState("+82");
  const [phone, setPhone] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState<number>(0);
  const phoneInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmit = useMemo(() => {
    return emailVerified && phoneVerified && username.trim() && password.trim() && address.trim();
  }, [emailVerified, phoneVerified, username, password, address]);

  useEffect(() => () => { if (emailInterval.current) clearInterval(emailInterval.current); if (phoneInterval.current) clearInterval(phoneInterval.current); }, []);

  const startTimer = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) => {
    setter(60);
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      setter((s) => {
        if (s <= 1) {
          if (ref.current) clearInterval(ref.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const requestPhone = async () => {
    // Disable immediately until timer expires
    startTimer(setPhoneTimer, phoneInterval);
    try {
      const r = await requestPhoneCode(countryCode, phone);
      setPhoneVerificationId(r.verificationId);
      setPhoneVerified(false);
      if (r.devCode) Alert.alert("개발용 코드", r.devCode);
    } catch (e: any) {
      // Keep disabled per requirement; user can retry after timer
      Alert.alert("오류", e?.message || "전화 인증 요청 실패");
    }
  };

  const checkPhone = async () => {
    try {
      if (!phoneVerificationId) return;
      await verifyPhoneCode(phoneVerificationId, phoneCode);
      setPhoneVerified(true);
      Alert.alert("인증 완료", "전화번호 인증이 완료되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e?.message || "인증 코드가 올바르지 않습니다.");
    }
  };

  const requestEmail = async () => {
    // Disable immediately until timer expires
    startTimer(setEmailTimer, emailInterval);
    try {
      const r = await requestEmailCode(email);
      setEmailVerificationId(r.verificationId);
      setEmailVerified(false);
      if (r.devCode) Alert.alert("개발용 코드", r.devCode);
    } catch (e: any) {
      // Keep disabled per requirement; user can retry after timer
      Alert.alert("오류", e?.message || "이메일 인증 요청 실패");
    }
  };

  const checkEmail = async () => {
    try {
      if (!emailVerificationId) return;
      await verifyEmailCode(emailVerificationId, emailCode);
      setEmailVerified(true);
      Alert.alert("인증 완료", "이메일 인증이 완료되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e?.message || "인증 코드가 올바르지 않습니다.");
    }
  };

  const doSignup = async () => {
    try {
      if (!emailVerificationId || !phoneVerificationId) return;
      const { user } = await signupApi({
        email,
        password,
        username,
        countryCode,
        phone,
        address,
        pfp_url: null,
        emailVerificationId,
        phoneVerificationId,
      });
      setUser(user);
    } catch (e: any) {
      Alert.alert("가입 실패", e?.message || "다시 시도해 주세요");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}> 
      <Text style={styles.title}>회원가입</Text>

      {/* Email */}
      <View style={styles.row}> 
        <TextInput value={email} onChangeText={setEmail} placeholder="이메일" style={[styles.input, { flex: 1 }]} autoCapitalize="none" keyboardType="email-address" />
        <Pressable style={[styles.actionBtn]} onPress={requestEmail} disabled={emailTimer>0}>
          <Text style={styles.actionText}>{emailTimer>0 ? `다시 요청 (${emailTimer}s)` : "인증 요청"}</Text>
        </Pressable>
      </View>
      <View style={styles.row}> 
        <TextInput value={emailCode} onChangeText={setEmailCode} placeholder="이메일 인증코드 6자리" style={[styles.input, { flex: 1 }]} keyboardType="number-pad" maxLength={6}/>
        <Pressable style={[styles.actionBtn, { backgroundColor: emailVerified ? "#16a34a" : ACCENT }]} onPress={checkEmail}>
          <Text style={[styles.actionText, { color: "#fff" }]}>{emailVerified ? "완료" : "확인"}</Text>
        </Pressable>
      </View>

      {/* Phone */}
      <View style={styles.row}> 
        <TextInput value={countryCode} onChangeText={setCountryCode} placeholder="국가코드" style={[styles.input, { width:90 }]} />
        <TextInput
          value={phone}
          onChangeText={(t) => {
            // If phone number changes after a successful verification, reset to enable inputs/buttons again
            if (phoneVerified) {
              setPhoneVerified(false);
              setPhoneCode("");
              setPhoneVerificationId(null);
            }
            setPhone(t);
          }}
          placeholder="전화번호"
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          keyboardType="phone-pad"
        />
        <Pressable style={[styles.actionBtn]} onPress={requestPhone} disabled={phoneTimer>0}>
          <Text style={styles.actionText}>{phoneTimer>0 ? `다시 요청 (${phoneTimer}s)` : "인증 요청"}</Text>
        </Pressable>
      </View>
      <View style={styles.row}> 
        <TextInput
          value={phoneCode}
          onChangeText={setPhoneCode}
          placeholder="전화 인증코드 6자리"
          style={[styles.input, { flex: 1, opacity: phoneVerified ? 0.5 : 1 }]}
          keyboardType="number-pad"
          maxLength={6}
          editable={!phoneVerified}
        />
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: phoneVerified ? "#16a34a" : ACCENT, opacity: phoneVerified ? 0.7 : 1 },
          ]}
          onPress={checkPhone}
          disabled={phoneVerified}
        >
          <Text style={[styles.actionText, { color: "#fff" }]}>{phoneVerified ? "완료" : "확인"}</Text>
        </Pressable>
      </View>

      {/* Profile basics */}
      <TextInput value={username} onChangeText={setUsername} placeholder="사용자명" style={styles.input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" style={styles.input} secureTextEntry />
      <TextInput value={address} onChangeText={setAddress} placeholder="주소" style={styles.input} />

      <Pressable style={[styles.submitBtn, { opacity: canSubmit ? 1 : 0.5 }]} disabled={!canSubmit} onPress={doSignup}>
        <Text style={styles.submitText}>가입하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  actionText: { fontWeight: "700", color: "#111827" },
  submitBtn: { backgroundColor: ACCENT, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "800" },
});
