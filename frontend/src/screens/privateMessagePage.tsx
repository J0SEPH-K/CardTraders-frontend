import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, Pressable, Image, Animated, Modal, Alert, Keyboard, InteractionManager, ActivityIndicator, Linking, Dimensions, TouchableOpacity } from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listMessages, sendMessage as sendMessageApi, ChatMessage, markRead, uploadChatImage, API_BASE, openChatWebSocket, ChatWsEvent, api } from "@/api/client";
import { createOrder, getPayment } from '@/api/client';
import PaymentMessage from '@/components/PaymentMessage';
import ReceiptModal from '@/components/ReceiptModal';
import ImageBundleViewer from '@/components/ImageBundleViewer';
import { useAuth } from "@/store/useAuth";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { FontAwesome6 } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

// App accent color (used elsewhere in the app)
const ACCENT = '#f93414';
const ACCENT_LIGHT = 'rgba(249, 52, 20, 0.10)'; // light tint for opponent bubble
const ACCENT_BORDER = 'rgba(249, 52, 20, 0.25)';

// Extremely light message model for now
interface Msg {
  id: string;
  me: boolean;
  text?: string;
  imageUrl?: string;
  ts: number; // epoch ms
  // optional payment fields
  type?: string;
  paymentId?: string;
  meta?: any;
  status?: string;
}

