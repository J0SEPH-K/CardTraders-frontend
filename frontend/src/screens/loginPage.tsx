import React, { useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Pressable,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Animated,
	Easing,
	Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/useAuth";
import { loginApi, loginWithGoogle, acceptTermsAndConditions } from "../api/client";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import { useNavigation } from "@react-navigation/native";
import { FontAwesome } from '@expo/vector-icons';
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";

const ACCENT = "#f93414";
// When true, social auth UI is visually disabled and not clickable (beta mode)
const SOCIAL_DISABLED = true;

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
	const navigation = useNavigation<any>();
	const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest2?.extra || {};
	const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
	const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

	// Debug: log environment and redirect URIs
	React.useEffect(() => {
		if (typeof __DEV__ !== "undefined" && __DEV__) {
			try {
				const redirectDefault = AuthSession.makeRedirectUri();
				console.log("[GoogleAuth] config", {
					appOwnership: Constants.appOwnership,
					scheme: (Constants as any)?.expoConfig?.scheme,
					expoClientId: Boolean(expoClientId),
					iosClientId: Boolean(iosClientId),
					androidClientId: Boolean(androidClientId),
					redirectDefault,
				});
			} catch (e) {
				console.log("[GoogleAuth] debug error", e);
			}
		}
	}, [expoClientId, iosClientId, androidClientId]);
	const insets = useSafeAreaInsets();
	const setUser = useAuth((s) => s.setUser);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPw, setShowPw] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [authError, setAuthError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showTermsModal, setShowTermsModal] = useState(false);
	const [pendingUser, setPendingUser] = useState<any>(null);

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

	const checkTermsAndSetUser = (user: any) => {
		// Check if user has accepted terms and conditions
		if (!user?.terms_and_conditions) {
			// User hasn't accepted terms, show modal
			setPendingUser(user);
			setShowTermsModal(true);
		} else {
			// User has already accepted terms, proceed with login
			setUser(user);
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
		} catch (e: any) {
			Alert.alert("오류", "약관 동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
		}
	};	const handleDeclineTerms = () => {
		setShowTermsModal(false);
		setPendingUser(null);
		Alert.alert("알림", "약관에 동의하셔야 서비스를 이용하실 수 있습니다.");
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
			
			// Debug logging for login response
			if (typeof __DEV__ !== "undefined" && __DEV__) {
				console.log("[DEBUG] Login response user:", JSON.stringify(user, null, 2));
				console.log("[DEBUG] User favorites from login:", user?.favorites);
			}
			
			checkTermsAndSetUser(user);
		} catch (e: any) {
			const msg = typeof e?.message === "string" ? e.message : "로그인에 실패했습니다.";
			setAuthError(msg);
			triggerShake();
		} finally {
			setLoading(false);
		}
	};

	// Subcomponent that only mounts when required client IDs exist; keeps hooks order valid
	const SocialButtonsReady: React.FC = () => {
		const isExpoGo = Constants.appOwnership === "expo";
		// Build a proxied redirect for Expo Go so Google gets an https://auth.expo.dev URL (hardcoded to match console)
		const proxyRedirectUri = "https://auth.expo.dev/@jungjunkim/cardtraders";
		const googleRequestConfig: any = isExpoGo
			? { clientId: expoClientId, redirectUri: proxyRedirectUri }
			: { iosClientId, androidClientId };
		const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleRequestConfig);
		return (
				<View style={styles.socialRowContainer}>
					<View style={styles.socialRow}>
			<Pressable
				style={[styles.socialIconBtn, { backgroundColor: "#fff", borderColor: "#4285F4", borderWidth: 1, opacity: request ? 1 : 0.6 }]}
						onPress={async () => {
						try {
							if (typeof __DEV__ !== "undefined" && __DEV__) {
								console.log("[GoogleAuth] request", {
									isExpoGo,
									requestRedirectUri: (request as any)?.redirectUri,
									proxyRedirectUri,
									usingClientKey: Object.keys(googleRequestConfig),
								});
							}
							// Force proxy usage in Expo Go to avoid exp:// redirect rejections
							const res = await (promptAsync as any)({ useProxy: isExpoGo, projectNameForProxy: "@jungjunkim/cardtraders" });
							if (res?.type === "success") {
								const idToken = (res as any)?.params?.id_token as string | undefined;
								if (!idToken) throw new Error("Google 인증 실패: id_token 없음");
								const { user } = await loginWithGoogle(idToken);
								if (!user || !user.username || !user.address) {
									(navigation as any).navigate("CompleteProfile", { idToken });
									return;
								}
								checkTermsAndSetUser(user);
							} else {
								if (typeof __DEV__ !== "undefined" && __DEV__) {
									console.log("[GoogleAuth] prompt result", res);
								}
								const err = (res as any)?.error || (res as any)?.params?.error;
								const desc = (res as any)?.params?.error_description || (res as any)?.error_description;
								if (err) {
									Alert.alert("Google 로그인 실패", `${err}${desc ? `: ${desc}` : ""}`);
								}
							}
						} catch (e: any) {
							Alert.alert("Google 로그인 실패", e?.message || "다시 시도해 주세요");
						}
					}}
				>
					<FontAwesome name="google" size={20} color="#4285F4" />
				</Pressable>
				<Pressable style={[styles.socialIconBtn, { backgroundColor: "#000" }]} onPress={() => Alert.alert("Apple", "애플 로그인은 곧 제공됩니다.")}> 
					<FontAwesome name="apple" size={20} color="#fff" />
				</Pressable>
				<Pressable style={[styles.socialIconBtn, { backgroundColor: "#FEE500" }]} onPress={() => Alert.alert("Kakao", "카카오 로그인은 곧 제공됩니다.")}> 
					<Text style={[styles.socialIconText, { fontWeight: '700' }]}>카</Text>
				</Pressable>
				<Pressable style={[styles.socialIconBtn, { backgroundColor: "#03C75A" }]} onPress={() => Alert.alert("Naver", "네이버 로그인은 곧 제공됩니다.")}> 
					<Text style={[styles.socialIconText, { fontWeight: '700', color: '#fff' }]}>N</Text>
				</Pressable>
				</View>

			</View>
		);
	};

	const SocialButtons: React.FC = () => {
		const isExpoGo = Constants.appOwnership === "expo";
		const ready = isExpoGo
			? Boolean(expoClientId)
			: Platform.OS === "ios"
			? Boolean(iosClientId)
			: Platform.OS === "android"
			? Boolean(androidClientId)
			: Boolean(expoClientId);
		if (!ready) {
			return (
				<View style={styles.socialRowContainer}>
					<View style={styles.socialRow}>
					<Pressable
						style={[styles.socialIconBtn, { backgroundColor: "#fff", borderColor: "#4285F4", borderWidth: 1, opacity: 0.5 }]}
						onPress={() => Alert.alert("구글 로그인 설정 필요", "환경변수 또는 app.json extra에 Google Client ID를 설정 후 앱을 다시 빌드/재시작하세요.")}
					>
					<FontAwesome name="google" size={20} color="#4285F4" />
					</Pressable>
					<Pressable style={[styles.socialIconBtn, { backgroundColor: "#000" }]} onPress={() => Alert.alert("Apple", "애플 로그인은 곧 제공됩니다.")}> 
				<FontAwesome name="apple" size={20} color="#fff" />
					</Pressable>
					<Pressable style={[styles.socialIconBtn, { backgroundColor: "#FEE500" }]} onPress={() => Alert.alert("Kakao", "카카오 로그인은 곧 제공됩니다.")}> 
				<Text style={[styles.socialIconText, { fontWeight: '700' }]}>카</Text>
					</Pressable>
					<Pressable style={[styles.socialIconBtn, { backgroundColor: "#03C75A" }]} onPress={() => Alert.alert("Naver", "네이버 로그인은 곧 제공됩니다.")}> 
				<Text style={[styles.socialIconText, { fontWeight: '700', color: '#fff' }]}>N</Text>
					</Pressable>
					</View>

				</View>
				);
		}
		return <SocialButtonsReady />;
	};

	const onPressIn = () => Animated.spring(loginScale, { toValue: 0.96, useNativeDriver: true }).start();
	const onPressOut = () => Animated.spring(loginScale, { toValue: 1, useNativeDriver: true }).start();

	const errorTranslateX = errorShake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] });

	return (
		<KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FAF9F6" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<View style={[styles.container, { paddingTop: 0, paddingBottom: insets.bottom + 24, justifyContent: 'center' }]}> 
					{/* header removed — content centered below */}

					{authError ? (
						<Animated.View style={[styles.errorBanner, { transform: [{ translateX: errorTranslateX }] }]}>
							<Text style={styles.errorText}>{authError}</Text>
						</Animated.View>
					) : null}

					<View style={{ gap: 14, width: "100%" }}>
						<Image source={require('../assets/CardTradersLogo_Original.png')} style={styles.cardLogo} />
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

					<View style={styles.socialAndSignupContainer}>
						<SocialButtons />

						<View style={styles.signupRow}>
							<Text style={{ color: "#6B7280" }}>계정이 없으신가요?</Text>
							<Pressable onPress={() => (navigation as any).navigate('SignUp')}>
								<Text style={{ color: ACCENT, fontWeight: "700" }}>가입하기</Text>
							</Pressable>
						</View>

						{SOCIAL_DISABLED ? (
							<View pointerEvents="auto" style={styles.socialOverlay}>
								<Text style={styles.socialOverlayText}>베타 모드 — 사용 불가</Text>
							</View>
						) : null}
					</View>
				</View>
			</ScrollView>
			
			<TermsAndConditionsModal
				visible={showTermsModal}
				onAccept={handleAcceptTerms}
				onDecline={handleDeclineTerms}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", paddingHorizontal: 20, gap: 24, backgroundColor: "#FAF9F6" },
	socialRow: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
	socialIconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
	socialIconText: { fontSize: 18, color: '#111' },
	header: { width: "100%", marginTop: 8 },
	brand: { fontSize: 32, fontWeight: "800", color: "#111" },
	subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6 },
	inputWrap: {
		borderWidth: 2,
		borderColor: "#E5E7EB",
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		height: 56, // fixed height to prevent layout shift when typing
		backgroundColor: "#FAF9F6",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
    input: { flex: 1, fontSize: 16, paddingRight: 12, height: '100%', textAlignVertical: 'center', includeFontPadding: false },
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
	cardLogo: { width: 300, height: 140, alignSelf: 'center', resizeMode: 'contain', marginTop: -40, marginBottom: 60 },
	socialRowContainer: { width: '100%', alignItems: 'center', justifyContent: 'center' },
	socialOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	socialOverlayText: { color: '#374151', fontWeight: '700' },
	socialAndSignupContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
});

