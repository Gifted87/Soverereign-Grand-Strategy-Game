export type TreatyType = 'PEACE' | 'ALLIANCE' | 'VASSALAGE' | 'TRADE' | 'NON_AGGRESSION' | 'MARRIAGE_PACT';
export type AllianceType = 'DEFENSIVE' | 'OFFENSIVE' | 'HOLY' | 'TRIBUTARY';
export type PlotType = 'ASSASSINATION' | 'CLAIM_FORGERY' | 'BRIBE' | 'SPY_INFILTRATE' | 'FABRICATE_SCANDAL';
export type PlotStage = 'FORMING' | 'CONSOLIDATING' | 'DEMANDING' | 'REVOLTING';

export interface TreatyTerm {
  description: string;
}

export interface Treaty {
  id: string;
  type: TreatyType;           // PEACE | ALLIANCE | VASSALAGE | TRADE | NON_AGGRESSION | MARRIAGE_PACT
  parties: string[];          // Realm IDs
  terms: TreatyTerm[];
  signedDate: number;
  expiryDate: number | null;
  isViolated: boolean;
  violatorId: string | null;
}

export interface Marriage {
  id: string;
  spouseAId: string;          // Character ID
  spouseBId: string;
  dynastyAId: string;
  dynastyBId: string;
  politicalPurpose: string;
  dowryGold: number;
  dowryProvinces: string[];
  casus_belli_unlocked: string[]; // what wars this enables
  isSecret: boolean;
  date: number;
}

export interface AllianceObligation {
  description: string;
}

export interface Alliance {
  id: string;
  members: string[];          // Realm IDs
  type: AllianceType;         // DEFENSIVE | OFFENSIVE | HOLY | TRIBUTARY
  leader: string;             // Realm ID
  formedDate: number;
  obligations: AllianceObligation[];
}

export interface IntelReport {
  id: string;
  sourceSpyId: string;
  subjectId: string;
  subjectType: 'CHARACTER' | 'ARMY' | 'ECONOMY' | 'PLOT';
  contents: string;           // narrative description
  confidence: number;         // 0–100 accuracy
  expiresAt: number;         // tick after which info is stale
  receivedAt: number;
}
