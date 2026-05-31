import { HexCoord } from '../../utils/geo';
import { TerrainType, BiomeType } from '../../data/terrain-types';
import { ResourceDeposit } from './Resource';
import { DiseaseState } from './Disease';
import { WeatherState } from './Climate';
import { Building } from './Building';

export interface Grievance {
  id: string;
  type: string;
  description: string;
  severity: number;
}

export type PopulationSnapshot = {
  total: number;
  serfs: number;
  clergy: number;
  nobles: number;
  merchants: number;
  health: number;
  mood: string;
};

export interface Province {
  id: string;
  name: string;
  ownerId: string;          // Character ID of ruling lord
  realmId: string;
  terrain: TerrainType;
  biome: BiomeType;
  continent?: string;
  elevation: number;        // 0–100
  fertility: number;        // 0–100 (affects crop yield)
  coords: HexCoord;         // position on hex grid
  neighbors: string[];      // adjacent province IDs
  settlements: string[];    // Settlement IDs within province
  resources: ResourceDeposit[];
  currentWeather: WeatherState;
  floodRisk: number;
  forestCoverage: number;   // 0–100 (can be depleted or grown)
  roadQuality: number;      // 0–100 (affects movement)
  loyalty: number;          // 0–100 toward realm
  grievances: Grievance[];
  population: PopulationSnapshot;
  disease: DiseaseState | null;
  fortificationLevel: number;
  isBlockaded: boolean;
  isBesieged: boolean;
  siegeProgress: number | null;
  controlledBy: string;     // militarily controlling army ID (can differ from owner)
  salted: boolean;          // land permanently damaged
  ruined: boolean;
  lastRaided: number | null; // game tick timestamp
  heavyRainDays?: number;
  droughtDays?: number;
  clearDays?: number;
  blizzardDays?: number;
  hasWildfire?: boolean;
  wildfireDuration?: number; // days burning
  quarantined?: boolean; // quarantined to stop spread
  devastatedTimeLeft?: number; // for fires
  diseaseHistory?: Record<string, number>; // last outbreak days
  buildings: Building[];
  constructionQueue?: {
    typeId: string;
    daysLeft: number;
    totalDays: number;
  }[];
}
