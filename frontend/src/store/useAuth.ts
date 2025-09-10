import { create } from "zustand";

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
	terms_and_conditions?: boolean;
} | null;

type State = { user: UserPublic; setUser: (u:UserPublic)=>void; logout: ()=>void };

export const useAuth = create<State>((set)=>({
	user:null,
	setUser:(user)=>set({user}),
	logout: ()=> set({ user: null }),
}));
