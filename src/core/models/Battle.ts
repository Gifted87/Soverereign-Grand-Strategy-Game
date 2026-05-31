import { HexCoord } from '../../utils/geo';

export type BattleStatus = 'ONGOING' | 'ATTACKER_VICTORY' | 'DEFENDER_VICTORY' | 'DRAW';

export interface BattlePhase {
  name: string;
  durationTicks: number;
}

export interface Battle {
  id: string;
  attackerId: string;         // Army ID
  defenderId: string;         // Army ID
  location: HexCoord;
  provinceId: string;
  startTick: number;
  endTick: number | null;
  status: BattleStatus;       // ONGOING | ATTACKER_VICTORY | DEFENDER_VICTORY | DRAW
  phases: BattlePhase[];
  attackerCasualties: number;
  defenderCasualties: number;
  attackerMoraleCollapse: boolean;
  defenderMoraleCollapse: boolean;
  weatherConditions: string;
  terrainAdvantage: 'attacker' | 'defender' | 'neutral';
  narrativeSummary: string;
}

export type SupplyStatus = 'FULL' | 'STRAINED' | 'STARVING' | 'SURRENDERED';
export type SiegePhase = 'INVESTMENT' | 'BOMBARDMENT' | 'ESCALADE' | 'NEGOTIATION';

export interface Sally {
  tick: number;
  attackerCasualties: number;
  defenderCasualties: number;
  success: boolean;
}

export interface Siege {
  id: string;
  siegerId: string;           // Army ID
  settlementId: string;
  startTick: number;
  progressPercent: number;   // 0–100 (100 = breach)
  supplyStatus: SupplyStatus; // FULL | STRAINED | STARVING | SURRENDERED
  escaladeAttempts: number;
  sallies: Sally[];
  currentPhase: SiegePhase;  // INVESTMENT | BOMBARDMENT | ESCALADE | NEGOTIATION
  diseaseRisk: number;
}
