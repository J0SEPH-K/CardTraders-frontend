import Constants from "expo-constants";

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API as string | undefined;
  if (env && env.trim().length > 0) return env;
  // Derive the dev machine's LAN IP from Expo host when running on a physical device.
  const hostUri = (Constants as any)?.manifest?.debuggerHost
    || (Constants as any)?.expoConfig?.hostUri
    || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri
    || (Constants as any)?.manifest2?.extra?.expoGo?.hostUri;
  if (typeof hostUri === "string" && hostUri.length) {
    // Extract the hostname part (e.g., "192.168.0.12" from "192.168.0.12:19000")
    const host = hostUri.split(":" )[0];
    const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
    if (isIPv4) {
      return `http://${host}:8000`;
    }
    // If not an IP (e.g., exp.host in tunnel mode), don't use it.
  }
  return "http://localhost:8000";
}

export let API_BASE = resolveApiBase();
export function setApiBase(url: string) {
  if (typeof url === 'string' && url.length) {
    API_BASE = url;
  }
}

const API_TIMEOUT_MS = Number((process as any)?.env?.EXPO_PUBLIC_API_TIMEOUT_MS || 12000);

function withTimeout<T>(p: Promise<T>, ms: number, abort: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      abort();
      reject(new Error(`timeout after ${ms}ms`));
    }, ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function api<T>(path: string, init?: RequestInit) {
  // Normalize to avoid double slashes when API_BASE ends with '/' and path starts with '/'
  const base = API_BASE.replace(/\/+$/, "");
  const pth = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${pth}`;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Log once per call to help diagnose device networking
    // eslint-disable-next-line no-console
    console.log("[api]", init?.method || "GET", url);
  }
  const controller = new AbortController();
  const opts: RequestInit = {
    ...init,
    signal: init?.signal ?? controller.signal,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  };
  try {
    const r = await withTimeout(fetch(url, opts), API_TIMEOUT_MS, () => controller.abort());
    if (!r.ok) {
      const body = await (async () => { try { return await (r as any).text(); } catch { return ""; } })();
      throw new Error(`HTTP ${r.status} ${r.statusText} at ${url}${body ? `: ${body}` : ""}`);
    }
    return (await r.json()) as T;
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : String(e);
    throw new Error(`Fetch failed ${url}: ${msg}`);
  }
}

// Auth API
export type LoginResponse = { user: import("@/store/useAuth").UserPublic };

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function requestPhoneCode(countryCode: string, phone: string) {
  return api<{ verificationId: string; expiresIn: number; devCode?: string }>(`/auth/request-phone-code`, {
    method: "POST",
    body: JSON.stringify({ countryCode, phone }),
  });
}

export async function verifyPhoneCode(verificationId: string, code: string) {
  return api<{ ok: boolean; target: string }>(`/auth/verify-phone-code`, {
    method: "POST",
    body: JSON.stringify({ verificationId, code }),
  });
}

export async function requestEmailCode(email: string) {
  return api<{ verificationId: string; expiresIn: number; devCode?: string }>(`/auth/request-email-code`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailCode(verificationId: string, code: string) {
  return api<{ ok: boolean; target: string }>(`/auth/verify-email-code`, {
    method: "POST",
    body: JSON.stringify({ verificationId, code }),
  });
}

export async function signupApi(payload: {
  email: string;
  password: string;
  username: string;
  countryCode: string;
  phone: string;
  address: string;
  pfp_url?: string | null;
  emailVerificationId: string;
  phoneVerificationId: string;
}): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/signup`, { method: "POST", body: JSON.stringify(payload) });
}

// Google auth API
export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/login-google`, { method: "POST", body: JSON.stringify({ idToken }) });
}

export async function completeProfileGoogle(idToken: string, username: string, address: string): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/complete-profile-google`, { method: "POST", body: JSON.stringify({ idToken, username, address }) });
}

