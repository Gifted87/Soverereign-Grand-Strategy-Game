import { StateCreator } from 'zustand';

export interface PlayerSlice {
  startingSetup: any | null;
  setStartingSetup: (setup: any) => void;
}

export const createPlayerSlice: StateCreator<PlayerSlice> = (set) => ({
  startingSetup: null,
  setStartingSetup: (setup) => set({ startingSetup: setup }),
});
