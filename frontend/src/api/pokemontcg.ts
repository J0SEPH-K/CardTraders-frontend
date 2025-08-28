// DEPRECATED: Replaced by TCGdex via backend proxy. Do not use in new code.

export type PokemonTCGImageSet = {
  small: string;
  large: string;
};

export type PokemonTCGSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
};

export type PokemonTCGCard = {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  number?: string;
  rarity?: string;
  set?: PokemonTCGSet;
  images?: PokemonTCGImageSet;
};

type PokemonTCGSearchResponse = {
  data: PokemonTCGCard[];
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
};

// Route through backend to avoid exposing keys on the client
import { API_BASE as BACKEND_BASE } from "./client";

function buildNameQuery(input: string): string {
  const tokens = input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return "";
  // Require all tokens to appear in the name (AND)
  const parts = tokens.map((t) => `name:*${t.replace(/[^a-z0-9-]/g, "*")}*`);
  return parts.join(" AND ");
}

export async function searchPokemonCards(): Promise<never> {
  throw new Error("pokemontcg API is deprecated. Use searchTcgDexCards from ./tcgdex instead.");
}
