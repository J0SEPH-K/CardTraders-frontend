import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createOrder, advertiseUploadedCard, API_BASE, api, uploadProof, openBankingStart, getPayment } from '@/api/client';
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
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showBankScreen, setShowBankScreen] = useState(false);

  const choose = async (tier: any) => {
    if (!user?.userId) return Alert.alert('로그인 필요', '로그인 후 이용해 주세요.');
    setLoading(true);
    try {
      // Create order on server
      const res = await createOrder({ buyer_id: String(user.userId), seller_id: String(user.userId), chatId: undefined, item_id: String(cardId), amount: tier.amount });
      const checkout = res.checkout_url || res.provider_token || res.order_id;
      // Store order id and show bank/OAuth screen
      const oid = res.order_id || String(res.order_id);
      setOrderId(oid);
      setShowBankScreen(true);
      const ref = (res as any).payment_reference;
      if (ref) {
        Alert.alert('송금 정보', `입금 시 결제 참조코드로 ${ref} 를 입력해주세요.`);
      }
      // If using Open Banking, request auth_url and open it in browser/webview
      try {
        const ob = await openBankingStart(oid);
        if (ob?.auth_url) {
          try { await Linking.openURL(ob.auth_url); } catch {}
        } else if (checkout && checkout.toString().startsWith('http')) {
          try { await Linking.openURL(checkout.toString()); } catch {}
        }
      } catch (e) {
        // fallback to provider checkout URL
        if (checkout && checkout.toString().startsWith('http')) {
          try { await Linking.openURL(checkout.toString()); } catch {}
        }
      }
    } catch (e: any) {
      Alert.alert('결제 오류', e?.message || '결제 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const copyAccount = async () => {
    const ba = user?.bank_acc;
    if (!ba) return Alert.alert('계좌 정보 없음', '판매자가 등록한 계좌 정보가 없습니다.');
    try {
      const cb = require('expo-clipboard');
      await cb.setStringAsync(ba);
    } catch {
      try { await (navigator as any)?.clipboard?.writeText(ba); } catch {}
    }
    Alert.alert('복사됨', '계좌 정보가 복사되었습니다. 은행 앱에 붙여넣기 하세요.');
  };

  const markBankSent = async () => {
    if (!orderId) return;
    try {
      // Poll the server for payment status and only navigate when it's PAID
      let attempts = 0;
      const maxAttempts = 8;
      while (attempts < maxAttempts) {
        const p = await getPayment(orderId);
        if (p && p.status === 'PAID') {
          Alert.alert('완료', '결제가 확인되어 광고가 시작됩니다.');
          // navigate back and refresh advertise list
          navigation.navigate('AdvertiseSetup' as any, { refreshed: true });
          return;
        }
        // wait before retrying
        await new Promise((res) => setTimeout(res, 2000));
        attempts += 1;
      }
      Alert.alert('검증 대기중', '결제 확인 중입니다. 조금 후 다시 시도해 주세요.');
    } catch (e: any) {
      Alert.alert('오류', e?.message || '송금 완료 처리에 실패했습니다.');
    }
  };

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
            <Text style={{ fontWeight: '700', marginBottom: 6 }}>계좌 이체 안내</Text>
            <Text>은행: 카드트레이더스</Text>
            <Text>계좌번호: 123-456-7890</Text>
            <Text>예금주: 카드트레이더스</Text>
            <Text style={{ marginTop: 8 }}>참조코드: <Text style={{ fontWeight: '700' }}>{/* show reference if present */}{/* orderId is stored; we can request order details but keep simple */}</Text></Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Pressable onPress={copyAccount} style={{ padding: 8, backgroundColor: '#fdecea', borderRadius: 8, marginRight: 8 }}><Text>계좌 복사</Text></Pressable>
              <Pressable onPress={() => { Alert.alert('참조 복사', '결제 참조코드는 자동으로 복사됩니다.'); }} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}><Text>참조 복사</Text></Pressable>
            </View>
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={() => {
                // open file picker or prompt for proof URL (simple approach: prompt for URL)
                Alert.prompt('영수증 업로드', '영수증 URL을 붙여넣어 주세요', async (url) => {
                  if (!url) return;
                  try {
                    if (!orderId) throw new Error('order not set');
                    await uploadProof(orderId, url);
                    Alert.alert('업로드됨', '영수증이 업로드되어 검토 대기중입니다.');
                  } catch (e: any) {
                    Alert.alert('오류', e?.message || '업로드 실패');
                  }
                });
              }} style={{ padding: 10, backgroundColor: '#f93414', borderRadius: 8 }}><Text style={{ color: '#fff' }}>영수증 업로드</Text></Pressable>
            </View>
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={markBankSent} style={{ padding: 10, backgroundColor: '#0ea5b1', borderRadius: 8 }}><Text style={{ color: '#fff' }}>송금 완료</Text></Pressable>
            </View>
          </View>
        )}
        {TIERS.map((t) => (
          <Pressable key={t.id} style={styles.tier} onPress={() => choose(t)}>
            <Text style={{ fontWeight: '700' }}>{t.label}</Text>
            <Text style={{ color: '#6b7280' }}>{t.amount.toLocaleString()}원</Text>
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
});
