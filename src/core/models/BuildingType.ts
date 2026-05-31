export type BuildingCategory = 'ECONOMIC' | 'MILITARY' | 'ADMINISTRATIVE' | 'RELIGIOUS' | 'INFRASTRUCTURE';

export interface BuildingType {
  id: string;
  name: string;
  category: BuildingCategory;
  description: string;
  cost: {
    gold: number;
    wood: number;
    stone: number;
    manpower: number;
  };
  buildTimeDays: number;
  upkeep: number;
  effectsDescription: string;
  requirements?: {
    terrain?: string[];
    coastal?: boolean;
    river?: boolean;
    minCityLevel?: number;
  };
}
