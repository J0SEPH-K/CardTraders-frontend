import { create } from "zustand";
type User = { id:string; email:string } | null;
type State = { user: User; setUser: (u:User)=>void };
export const useAuth = create<State>((set)=>({ user:null, setUser:(user)=>set({user}) }));
