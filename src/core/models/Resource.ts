import { GoodType } from '../../data/goods-catalogue';

export interface ResourceDeposit {
  good: GoodType;
  richness: number;         // 0–100
  discovered: boolean;
  depleted: boolean;
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