export async function updateProfileApi(payload: {
  id?: string | null;
  userId?: string;
  email?: string;
  username?: string;
  phone_num?: string;
  address?: string;
  // Favorites array of item ids
  favorites?: string[] | null;
  // One of the following for avatar; image_base64 takes precedence if provided
  image_base64?: string | null;
  pfp_url?: string | null;
}): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/update-profile`, { method: "POST", body: JSON.stringify(payload) });
}

export async function acceptTermsAndConditions(userId: string): Promise<LoginResponse> {
  return api<LoginResponse>(`/auth/accept-terms`, { method: "POST", body: JSON.stringify({ userId, terms_and_conditions: true }) });
}

// Uploaded cards API
export type CreateUploadedCardPayload = {
  category: string;
  card_name?: string;
  rarity?: string;
  variants?: string[] | string;
  language?: string;
  set?: string;
  card_num?: string | number;
  price?: number | string;
  description?: string;
  uploadDate?: string | number;
  uploadedBy?: string | number;
  image_base64?: string; // data URL or base64 string
};

export async function createUploadedCard(payload: CreateUploadedCardPayload) {
  // Use trailing slash to match FastAPI router prefix + "/" route and avoid 307 redirect
  return api(`/uploaded-cards/`, { method: "POST", body: JSON.stringify(payload) });
}

export async function getUploadedCard(id: string | number) {
  return api<any>(`/uploaded-cards/${encodeURIComponent(String(id))}`);
}

export async function advertiseUploadedCard(id: string | number) {
  return api<any>(`/uploaded-cards/${encodeURIComponent(String(id))}/advertise`, { method: 'POST' });
}

export async function updateUploadedCard(id: string | number, payload: Partial<CreateUploadedCardPayload>) {
  return api<any>(`/uploaded-cards/${encodeURIComponent(String(id))}`, { 
    method: 'PUT', 
    body: JSON.stringify(payload) 
  });
}

// Chat API
export type Conversation = {
  id: string;
  participants: string[];
  participantsHash: string;
  listingId?: string | null;
  lastMessage?: { text: string; senderId: string; at: string };
  unread?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export async function getOrCreateConversation(participants: string[], listingId?: string | null) {
  return api<Conversation>(`/chats/conversations/get-or-create`, {
    method: "POST",
    body: JSON.stringify({ participants, listingId: listingId ?? null }),
  });
}

export type ChatMessage = {
  id: string;
  convoId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  at: string;
  status?: string;
  // optional payment message fields
  type?: string;
  paymentId?: string;
  meta?: any;
};

// Payments API
export async function createOrder(payload: { buyer_id: string; seller_id: string; chatId?: string | null; item_id?: string | null; amount: number; currency?: string; }) {
  return api<{ order_id: string; checkout_url?: string; provider_token?: string; message_id?: string; payment_reference?: string }>(`/payments/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reconcileTransaction(tx: { tx_id: string; amount: number; description?: string; payer_name?: string }) {
  return api<{ matched_order_id?: string; matched: boolean; reason?: string }>(`/payments/reconcile`, {
    method: 'POST',
    body: JSON.stringify(tx),
  });
}

export async function uploadProof(order_id: string, proof_url: string) {
  return api<{ ok: boolean; order_id?: string }>(`/payments/${encodeURIComponent(order_id)}/upload-proof`, {
    method: 'POST',
    body: JSON.stringify({ proof_url }),
  });
}

// Mark a payment as pending (created by user after uploading proof / indicating transfer)
export async function startPending(order_id: string, payload: { tierId?: string; note?: string } = {}) {
  return api<{ ok: boolean; order_id?: string }>(`/payments/${encodeURIComponent(order_id)}/pending`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPayment(order_id: string) {
  return api<any>(`/payments/${encodeURIComponent(order_id)}`);
}

export async function listMessages(convoId: string, beforeId?: string, limit = 50) {
  const params = new URLSearchParams();
  if (beforeId) params.set("beforeId", beforeId);
  if (limit) params.set("limit", String(limit));
  return api<{ items: ChatMessage[] }>(`/chats/${convoId}/messages?${params.toString()}`);
}

export async function sendMessage(convoId: string, senderId: string, text?: string, imageUrl?: string) {
  return api<{ id: string }>(`/chats/${convoId}/messages`, {
    method: "POST",
    body: JSON.stringify({ senderId, text, imageUrl }),
  });
}

export async function markRead(convoId: string, readerId: string) {
  return api<{ ok: boolean }>(`/chats/${convoId}/read`, {
    method: "POST",
    body: JSON.stringify({ readerId }),
  });
}

export async function listConversations(userId: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ userId, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return api<{ items: Conversation[] }>(`/chats/conversations?${params.toString()}`);
}

export async function uploadChatImage(convoId: string, senderId: string, image_base64: string) {
  return api<{ id: string; imageUrl: string }>(`/chats/${convoId}/attachments`, {
    method: "POST",
    body: JSON.stringify({ senderId, image_base64 }),
  });
}

// WebSocket helpers for chat
export type ChatWsEvent =
  | { type: 'new_message'; convoId: string; message: ChatMessage }
  | { type: 'typing'; convoId: string; userId: string; isTyping: boolean }
  | { type: 'read'; convoId: string; readerId: string };

// Payment events emitted by the server over the chat websocket
export type ChatPaymentStarted = {
  type: 'payment.started';
  convoId: string;
  message: ChatMessage & { type: 'payment'; paymentId: string; meta: any; status: string };
};

export type ChatPaymentUpdated = {
  type: 'payment.updated';
  convoId: string;
  message: { id: string; paymentId: string; status: string; providerInfo?: any };
};

export type ChatWsEventAll = ChatWsEvent | ChatPaymentStarted | ChatPaymentUpdated;

export function openChatWebSocket(convoId: string, userId?: string): WebSocket {
  // Prefer ws(s) based on API_BASE
  const url = new URL(API_BASE.replace(/\/+$/, ''));
  const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
  // backend router mounted at /chats, ws route at /ws/{convoId}
  const wsUrl = `${wsProto}//${url.host}/chats/ws/${encodeURIComponent(convoId)}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
  const ws = new WebSocket(wsUrl);
  return ws;
}