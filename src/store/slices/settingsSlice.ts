import { StateCreator } from 'zustand';

export interface SettingsSlice {
  isPaused: boolean;
  speed: number;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  isPaused: true,
  speed: 1,
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setSpeed: (speed) => set({ speed }),
});
