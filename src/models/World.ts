import { HexCoord } from '../utils/geo';
import { TerrainType, BiomeType } from '../data/terrain-types';

export interface ResourceDeposit {
  good: string;
  richness: number; // 0-100
  discovered: boolean;
  depleted: boolean;
}

export interface Province {
  id: string;
  name: string;
  ownerId: string;
  realmId: string;
  terrain: TerrainType;
  biome: BiomeType;
  elevation: number;
  fertility: number;
  coords: HexCoord;
  neighbors: string[];
  settlements: string[];
  resources: ResourceDeposit[];
  population: number;
  loyalty: number;
  fortificationLevel: number;
  foodStockpile: number;
  // To match previous UI expectations:
  walls: number;
  x: number; // visual percentage left
  y: number; // visual percentage top
}

export interface WorldSnapshot {
  currentDay: number;
  currentYear: number;
  provinces: Record<string, Province>;
}
