import { HexCoord } from '../../utils/geo';
import { Unit } from './Unit';
import { DiseaseState } from './Disease';

export type ArmyStance = 'MARCH' | 'RAID' | 'BESIEGE' | 'DEFEND' | 'FORAGE';

export interface Order {
  type: string;
  targetId?: string;
  targetCoord?: HexCoord;
}

export interface PendingOrder {
  id: string;
  order: Order;
  deliveryTick: number; // When courier arrives
}

export interface Army {
  id: string;
  name: string;
  realmId: string;
  commanderId: string;        // Character ID of general
  officerIds: string[];       // Sub-commanders
  units: Unit[];
  location: HexCoord;
  destination: HexCoord | null;
  path: HexCoord[];           // calculated route
  movementPoints: number;     // remaining MP this tick
  supplyLevel: number;        // 0–100
  supplyConvoyId: string | null;
  morale: number;             // 0–100
  discipline: number;         // 0–100
  experience: number;         // improves with battles
  stance: ArmyStance;         // MARCH | RAID | BESIEGE | DEFEND | FORAGE
  orders: Order[];            // queued from player or commander
  pendingOrders: PendingOrder[]; // orders from player awaiting courier delivery
  isExhausted: boolean;
  frostbiteRisk: number;      // 0–100
  diseases: DiseaseState[];
  deserterRate: number;       // % of troops deserting per day
  loot: number;               // gold looted so far
  attritionDays: number;      // days without supply
}
