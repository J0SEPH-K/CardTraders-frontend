import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, FlatList, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/useAuth';
import { updateProfileApi } from '@/api/client';

const BANKS = [
  { key: 'KB', name: 'KB국민은행' },
  { key: 'SinHan', name: '신한은행' },
  { key: 'Woori', name: '우리은행' },
  { key: 'KEB', name: 'KEB하나은행' },
  { key: 'NH', name: 'NH농협은행' },
  { key: 'IBK', name: 'IBK기업은행' },
  { key: 'KKB', name: '카카오뱅크' },
  { key: 'KBANK', name: '케이뱅크' },
  { key: 'Citi', name: '시티은행' },
  { key: 'IM', name: 'iM뱅크' },
  { key: 'SC', name: 'SC제일은행' },
  { key: 'TOSS', name: '토스뱅크' },
];

// Static require map for original icons (used in bank selection buttons)
const BANK_ORIGINAL: Record<string, any> = {
  KB: require('../assets/BankIcons/KB/signature.png'),
  SinHan: require('../assets/BankIcons/SinHan/signature.png'),
  Woori: require('../assets/BankIcons/Woori/signature.png'),
  KEB: require('../assets/BankIcons/KEB/signature.png'),
  NH: require('../assets/BankIcons/NH/signature.png'),
  IBK: require('../assets/BankIcons/IBK/signature.png'),
  KKB: require('../assets/BankIcons/KKB/signature.png'),
  KBANK: require('../assets/BankIcons/KKB/signature.png'),
  Citi: require('../assets/BankIcons/Citi/signature.png'),
  IM: require('../assets/BankIcons/IM/signature.png'),
  SC: require('../assets/BankIcons/SC/signature.png'),
  TOSS: require('../assets/BankIcons/TOSS/signature.png'),
};

export default function AddBankAccountPage() {
  const navigation = useNavigation();
  const user = useAuth((s) => s.user);
  const [selected, setSelected] = useState<string | null>(null);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return Alert.alert('선택하세요', '은행을 선택해주세요');
    if (!account || account.trim().length < 5) return Alert.alert('계좌번호', '유효한 계좌번호를 입력해주세요');
    try {
      setLoading(true);
      const bank = BANKS.find((b) => b.key === selected)?.name || selected;
      const payload = {
        id: user?.id ?? null,
        userId: user?.userId,
        bank_acc: `${bank} ${account.trim()}`,
      } as any; // backend accepts arbitrary fields; cast to any to avoid TS complaining
      const r = await updateProfileApi(payload);
      // update local user
      useAuth.getState().setUser(r.user);
      Alert.alert('완료', '계좌가 등록되었습니다');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('오류', e?.message || '계좌 등록 실패');
    } finally {
      setLoading(false);
    }
  };

  const renderBank = ({ item }: { item: { key: string; name: string } }) => {
    const active = item.key === selected;
    const icon = BANK_ORIGINAL[item.key];
    return (
      <Pressable onPress={() => setSelected(item.key)} style={[styles.bankBtn, active ? styles.bankBtnActive : null]} accessibilityRole="button">
        {icon ? (
          <Image source={icon} style={[styles.bankIconImg, active ? styles.bankIconActive : null]} resizeMode="contain" />
        ) : (
          <View style={[styles.bankIcon, active ? styles.bankIconActive : null]}>
            <Text style={styles.bankInitial}>{item.key.slice(0, 2)}</Text>
          </View>
        )}
        <Text style={styles.bankLabel}>{item.name}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="뒤로">
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>뒤로</Text>
          </Pressable>
          <Text style={styles.title}>계좌 추가</Text>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.sectionTitle}>은행 선택</Text>
        <FlatList data={BANKS} keyExtractor={(i) => i.key} renderItem={renderBank} horizontal={false} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} style={{ marginBottom: 16 }} />

        <Text style={styles.sectionTitle}>계좌번호</Text>
        <TextInput value={account} onChangeText={setAccount} placeholder="계좌번호 입력" style={styles.input} keyboardType="numeric" />

        <View style={styles.verifyBox}>
          <Text style={{ color: '#6b7280' }}>계좌 인증</Text>
          <Text style={{ color: '#9ca3af', marginTop: 8 }}>인증 절차는 추후 제공됩니다. (여기에 인증 UI가 들어갑니다)</Text>
        </View>

        <View style={{ flex: 1 }} />
        <Pressable onPress={handleSubmit} style={styles.submitBtn} accessibilityRole="button">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>계좌 등록</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 24, color: '#111827' },
  backText: { fontSize: 16, color: '#111827' },
  title: { fontSize: 18, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  bankBtn: { width: '48%', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  bankBtnActive: { borderColor: '#f93414', backgroundColor: '#fff8f8' },
  bankIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  bankIconActive: { backgroundColor: '#fef2f2' },
  bankIconImg: { width: 40, height: 40, borderRadius: 6, backgroundColor: 'transparent' },
  bankInitial: { fontWeight: '700', color: '#111827' },
  bankLabel: { flex: 1, fontSize: 14, color: '#111827' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  verifyBox: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 88 },
  submitBtn: { backgroundColor: '#f93414', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
});
