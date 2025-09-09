import { create } from "zustand";

// Lightweight platform storage wrapper: prefer MMKV on native, fall back to localStorage in web
let storage: {
	getString: (k: string) => string | null;
	setString: (k: string, v: string) => void;
	delete: (k: string) => void;
} | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
	const { MMKV } = require('react-native-mmkv');
	const kv = new MMKV();
	storage = {
		getString: (k: string) => kv.getString(k) ?? null,
		setString: (k: string, v: string) => kv.set(k, v),
		delete: (k: string) => kv.delete(k),
	};
} catch (e) {
	// Not running in native environment or MMKV not available. Use localStorage when possible.
	if (typeof localStorage !== 'undefined') {
		storage = {
			getString: (k: string) => localStorage.getItem(k),
			setString: (k: string, v: string) => localStorage.setItem(k, v),
			delete: (k: string) => localStorage.removeItem(k),
		};
	} else {
		storage = null;
	}
}

const STORAGE_KEY = 'cardtraders.auth.user';

function loadStoredUser(): any | null {
	try {
		if (!storage) return null;
		const s = storage.getString(STORAGE_KEY);
		if (!s) return null;
		return JSON.parse(s) as any;
	} catch (e) {
		return null;
	}
}

function saveStoredUser(u: any | null) {
	try {
		if (!storage) return;
		if (!u) {
			storage.delete(STORAGE_KEY);
		} else {
			storage.setString(STORAGE_KEY, JSON.stringify(u));
		}
	} catch (e) {
		// ignore
	}
}

function normalizeUser(u: any | null) {
	if (!u) return null;
	const out = { ...u };
	try {
		if (Array.isArray(out.favorites)) {
			out.favorites = Array.from(new Set(out.favorites.map((x: any) => String(x))));
		}
	} catch (e) {
		out.favorites = out.favorites || [];
	}
	try {
		if (Array.isArray(out.starred_item)) {
			out.starred_item = Array.from(new Set(out.starred_item.map((x: any) => String(x))));
		}
	} catch (e) {
		out.starred_item = out.starred_item || [];
	}
	return out;
}

export type UserPublic = {
	id?: string | null;
	userId: string;
	username: string;
	email: string;
	phone_num?: string | null;
	bank_acc?: string | null;
	address?: string | null;
	signup_date?: string | null;
	suggested_num?: number;
	// new standardized favorites list (card ids as strings)
	favorites?: string[];
	// legacy field kept for compatibility with older code
	starred_item?: string[];
	messages?: any[];
	premade_messages?: string[];
	notification?: boolean;
	blocked_users?: string[];
	pfp?: { url?: string | null; storage?: string | null } | null;
} | null;

type State = { user: UserPublic; setUser: (u:UserPublic)=>void; logout: ()=>void };

const initialUser = normalizeUser(loadStoredUser());

export const useAuth = create<State>((set)=>({
	user: initialUser as UserPublic ?? null,
	setUser:(user)=>{
		const norm = normalizeUser(user as any);
		saveStoredUser(norm);
		set({user: norm});
	},
	logout: ()=>{
		saveStoredUser(null);
		set({ user: null });
	},
}));
