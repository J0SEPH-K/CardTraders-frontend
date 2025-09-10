import { API_BASE, api } from '@/api/client';

let _loaded = false;
let _cfg: Record<string, any> = {};

export async function loadRuntimeConfig() {
  if (_loaded) return _cfg;
  try {
    const r = await api<{ config: Record<string, any> }>(`/config`);
    _cfg = r?.config ?? {};
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[config] load failed, using defaults:', String(e));
  } finally {
    _loaded = true;
  }
  return _cfg;
}

export function getConfig<T = any>(key: string, fallback?: T): T | undefined {
  return (_cfg[key] as T) ?? (fallback as T | undefined);
}

export function getAllConfig() {
  return { ..._cfg, API_BASE };
}
