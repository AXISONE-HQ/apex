import { create } from "zustand";

interface SessionState {
  orgId: string;
  userName: string;
  email: string;
  role: string;
  setSession: (payload: Partial<Omit<SessionState, "setSession">>) => void;
}

const DEFAULT_STATE: Omit<SessionState, "setSession"> = {
  orgId: "00000000-0000-0000-0000-000000000001",
  userName: "Alex Morgan",
  email: "alex@apex.dev",
  role: "org-admin",
};

export const useSessionStore = create<SessionState>((set) => ({
  ...DEFAULT_STATE,
  setSession: (payload) => set((state) => ({ ...state, ...payload })),
}));
