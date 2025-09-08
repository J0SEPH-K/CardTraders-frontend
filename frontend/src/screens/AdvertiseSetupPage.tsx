import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/useAuth';
import { API_BASE } from '@/api/client';
import { useIsFocused } from '@react-navigation/native';

export default function AdvertiseSetupPage() {
  const navigation = useNavigation<any>();
  const user = useAuth((s)=>s.user);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'price' | 'title'>('recent');
  const isFocused = useIsFocused();

  const fetchCards = async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ uploadedBy: String(user.userId), limit: '100', offset: '0' });
      const r = await fetch(`${API_BASE}/uploaded-cards?${params.toString()}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setCards(data || []);
    } catch (e: any) {
      Alert.alert('불러오기 실패', e?.message || '카드를 불러오지 못했습니다.');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCards(); }, [user?.userId]);
  // Refresh when returning from payment or when screen regains focus
  useEffect(() => { if (isFocused) fetchCards(); }, [isFocused]);

  const advertised = useMemo(() => cards.filter(c => c.is_advertised), [cards]);
  const regular = useMemo(() => cards.filter(c => !c.is_advertised), [cards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = [...advertised, ...regular];
    if (q) base = base.filter((c) => (c.card_name || c.title || '').toLowerCase().includes(q));
    if (sort === 'price') base.sort((a,b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'title') base.sort((a,b) => ((a.card_name||a.title||'') > (b.card_name||b.title||'') ? 1 : -1));
    else base.sort((a,b) => (b.id || 0) - (a.id || 0));
    return base;
  }, [advertised, regular, query, sort]);

  const renderListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <TextInput value={query} onChangeText={setQuery} placeholder="검색" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Pressable style={[styles.filterBtn, sort === 'recent' && styles.filterBtnActive]} onPress={() => setSort('recent')}><Text>최신</Text></Pressable>
        <Pressable style={[styles.filterBtn, sort === 'price' && styles.filterBtnActive]} onPress={() => setSort('price')}><Text>가격</Text></Pressable>
        <Pressable style={[styles.filterBtn, sort === 'title' && styles.filterBtnActive]} onPress={() => setSort('title')}><Text>이름</Text></Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.item, item.is_advertised ? styles.dimmed : null]}
      onPress={() => { if (item.is_advertised) return; navigation.navigate('AdPayment' as any, { cardId: item.id }); }}
      disabled={item.is_advertised}
    >
      <Image source={{ uri: item.image_url ? `${API_BASE}${item.image_url}` : 'https://placehold.co/80x100' }} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>{item.card_name || item.title || '이름 없음'}</Text>
          {item.is_advertised ? <View style={styles.badge}><Text style={{ color: '#fff', fontWeight: '700' }}>광고중</Text></View> : null}
        </View>
        <Text style={styles.sub}>{item.set ? `${item.set}${item.card_num ? ` • ${item.card_num}` : ''}` : ''}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>뒤로</Text></Pressable>
        <Text style={styles.header}>홍보하기</Text>
        <View style={{ width: 48 }} />
      </View>
    {/* Search & filters are rendered as the FlatList header so the first item isn't covered */}
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={renderListHeader}
      contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  back: { padding: 6 },
  backText: { color: '#111827' },
  header: { fontSize: 18, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  thumb: { width: 80, height: 100, borderRadius: 8, marginRight: 12, backgroundColor: '#e5e7eb' },
  title: { fontWeight: '700' },
  sub: { color: '#6b7280', marginTop: 6 },
  dimmed: { opacity: 0.5, backgroundColor: 'rgba(249,52,20,0.05)' },
  badge: { backgroundColor: '#f93414', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#fdecea', borderColor: '#f93414' },
});
