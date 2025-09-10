import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Text, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Conversation, listConversations, getUploadedCard, API_BASE } from "@/api/client";
import { useAuth } from "@/store/useAuth";

export default function ConversationsPage() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const me = useAuth((s) => s.user);
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});

  const load = async (append = false) => {
    if (!me?.userId || loading) return;
    setLoading(true);
    try {
      const res = await listConversations(me.userId, cursor, 20);
      const list = append ? [...items, ...res.items] : res.items;
      setItems(list);
      // For now, simple cursor from last updatedAt
      const last = res.items[res.items.length - 1];
      setCursor(last?.updatedAt);

      // Fetch images for conversations that have listingId and not yet cached
      const needed = Array.from(
        new Set(
          (list || [])
            .map((c) => c.listingId)
            .filter((v): v is string => !!v && typeof v === "string")
        )
      ).filter((lid) => !imageMap[lid]);
    if (needed.length > 0) {
        try {
          const results = await Promise.allSettled(needed.map((lid) => getUploadedCard(lid)));
          const updates: Record<string, string> = {};
      const titleUpdates: Record<string, string> = {};
          results.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value) {
              const card = r.value as any;
              const rel = card?.image_url as string | undefined;
              if (rel) updates[needed[i]] = `${API_BASE}${rel}`;
        // Derive product name
        const rawTitle = (card?.card_name || card?.title || (card?.category ? `${card.category} card` : "대화")) as string;
        const cleanTitle = String(rawTitle).replace(/\s*#\d+\b/g, "");
        titleUpdates[needed[i]] = cleanTitle;
            }
          });
          if (Object.keys(updates).length) setImageMap((prev) => ({ ...prev, ...updates }));
      if (Object.keys(titleUpdates).length) setTitleMap((prev) => ({ ...prev, ...titleUpdates }));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.userId]);

  const open = (c: Conversation) => {
    const productTitle = (c.listingId && titleMap[c.listingId]) || undefined;
    const img = (c.listingId && imageMap[c.listingId]) || "https://placehold.co/48x48";
    navigation.navigate("PrivateMessage", {
      convoId: c.id,
      title: productTitle || "대화",
      imageUrl: img,
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => {
  const productTitle = (item.listingId && titleMap[item.listingId]) || undefined;
  const last = item.lastMessage;
  const img = (item.listingId && imageMap[item.listingId]) || "https://placehold.co/72x72";
    return (
      <Pressable style={styles.row} onPress={() => open(item)}>
    <Image source={{ uri: img }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
      <Text style={styles.title} numberOfLines={1}>{productTitle || "대화"}</Text>
          {last ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {last.senderId === me?.userId ? "나: " : ""}
              {last.text}
            </Text>
          ) : (
            <Text style={styles.subtitle}>대화를 시작해 보세요</Text>
          )}
        </View>
        <View style={styles.unreadDotWrap}>
          {!!(item.unread && me?.userId && (item.unread[me.userId] || 0) > 0) ? (
            <View style={styles.unreadDot}><Text style={styles.unreadText}>{Math.min(99, item.unread[me.userId] || 0)}</Text></View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }] }>
      {/* Simple header */}
      <View style={{ paddingTop: insets.top, backgroundColor: "#FAF9F6" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 16 }}>〈 뒤로</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>대화</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        onEndReachedThreshold={0.3}
        onEndReached={() => load(true)}
        refreshing={loading}
        onRefresh={() => { setCursor(undefined); load(false); }}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FAF9F6" },
  avatar: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#e5e7eb", marginRight: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 84 },
  unreadDotWrap: { marginLeft: 8 },
  unreadDot: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
