import { PlotType, PlotStage } from './Treaty'; // Reuse plot stage

export type FactionType = 'INDEPENDENCE' | 'SUCCESSION' | 'RELIGIOUS' | 'NOBLE_RIGHTS' | 'MERCANTILE';

export interface FactionDemand {
  description: string;
}

export interface Consequence {
  description: string;
}

export interface Faction {
  id: string;
  realmId: string;
  name: string;
  type: FactionType;          // INDEPENDENCE | SUCCESSION | RELIGIOUS | NOBLE_RIGHTS | MERCANTILE
  leader: string;             // Character ID
  members: string[];          // Character IDs
  strength: number;           // 0–100 (faction power within realm)
  demands: FactionDemand[];
  isActive: boolean;
  plotStage: PlotStage;       // FORMING | CONSOLIDATING | DEMANDING | REVOLTING
  treasuryFunding: number;
  hasPlayerDiscovered: boolean;
}

export interface Plot {
  id: string;
  type: PlotType;             // ASSASSINATION | CLAIM_FORGERY | BRIBE | SPY_INFILTRATE | FABRICATE_SCANDAL
  initiatorId: string;        // Character ID
  targetId: string;           // Character ID or Realm ID
  agentIds: string[];         // Spy character IDs executing it
  progressPercent: number;
  exposureRisk: number;       // 0–100
  potentialConsequences: Consequence[];
  isExposed: boolean;
  outcomeId: string | null;
}
