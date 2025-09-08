import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/useAuth';
import { Image } from 'react-native';

const BANK_SIGNATURE: Record<string, any> = {
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

const BANK_KEY_TO_NAME: Record<string, string> = {
  KB: 'KB국민은행',
  SinHan: '신한은행',
  Woori: '우리은행',
  KEB: 'KEB하나은행',
  NH: 'NH농협은행',
  IBK: 'IBK기업은행',
  KKB: '카카오뱅크',
  KBANK: '케이뱅크',
  Citi: '시티은행',
  IM: 'iM뱅크',
  SC: 'SC제일은행',
  TOSS: '토스뱅크',
};

export default function PaymentsPage() {
  const navigation = useNavigation();
  const user = useAuth((s)=>s.user);
  // derive bank key and account code for display
  const bankRaw = user?.bank_acc || '';
  const detectedKey = Object.keys(BANK_SIGNATURE).find((k) => bankRaw.includes(k) || bankRaw.includes(BANK_KEY_TO_NAME[k]));
  let accountCode = bankRaw;
  if (detectedKey) {
    const name = BANK_KEY_TO_NAME[detectedKey];
    accountCode = bankRaw.replace(name, '').replace(detectedKey, '').trim();
  } else if (bankRaw.includes(' ')) {
    // fallback: use everything after the first space
    const i = bankRaw.indexOf(' ');
    accountCode = bankRaw.slice(i + 1).trim();
  }
  // create masked account string: keep first 4 digits, mask remaining digits in groups of 4
  const digitsOnly = (accountCode || '').replace(/\D/g, '');
  let maskedAccount = accountCode;
  if (digitsOnly.length > 4) {
    const first4 = digitsOnly.slice(0, 4);
    const restLen = digitsOnly.length - 4;
    const groups = Math.ceil(restLen / 4);
    const maskedGroups = new Array(groups).fill('****').join(' ');
    maskedAccount = `${first4} ${maskedGroups}`;
  } else {
    maskedAccount = digitsOnly || accountCode;
  }
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="뒤로">
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>뒤로</Text>
          </Pressable>
          <Text style={styles.title}>결제 방식</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>계좌번호</Text>
            <Pressable style={styles.plusBtn} onPress={() => navigation.navigate('AddBankAccount' as never)}>
              <Text style={styles.plusText}>＋</Text>
            </Pressable>
          </View>
          <View style={styles.sectionBody}>
            {user?.bank_acc ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                {detectedKey ? (
                  <Image source={BANK_SIGNATURE[detectedKey]} style={{ width: 220, height: 56, resizeMode: 'contain' }} />
                ) : null}
                <Text style={{ color: '#111827', marginLeft: 12 }}>{maskedAccount}</Text>
              </View>
            ) : (
              <Text style={styles.placeholder}>등록된 계좌가 없습니다</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>신용/체크 카드</Text>
            <Pressable style={styles.plusBtn} onPress={() => navigation.navigate('AddBankAccount' as never)}>
              <Text style={styles.plusText}>＋</Text>
            </Pressable>
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.placeholder}>등록된 카드가 없습니다</Text>
          </View>
        </View>
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

  section: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  plusBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#e5e7eb' },
  plusText: { fontSize: 22, color: '#111827' },
  sectionBody: { padding: 20, minHeight: 100, justifyContent: 'center' },
  placeholder: { color: '#6b7280' },
});
