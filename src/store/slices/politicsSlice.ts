import { StateCreator } from 'zustand';
import { Character, Dynasty, Faction, Plot, Religion, Treaty } from '../../types';

export interface PoliticsSlice {
  characters?: Record<string, Character>;
  dynasties?: Record<string, Dynasty>;
  factions?: Record<string, Faction>;
  plots?: Record<string, Plot>;
  religions?: Record<string, Religion>;
  treaties?: Record<string, Treaty>;
}

export const createPoliticsSlice: StateCreator<PoliticsSlice> = () => ({
  characters: {},
  dynasties: {},
  factions: {},
  plots: {},
  religions: {},
  treaties: {},
});
