import { StateCreator } from 'zustand';
import { ResourceLevel } from '../../types';

export interface EconomySlice {
  resources: ResourceLevel;
  spendGold: (amount: number) => boolean;
}

export const createEconomySlice: StateCreator<EconomySlice> = (set) => ({
  resources: {
    gold: 5400,
    food: 12500,
    iron: 850,
    wood: 2100,
    stone: 400,
    manpower: 1200,
    prestige: 150,
  },
  spendGold: (amount) => {
    let success = false;
    set((state) => {
      const currentGold = state.resources.gold;
      if (currentGold >= amount) {
        success = true;
        return {
          resources: {
            ...state.resources,
            gold: Math.max(0, currentGold - amount)
          }
        };
      }
      return {};
    });
    return success;
  },
});
