export type Gender = 'MALE' | 'FEMALE';

export type TraitCategory = 'PERSONALITY' | 'PHYSICAL' | 'MENTAL' | 'LIFESTYLE' | 'STRESS';

export type StatType = 'diplomacy' | 'martial' | 'stewardship' | 'intrigue' | 'learning' | 'piety';

export interface BehaviorWeight {
  decisionType: string;
  weightModifier: number; // e.g. how likely are they to make certain decisions
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  category: TraitCategory;
  statModifiers: Partial<Record<StatType, number>>;
  behaviorWeights: BehaviorWeight[];
  opposedTraits: string[];
  isCongenital: boolean;
  isVisible: boolean;
}

export interface Virtue {
  id: string;
  name: string;
  description: string;
  modifier?: Partial<Record<StatType, number>>;
}

export interface Flaw {
  id: string;
  name: string;
  description: string;
  modifier?: Partial<Record<StatType, number>>;
}

export interface Memory {
  id: string;
  description: string;
  tick: number;
}

export interface Title {
  id: string;
  name: string;
}

export interface CourtPosition {
  id: string;
  name: string;
}

export type Ambition = 'WEALTH' | 'POWER' | 'LEGACY' | 'REVENGE' | 'PIETY' | 'FREEDOM';

export interface Character {
  id: string;
  firstName: string;
  lastName: string;          // family name
  dynastyId: string;
  isPlayer: boolean;

  // Biology
  gender: Gender;
  age: number;
  health: number;            // 0–100
  fertility: number;         // 0–100
  isPregnant: boolean;
  isAlive: boolean;
  causeOfDeath: string | null;
  deathDate: number | null;  // game tick

  // Identity & Background
  birthProvinceId: string;
  religion: string;
  culture: string;
  languagesSpoken: string[];
  title: Title | null;
  position: CourtPosition | null;

  // Psychological Profile
  traits: Trait[];           // up to 5 personality traits
  virtues: Virtue[];
  flaws: Flaw[];
  secretTrait: Trait | null; // hidden from others

  // Relationships
  fatherId: string | null;
  motherId: string | null;
  spouseId: string | null;
  childrenIds: string[];
  siblingIds: string[];
  loverIds: string[];        // secret paramours
  enemyIds: string[];
  allyIds: string[];
  mentorId: string | null;

  // Stats
  diplomacy: number;         // 1–20
  martial: number;           // 1–20
  stewardship: number;       // 1–20
  intrigue: number;          // 1–20
  learning: number;          // 1–20
  piety: number;

  // Ambitions & Motivations
  ambition: Ambition;
  opinion: Record<string, number>;   // Character ID → opinion score (-100 to +100)
  suspicion: Record<string, number>; // Character ID → suspicion score

  // Memory System
  memories: Memory[];        // Permanent record of formative events
  traumaIds: string[];       // Active traumas affecting behavior

  // Holdings
  primaryTitle: Title | null;
  heldTitles: Title[];
  landedProvinceIds: string[];
  goldHoldings: number;
}
