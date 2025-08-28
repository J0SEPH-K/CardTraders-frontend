import React, { useRef } from "react";
import { View, Text, Image, StyleSheet, Pressable, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

export type Conversation = {
  id: string;
  title: string; // card name
  imageUrl?: string; // seller's card image
  latestMessage: string;
  latestSenderMe?: boolean;
  notificationsEnabled?: boolean;
};

type Props = {
  convo: Conversation;
  onPress: (convo: Conversation) => void;
  onToggleNotification: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

export default function ChatBlock({ convo, onPress, onToggleNotification, onDelete }: Props) {
  const swipeRef = useRef<Swipeable | null>(null);

  const confirmDelete = () => {
    Alert.alert(
      "채팅 삭제",
      "삭제하면 메시지 기록을 복구할 수 없습니다. 계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            swipeRef.current?.close();
            onDelete(convo.id);
          },
        },
      ]
    );
  };

  const LeftActions = () => (
    <View style={styles.actionsWrap}>
      <Pressable
        style={[styles.actionBtn, styles.actionNotify, convo.notificationsEnabled ? styles.actionOn : undefined]}
        onPress={() => {
          swipeRef.current?.close();
          onToggleNotification(convo.id, !convo.notificationsEnabled);
        }}
      >
        <Text style={styles.actionText}>{convo.notificationsEnabled ? "알림 끄기" : "알림"}</Text>
      </Pressable>
      <Pressable style={[styles.actionBtn, styles.actionDelete]} onPress={confirmDelete}>
        <Text style={styles.actionText}>삭제</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable ref={swipeRef} renderLeftActions={LeftActions} overshootLeft={false}>
      <Pressable style={styles.row} onPress={() => onPress(convo)}>
        <Image source={{ uri: convo.imageUrl || "https://placehold.co/96x96" }} style={styles.avatar} />
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{convo.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {convo.latestSenderMe ? "나: " : ""}
            {convo.latestMessage}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  center: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  actionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  actionBtn: {
    width: 88,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionNotify: {
    backgroundColor: "#2563EB",
  },
  actionDelete: {
    backgroundColor: "#EF4444",
  },
  actionOn: {
    backgroundColor: "#111827",
  },
});
