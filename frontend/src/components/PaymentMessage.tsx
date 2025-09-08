import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

export default function PaymentMessage({ message, me, onPay, onOpenReceipt }: { message: any; me: boolean; onPay?: () => void; onOpenReceipt?: () => void }) {
  const status = message.status || (message.meta && message.meta.status) || 'PENDING';
  const amount = message.meta?.amount ?? message.amount ?? 0;
  const currency = message.meta?.currency ?? 'KRW';
  const isBuyer = message.meta?.role === 'buyer';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>결제 요청</Text>
        <Text style={styles.amount}>{amount.toLocaleString()} {currency}</Text>
        <View style={styles.row}>
          <Text style={styles.statusLabel}>상태:</Text>
          {status === 'PENDING' && <Text style={styles.statusPending}>대기 중</Text>}
          {status === 'PROCESSING' && <View style={styles.row}><ActivityIndicator size="small" color="#f93414" /><Text style={styles.statusProcessing}>처리 중</Text></View>}
          {status === 'PAID' && <Text style={styles.statusPaid}>결제 완료</Text>}
          {status === 'FAILED' && <Text style={styles.statusFailed}>실패</Text>}
        </View>
        {isBuyer && status === 'PENDING' && (
          <Pressable style={styles.payBtn} onPress={onPay}><Text style={styles.payBtnText}>지금 결제</Text></Pressable>
        )}
        {status === 'PAID' && onOpenReceipt && (
          <Pressable style={[styles.payBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }]} onPress={onOpenReceipt}><Text style={[styles.payBtnText, { color: '#111827' }]}>영수증 보기</Text></Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3f3f3' },
  title: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  amount: { fontSize: 18, color: '#111827', fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 13, color: '#6b7280' },
  statusPending: { fontSize: 13, color: '#f59e0b' },
  statusProcessing: { fontSize: 13, color: '#f93414', marginLeft: 6 },
  statusPaid: { fontSize: 13, color: '#10b981' },
  statusFailed: { fontSize: 13, color: '#ef4444' },
  payBtn: { marginTop: 10, backgroundColor: '#f93414', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  payBtnText: { color: '#fff', fontWeight: '700' },
});
