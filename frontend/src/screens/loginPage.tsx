import React, { useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Animated,
	Easing,
	Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/useAuth";
import { loginApi, loginWithGoogle } from "../api/client";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import { useNavigation } from "@react-navigation/native";

const ACCENT = "#f93414";

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
	const navigation = useNavigation<any>();
	const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest2?.extra || {};
	const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
	const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

	// Detect Expo Go vs Native (dev build/standalone)
	const isExpoGo = Constants.appOwnership === "expo";

	// Determine if Google auth is configured for current platform
	const googleReady = useMemo(() => {
		if (isExpoGo) return Boolean(expoClientId);
		if (Platform.OS === "ios") return Boolean(iosClientId);
		if (Platform.OS === "android") return Boolean(androidClientId);
		return Boolean(expoClientId);
	}, [isExpoGo, expoClientId, iosClientId, androidClientId]);

	const googleConfig = useMemo(() => {
		if (isExpoGo) {
			return { expoClientId } as const;
		}
		return { iosClientId, androidClientId } as const;
	}, [isExpoGo, expoClientId, iosClientId, androidClientId]);

	const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig as any);
	const insets = useSafeAreaInsets();
	const setUser = useAuth((s) => s.setUser);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPw, setShowPw] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [authError, setAuthError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Animations
	const emailFocusAnim = useRef(new Animated.Value(0)).current;
	const pwFocusAnim = useRef(new Animated.Value(0)).current;
	const loginScale = useRef(new Animated.Value(1)).current;
	const errorShake = useRef(new Animated.Value(0)).current;

	const emailBorderColor = emailFocusAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["#E5E7EB", ACCENT],
	});
	const pwBorderColor = pwFocusAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["#E5E7EB", ACCENT],
	});

	const triggerShake = () => {
		errorShake.setValue(0);
		Animated.sequence([
			Animated.timing(errorShake, { toValue: 1, duration: 50, useNativeDriver: true, easing: Easing.linear }),
			Animated.timing(errorShake, { toValue: -1, duration: 50, useNativeDriver: true, easing: Easing.linear }),
			Animated.timing(errorShake, { toValue: 1, duration: 50, useNativeDriver: true, easing: Easing.linear }),
			Animated.timing(errorShake, { toValue: 0, duration: 50, useNativeDriver: true, easing: Easing.linear }),
		]).start();
	};

	const login = async () => {
		setAuthError(null);
		// Basic client-side validation
		let ok = true;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setEmailError("이메일 형식이 올바르지 않습니다.");
			ok = false;
		} else {
			setEmailError(null);
		}
		if (password.length < 6) {
			setPasswordError("비밀번호는 6자 이상이어야 합니다.");
			ok = false;
		} else {
			setPasswordError(null);
		}
		if (!ok) {
			triggerShake();
			return;
		}
		try {
			setLoading(true);
			const { user } = await loginApi(email, password);
			setUser(user);
		} catch (e: any) {
			const msg = typeof e?.message === "string" ? e.message : "로그인에 실패했습니다.";
			setAuthError(msg);
			triggerShake();
		} finally {
			setLoading(false);
		}
	};

	const SocialButtons = () => (
		<View style={{ gap: 10 }}>
					<Pressable
						style={[
							styles.socialBtn,
							{ backgroundColor: "#fff", borderColor: "#4285F4", borderWidth: 1, opacity: request && googleReady ? 1 : 0.6 },
						]}
						disabled={!googleReady}
						onPress={async () => {
							try {
								if (!googleReady) {
									Alert.alert("구글 로그인 설정 필요", "환경변수에 Google Client ID를 설정해 주세요.");
									return;
								}
								const res = await promptAsync();
								if (res?.type === "success") {
									const idToken = (res as any)?.params?.id_token as string | undefined;
									if (!idToken) throw new Error("Google 인증 실패: id_token 없음");
									const { user } = await loginWithGoogle(idToken);
									if (!user || !user.username || !user.address) {
										(navigation as any).navigate("CompleteProfile", { idToken });
										return;
									}
									setUser(user);
								}
							} catch (e: any) {
								Alert.alert("Google 로그인 실패", e?.message || "다시 시도해 주세요");
							}
						}}
					> 
						<Text style={[styles.socialText, { color: "#4285F4" }]}>Google 계정으로 계속</Text>
					</Pressable>
			<Pressable style={[styles.socialBtn, { backgroundColor: "#000" }]} onPress={() => Alert.alert("Apple", "애플 로그인은 곧 제공됩니다.")}> 
				<Text style={[styles.socialText, { color: "#fff" }]}>Apple 계정으로 계속</Text>
			</Pressable>
			<Pressable style={[styles.socialBtn, { backgroundColor: "#FEE500" }]} onPress={() => Alert.alert("Kakao", "카카오 로그인은 곧 제공됩니다.")}> 
				<Text style={[styles.socialText, { color: "#111" }]}>카카오톡 계정으로 계속</Text>
			</Pressable>
			<Pressable style={[styles.socialBtn, { backgroundColor: "#03C75A" }]} onPress={() => Alert.alert("Naver", "네이버 로그인은 곧 제공됩니다.")}> 
				<Text style={[styles.socialText, { color: "#fff" }]}>네이버 계정으로 계속</Text>
			</Pressable>
		</View>
	);

	const onPressIn = () => Animated.spring(loginScale, { toValue: 0.96, useNativeDriver: true }).start();
	const onPressOut = () => Animated.spring(loginScale, { toValue: 1, useNativeDriver: true }).start();

	const errorTranslateX = errorShake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] });

	return (
		<KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
					<View style={styles.header}>
						<Text style={styles.brand}>CardTraders</Text>
						<Text style={styles.subtitle}>쉽고 안전한 카드 거래</Text>
					</View>

					{authError ? (
						<Animated.View style={[styles.errorBanner, { transform: [{ translateX: errorTranslateX }] }]}>
							<Text style={styles.errorText}>{authError}</Text>
						</Animated.View>
					) : null}

					<View style={{ gap: 14, width: "100%" }}>
						<Animated.View style={[styles.inputWrap, { borderColor: emailBorderColor }]}
						>
							<TextInput
								value={email}
								onChangeText={setEmail}
								placeholder="이메일"
								style={styles.input}
								keyboardType="email-address"
								autoCapitalize="none"
								onFocus={() => Animated.timing(emailFocusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start()}
								onBlur={() => Animated.timing(emailFocusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start()}
							/>
						</Animated.View>
						{emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

						<Animated.View style={[styles.inputWrap, { borderColor: pwBorderColor }]}
						>
							<TextInput
								value={password}
								onChangeText={setPassword}
								placeholder="비밀번호"
								style={styles.input}
								secureTextEntry={!showPw}
								onFocus={() => Animated.timing(pwFocusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start()}
								onBlur={() => Animated.timing(pwFocusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start()}
							/>
							<Pressable onPress={() => setShowPw((v) => !v)} accessibilityRole="button">
								<Text style={{ color: ACCENT, fontWeight: "700" }}>{showPw ? "숨기기" : "표시"}</Text>
							</Pressable>
						</Animated.View>
						{passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

						<Animated.View style={{ transform: [{ scale: loginScale }] }}>
							<Pressable
								onPressIn={onPressIn}
								onPressOut={onPressOut}
								onPress={login}
								disabled={loading}
								style={[styles.loginBtn, { opacity: loading ? 0.7 : 1 }]}
							>
								<Text style={styles.loginText}>{loading ? "로그인 중..." : "로그인"}</Text>
							</Pressable>
						</Animated.View>
					</View>

					<View style={styles.dividerRow}>
						<View style={styles.divider} />
						<Text style={styles.dividerText}>또는</Text>
						<View style={styles.divider} />
					</View>

					<SocialButtons />

					<View style={styles.signupRow}>
						<Text style={{ color: "#6B7280" }}>계정이 없으신가요?</Text>
						<Pressable onPress={() => (navigation as any).navigate('SignUp')}>
							<Text style={{ color: ACCENT, fontWeight: "700" }}>가입하기</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", paddingHorizontal: 20, gap: 24, backgroundColor: "#fff" },
	header: { width: "100%", marginTop: 8 },
	brand: { fontSize: 32, fontWeight: "800", color: "#111" },
	subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6 },
	inputWrap: {
		borderWidth: 2,
		borderColor: "#E5E7EB",
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		backgroundColor: "#fff",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	input: { flex: 1, fontSize: 16, paddingRight: 12 },
	fieldError: { color: "#DC2626", fontSize: 12, marginTop: -6, marginBottom: 4 },
	loginBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
	loginText: { color: "#fff", fontSize: 16, fontWeight: "800" },
	dividerRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
	divider: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
	dividerText: { color: "#6B7280", fontWeight: "700" },
	socialBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
	socialText: { fontWeight: "700" },
	signupRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
	errorBanner: { width: "100%", backgroundColor: "#FEE2E2", borderRadius: 12, padding: 12 },
	errorText: { color: "#B91C1C", fontWeight: "700" },
});

