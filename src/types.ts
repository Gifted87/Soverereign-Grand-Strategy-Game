import { Province as CoreProvince } from './core/models/Province';
import { Army as CoreArmy } from './core/models/Army';
import { Character } from './core/models/Character';
import { Dynasty } from './core/models/Dynasty';
import { Faction, Plot } from './core/models/Faction';
import { Religion } from './core/models/Religion';
import { Treaty } from './core/models/Treaty';
import { TreasuryState } from './core/models/Resource';

export type { Character, Dynasty, Faction, Plot, Religion, Treaty, TreasuryState };

export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type Era = 'DARK_AGES' | 'FEUDAL' | 'HIGH_MEDIEVAL' | 'LATE_MEDIEVAL';

export interface ResourceLevel {
  gold: number;
  food: number;
  iron: number;
  wood: number;
  stone: number;
  manpower: number;
  prestige: number;
}

export type ChronicleType = 'CRITICAL' | 'URGENT' | 'NORMAL' | 'FLAVOR';

export interface ChronicleEntry {
  id: string;
  year: number;
  day: number;
  text: string;
  type: ChronicleType;
}

export type Province = CoreProvince & { x?: number, y?: number };
export type Army = CoreArmy;

export interface GameState {
  currentDay: number;
  currentYear: number;
  currentSeason: Season;
  currentEra: Era;
  isPaused: boolean;
  speed: number;

  resources: ResourceLevel;
  chronicle: ChronicleEntry[];
  provinces: Record<string, Province>;
  armies: Record<string, Army>;
  characters?: Record<string, Character>;
  dynasties?: Record<string, Dynasty>;
  factions?: Record<string, Faction>;
  plots?: Record<string, Plot>;
  religions?: Record<string, Religion>;
  treaties?: Record<string, Treaty>;
  treasury?: TreasuryState;

  selectedProvinceId: string | null;
  startingSetup?: any | null;
  convoys?: Record<string, any>;
  aureliaSimState?: any;
  
  // Actions
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  updateFromSnapshot: (snapshot: any) => void;
  selectProvince: (id: string | null) => void;
  addChronicle: (text: string, type: ChronicleType) => void;
  setStartingSetup?: (setup: any) => void;
  updateCharacterOpinion?: (charId: string, amount: number) => void;
  spendGold?: (amount: number) => boolean;
}
