import { create } from "zustand";

interface SessionState {
  orgId: string;
  userName: string;
  email: string;
  role: string;
  setSession: (payload: Partial<Omit<SessionState, "setSession">>) => void;
}

const DEFAULT_STATE: Omit<SessionState, "setSession"> = {
  orgId: "",
  userName: "",
  email: "",
  role: "",
};

export const useSessionStore = create<SessionState>((set) => ({
  ...DEFAULT_STATE,
  setSession: (payload) => set((state) => ({ ...state, ...payload })),
}));
