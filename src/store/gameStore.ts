import { create } from 'zustand';
import { GameState } from '../types';

import { UISlice, createUISlice } from './slices/uiSlice';
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { PlayerSlice, createPlayerSlice } from './slices/playerSlice';
import { DiplomacySlice, createDiplomacySlice } from './slices/diplomacySlice';
import { EconomySlice, createEconomySlice } from './slices/economySlice';
import { ChronicleSlice, createChronicleSlice } from './slices/chronicleSlice';
import { PoliticsSlice, createPoliticsSlice } from './slices/politicsSlice';
import { MilitarySlice, createMilitarySlice } from './slices/militarySlice';
import { WorldSlice, createWorldSlice } from './slices/worldSlice';

export type FullStore = GameState &
  UISlice &
  SettingsSlice &
  PlayerSlice &
  DiplomacySlice &
  EconomySlice &
  ChronicleSlice &
  PoliticsSlice &
  MilitarySlice &
  WorldSlice;

export const useGameStore = create<FullStore>((set, get, api) => ({
  ...createUISlice(set, get, api),
  ...createSettingsSlice(set, get, api),
  ...createPlayerSlice(set, get, api),
  ...createDiplomacySlice(set, get, api),
  ...createEconomySlice(set, get, api),
  ...createChronicleSlice(set, get, api),
  ...createPoliticsSlice(set, get, api),
  ...createMilitarySlice(set, get, api),
  ...createWorldSlice(set, get, api),

  updateFromSnapshot: (snapshot) => set((state) => {
    return {
      ...state,
      ...snapshot,
    };
  }),
}));
