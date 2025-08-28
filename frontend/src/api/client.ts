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

export const API_BASE = resolveApiBase();

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
  const url = `${API_BASE}${path}`;
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