import { create } from "zustand";

interface SessionState {
  orgId: string;
  userName: string;
  role: "platform" | "org-admin" | "coach";
  setSession: (payload: Partial<SessionState>) => void;
}

const DEFAULT_STATE = {
  orgId: "00000000-0000-0000-0000-000000000001",
  userName: "Alex Morgan",
  role: "org-admin" as const,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...DEFAULT_STATE,
  setSession: (payload) => set((state) => ({ ...state, ...payload })),
}));
