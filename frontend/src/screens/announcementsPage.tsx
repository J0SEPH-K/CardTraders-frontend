import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const DATA = [
  { id: '1', title: '공지사항 1', body: '서비스 업데이트 내역을 안내드립니다.' },
  { id: '2', title: '공지사항 2', body: '점검 안내: 8/30(토) 02:00~04:00' },
];

export default function AnnouncementsPage(){
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.container}
        data={DATA}
        keyExtractor={(i)=>i.id}
        renderItem={({item})=> (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backText}>뒤로</Text>
            </Pressable>
            <Text style={styles.headerTitle}>공지사항</Text>
            <View style={{ width: 48 }} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 8 },
  backIcon: { fontSize: 24, color: '#111827' },
  backText: { fontSize: 16, color: '#111827' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  body: { color: '#374151' },
});
