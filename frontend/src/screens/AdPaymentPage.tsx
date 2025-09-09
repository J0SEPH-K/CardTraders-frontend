import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { advertiseUploadedCard, api } from '@/api/client';
import { useAuth } from '@/store/useAuth';

const TIERS = [
  { id: 'basic', label: 'Basic - 50 clicks (10,000원)', amount: 10000 },
  { id: 'standard', label: 'Standard - 100 clicks (19,000원)', amount: 19000 },
  { id: 'premium', label: 'Premium - 200 clicks (35,000원)', amount: 35000 },
];

export default function AdPaymentPage(){
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { cardId } = route.params || {};
  const user = useAuth((s)=>s.user);
  const [loading, setLoading] = useState(false);
  // orderId concept removed — we store only selected tier and proof locally
  const [showBankScreen, setShowBankScreen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);

  const choose = async (tier: any) => {
    if (!user?.userId) return Alert.alert('로그인 필요', '로그인 후 이용해 주세요.');
    setLoading(true);
    try {
  // No server-side order is created. Store selection locally and show bank screen.
  setSelectedTierId(tier.id);
  // keep optimistic advertise only in dev - production should wait for reconcile/admin approval
  try { if (__DEV__) await advertiseUploadedCard(cardId); } catch {}
  setShowBankScreen(true);
    } catch (e: any) {
      Alert.alert('결제 오류', e?.message || '결제 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const COMPANY_BANK_INFO = {
    bank: '국민은행',
    account: '43720104310085',
    holder: '카드트레이더스',
  };

  // allow deleting the shown bank info (user-requested UX)
  const [bankInfo, setBankInfo] = useState<any>(COMPANY_BANK_INFO);

  // copyAccount removed per UX change: no 참조 복사

  // markBankSent removed — no server-side order flow

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>뒤로</Text></Pressable>
        <Text style={styles.header}>광고 결제</Text>
        <View style={{ width: 48 }} />
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ marginBottom: 12 }}>선택한 카드 ID: {cardId}</Text>
        {showBankScreen && (
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12 }}>
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: '700' }}>계좌 이체 안내</Text>
            </View>
            {bankInfo ? (
              <>
                <Text style={{ marginBottom: 6 }}>은행: {bankInfo.bank}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Pressable onPress={() => {
                    Alert.alert('계좌 정보 삭제', '계좌 정보를 삭제하시겠습니까?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => { setBankInfo(null); Alert.alert('삭제됨', '계좌 정보가 삭제되었습니다.'); } },
                    ]);
                  }} style={{ padding: 6, marginRight: 8 }}>
                    <Text style={{ color: '#ef4444', fontWeight: '600' }}>삭제</Text>
                  </Pressable>
                  <Text style={{ fontWeight: '600', marginRight: 8 }}>계좌번호:</Text>
                  <Text>{bankInfo.account}</Text>
                </View>
                <Text>예금주: {bankInfo.holder}</Text>
              </>
            ) : (
              <Text style={{ color: '#6b7280' }}>계좌 정보가 없습니다.</Text>
            )}
            {/* copy button removed per request */}
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={async () => {
                // Ask for permission and open image picker
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) return Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
                try {
                  // pass native-expected mediaTypes as lowercase array to avoid runtime cast errors
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: false, base64: true, quality: 0.8 });
                  if (res.canceled) return;
                  const asset = (res as any).assets && (res as any).assets[0];
                  if (!asset || !asset.base64) return Alert.alert('오류', '이미지 인코딩 실패');
                  const mime = asset.type || 'image/jpeg';
                  const dataUrl = `data:${mime};base64,${asset.base64}`;
                  // Cache the selected proof locally. We'll upload when the user confirms (송금 완료).
                  setProofDataUrl(dataUrl);
                  setProofUploaded(true);
                  Alert.alert('선택됨', '영수증이 선택되었습니다. 송금 완료 시 서버로 업로드됩니다.');
                } catch (e: any) {
                  Alert.alert('오류', e?.message || '업로드 실패');
                }
              }} style={{ padding: 10, backgroundColor: '#f93414', borderRadius: 8 }}><Text style={{ color: '#fff' }}>영수증 업로드</Text></Pressable>
            </View>
            {proofUploaded && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#065f46', fontWeight: '600' }}>파일 업로드 됨</Text>
              </View>
            )}
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={async () => {
                try {
                  // Send the pending creation without an order id. Backend will store a pending_ad document.
                  const body: any = {
                    user_id: String(user?.userId || ''),
                    card_id: String(cardId || ''),
                    selected_option: selectedTierId ?? undefined,
                  };
                  if (proofDataUrl) body.proof_image = proofDataUrl;
                  await api(`/payments/pending`, { method: 'POST', body: JSON.stringify(body) });
                  Alert.alert('대기 등록', '송금 완료로 표시되어 검토 대기중입니다.');
                  navigation.navigate('AdvertiseSetup' as any, { refreshed: true });
                } catch (e: any) {
                  Alert.alert('오류', e?.message || '대기 등록 실패');
                }
              }} style={{ padding: 10, backgroundColor: '#0ea5b1', borderRadius: 8 }}><Text style={{ color: '#fff' }}>송금 완료</Text></Pressable>
            </View>
          </View>
        )}
        {TIERS.map((t) => (
          <Pressable key={t.id} onPress={() => choose(t)}>
            <View style={[styles.tier, selectedTierId === t.id ? styles.tierSelected : null]}>
              <Text style={{ fontWeight: '700' }}>{t.label}</Text>
              <Text style={{ color: '#6b7280' }}>{t.amount.toLocaleString()}원</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  back: { padding: 6 },
  backText: { color: '#111827' },
  header: { fontSize: 18, fontWeight: '700' },
  tier: { padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  tierSelected: { borderColor: '#0ea5b1', backgroundColor: '#ecfdf5' },
});
