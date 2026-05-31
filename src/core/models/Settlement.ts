import { GoodType } from '../../data/goods-catalogue';
import { Unit } from './Unit';
import { Building } from './Building';
import { DiseaseState } from './Disease';

export type SettlementType = 'HAMLET' | 'VILLAGE' | 'TOWN' | 'CITY' | 'CAPITAL' | 'FORTRESS';
export type SettlementSpec = 'TRADE_HUB' | 'MILITARY_CAMP' | 'RELIGIOUS_CENTER' | 'MINING_TOWN' | 'FARMING_COMMUNITY';

export interface Settlement {
  id: string;
  name: string;
  provinceId: string;
  type: SettlementType;     // HAMLET | VILLAGE | TOWN | CITY | CAPITAL | FORTRESS
  population: number;
  buildings: Building[];
  walls: number;            // 0–5 wall level
  garrison: Unit[];
  marketValue: Partial<Record<GoodType, number>>;   // local prices
  tradeRoutes: string[];   // TradeRoute IDs active here
  diseases: DiseaseState[];
  unrest: number;          // 0–100
  mayor: string | null;    // Character ID
  specialization: SettlementSpec | null;
}
