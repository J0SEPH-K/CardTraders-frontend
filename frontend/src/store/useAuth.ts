import { create } from "zustand";

export type UserPublic = {
	id?: string | null;
	userId: string;
	username: string;
	email: string;
	phone_num?: string | null;
	address?: string | null;
	signup_date?: string | null;
	suggested_num?: number;
	starred_item?: string[];
	messages?: any[];
	premade_messages?: string[];
	notification?: boolean;
	blocked_users?: string[];
	pfp?: { url?: string | null; storage?: string | null } | null;
} | null;

type State = { user: UserPublic; setUser: (u:UserPublic)=>void; logout: ()=>void };

export const useAuth = create<State>((set)=>({
	user:null,
	setUser:(user)=>set({user}),
	logout: ()=> set({ user: null }),
}));
