import { Province } from './Province';
import { Character } from './Character';
import { Settlement } from './Settlement';
import { Army } from './Army';

export interface WorldState {
  currentDay: number;
  currentYear: number;
  provinces: Record<string, Province>;
  characters: Record<string, Character>;
  settlements: Record<string, Settlement>;
  armies: Record<string, Army>;
}

