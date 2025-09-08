import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { getPayment } from '@/api/client';

export default function ReceiptModal({ visible, onClose, orderId }: { visible: boolean; onClose: () => void; orderId?: string }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    let mounted = true;
    (async () => {
      if (!orderId) return;
      setLoading(true);
      try {
        const r = await getPayment(orderId);
        if (!mounted) return;
        setReceipt(r);
      } catch (e) {
        Alert.alert('오류', '영수증을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [visible, orderId]);

  const submitDispute = () => {
    // This is a local placeholder: in production you'd POST to /payments/disputes
    if (!reason.trim()) return Alert.alert('문구 필요', '문제를 설명해 주세요.');
    setShowDispute(false);
    onClose();
    Alert.alert('문의 접수됨', '운영팀에 문의가 접수되었습니다.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>결제 영수증</Text>
          {loading ? <Text style={styles.loading}>불러오는 중…</Text> : null}
          {receipt ? (
            <View>
              <Text style={styles.row}><Text style={styles.label}>주문:</Text> {receipt.order_id}</Text>
              <Text style={styles.row}><Text style={styles.label}>금액:</Text> {receipt.amount} {receipt.currency}</Text>
              <Text style={styles.row}><Text style={styles.label}>상태:</Text> {receipt.status}</Text>
              <Text style={styles.row}><Text style={styles.label}>판매자:</Text> {receipt.seller_id}</Text>
            </View>
          ) : null}

          {!showDispute ? (
            <View style={{ marginTop: 12 }}>
              <Pressable style={styles.btn} onPress={() => setShowDispute(true)}><Text style={styles.btnText}>문제 신고 / 환불 요청</Text></Pressable>
              <Pressable style={[styles.btn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 }]} onPress={onClose}><Text style={[styles.btnText, { color: '#111827' }]}>닫기</Text></Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>문제를 설명해 주세요</Text>
              <TextInput value={reason} onChangeText={setReason} style={styles.input} placeholder="예: 물품 미도착, 중복 결제 등" multiline />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable style={styles.btn} onPress={submitDispute}><Text style={styles.btnText}>전송</Text></Pressable>
                <Pressable style={[styles.btn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }]} onPress={() => setShowDispute(false)}><Text style={[styles.btnText, { color: '#111827' }]}>취소</Text></Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  loading: { color: '#6b7280' },
  row: { marginTop: 6 },
  label: { fontWeight: '700', color: '#111827' },
  btn: { marginTop: 6, backgroundColor: '#f93414', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  input: { minHeight: 80, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, textAlignVertical: 'top' },
});
