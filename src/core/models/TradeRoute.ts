import { GoodType } from '../../data/goods-catalogue';
import { HexCoord } from '../../utils/geo';

export type RouteStatus = 'ACTIVE' | 'DISRUPTED' | 'SEVERED';

export interface ResourceFlowNode {
  id: string;
  type: 'PRODUCER' | 'CONSUMER' | 'STORAGE' | 'TRANSIT';
  settlementId: string;
  good: GoodType;
  ratePerDay: number;         // positive = producing, negative = consuming
  stockpile: number;
  capacity: number;
}

export interface TradeRoute {
  id: string;
  originId: string;           // Settlement ID
  destinationId: string;
  good: GoodType;
  volumePerMonth: number;
  profitPerMonth: number;
  riskLevel: number;          // 0–100 (banditry, weather)
  status: RouteStatus;        // ACTIVE | DISRUPTED | SEVERED
  convoysInTransit: string[]; // Convoy IDs
  isRoyal: boolean;           // player-established
}

export interface Convoy {
  id: string;
  tradeRouteId: string | null;
  militaryArmyId: string | null;  // null if civilian supply
  cargo: Partial<Record<GoodType, number>>;
  origin: HexCoord;
  destination: HexCoord;
  currentLocation: HexCoord;
  path: HexCoord[];
  escort: string | null;          // Army ID providing protection
  speed: number;                  // hexes per tick
  isRaided: boolean;
  raidedByArmyId: string | null;
}

export interface TreasuryState {
  goldBalance: number;
  goldPerTick: number;        // net daily income
  taxRevenue: number;         // from provinces
  tradeIncome: number;
  tributeIncome: number;
  militaryUpkeep: number;
  buildingUpkeep: number;
  courtUpkeep: number;
  debtRepayment: number;
  minters: number;            // active coin minting capacity
  inflationRate: number;      // 0.0–3.0 multiplier (1.0 = normal)
  debtAmount: number;
  debtCreditorId: string | null;
  coinsInCirculation: number;
}
