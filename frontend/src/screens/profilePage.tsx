import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/store/useAuth';

type RootStackParamList = {
	Login: undefined;
	SignUp: undefined;
	Home: undefined;
	Settings: undefined;
	Announcements: undefined;
};

export default function ProfilePage() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const user = useAuth((s) => s.user);
	const logout = useAuth((s) => s.logout);

	const handleLogout = () => {
		// Clear auth state; navigation will reset via effect when user becomes null
		logout();
	};

	// When user becomes null, reset stack to Login once
	useEffect(() => {
		if (!user) {
			(navigation as any).reset({ index: 0, routes: [{ name: 'Login' }] });
		}
	}, [user, navigation]);

	const goSettings = () => navigation.navigate('Settings');
	const goAnnouncements = () => navigation.navigate('Announcements');

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
					<View style={styles.headerRow}>
						<Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} style={styles.backBtn}>
							<Text style={styles.backIcon}>‹</Text>
							<Text style={styles.backText}>뒤로</Text>
						</Pressable>
						<Text style={styles.headerTitle}>프로필</Text>
						<View style={{ width: 48 }} />
					</View>
				{/* Profile Card */}
				<View style={styles.card}>
					<View style={styles.accentBar} />
					<Image
						source={require('../assets/CardTradersLogo_Original.png')}
						style={styles.cardLogo}
						accessibilityIgnoresInvertColors
					/>
					<View style={styles.avatarBox}>
						{user?.pfp?.url ? (
							<Image source={{ uri: user.pfp.url }} style={styles.avatar} />
						) : (
							<Image source={require('../assets/CardTradersLogo_Original.png')} style={styles.avatar} />
						)}
					</View>
					<View style={styles.cardRight}>
						<View style={styles.infoSection}>
							<View style={styles.infoRow}>
								<Text style={styles.value}>트레이더: </Text>
								<Text style={styles.value}>{user?.username ?? '—'}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.value}>이메일: </Text>
								<Text style={styles.value}>{user?.email ?? '—'}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.value}>전화번호: </Text>
								<Text style={styles.value}>{user?.phone_num ?? '—'}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.value}>주소: </Text>
								<Text style={styles.value}>{user?.address ?? '—'}</Text>
							</View>
						</View>
					</View>

					<View style={styles.actionsRow}>
						<Pressable onPress={handleLogout} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[styles.chip, styles.secondaryChip]}>
							<Text style={[styles.chipText, styles.secondaryText]}>로그아웃</Text>
						</Pressable>
						<Pressable onPress={goSettings} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[styles.chip, styles.primaryChip] }>
							<Text style={[styles.chipText, styles.primaryText]}>프로필 수정</Text>
						</Pressable>
					</View>
				</View>

				{/* Settings button */}
				<Pressable onPress={goSettings} style={styles.listButton}>
					<Text style={styles.listButtonText}>앱 설정</Text>
					<Text style={styles.listButtonArrow}>›</Text>
				</Pressable>

				{/* Grouped buttons */}
				<View style={styles.group}>
					<Pressable onPress={goAnnouncements} style={[styles.groupItem, styles.groupTop] }>
						<Text style={styles.groupText}>공지사항</Text>
						<Text style={styles.listButtonArrow}>›</Text>
					</Pressable>
					<View style={styles.groupDivider} />
					<Pressable onPress={() => Alert.alert('고객센터', '준비 중입니다.')} style={styles.groupItem}>
						<Text style={styles.groupText}>고객센터</Text>
						<Text style={styles.listButtonArrow}>›</Text>
					</Pressable>
					<View style={styles.groupDivider} />
					<Pressable onPress={() => Alert.alert('의견 남기기', '준비 중입니다.')} style={[styles.groupItem, styles.groupBottom] }>
						<Text style={styles.groupText}>의견 남기기</Text>
						<Text style={styles.listButtonArrow}>›</Text>
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	);
}

const ACCENT = '#f93414';

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#fff' },
	container: { flex: 1, padding: 16, gap: 16 },
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 8 },
	backIcon: { fontSize: 24, color: '#111827' },
	backText: { fontSize: 16, color: '#111827' },
	headerTitle: { fontSize: 18, fontWeight: '600' },
	card: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		minHeight: 180,
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#e5e7eb',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 2,
	},
	accentBar: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: 32,
		backgroundColor: ACCENT,
	},
	cardLogo: {
		position: 'absolute',
		top: 4,
		right: 4,
		width: 24,
		height: 24,
		resizeMode: 'contain',
		tintColor: '#ffffff',
		zIndex: 2,
		opacity: 0.95,
	},
	avatarBox: {
		width: 120, // fixed area for the picture
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatar: {
		width: 100,
		height: 130,
		borderRadius: 12,
		marginRight: 0,
		marginLeft: 0,
		alignSelf: 'center', // vertical center
		resizeMode: 'contain',
		backgroundColor: '#ffffff',
	},
	cardRight: { flex: 1, paddingLeft: 40, justifyContent: 'center' }, // center info vertically
	infoSection: { gap: 6 },
	infoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
	label: { fontSize: 11, color: '#6b7280' },
	value: { fontSize: 14, color: '#111827' },
	actionsRow: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 8,
	},
	chip: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
	},
	primaryChip: { borderColor: ACCENT, backgroundColor: '#fff' },
	secondaryChip: { borderColor: '#d1d5db', backgroundColor: '#fff' },
	chipText: { fontSize: 10 },
	primaryText: { color: ACCENT, fontWeight: '600' },
	secondaryText: { color: '#374151' },

	listButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	listButtonText: { fontSize: 16, color: '#111827' },
	listButtonArrow: { fontSize: 22, color: '#9ca3af' },

	group: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		overflow: 'hidden',
	},
	groupItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#fff',
	},
	groupTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
	groupBottom: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
	groupDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb' },
	groupText: { fontSize: 16, color: '#111827' },
});

