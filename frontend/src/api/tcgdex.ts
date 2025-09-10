import { API_BASE as BACKEND_BASE } from "./client";

export type TcgDexCardBrief = {
  id: string;
  localId?: string | number;
  name: string;
  image?: string;
  // Optional fields when the backend includes extra data
  rarity?: string;
  set?: TcgDexSetBrief;
};

export async function searchTcgDexCards(query: string, page = 1, pageSize = 30, lang = "en", signal?: AbortSignal): Promise<TcgDexCardBrief[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("lang", lang);
  const res = await fetch(`${BACKEND_BASE}/tcgdex/cards/search?${params.toString()}`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `TCGdex proxy error: ${res.status}`);
  }
  return (await res.json()) as TcgDexCardBrief[];
}

export type TcgDexSetBrief = { id: string; name: string };
export type TcgDexCard = {
  id: string;
  localId?: string | number;
  name: string;
  image?: string;
  rarity?: string;
  set?: TcgDexSetBrief;
  category?: string;
  regulationMark?: string;
  // Optional fields present on full card payloads
  variants?: Record<string, boolean> | string[];
};

export async function getTcgDexCard(cardId: string, lang = "en", signal?: AbortSignal): Promise<TcgDexCard> {
  const params = new URLSearchParams();
  params.set("lang", lang);
  const res = await fetch(`${BACKEND_BASE}/tcgdex/cards/${encodeURIComponent(cardId)}?${params.toString()}`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `TCGdex proxy error: ${res.status}`);
  }
  return (await res.json()) as TcgDexCard;
}
