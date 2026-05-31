import { UnitType } from '../../data/unit-types';

export type Formation = 'LOOSE' | 'STANDARD' | 'SHIELD_WALL' | 'WEDGE' | 'SQUARE';

export enum UnitArmor {
  NONE = 'NONE',
  PADDED = 'PADDED',
  LEATHER = 'LEATHER',
  CHAINMAIL = 'CHAINMAIL',
  PLATE = 'PLATE'
}

export interface UnitAbility {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  type: UnitType;
  count: number;              // individual soldiers represented
  maxCount: number;           // recruitment capacity
  strength: number;           // 0–100 combat effectiveness
  morale: number;
  experience: number;         // 0–100 (veteran status)
  equipmentQuality: number;   // 0–100
  supplyConsumed: number;     // per day
  upkeepCost: number;         // per month in gold
  formation: Formation;       // LOOSE | STANDARD | SHIELD_WALL | WEDGE | SQUARE
  isMounted: boolean;
  isRanged: boolean;
  hasArmor: UnitArmor;
  specialAbility: UnitAbility | null;
}
