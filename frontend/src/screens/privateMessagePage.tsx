import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, Pressable, Image, Animated } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

// Extremely light message model for now
interface Msg {
  id: string;
  me: boolean;
  text?: string;
  imageUrl?: string;
  ts: number; // epoch ms
}

export default function PrivateMessagePage() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { title, imageUrl } = route.params || {};

  const [messages, setMessages] = useState<Msg[]>([
    { id: "m1", me: false, text: "안녕하세요!", ts: Date.now() - 60_000 },
    { id: "m2", me: true, text: "안녕하세요, 관심 감사합니다.", ts: Date.now() - 55_000 },
    { id: "m3", me: false, text: "가격 협상 가능할까요?", ts: Date.now() - 54_000 },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Msg>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: true, header: () => (
      <View style={styles.header}>
        <Image source={{ uri: imageUrl || "https://placehold.co/48x48" }} style={styles.headerIcon} />
        <Text style={styles.headerTitle} numberOfLines={1}>{title || "대화"}</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerBtn} onPress={() => { /* phone call */ }}>
            <Text style={styles.headerBtnText}>📞</Text>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => {/* more menu could open an action sheet */}}>
            <Text style={styles.headerBtnText}>⋯</Text>
          </Pressable>
        </View>
      </View>
    ) });
  }, [navigation, title, imageUrl]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { id: `m${prev.length+1}` , me: true, text: trimmed, ts: Date.now() }]);
    setInput("");
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const renderItem = ({ item, index }: { item: Msg; index: number }) => {
    const prev = messages[index - 1];
    const showTs = !prev || Math.floor(prev.ts/60000) !== Math.floor(item.ts/60000);
    const time = new Date(item.ts);
    const hh = String(time.getHours()).padStart(2,'0');
    const mm = String(time.getMinutes()).padStart(2,'0');
    return (
      <View style={[styles.bubbleRow, item.me ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, item.me ? styles.bubbleMe : styles.bubbleOther]}>
          {item.text ? <Text style={[styles.bubbleText, item.me && styles.bubbleTextMe]}>{item.text}</Text> : null}
          {showTs ? (
            <Text style={[styles.ts, item.me ? styles.tsLeft : styles.tsRight]}>{`${hh}:${mm}`}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const onScroll = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    setShowScrollBottom(offsetY > 600);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }} keyboardVerticalOffset={80}>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          onScroll={onScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        />

        {showScrollBottom ? (
          <Pressable style={styles.scrollBottom} onPress={() => listRef.current?.scrollToEnd({ animated: true })}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>↓ 최신</Text>
          </Pressable>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable style={styles.mediaBtn} onPress={() => { /* open sheet for gallery/camera */ }}>
            <Text style={{ fontSize: 18 }}>🖼️</Text>
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="메시지 보내기"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendText}>전송</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerIcon: { width: 32, height: 32, borderRadius: 6, marginRight: 8, backgroundColor: "#e5e7eb" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: { padding: 6 },
  headerBtnText: { fontSize: 18 },

  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  bubbleMe: { backgroundColor: "#2563EB", borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderTopLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  bubbleText: { fontSize: 16, color: "#111827" },
  bubbleTextMe: { color: "#fff" },
  ts: { fontSize: 10, marginTop: 2, color: "#6b7280" },
  tsLeft: { alignSelf: "flex-start" },
  tsRight: { alignSelf: "flex-end" },

  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  mediaBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2563EB", borderRadius: 10 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  scrollBottom: {
    position: "absolute",
    right: 16,
    bottom: 84,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