export default function PrivateMessagePage() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { title, imageUrl, convoId, sellerId } = route.params || {};
  const insets = useSafeAreaInsets();
  const headerHeight = 56 + insets.top;
  const me = useAuth((s)=>s.user);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [receiptOpenFor, setReceiptOpenFor] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Msg>>(null);
  const inputRef = useRef<TextInput | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankAmount, setBankAmount] = useState<string>('');
  const [bankOrderId, setBankOrderId] = useState<string | null>(null);
  const [bankProcessing, setBankProcessing] = useState(false);
  const [bankSellerInfo, setBankSellerInfo] = useState<any | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  // Track whether the list is scrolled to the bottom so we only auto-scroll on incoming messages when appropriate
  const isAtBottomRef = useRef(true);
  // Flag to request auto-scroll on next content size change
  const shouldAutoScrollRef = useRef(false);
  // Track sizes for precise scrolling
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const [inputBarH, setInputBarH] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showGalleryTray, setShowGalleryTray] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryItems, setGalleryItems] = useState<Array<{ id: string; uri: string }>>([]);
  // Tight tray height: header (~32px) + thumb (132px) + small spacing
  const GALLERY_TRAY_HEIGHT = 172;
  const attemptedPreloadRef = useRef(false);
  // full-screen gallery viewer animation state and selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  // bundle viewer state
  const [bundleOpen, setBundleOpen] = useState<{ images: string[] } | null>(null);
  const viewerAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  // compute thumbnail size for 4 columns with 12px side padding and 8px gaps
  const THUMB_SIZE = Math.floor((screenWidth - 12 * 2 - 8 * 3) / 4);
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
  const ignoreBackdropUntilRef = useRef<number>(0);
  // Gate rendering until we've scrolled to bottom once to avoid visible jump
  const [listReady, setListReady] = useState(false);
  const [inputMeasured, setInputMeasured] = useState(false);
  const [bottomPrepared, setBottomPrepared] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  // Remount key to apply initialScrollIndex only when messages are loaded
  const listMountKey = useMemo(() => `convo-${convoId}-${messages.length > 0 ? 'loaded' : 'empty'}`,[convoId, messages.length]);
  const isOpponentTyping = useMemo(() => Object.entries(typingMap).some(([uid, on]) => on && uid !== me?.userId), [typingMap, me?.userId]);
  const lastOpponentId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].me) return messages[i].id;
    }
    return undefined;
  }, [messages]);

  // Helpers
  const dedupeByIdSorted = (arr: Msg[]) => {
    // Keep last occurrence per id, then restore order by ts
    const seen = new Set<string>();
    const out: Msg[] = [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const m = arr[i];
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out.reverse().sort((a,b)=>a.ts-b.ts);
  };

  useEffect(() => {
    navigation.setOptions({ headerShown: true, header: () => (
  <View style={[styles.header, { paddingTop: insets.top, height: headerHeight }]}>
        <Pressable style={styles.headerBack} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="뒤로">
          <Text style={styles.headerBackIcon}>‹</Text>
          <Text style={styles.headerBackText}>뒤로</Text>
        </Pressable>
        <Image source={{ uri: imageUrl || "https://placehold.co/48x48" }} style={styles.headerIcon} />
        <Text style={styles.headerTitle} numberOfLines={1}>{title || "대화"}</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerBtn} onPress={() => { /* phone call */ }}>
            <Text style={styles.headerBtnText}>📞</Text>
          </Pressable>
          {/* Bank transfer button: only show when current user is buyer (i.e., sellerId provided and not me) */}
          {sellerId && me?.userId && String(me.userId) !== String(sellerId) ? (
            <Pressable style={styles.headerBtn} onPress={() => setShowBankModal(true)}>
              <Text style={styles.headerBtnText}>💸</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.headerBtn} onPress={() => setShowMenu(true)}>
            <Text style={styles.headerBtnText}>⋯</Text>
          </Pressable>
        </View>
      </View>
    ) });
  }, [navigation, title, imageUrl, insets.top, sellerId, me?.userId]);

  const fetchInitial = async () => {
    if (!convoId) return;
    try {
      const res = await listMessages(convoId, undefined, 50);
  const items = res.items.map((m: ChatMessage) => ({
        id: m.id,
        me: m.senderId === me?.userId,
        text: m.text,
        imageUrl: m.imageUrl ? `${API_BASE}${m.imageUrl}` : undefined,
  // Use server time as-is; ensure stable utc-based parse
  ts: new Date(m.at).getTime(),
  // payment fields
  type: (m as any).type,
  paymentId: (m as any).paymentId,
  meta: (m as any).meta,
  })) as Msg[];
  // If no items, bottom is trivially prepared
  setBottomPrepared(items.length === 0);
  setListReady(false);
  setMessages(dedupeByIdSorted(items));
  // Ensure scroll happens after content layout (non-animated to avoid flicker)
  shouldAutoScrollRef.current = true;
  scrollToBottom(false);
      if (me?.userId) await markRead(convoId, me.userId);
    } catch {}
  };

  useEffect(() => { fetchInitial(); }, [convoId, me?.userId]);
  // Reset list readiness when switching conversations
  useEffect(() => { setListReady(false); setBottomPrepared(false); setInputMeasured(false); }, [convoId]);

  // Reveal UI only when both bottom prepared and input measured
  useEffect(() => {
    if (bottomPrepared && inputMeasured) {
      // Show a short 0.5s loading overlay before revealing the prepared list
      setShowLoadingOverlay(true);
      const t = setTimeout(() => {
        setShowLoadingOverlay(false);
        setListReady(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [bottomPrepared, inputMeasured]);

  // When screen gains focus (e.g., opened from Conversations list), ensure we land at the latest

  // Scroll to bottom when keyboard shows up (better composing experience)
  useEffect(() => {
    const showEvents = Platform.OS === 'ios'
      ? ['keyboardWillChangeFrame', 'keyboardWillShow', 'keyboardDidShow']
      : ['keyboardDidShow'];
    const subs = showEvents.map((evt) => Keyboard.addListener(evt as any, () => {
      setKeyboardVisible(true);
      shouldAutoScrollRef.current = true;
      // Immediate and animated for snappy feel
      scrollToBottomNow(true);
      // Follow-up in next tick in case layout finishes after first call
      setTimeout(() => {
        if (shouldAutoScrollRef.current) {
          scrollToBottom(true);
          shouldAutoScrollRef.current = false;
        }
      }, 0);
    }));
    const hideEvents = Platform.OS === 'ios' ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];
    hideEvents.forEach((evt) => subs.push(Keyboard.addListener(evt as any, () => setKeyboardVisible(false))));
    return () => { subs.forEach(sub => { try { sub.remove(); } catch {} }); };
  }, []);

  const scrollToBottom = (animated: boolean = true) => {
    // Throttle animated scrolls so repeated triggers (modals, layout changes)
    // don't queue multiple animated scrolls and feel like they're accelerating.
    const now = Date.now();
    // @ts-ignore added below
    if (animated && (scrollAnimatedLastAtRef.current && (now - scrollAnimatedLastAtRef.current) < 200)) {
      // downgrade to non-animated if last animated scroll was very recent
      animated = false;
    }
    if (animated) scrollAnimatedLastAtRef.current = now;

    requestAnimationFrame(() => {
      const contentH = contentHeightRef.current;
      const layoutH = layoutHeightRef.current;
      if (contentH > 0 && layoutH > 0) {
        const offset = Math.max(0, contentH - layoutH);
        try {
          listRef.current?.scrollToOffset({ offset, animated });
          return;
        } catch {}
      }
      // Fallback
      listRef.current?.scrollToEnd({ animated });
    });
  };

  // Immediate variant (no rAF) used for keyboard/focus to feel instant
  const scrollToBottomNow = (animated: boolean = false) => {
    const now = Date.now();
    if (animated && (scrollAnimatedLastAtRef.current && (now - scrollAnimatedLastAtRef.current) < 200)) {
      animated = false;
    }
    if (animated) scrollAnimatedLastAtRef.current = now;

    const contentH = contentHeightRef.current;
    const layoutH = layoutHeightRef.current;
    if (contentH > 0 && layoutH > 0) {
      const offset = Math.max(0, contentH - layoutH);
      try {
        listRef.current?.scrollToOffset({ offset, animated });
        return;
      } catch {}
    }
    try { listRef.current?.scrollToEnd({ animated }); } catch {}
  };

  // Track when we last ran an animated scroll to prevent stacking animations
  const scrollAnimatedLastAtRef = useRef<number | null>(null);

  // WebSocket live updates + typing indicator (single connection)
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<{ t?: any; tries: number }>({ tries: 0 });
  useEffect(() => {
    if (!convoId) return;
    let closed = false;
    const connect = () => {
      if (closed) return;
      const ws = openChatWebSocket(convoId, me?.userId);
      wsRef.current = ws;
      ws.onopen = () => {
        reconnectRef.current.tries = 0;
        // Small sync on connect to avoid missing anything
        listMessages(convoId, undefined, 50).then((res) => {
          const arr = res.items.map((m: ChatMessage) => ({
            id: m.id,
            me: m.senderId === me?.userId,
            text: m.text,
            imageUrl: m.imageUrl ? `${API_BASE}${m.imageUrl}` : undefined,
            ts: new Date(m.at).getTime(),
          })) as Msg[];
          setMessages(dedupeByIdSorted(arr));
          shouldAutoScrollRef.current = true;
          scrollToBottom(false);
        }).catch(()=>{});
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
      ws.onclose = () => {
        wsRef.current = null;
        if (closed) return;
        const tries = ++reconnectRef.current.tries;
        const delay = Math.min(1000 * tries, 8000);
        reconnectRef.current.t = setTimeout(connect, delay);
      };
      ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as any;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'new_message' && data.message) {
          const m = data.message as any;
          setMessages((prev) => {
            let next = [...prev];
            // If server emits a bundle message, remove any recent individual image messages
            // that belong to the same sender and match the bundle urls (or are very close in time).
            try {
              if (m.type === 'bundle' && m.meta?.images && Array.isArray(m.meta.images) && m.meta.images.length > 0) {
                const bundleImgs: string[] = m.meta.images.map((u: string) => (u && typeof u === 'string' ? (u.startsWith(API_BASE) ? u : u) : u));
                const bundleTs = new Date(m.at).getTime();
                const WINDOW = 15000; // ms window to consider images part of bundle
                next = next.filter((msg) => {
                  if (!msg.imageUrl) return true;
                  // exact url match
                  if (bundleImgs.includes(msg.imageUrl)) return false;
                  // or close timestamp and same sender and image-only
                  if (msg.me === (m.senderId === me?.userId) && Math.abs((msg.ts || 0) - bundleTs) < WINDOW && (!msg.text || msg.text === '')) return false;
                  return true;
                });
              }
            } catch (e) {
              // ignore
            }
            // append the new message (bundle or regular)
            next.push({
              id: m.id,
              me: m.senderId === me?.userId,
              text: m.text,
              imageUrl: m.imageUrl ? `${API_BASE}${m.imageUrl}` : undefined,
              ts: new Date(m.at).getTime(),
              type: m.type,
              paymentId: m.paymentId,
              meta: m.meta,
              status: m.status,
            });
            return dedupeByIdSorted(next);
          });
          // Request auto-scroll if user is already at bottom
          shouldAutoScrollRef.current = isAtBottomRef.current;
          // Mark read when we receive any new message
          if (me?.userId) markRead(convoId, me.userId).catch(()=>{});
          // Clear typing indicator for sender
          if (m.senderId && m.senderId !== me?.userId) {
            setTypingMap((prev) => ({ ...prev, [m.senderId]: false }));
          }
  } else if (data.type === 'typing') {
          const uid = (data as any).userId;
          const isTyping = (data as any).isTyping === true;
          if (uid && uid !== me?.userId) {
            setTypingMap((prev) => ({ ...prev, [uid]: isTyping }));
          }
        } else if (data.type === 'read') {
          // no-op for now
        }
        else if (data.type === 'payment.started' && data.message) {
          const m = data.message as any;
          setMessages((prev) => dedupeByIdSorted([...prev, {
            id: m.id,
            me: m.senderId === me?.userId,
            text: undefined,
            imageUrl: undefined,
            ts: new Date(m.at).getTime(),
            type: 'payment',
            paymentId: m.paymentId,
            meta: m.meta,
            status: m.status,
          }]));
          shouldAutoScrollRef.current = true;
        } else if (data.type === 'payment.updated' && data.message) {
          const m = data.message as any;
          setMessages((prev) => prev.map((msg) => (msg.id === m.id ? { ...msg, status: m.status, meta: { ...msg.meta, providerInfo: m.providerInfo } } : msg)));
        }
      } catch {}
      };
    };
    connect();
    // Clean up
    return () => {
      closed = true;
      if (reconnectRef.current.t) clearTimeout(reconnectRef.current.t);
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [convoId, me?.userId]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || !convoId || !me?.userId) return;
    // optimistic append
    const optimistic: Msg = { id: `tmp-${Date.now()}`, me: true, text: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, optimistic]);
  setInput("");
  // Always scroll to the latest when sending
  shouldAutoScrollRef.current = true;
  scrollToBottom(true);
    try {
      const { id } = await sendMessageApi(convoId, me.userId, trimmed);
      // replace tmp id with real id and dedupe to avoid duplicate keys if WS already added it
      setMessages(prev => {
        const replaced = prev.map(m => (m.id === optimistic.id ? { ...m, id } : m));
        return dedupeByIdSorted(replaced);
      });
    } catch {
      // revert on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  const pasteBankCode = () => {
    const bank = me?.bank_acc;
    if (!bank) {
      Alert.alert('계좌 정보 없음', '등록된 계좌 정보가 없습니다.');
      return;
    }
    // Insert or append bank string into input
    const newText = input && input.trim().length > 0 ? `${input} ${bank}` : bank;
    setInput(newText);
    // focus input and notify typing
    try { inputRef.current?.focus(); } catch {}
    notifyTyping(newText.trim().length > 0);
  };

  const startBankTransfer = async () => {
    if (!me?.userId || !sellerId) return;
    const amt = Number(bankAmount);
    if (!amt || amt <= 0) return Alert.alert('금액 필요', '유효한 금액을 입력하세요.');
    setBankProcessing(true);
    try {
      const res = await createOrder({ buyer_id: me.userId, seller_id: String(sellerId), chatId: convoId, item_id: undefined, amount: amt });
      // store order id and show bank instructions; for sandbox flow the server returns checkout_url like /payments/sandbox/checkout/{id}
      setBankOrderId(res.order_id);
      // Try to fetch payment details so we can show seller bank info if available
      try {
        const p = await getPayment(res.order_id);
        setBankSellerInfo(p.meta?.sellerBank || p.meta?.seller_bank || null);
      } catch (err) {
        // ignore, we'll still show order id and instructions
        setBankSellerInfo(null);
      }
    } catch (e: any) {
      Alert.alert('오류', e?.message || '결제 생성 실패');
    } finally {
      setBankProcessing(false);
    }
  };

  const markBankSent = async () => {
    if (!bankOrderId || !convoId || !me?.userId) return;
    try {
      // Notify the conversation that buyer has sent the bank transfer
      const text = `계좌이체를 완료했습니다. 주문 ID: ${bankOrderId}`;
      await sendMessageApi(convoId, me.userId, text);
      setShowBankModal(false);
      setBankOrderId(null);
      setBankAmount('');
      setBankSellerInfo(null);
      Alert.alert('알림 전송', '판매자에게 완료 알림을 보냈습니다.');
    } catch (err: any) {
      Alert.alert('오류', err?.message || '알림 전송 실패');
    }
  };

  const markBankCompleteDev = async () => {
    if (!bankOrderId) return;
    setBankProcessing(true);
    try {
      // call sandbox complete endpoint on backend to mark order PAID (dev only)
      await api(`/payments/sandbox/complete/${encodeURIComponent(bankOrderId)}`, { method: 'GET' });
      Alert.alert('완료', '샌드박스 결제가 완료로 표시되었습니다.');
      setShowBankModal(false);
      setBankOrderId(null);
    } catch (e: any) {
      Alert.alert('실패', e?.message || '완료 처리에 실패했습니다.');
    } finally {
      setBankProcessing(false);
    }
  };

  const handlePay = async (message: any) => {
    // message contains paymentId or meta
    if (!me?.userId) return;
    try {
      // create order (server will return checkout_url or provider token)
      const res = await createOrder({ buyer_id: me.userId, seller_id: message.meta?.sellerId || message.meta?.seller_id, chatId: convoId, item_id: message.meta?.item_id, amount: message.meta?.amount });
      const checkout = (res.checkout_url || res.provider_token) as string | undefined;
      if (!checkout) {
        Alert.alert('결제 오류', '결제 정보를 불러오지 못했습니다.');
        return;
      }
      // For sandbox flow the checkout may be an internal route; for Kakao it's a full URL.
      try {
        const url = checkout.startsWith('http') ? checkout : `${API_BASE}${checkout}`;
        await Linking.openURL(url);
      } catch (e) {
        Alert.alert('링크 열기 실패', '결제 페이지를 열 수 없습니다.');
      }
      // optimistic status -> PROCESSING until webhook updates
      setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, status: 'PROCESSING' } : msg)));
      // Start polling as fallback (short timeout)
      const start = Date.now();
      const pid = setInterval(async () => {
        try {
          const s = await getPayment(message.paymentId || res.order_id);
          if (s.status && s.status !== 'PENDING' && s.status !== 'PROCESSING') {
            setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, status: s.status } : msg)));
            clearInterval(pid);
          }
          if (Date.now() - start > 120000) {
            clearInterval(pid);
          }
        } catch {
          // ignore
        }
      }, 2000);
    } catch (e: any) {
      Alert.alert('결제 오류', e?.message || '결제를 시작할 수 없습니다.');
    }
  };

  const notifyTyping = (isTyping: boolean) => {
  const ws: WebSocket | null = wsRef.current;
    try {
      ws?.readyState === 1 && ws.send(JSON.stringify({ type: isTyping ? 'typing' : 'stop_typing', userId: me?.userId }));
    } catch {}
  };

  const pickAndSendImage = async () => {
    if (!convoId || !me?.userId || uploadingImage) return;
    try {
      // Open tray and load recent photos
      // open gallery viewer: dismiss keyboard and animate in
      Keyboard.dismiss();
      // prevent immediate backdrop presses from closing the modal (same tap)
      ignoreBackdropUntilRef.current = Date.now() + 400;
      setShowGalleryTray(true);
      // small delay so Modal is mounted before animation
      setTimeout(() => {
        Animated.timing(viewerAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      }, 30);
  // Ensure the list leaves room for the tray
  shouldAutoScrollRef.current = true;
  scrollToBottom(true);
      if (galleryItems.length === 0 && !galleryLoading) {
        setGalleryLoading(true);
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
          setGalleryLoading(false);
          Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
          return;
        }
        try {
          const page = await MediaLibrary.getAssetsAsync({ mediaType: ['photo'], sortBy: [MediaLibrary.SortBy.creationTime], first: 80 });
          // Resolve local URIs for better compatibility
          const infos = await Promise.all(page.assets.map(async (a: MediaLibrary.Asset) => {
            try {
              const info = await MediaLibrary.getAssetInfoAsync(a);
              return { id: a.id, uri: (info.localUri as string) || a.uri };
            } catch {
              return { id: a.id, uri: a.uri };
            }
          }));
          setGalleryItems(infos);
        } finally {
          setGalleryLoading(false);
        }
      }
    } finally {
      // No-op; uploading occurs on selection from the tray
    }
  };

  // Preload gallery images on open so the tray appears instantly
  const preloadGallery = React.useCallback(async () => {
    if (attemptedPreloadRef.current) return;
    if (galleryItems.length > 0 || galleryLoading) return;
    attemptedPreloadRef.current = true;
    try {
      // Check existing permission first
      const perm = await MediaLibrary.getPermissionsAsync();
      let granted = perm.status === 'granted';
      // If we can ask, request proactively so the tray won’t block later
      if (!granted && perm.canAskAgain) {
        const req = await MediaLibrary.requestPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (!granted) return;
      setGalleryLoading(true);
      try {
        const page = await MediaLibrary.getAssetsAsync({ mediaType: ['photo'], sortBy: [MediaLibrary.SortBy.creationTime], first: 80 });
        const infos = await Promise.all(page.assets.map(async (a: MediaLibrary.Asset) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(a);
            return { id: a.id, uri: (info.localUri as string) || a.uri };
          } catch {
            return { id: a.id, uri: a.uri };
          }
        }));
        setGalleryItems(infos);
      } finally {
        setGalleryLoading(false);
      }
    } catch {}
  }, [galleryItems.length, galleryLoading]);

  useFocusEffect(React.useCallback(() => {
    shouldAutoScrollRef.current = true;
    // Do an immediate non-animated jump to bottom before revealing the list
    requestAnimationFrame(() => {
      scrollToBottomNow(false);
    });
    // Kick off gallery preload in the background
    preloadGallery();
    const t0 = setTimeout(() => {
      if (shouldAutoScrollRef.current) scrollToBottom(true);
    }, 0);
    const t1 = setTimeout(() => {
      if (shouldAutoScrollRef.current) scrollToBottom(true);
    }, 60);
    const t2 = setTimeout(() => {
      if (shouldAutoScrollRef.current) scrollToBottom(true);
    }, 250);
    const intHandle = InteractionManager.runAfterInteractions(() => {
      if (shouldAutoScrollRef.current) scrollToBottom(true);
    });
    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2);
      // @ts-ignore InteractionManager types allow cancel via .cancel() on the handle
      try { intHandle.cancel && intHandle.cancel(); } catch {}
    };
  }, [convoId, preloadGallery]));

  const sendImageFromUri = async (uri: string) => {
    if (!convoId || !me?.userId || uploadingImage) return;
    setUploadingImage(true);
    try {
      // Close the tray immediately so the new bubble isn't obscured
      setShowGalleryTray(false);
      let manipulated;
      try {
        manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
      } catch (err) {
        Alert.alert('오류', '이미지를 처리하는 중 문제가 발생했습니다.');
        return;
      }
      const base64 = manipulated?.base64 || null;
      if (!base64) {
        Alert.alert('오류', '이미지를 처리할 수 없습니다.');
        return;
      }
      const optimistic: Msg = { id: `tmp-img-${Date.now()}`, me: true, imageUrl: uri, ts: Date.now() };
      setMessages((prev) => [...prev, optimistic]);
      // Trigger immediate and follow-up scrolls for reliability
      shouldAutoScrollRef.current = true;
      scrollToBottomNow(true);
      setTimeout(() => {
        if (shouldAutoScrollRef.current) {
          scrollToBottom(true);
          shouldAutoScrollRef.current = false;
        }
      }, 0);
      try {
        const res = await uploadChatImage(convoId, me.userId, `data:image/jpeg;base64,${base64}`);
        const abs = res.imageUrl ? `${API_BASE}${res.imageUrl}` : uri;
        setMessages((prev) => {
          const replaced = prev.map((m) => (m.id === optimistic.id ? { ...m, id: res.id, imageUrl: abs } : m));
          return dedupeByIdSorted(replaced);
        });
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        Alert.alert('업로드 실패', '이미지 전송에 실패했습니다. 네트워크 상태를 확인해주세요.');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const isSameDay = (a: number, b: number) => {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  };

  const formatDay = (ms: number) => {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  };

  const renderItem = ({ item, index }: { item: Msg; index: number }) => {
    // If this is an individual image message and there's a nearby bundle
    // message from the same sender, hide it so we only show the compact
    // bundle preview (prevents duplicate large placeholders).
    const BUNDLE_HIDE_WINDOW = 12000; // ms
    if (item.imageUrl && item.me) {
      for (let k = Math.max(0, index - 6); k < Math.min(messages.length, index + 6); k++) {
        const m = messages[k];
        if (m && m.type === 'bundle' && m.me && Math.abs((m.ts || 0) - (item.ts || 0)) < BUNDLE_HIDE_WINDOW) {
          return null;
        }
      }
    }

    // Collapse consecutive image-only messages from the same sender into a
    // single stacked preview to avoid multiple large empty placeholders.
    const isImageOnly = !!item.imageUrl && !item.text;
    let cluster: string[] | null = null;
    let clusterStart = index;
    if (isImageOnly) {
      const WINDOW = 10000; // ms - cluster time window
      // walk backwards to find start of cluster
      let i = index;
      while (i - 1 >= 0) {
        const prev = messages[i - 1];
        if (!prev) break;
        if (!!prev.imageUrl && !prev.text && prev.me === item.me && Math.abs((item.ts || 0) - (prev.ts || 0)) < WINDOW) {
          i -= 1;
        } else break;
      }
      clusterStart = i;
      // walk forwards to collect cluster images
      const imgs: string[] = [];
      for (let j = clusterStart; j < messages.length; j++) {
        const m = messages[j];
        if (!m) break;
        if (!!m.imageUrl && !m.text && m.me === item.me && Math.abs((m.ts || 0) - (messages[clusterStart].ts || 0)) < WINDOW) {
          imgs.push(m.imageUrl as string);
        } else break;
      }
      if (imgs.length > 1) cluster = imgs;
    }

    // If this message is part of a cluster but not the start, skip rendering it.
    if (cluster && index !== clusterStart) return null;

    const showDaySep = index === 0 || !isSameDay(messages[index - 1]?.ts, item.ts);
    const time = new Date(item.ts);
    const hh = String(time.getHours()).padStart(2,'0');
    const mm = String(time.getMinutes()).padStart(2,'0');
    // Only show timestamp for the last bubble in a same-sender, same-minute cluster
  const currBucket = Math.floor(item.ts / 60000);
  const next = messages[index + 1];
  const nextSameBucket = next ? Math.floor(next.ts / 60000) === currBucket : false;
  const nextSameSender = next ? next.me === item.me : false;
  // For bundle messages always show timestamp inline to avoid delayed/bottom timestamps
  const showTs = item.type === 'bundle' ? true : !(nextSameBucket && nextSameSender);
    return (
      <View>
        {showDaySep ? (
          <View style={styles.daySepContainer}>
            <View style={styles.daySepLine} />
            <Text style={styles.daySepLabel}>{formatDay(item.ts)}</Text>
            <View style={styles.daySepLine} />
          </View>
        ) : null}
  <View style={[styles.bubbleRow, item.me ? styles.bubbleRowMe : styles.bubbleRowOther]}>
          {item.type === 'payment' ? (
              <Pressable onPress={() => { if (item.status === 'PAID' && item.paymentId) setReceiptOpenFor(item.paymentId); }}>
                <PaymentMessage message={item} me={item.me} onPay={() => handlePay(item)} onOpenReceipt={() => { if (item.paymentId) setReceiptOpenFor(item.paymentId); }} />
              </Pressable>
          ) : item.type === 'bundle' ? (
            <Pressable onPress={() => setBundleOpen({ images: item.meta?.images || [] })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.bundleWrap}>
                  {(item.meta?.images || []).slice(0,3).map((u: string, i: number) => (
                    <Image key={i} source={{ uri: u }} style={[styles.bundleThumb, { left: i * 12, zIndex: 10 - i }]} />
                  ))}
                  {item.meta?.images && item.meta.images.length > 3 ? (
                    <View style={[styles.bundleMore, { left: 3 * 12 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>+{item.meta.images.length - 3}</Text></View>
                  ) : null}
                </View>
                {/* Always show inline timestamp for bundles so it matches single-image layout */}
                <Text style={[styles.sideTs, item.me ? styles.sideTsMe : styles.sideTsOther, { marginLeft: 8 }]}>{`${hh}:${mm}`}</Text>
              </View>
            </Pressable>
          ) : item.me ? (
            <>
              {showTs ? <Text style={[styles.sideTs, styles.sideTsMe]}>{`${hh}:${mm}`}</Text> : null}
              <View style={{ maxWidth: '80%', alignItems: 'flex-end' }}>
                {/** If this message started a clustered group of images, render a compact stacked preview */}
                {cluster ? (
                  <Pressable onPress={() => setBundleOpen({ images: cluster as string[] })}>
                    <View style={styles.bundleWrap}>
                      {(cluster as string[]).slice(0,3).map((u: string, i: number) => (
                        <Image key={i} source={{ uri: u }} style={[styles.bundleThumb, { left: i * 12, zIndex: 10 - i }]} />
                      ))}
                      {(cluster as string[]).length > 3 ? (
                        <View style={[styles.bundleMore, { left: 3 * 12 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>+{(cluster as string[]).length - 3}</Text></View>
                      ) : null}
                    </View>
                  </Pressable>
                ) : (
                  item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.imageThumb} />
                  ) : null
                )}
                {item.text ? (
                  <View style={[styles.bubble, styles.bubbleMe]}>
                    <Text style={[styles.bubbleText, styles.bubbleTextMe]}>{item.text}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={{ maxWidth: '80%' }}>
                {/* If this message started a clustered group of images from the other user, render a compact stacked preview */}
                {cluster ? (
                  <Pressable onPress={() => setBundleOpen({ images: cluster as string[] })}>
                    <View style={styles.bundleWrap}>
                      {(cluster as string[]).slice(0,3).map((u: string, i: number) => (
                        <Image key={i} source={{ uri: u }} style={[styles.bundleThumb, { left: i * 12, zIndex: 10 - i }]} />
                      ))}
                      {(cluster as string[]).length > 3 ? (
                        <View style={[styles.bundleMore, { left: 3 * 12 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>+{(cluster as string[]).length - 3}</Text></View>
                      ) : null}
                    </View>
                  </Pressable>
                ) : (
                  item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.imageThumb} />
                  ) : null
                )}
                {item.text ? (
                  <View style={[styles.bubble, styles.bubbleOther]}>
                    <Text style={styles.bubbleText}>{item.text}</Text>
                  </View>
                ) : null}
              </View>
              {showTs ? <Text style={[styles.sideTs, styles.sideTsOther]}>{`${hh}:${mm}`}</Text> : null}
              {isOpponentTyping && lastOpponentId === item.id ? (
                <View style={styles.typingInlineRow}>
                  <Text style={styles.typingInlineLabel}>상대방이 입력 중…</Text>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
  };

  // Receipt modal handlers
  const closeReceipt = () => setReceiptOpenFor(null);

  const onScroll = (e: any) => {
  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
  const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
  // Consider within 24px as being at bottom
  const atBottom = distanceFromBottom < 24;
    isAtBottomRef.current = atBottom;
  // Only show the button when scrolled up more than a threshold
  const SHOW_BTN_THRESHOLD = Math.max(200, layoutMeasurement.height * 0.25);
  setShowScrollBottom(distanceFromBottom > SHOW_BTN_THRESHOLD);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }} keyboardVerticalOffset={0}>
      <View style={styles.container}>
        {/* Loading overlay shown while we perform the final bottom scroll + brief delay */}
        {showLoadingOverlay ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : null}
        <FlatList
          key={listMountKey}
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          onScroll={onScroll}
          style={{ opacity: listReady ? 1 : 0 }}
          onScrollToIndexFailed={(info) => {
            // Retry after a short delay to allow measurement/virtualization to catch up
            setTimeout(() => {
              try { listRef.current?.scrollToIndex({ index: info.index, animated: true }); } catch {}
            }, 100);
          }}
          onLayout={(e) => {
            layoutHeightRef.current = e.nativeEvent.layout.height;
            if (shouldAutoScrollRef.current) {
              // Ensure we scroll once layout height is known
              scrollToBottom(false);
            }
          }}
          onContentSizeChange={(w, h) => {
            contentHeightRef.current = h;
            if (shouldAutoScrollRef.current) {
              // First-time prepare: jump without animation, then mark prepared
              if (!bottomPrepared) {
                scrollToBottom(false);
                setBottomPrepared(true);
              } else {
                // Subsequent auto-scrolls (e.g., after images load) can animate
                scrollToBottom(true);
              }
              shouldAutoScrollRef.current = false;
            }
          }}
          contentContainerStyle={{
            padding: 16, 
            // Reserve space for input bar, safe area (when keyboard hidden), and gallery tray if visible
            paddingBottom: 
              (keyboardVisible 
                ? Math.max(72, inputBarH + 6) 
                : Math.max(96, inputBarH + 12) + insets.bottom 
              ),
          }}
        />

        {/* Gallery viewer modal (vertical scrolling, selection, backdrop shadow) */}
        <Modal visible={showGalleryTray && listReady} transparent animationType="none" onRequestClose={() => setShowGalleryTray(false)}>
          {/* backdrop shadow that closes viewer when tapped */}
          <AnimatedTouchable activeOpacity={1} style={[styles.viewerBackdrop, { opacity: viewerAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.45] }) }]} onPress={() => {
            // ignore quick presses (likely the same tap that opened the viewer)
            if (Date.now() < ignoreBackdropUntilRef.current) return;
            // trigger close animation
            Animated.timing(viewerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowGalleryTray(false));
          }} />

          <Animated.View style={[styles.viewerContainer, { transform: [{ translateY: viewerAnim.interpolate({ inputRange: [0,1], outputRange: [screenHeight, 0] }) }] }] }>
            <View style={styles.galleryHeaderRow}>
              <Text style={styles.galleryTitle}>사진 선택</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={() => setSelectMode((s) => !s)} style={styles.galleryAction}><Text style={{ color: ACCENT }}>{selectMode ? '해제' : '선택'}</Text></Pressable>
                <Pressable onPress={() => {
                  // close with animation
                  Animated.timing(viewerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowGalleryTray(false));
                }} style={styles.galleryAction}><Text style={{ color: '#111827' }}>닫기</Text></Pressable>
              </View>
            </View>

            {galleryLoading ? (
              <View style={styles.galleryLoading}><Text style={{ color: '#6b7280' }}>불러오는 중…</Text></View>
            ) : (
              <FlatList
                data={galleryItems}
                keyExtractor={(it) => it.id}
                numColumns={4}
                renderItem={({ item, index }) => {
                  const isLastInRow = (index + 1) % 4 === 0;
                  return (
                    <Pressable onPress={() => {
                      if (selectMode) {
                        setSelectedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      } else {
                        // send immediately when not in select mode
                        sendImageFromUri(item.uri);
                        // close viewer
                        Animated.timing(viewerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowGalleryTray(false));
                      }
                    }} style={[styles.galleryListItem, { width: THUMB_SIZE, height: THUMB_SIZE, marginRight: isLastInRow ? 0 : 8 }]}>
                      <Image source={{ uri: item.uri }} style={[styles.galleryListImage, { width: THUMB_SIZE, height: THUMB_SIZE }]} />
                      {selectMode ? (
                        selectedItems[item.id] ? (
                          <View style={styles.selectedBadge}><Text style={{ color: '#fff', fontSize: 12 }}>✓</Text></View>
                        ) : (
                          <View style={styles.unselectedBadge} />
                        )
                      ) : null}
                    </Pressable>
                  );
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 12 }}
              />
            )}

            {/* action bar when in select mode */}
            {selectMode ? (
              <View style={styles.selectBar}>
                <Text style={{ fontSize: 14 }}>{Object.values(selectedItems).filter(Boolean).length} 선택</Text>
                <Pressable onPress={async () => {
                  const toSend = galleryItems.filter((g) => selectedItems[g.id]);
                  if (toSend.length === 0) return;
                  // optimistic bundle message shown immediately
                  const optimistic: Msg = { id: `bundle-${Date.now()}`, me: true, ts: Date.now(), type: 'bundle', meta: { images: toSend.map(t => t.uri) } } as any;
                  setMessages(prev => [...prev, optimistic]);
                  setSelectedItems({});
                  setSelectMode(false);
                  Animated.timing(viewerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowGalleryTray(false));

                  if (!me?.userId) return;
                  // Upload images (resize -> base64 when needed) and collect server URLs
                  const uploadedUrls: string[] = [];
                  for (const g of toSend) {
                    try {
                      let base64: string | null = null;
                      if (g.uri.startsWith('data:')) {
                        base64 = g.uri.split(',')[1] || null;
                      } else {
                        try {
                          const m = await ImageManipulator.manipulateAsync(
                            g.uri,
                            [{ resize: { width: 1024 } }],
                            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                          );
                          base64 = m?.base64 || null;
                        } catch (err) {
                          // fallback: try to upload without resizing (may fail on some platforms)
                          base64 = null;
                        }
                      }
                      if (!base64) continue;
                      const res = await uploadChatImage(convoId, me.userId, `data:image/jpeg;base64,${base64}`);
                      const abs = res.imageUrl ? `${API_BASE}${res.imageUrl}` : res.imageUrl || '';
                      if (abs) uploadedUrls.push(abs);
                    } catch (err) {
                      // continue on failure for each image
                    }
                  }

                  // If we uploaded at least one image, create a server-side bundle message so it persists
                  if (uploadedUrls.length > 0) {
                    try {
                      const body = JSON.stringify({ senderId: me.userId, type: 'bundle', meta: { images: uploadedUrls } });
                      const resp = await api<{ id: string }>(`/chats/${convoId}/messages`, { method: 'POST', body });
                      const serverId = (resp as any).id;
                      setMessages(prev => {
                        const replaced = prev.map((m) => (m.id === optimistic.id ? { ...m, id: serverId, meta: { images: uploadedUrls } } : m));
                        return dedupeByIdSorted(replaced);
                      });
                    } catch (err) {
                      // If creating bundle message fails, at least update optimistic meta to the uploaded URLs
                      setMessages(prev => prev.map((m) => (m.id === optimistic.id ? { ...m, meta: { images: uploadedUrls } } : m)));
                    }
                  } else {
                    // No uploads succeeded: remove optimistic and inform user
                    setMessages(prev => prev.filter((m) => m.id !== optimistic.id));
                    Alert.alert('전송 실패', '이미지 업로드에 실패했습니다. 네트워크를 확인하세요.');
                  }
                }} style={[styles.galleryAction, { backgroundColor: ACCENT, paddingHorizontal: 12 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>전송</Text></Pressable>
              </View>
            ) : null}
          </Animated.View>
        </Modal>

  {showScrollBottom && listReady ? ( 
          <Pressable
      style={[styles.scrollBottom, { bottom: inputBarH + (showGalleryTray ? GALLERY_TRAY_HEIGHT : 0) + 16 }]}
            onPress={() => {
              shouldAutoScrollRef.current = true;
              scrollToBottom(true);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 28, lineHeight: 28 }}>↓</Text>
          </Pressable>
        ) : null}

  <View
      style={[styles.inputBar, { paddingBottom: (keyboardVisible ? 6 : 12 + insets.bottom), opacity: listReady ? 1 : 0 }]}
      pointerEvents={listReady ? 'auto' : 'none'}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h !== inputBarH) {
              setInputBarH(h);
      if (!inputMeasured && h > 0) setInputMeasured(true);
              if (isAtBottomRef.current) {
                // Keep anchored to bottom when input bar grows/shrinks
                shouldAutoScrollRef.current = true;
                scrollToBottom(false);
              }
            }
          }}
        >
          <Pressable style={styles.mediaBtn} onPress={pickAndSendImage} disabled={uploadingImage} accessibilityRole="button" accessibilityLabel="이미지 선택">
            <FontAwesome6 name="image" size={20} color={uploadingImage ? "#9ca3af" : "#111827"} />
          </Pressable>
          <Pressable style={styles.mediaBtn} onPress={pasteBankCode} accessibilityRole="button" accessibilityLabel="계좌 붙여넣기">
            <FontAwesome6 name="credit-card" size={20} color={'#111827'} />
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="메시지 보내기"
            ref={(r) => { inputRef.current = r; }}
            value={input}
            onChangeText={(t) => { setInput(t); notifyTyping(t.trim().length > 0); }}
            onFocus={() => {
              shouldAutoScrollRef.current = true;
              scrollToBottomNow(true);
              setTimeout(() => {
                if (shouldAutoScrollRef.current) {
                  scrollToBottom(true);
                  shouldAutoScrollRef.current = false;
                }
              }, 0);
            }}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendText}>전송</Text>
          </Pressable>
          {/* inline typing indicator moved to message list */}
        </View>

        {/* Bottom sheet menu */}
        <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
            <View />
          </Pressable>
          <View style={[styles.menuSheet, { paddingBottom: 12 + insets.bottom }]}> 
            <View style={styles.menuHandle} />
            <Pressable style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("신고", "사용자를 신고했습니다."); }}>
              <Text style={styles.menuItemText}>사용자 신고</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable style={styles.menuItem} onPress={() => { setShowMenu(false); Alert.alert("차단", "사용자를 차단했습니다."); }}>
              <Text style={[styles.menuItemText, { color: "#b91c1c" }]}>사용자 차단</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable style={styles.menuItem} onPress={() => {
              setShowMenu(false);
              Alert.alert("대화 삭제", "이 대화를 삭제하시겠어요?", [
                { text: "취소", style: "cancel" },
                { text: "삭제", style: "destructive", onPress: () => navigation.goBack() },
              ]);
            }}>
              <Text style={[styles.menuItemText, { color: "#dc2626", fontWeight: "700" }]}>대화 삭제</Text>
            </Pressable>
            <View style={{ height: 8 }} />
            <Pressable style={[styles.menuItem, styles.menuCancel]} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuCancelText}>취소</Text>
            </Pressable>
          </View>
        </Modal>
      </View>
        <ReceiptModal visible={!!receiptOpenFor} onClose={() => setReceiptOpenFor(null)} orderId={receiptOpenFor ?? undefined} />
  <ImageBundleViewer images={bundleOpen?.images || []} visible={!!bundleOpen} onClose={() => setBundleOpen(null)} />
        <Modal visible={showBankModal} transparent animationType="fade" onRequestClose={() => setShowBankModal(false)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setShowBankModal(false)}>
            <View />
          </Pressable>
          <View style={[styles.menuSheet, { paddingBottom: 12 + insets.bottom, paddingHorizontal: 16 }]}> 
            <View style={styles.menuHandle} />
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>계좌이체 시작</Text>
            <Text style={{ marginBottom: 8 }}>판매자에게 직접 계좌이체할 금액을 입력하세요.</Text>
            <TextInput value={bankAmount} onChangeText={setBankAmount} keyboardType="numeric" placeholder="금액 (원)" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginBottom: 8 }} />
            <Pressable style={[styles.menuItem, { backgroundColor: '#111827', borderRadius: 8, marginBottom: 8 }]} onPress={startBankTransfer} disabled={bankProcessing}><Text style={[styles.menuItemText, { color: '#fff', fontWeight: '700' }]}>{bankProcessing ? '처리중...' : '계좌이체 요청'}</Text></Pressable>
            {bankOrderId ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ marginBottom: 6 }}>주문 ID: {bankOrderId}</Text>
                {bankSellerInfo ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 4 }}>판매자 계좌 정보</Text>
                    {bankSellerInfo.name ? <Text>예금주: {bankSellerInfo.name}</Text> : null}
                    {bankSellerInfo.bank ? <Text>은행: {bankSellerInfo.bank}</Text> : null}
                    {bankSellerInfo.account ? <Text>계좌번호: {bankSellerInfo.account}</Text> : null}
                    <Text style={{ marginTop: 6, color: '#6b7280' }}>입금 후 아래 버튼을 눌러 판매자에게 알림을 보내세요.</Text>
                  </View>
                ) : (
                  <Text style={{ marginBottom: 6 }}>판매자 계좌 정보가 등록되어 있지 않습니다. 실제 송금은 판매자와 별도로 진행하세요.</Text>
                )}
                <Pressable style={[styles.menuItem, { backgroundColor: '#111827', borderRadius: 8, marginBottom: 8 }]} onPress={markBankSent} disabled={bankProcessing}><Text style={[styles.menuItemText, { color: '#fff', fontWeight: '700' }]}>{bankProcessing ? '처리중...' : '송금 완료 알리기'}</Text></Pressable>
                {__DEV__ ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ marginBottom: 6, color: '#6b7280' }}>개발용: 실제은행 송금 시 서버에서 webhook으로 결제완료를 처리하거나 아래 버튼으로 샌드박스에서 완료 표시하세요.</Text>
                    <Pressable style={[styles.menuItem, { backgroundColor: '#f93414', borderRadius: 8 }]} onPress={markBankCompleteDev} disabled={bankProcessing}><Text style={[styles.menuItemText, { color: '#fff', fontWeight: '700' }]}>샌드박스 결제완료 표시</Text></Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={{ height: 8 }} />
            <Pressable style={[styles.menuItem, styles.menuCancel]} onPress={() => setShowBankModal(false)}><Text style={styles.menuCancelText}>취소</Text></Pressable>
          </View>
        </Modal>
      </KeyboardAvoidingView>
  );
}

  // Note: unreachable here due to function closing above in the original file structure; ensure ReceiptModal is rendered inside component return in previous patch

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    height: 56,
  backgroundColor: "#FAF9F6",
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
  headerBack: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingRight: 8, marginRight: 4 },
  headerBackIcon: { fontSize: 24, color: "#111827" },
  headerBackText: { fontSize: 16, color: "#111827" },

  bubbleRow: { marginBottom: 10, flexDirection: "row", alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  // Increased padding and radius for a larger, more readable bubble
  bubble: { maxWidth: "80%", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  bubbleMe: { backgroundColor: ACCENT, borderTopRightRadius: 6 },
  bubbleOther: { backgroundColor: ACCENT_LIGHT, borderTopLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: ACCENT_BORDER },
  // Larger font for improved readability
  bubbleText: { fontSize: 18, color: "#111827" },
  bubbleTextMe: { color: "#fff" },
  ts: { fontSize: 11, marginTop: 4, color: "#6b7280" },
  tsLeft: { alignSelf: "flex-start" },
  tsRight: { alignSelf: "flex-end" },
  tsOnMe: { color: "rgba(255,255,255,0.85)" },
  sideTs: { fontSize: 12, color: '#6b7280' },
  sideTsMe: { marginRight: 6 },
  sideTsOther: { marginLeft: 6 },
  imageThumb: { width: 220, height: 220, borderRadius: 12, marginBottom: 4, backgroundColor: '#e5e7eb' },

  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  backgroundColor: "#FAF9F6",
    flexDirection: "row",
  alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    gap: 8,
  zIndex: 10,
  },
  mediaBtn: {
    width: 38,
    height: 38,
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
  sendBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: ACCENT, borderRadius: 10 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  typingWrap: { position: 'absolute', left: 60, right: 96, bottom: 50, paddingVertical: 2 },
  typingText: { fontSize: 12, color: '#6b7280' },
  typingInlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 8 },
  typingInlineLabel: { fontSize: 12, color: '#6b7280', marginRight: 6 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9ca3af', opacity: 0.3 },
  dot1: { opacity: 0.3 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.9 },

  scrollBottom: {
  position: "absolute",
  right: 16,
  bottom: 84,
  backgroundColor: "#111827",
  borderRadius: 28,
  width: 56,
  height: 56,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  },

  // Gallery tray
  galleryTray: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  galleryTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  galleryClose: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  galleryLoading: { paddingHorizontal: 12, paddingVertical: 12 },
  galleryThumbWrap: { width: 132, height: 132, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  galleryThumb: { width: '100%', height: '100%' },

  // Bottom sheet styles
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  menuSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: { fontSize: 16, color: '#111827' },
  menuSep: { height: 1, backgroundColor: '#e5e7eb', marginHorizontal: 16 },
  menuCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  menuCancelText: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Day separator
  daySepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  daySepLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  daySepLabel: {
    marginHorizontal: 10,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  // Viewer modal styles
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 60,
  },
  viewerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 80,
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    zIndex: 70,
    overflow: 'hidden',
  },
  galleryHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  galleryAction: { paddingHorizontal: 8, paddingVertical: 6 },
  galleryListItem: { marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  galleryListImage: { width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: '#e5e7eb' },
  selectedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: ACCENT, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unselectedBadge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)', borderStyle: 'dotted', backgroundColor: 'transparent' },
  selectBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bundleWrap: { width: 120, height: 80, position: 'relative' },
  bundleThumb: { position: 'absolute', width: 80, height: 80, borderRadius: 8, resizeMode: 'cover', backgroundColor: '#e5e7eb' },
  bundleMore: { position: 'absolute', width: 80, height: 80, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
