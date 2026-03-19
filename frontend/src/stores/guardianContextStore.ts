import { create } from "zustand";

interface GuardianContextState {
  selectedGuardianId: string | null;
  setGuardianId: (guardianId: string | null) => void;
}

export const useGuardianContextStore = create<GuardianContextState>((set) => ({
  selectedGuardianId: null,
  setGuardianId: (guardianId) => set({ selectedGuardianId: guardianId }),
}));
