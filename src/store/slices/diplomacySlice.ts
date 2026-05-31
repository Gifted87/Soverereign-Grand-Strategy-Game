import { StateCreator } from 'zustand';
import { Character } from '../../types';

export interface DiplomacySlice {
  updateCharacterOpinion: (charId: string, amount: number) => void;
}

export const createDiplomacySlice: StateCreator<DiplomacySlice & { characters?: Record<string, Character> }> = (set) => ({
  updateCharacterOpinion: (charId, amount) => set((state) => {
    if (!state.characters || !state.characters[charId]) return {};
    const updated = { ...state.characters };
    const char = updated[charId];
    const newOpinion = { ...char.opinion };
    newOpinion['player'] = Math.max(-100, Math.min(100, (newOpinion['player'] || 0) + amount));
    updated[charId] = {
      ...char,
      opinion: newOpinion
    };
    return { characters: updated };
  }),
});
