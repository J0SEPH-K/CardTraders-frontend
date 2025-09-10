import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SettingsPage(){
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>뒤로</Text>
          </Pressable>
          <Text style={styles.headerTitle}>앱 설정</Text>
          <View style={{ width: 48 }} />
        </View>
        <Text style={styles.desc}>여기에 알림, 테마, 개인정보 설정 등을 추가하세요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F6' },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 8 },
  backIcon: { fontSize: 24, color: '#111827' },
  backText: { fontSize: 16, color: '#111827' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  desc: { color: '#6b7280' },
});
