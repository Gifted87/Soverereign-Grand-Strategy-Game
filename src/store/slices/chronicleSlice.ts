import { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import { ChronicleEntry, ChronicleType } from '../../types';

export interface ChronicleSlice {
  chronicle: ChronicleEntry[];
  addChronicle: (text: string, type: ChronicleType) => void;
}

export const createChronicleSlice: StateCreator<any, [], [], ChronicleSlice> = (set) => ({
  chronicle: [
    { id: nanoid(), year: 1142, day: 248, text: 'The Grand Host marches on Valedor.', type: 'URGENT' },
    { id: nanoid(), year: 1142, day: 249, text: 'Autumn rains have turned the southern roads to mud.', type: 'NORMAL' },
    { id: nanoid(), year: 1142, day: 250, text: 'Your realm stands ready.', type: 'FLAVOR' },
  ],
  addChronicle: (text, type) => set((state: any) => ({
    chronicle: [...state.chronicle, { id: nanoid(), year: state.currentYear, day: state.currentDay, text, type }]
  })),
});
