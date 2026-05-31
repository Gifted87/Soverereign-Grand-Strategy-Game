export interface Doctrine {
  name: string;
}
export interface PiousAction {
  name: string;
}
export interface SinfulAction {
  name: string;
}

export interface Religion {
  id: string;
  name: string;
  headquartersId: string;     // Settlement ID (Holy City)
  headId: string | null;      // Character ID of highest priest
  doctrines: Doctrine[];
  holyWarJustification: string;
  piousActions: PiousAction[];
  sinfulActions: SinfulAction[];
  attitude: Record<string, number>;  // Religion ID → tolerance (negative = hostility)
  isMonotheistic: boolean;
  holyTextName: string;
  iconId: string;
}

export interface CharacterReligionState {
  religionId: string;
  piousScore: number;         // 0–100
  isExcommunicated: boolean;
  isAtPilgrimage: boolean;
  pilgrimageDestination: string | null;
  hasReceivedBlessing: boolean;
  blessingExpiry: number | null;
  heresy: string | null;      // heretical sect name, if secret heretic
  monasteryDonations: number; // lifetime donations
}

export type HolyWarStatus = 'CALLED' | 'ONGOING' | 'CONCLUDED';

export interface HolyWar {
  id: string;
  name: string;
  calledByRealmId: string;
  targetReligionId: string;
  targetRegion: string;
  participatingRealmIds: string[];
  status: HolyWarStatus;      // CALLED | ONGOING | CONCLUDED
  crusadersStrength: number;
  targetStrength: number;
  progress: number;           // 0–100
  indulgenceGranted: boolean;
  sacksOccurred: number;
}
