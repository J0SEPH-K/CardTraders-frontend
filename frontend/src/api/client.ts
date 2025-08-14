export const API_BASE = (process.env.EXPO_PUBLIC_API || "http://localhost:8000") as string;

export async function api<T>(path: string, init?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as T;
}