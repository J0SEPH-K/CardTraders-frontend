import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, Image, Alert, ScrollView, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { requestPhoneCode, verifyPhoneCode, requestEmailCode, verifyEmailCode, API_BASE } from '@/api/client';

type Props = {
  visible: boolean;
  onClose: () => void;
  initial?: {
    username?: string | null;
    email?: string | null;
    phone_num?: string | null;
    address?: string | null;
    pfpUrl?: string | null;
  };
  onSave?: (data: {
    username: string;
  email: string;
    phone_num: string;
    address: string;
    // If user selected a new image, provide it
    pfpImage?: { uri: string; base64?: string } | null;
  }) => void | Promise<void>;
};

const ACCENT = '#f93414';

export default function EditCardModal({ visible, onClose, initial, onSave }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [emailTimer, setEmailTimer] = useState<number>(0);
  const emailInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [phoneTimer, setPhoneTimer] = useState<number>(0);
  const phoneInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [address, setAddress] = useState('');
  const [pfpUri, setPfpUri] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  // Prefer prop value on first render to avoid fallback-icon flicker
  // If initial pfp is a relative backend URL, prefix with API_BASE for display
  const initialPfp = (initial?.pfpUrl ?? undefined) as string | undefined;
  const resolvedInitialPfp = initialPfp && !/^https?:\/\//i.test(initialPfp) ? `${API_BASE}${initialPfp}` : initialPfp;
  const effectivePfpUri = pfpUri ?? resolvedInitialPfp;

  // Unfold-down animation state
  const backdropAnim = useRef(new Animated.Value(0)).current; // 0 -> 1
  const heightAnim = useRef(new Animated.Value(0)).current; // 0 -> content height
  const contentOpacity = useRef(new Animated.Value(0)).current; // 0 -> 1
  const cardOpacity = useRef(new Animated.Value(0)).current; // hide card until ready
  const [contentMeasuredH, setContentMeasuredH] = useState<number | null>(null);
  const [revealReady, setRevealReady] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
  // Reset unfold animation state on open
  backdropAnim.setValue(0);
  heightAnim.setValue(0);
  contentOpacity.setValue(0);
  cardOpacity.setValue(0);
  setContentMeasuredH(null);
  setRevealReady(false);
    setUsername((initial?.username ?? '') as string);
    // Initialize email
    const initEmail = (initial?.email ?? '') as string;
    setEmail(initEmail);
    setEmailVerified(true);
    setEmailCode('');
    setEmailVerificationId(null);
    setEmailTimer(0);
    if (emailInterval.current) { clearInterval(emailInterval.current); emailInterval.current = null; }

    // Initialize phone and country code
    const initPhone = (initial?.phone_num ?? '') as string;
    if (initPhone && /^\+\d{1,3}/.test(initPhone)) {
      const m = initPhone.match(/^(\+\d{1,3})\s*(.*)$/);
      if (m) {
        setCountryCode(m[1]);
        setPhone(m[2].replace(/^[\s-]+/, ''));
      } else {
        setCountryCode('+82');
        setPhone(initPhone);
      }
    } else {
      setCountryCode('+82');
      setPhone(initPhone);
    }
    setPhoneVerified(true);
    setPhoneCode('');
    setPhoneVerificationId(null);
    setPhoneTimer(0);
    if (phoneInterval.current) { clearInterval(phoneInterval.current); phoneInterval.current = null; }
  setAddress((initial?.address ?? '') as string);
  // Reset picked image so we re-derive from initial (resolved with API_BASE) on each open
  setPfpUri(undefined);
  }, [visible]);

  useEffect(() => () => {
    if (emailInterval.current) clearInterval(emailInterval.current);
    if (phoneInterval.current) clearInterval(phoneInterval.current);
  }, []);

  const pickImage = async () => {
    const pick = async () => {
      const base = {
        quality: 1,
        base64: false,
        allowsEditing: true,
        aspect: [4, 5] as [number, number],
        exif: false,
      };
      // iOS native expects Array<MediaType> like ['images'] instead of enum
      const opts = Platform.OS === 'ios'
        ? ({ ...base, mediaTypes: ['images'] } as any)
        : ({ ...base, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      return ImagePicker.launchImageLibraryAsync(opts as any);
    };
    try {
      const res = await pick();
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setPfpUri(manipulated.uri || asset.uri);
      } catch {
        setPfpUri(asset.uri);
      }
    } catch (err: any) {
      try {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (req.granted) {
          const res = await pick();
          if (!res.canceled) {
            const asset = res.assets?.[0];
            if (asset?.uri) {
              try {
                const manipulated = await ImageManipulator.manipulateAsync(
                  asset.uri,
                  [{ resize: { width: 600 } }],
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                setPfpUri(manipulated.uri || asset.uri);
              } catch {
                setPfpUri(asset.uri);
              }
            }
          }
          return;
        }
      } catch {}
      const msg = typeof err?.message === 'string' ? err.message : '';
      Alert.alert('오류', `사진을 불러오지 못했습니다.${msg ? `\n${msg}` : ''}`);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('입력 오류', '사용자명을 입력해주세요.');
      return;
    }
    // Enforce verification if value changed from initial
    const emailChanged = (email || '').trim() !== ((initial?.email || '') as string).trim();
    const phoneCombined = `${countryCode}${phone || ''}`.trim();
    const initPhoneCombined = (() => {
      const s = ((initial?.phone_num || '') as string).trim();
      if (!s) return '';
      const m = s.match(/^(\+\d{1,3})\s*(.*)$/);
      return m ? `${m[1]}${m[2].replace(/^[\s-]+/, '')}` : s;
    })();
    const phoneChanged = phoneCombined !== initPhoneCombined;
    if (emailChanged && !emailVerified) {
      Alert.alert('인증 필요', '이메일 변경 시 인증이 필요합니다. 인증을 완료해주세요.');
      return;
    }
    if (phoneChanged && !phoneVerified) {
      Alert.alert('인증 필요', '전화번호 변경 시 인증이 필요합니다. 인증을 완료해주세요.');
      return;
    }
    try {
      setSaving(true);
      await onSave?.({
        username: username.trim(),
        email: email.trim(),
  phone_num: `${countryCode} ${phone.trim()}`,
        address: address.trim(),
        pfpImage: pfpUri ? { uri: pfpUri } : null,
      });
      onClose();
    } catch (e) {
      Alert.alert('저장 실패', '프로필 저장 중 문제가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Timer helper
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

  // Email verification flows
  const requestEmail = async () => {
    startTimer(setEmailTimer, emailInterval);
    try {
      const r = await requestEmailCode(email.trim());
      setEmailVerificationId(r.verificationId);
      setEmailVerified(false);
      if ((r as any).devCode) Alert.alert('개발용 코드', String((r as any).devCode));
    } catch (e: any) {
      Alert.alert('오류', e?.message || '이메일 인증 요청 실패');
    }
  };
  const checkEmail = async () => {
    try {
      if (!emailVerificationId) return;
      await verifyEmailCode(emailVerificationId, emailCode);
      setEmailVerified(true);
      Alert.alert('인증 완료', '이메일 인증이 완료되었습니다.');
    } catch (e: any) {
      Alert.alert('오류', e?.message || '인증 코드가 올바르지 않습니다.');
    }
  };

  // Phone verification flows
  const requestPhone = async () => {
    startTimer(setPhoneTimer, phoneInterval);
    try {
      const r = await requestPhoneCode(countryCode, phone.trim());
      setPhoneVerificationId(r.verificationId);
      setPhoneVerified(false);
      if ((r as any).devCode) Alert.alert('개발용 코드', String((r as any).devCode));
    } catch (e: any) {
      Alert.alert('오류', e?.message || '전화 인증 요청 실패');
    }
  };
  const checkPhone = async () => {
    try {
      if (!phoneVerificationId) return;
      await verifyPhoneCode(phoneVerificationId, phoneCode);
      setPhoneVerified(true);
      Alert.alert('인증 완료', '전화번호 인증이 완료되었습니다.');
    } catch (e: any) {
      Alert.alert('오류', e?.message || '인증 코드가 올바르지 않습니다.');
    }
  };

  const onMeasureLayout = (e: any) => {
    if (!visible) return;
    const h = e?.nativeEvent?.layout?.height ?? 0;
    if (!h) return;
    if (contentMeasuredH == null) {
      setContentMeasuredH(h);
      setRevealReady(true);
      // Animate backdrop + height (unfold) + content opacity in parallel
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(heightAnim, { toValue: h, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
  Animated.timing(cardOpacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }
  };

  // Fade-out close animation helper
  const fadeOutAndClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      closingRef.current = false;
      onClose();
    });
  };

  return (
  <Modal visible={visible} animationType="none" transparent onRequestClose={fadeOutAndClose}>
      <SafeAreaView style={styles.modalRoot}>
        {/* Animated backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        {/* Tap interceptor on top of animated backdrop */}
    <Pressable style={[styles.backdrop, { backgroundColor: 'transparent' }]} onPress={fadeOutAndClose} />
  <Animated.View style={[styles.card, { opacity: cardOpacity }]}>
          <View style={styles.accentBar} />
          <Image
            source={require('../assets/CardTradersLogo_Original.png')}
            style={styles.cardLogo}
            accessibilityIgnoresInvertColors
          />
          {/* Hidden measure pass: render content invisibly to obtain full height */}
          {!revealReady && (
            <View style={styles.measureWrap} pointerEvents="none" onLayout={onMeasureLayout}>
              <View style={styles.cardContent}>
                {/* duplicated content for measurement */}
                <View style={styles.avatarBox}>
                  <Image source={effectivePfpUri ? { uri: effectivePfpUri } : require('../assets/CardTradersLogo_Original.png')} style={styles.avatarBig} />
                  <Pressable style={styles.changePhotoBtn}>
                    <Text style={styles.changePhotoText}>사진 변경</Text>
                  </Pressable>
                </View>

                {/* Email */}
                <View style={styles.field}>
                  <Text style={styles.label}>이메일</Text>
                  <View style={styles.row}>
                    <TextInput value={email} placeholder="이메일" style={[styles.input, { flex: 1 }]} />
                    <View style={[styles.actionBtn]}>
                      <Text style={styles.actionText}>인증 요청</Text>
                    </View>
                  </View>
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <TextInput value={emailCode} placeholder="이메일 인증코드 6자리" style={[styles.input, { flex: 1 }]} />
                    <View style={[styles.actionBtn]}>
                      <Text style={[styles.actionText]}>확인</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>사용자명</Text>
                  <TextInput value={username} placeholder="이름" style={styles.input} />
                </View>

                {/* Phone */}
                <View style={styles.field}>
                  <Text style={styles.label}>전화번호</Text>
                  <View style={styles.row}>
                    <TextInput value={countryCode} style={[styles.input, { width: 90 }]} />
                    <TextInput value={phone} style={[styles.input, { flex: 1 }]} />
                    <View style={[styles.actionBtn]}>
                      <Text style={styles.actionText}>인증 요청</Text>
                    </View>
                  </View>
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <TextInput value={phoneCode} style={[styles.input, { flex: 1 }]} />
                    <View style={[styles.actionBtn]}>
                      <Text style={[styles.actionText]}>확인</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>주소</Text>
                  <TextInput value={address} placeholder="주소" style={styles.input} multiline />
                </View>

                <View style={styles.btnRow}>
                  <View style={[styles.btn, styles.cancelBtn]}>
                    <Text style={[styles.btnText, styles.cancelText]}>취소</Text>
                  </View>
                  <View style={[styles.btn, styles.saveBtn]}>
                    <Text style={[styles.btnText, styles.saveText]}>저장</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          {/* Unfold reveal container: height anim from 0 -> measured content height */}
          <Animated.View style={[
            styles.reveal,
            revealReady
              ? { height: heightAnim as any, opacity: contentOpacity as any }
              : { height: 0, opacity: 0 }
          ]}>
            <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
            <View style={styles.avatarBox}>
              <Image source={effectivePfpUri ? { uri: effectivePfpUri } : require('../assets/CardTradersLogo_Original.png')} style={styles.avatarBig} />
              <Pressable style={styles.changePhotoBtn} onPress={pickImage}>
                <Text style={styles.changePhotoText}>사진 변경</Text>
              </Pressable>
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>이메일</Text>
              <View style={styles.row}>
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    const init = (initial?.email || '') as string;
                    setEmail(t);
                    if (t.trim() !== init.trim()) {
                      setEmailVerified(false);
                      setEmailCode('');
                      setEmailVerificationId(null);
                    } else {
                      setEmailVerified(true);
                    }
                  }}
                  placeholder="이메일"
                  style={[styles.input, { flex: 1 }]} autoCapitalize="none" keyboardType="email-address"
                />
                <Pressable style={[styles.actionBtn]} onPress={requestEmail} disabled={emailTimer>0}>
                  <Text style={styles.actionText}>{emailTimer>0 ? `다시 요청 (${emailTimer}s)` : '인증 요청'}</Text>
                </Pressable>
              </View>
              <View style={[styles.row, { marginTop: 6 }]}>
                <TextInput
                  value={emailCode}
                  onChangeText={setEmailCode}
                  placeholder="이메일 인증코드 6자리"
                  style={[styles.input, { flex: 1, opacity: emailVerified ? 0.5 : 1 }]} keyboardType="number-pad" maxLength={6}
                  editable={!emailVerified}
                />
                <Pressable style={[styles.actionBtn, { backgroundColor: emailVerified ? '#16a34a' : ACCENT, opacity: emailVerified ? 0.7 : 1 }]} onPress={checkEmail} disabled={emailVerified}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>{emailVerified ? '완료' : '확인'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>사용자명</Text>
              <TextInput value={username} onChangeText={setUsername} placeholder="이름" style={styles.input} />
            </View>
            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>전화번호</Text>
              <View style={styles.row}>
                <TextInput value={countryCode} onChangeText={(t)=>{
                  setCountryCode(t);
                  const initCombined = ((initial?.phone_num || '') as string).trim();
                  const currentCombined = `${t}${phone}`.trim();
                  if (initCombined !== currentCombined) {
                    setPhoneVerified(false); setPhoneCode(''); setPhoneVerificationId(null);
                  } else {
                    setPhoneVerified(true);
                  }
                }} placeholder="국가코드" style={[styles.input, { width: 90 }]} />
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    const initCombined = ((initial?.phone_num || '') as string).trim();
                    const currentCombined = `${countryCode}${t}`.trim();
                    if (initCombined !== currentCombined) {
                      setPhoneVerified(false); setPhoneCode(''); setPhoneVerificationId(null);
                    } else {
                      setPhoneVerified(true);
                    }
                  }}
                  placeholder="전화번호"
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="phone-pad"
                />
                <Pressable style={[styles.actionBtn]} onPress={requestPhone} disabled={phoneTimer>0}>
                  <Text style={styles.actionText}>{phoneTimer>0 ? `다시 요청 (${phoneTimer}s)` : '인증 요청'}</Text>
                </Pressable>
              </View>
              <View style={[styles.row, { marginTop: 6 }]}>
                <TextInput
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  placeholder="전화 인증코드 6자리"
                  style={[styles.input, { flex: 1, opacity: phoneVerified ? 0.5 : 1 }]} keyboardType="number-pad" maxLength={6}
                  editable={!phoneVerified}
                />
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: phoneVerified ? '#16a34a' : ACCENT, opacity: phoneVerified ? 0.7 : 1 }]}
                  onPress={checkPhone}
                  disabled={phoneVerified}
                >
                  <Text style={[styles.actionText, { color: '#fff' }]}>{phoneVerified ? '완료' : '확인'}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>주소</Text>
              <TextInput value={address} onChangeText={setAddress} placeholder="주소" style={styles.input} multiline />
            </View>

              <View style={styles.btnRow}>
                <Pressable style={[styles.btn, styles.cancelBtn]} onPress={fadeOutAndClose} disabled={saving}>
                  <Text style={[styles.btnText, styles.cancelText]}>취소</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                  <Text style={[styles.btnText, styles.saveText]}>{saving ? '저장 중…' : '저장'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 75 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    width: '92%',
    maxWidth: 460,
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderWidth: 3,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  alignSelf: 'center',
  },
  measureWrap: { position: 'absolute', left: -9999, right: 0, top: -9999, opacity: 0 },
  reveal: { overflow: 'hidden' },
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
    opacity: 0.95,
  },
  cardContent: { paddingBottom: 6 },
  avatarBox: { alignItems: 'center', marginBottom: 12 },
  avatarBig: { width: 120, height: 150, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  changePhotoBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: ACCENT, backgroundColor: '#FAF9F6' },
  changePhotoText: { color: ACCENT, fontWeight: '600' },
  field: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  actionText: { fontWeight: '700', color: '#111827' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  saveBtn: { backgroundColor: ACCENT },
  btnText: { fontWeight: '700' },
  cancelText: { color: '#111827' },
  saveText: { color: '#fff' },
});
