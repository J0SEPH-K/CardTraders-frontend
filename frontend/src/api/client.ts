export const API_BASE = process.env.EXPO_PUBLIC_API ?? "http://localhost:8000"\;
export async function api<T>(path:string, init?:RequestInit){
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { "content-type":"application/json", ...(init?.headers||{}) }});
  if(!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
