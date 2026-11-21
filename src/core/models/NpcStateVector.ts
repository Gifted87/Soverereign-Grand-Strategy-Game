/**
 * NpcStateVector.ts
 *
 * Defines the probabilistic state model for every NPC in the simulation.
 * Based on sovereign_npc_simulation.md Section 2 & 4.
 *
 * State is split into three types:
 *   ContinuousState  — 0–100 floats that drift toward a baseline each tick
 *   IntegerState     — raw integer counters changed discretely by actions
 *   CategoricalState — enum/string modes changed by specific action triggers
 */

// ─── Primitive State Types ─────────────────────────────────────────────────

/** A single continuous state variable with its drift parameters. */
export interface ContinuousVar {
  value: number;      // current value 0–100
  baseline: number;   // resting value this character drifts toward
  decayRate: number;  // fraction of (baseline - value) applied per tick, e.g. 0.05
}

export type ContinuousBlock = Record<string, ContinuousVar>;
export type IntegerBlock    = Record<string, number>;
export type CategoricalBlock = Record<string, string>;

// ─── Memory System (Section 8) ─────────────────────────────────────────────

export type MemoryEventType =
  | 'BETRAYAL' | 'BATTLE_LOST' | 'BATTLE_WON' | 'GIFT_RECEIVED'
  | 'INSULT_RECEIVED' | 'PARDON_RECEIVED' | 'MASSACRE_WITNESSED'
  | 'FAMINE_SURVIVED' | 'ASSASSINATION_ATTEMPT' | 'PROMOTION'
  | 'BRIBERY_RECEIVED' | 'TAXATION_GRIEVANCE' | 'DISEASE_SURVIVED'
  | 'DISPLACEMENT' | 'EXECUTION_WITNESSED' | 'ALLY_BETRAYED'
  | 'CONTRACT_HONORED' | 'CONTRACT_BROKEN' | 'DEBT_FORGIVEN'
  | 'LAND_SEIZED' | 'LAND_GRANTED' | 'GENERAL';

export type MemoryValence = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'TRAUMATIC';

export interface MemoryRecord {
  id: string;
  eventType: MemoryEventType;
  actorId: string;              // who did it (char id, realm id, or 'world')
  tickTimestamp: number;
  intensity: number;            // 0–100 how significant this memory feels
  emotionalValence: MemoryValence;
  hasFaded: boolean;
  generational: boolean;        // passes to heirs
  description: string;          // human-readable log text
}

// ─── Action Cooldowns ──────────────────────────────────────────────────────

export type ActionCooldowns = Record<string, number>; // actionId → tick when available again

// ─── NPC Tier ──────────────────────────────────────────────────────────────

export type NpcTier = 1 | 2 | 3 | 4;

// ─── Full State Vector ─────────────────────────────────────────────────────

export interface NpcStateVector {
  /** Which design-doc character type this is */
  characterType: NpcCharacterType;
  /** Simulation tier — governs tick rate, memory capacity, noise magnitude */
  tier: NpcTier;
  /** Province/settlement this NPC is bound to */
  provinceId: string;
  settlementId: string | null;

  continuous: ContinuousBlock;
  integers: IntegerBlock;
  categorical: CategoricalBlock;

  memories: MemoryRecord[];
  cooldowns: ActionCooldowns;

  /** Tick on which this NPC was last evaluated */
  lastTickEvaluated: number;
}

// ─── Character Type Enum ───────────────────────────────────────────────────

export type NpcCharacterType =
  // Tier 1 — Phase 1
  | 'PEASANT_COHORT'
  | 'WANDERING_KNIGHT'
  | 'MONK'
  // Tier 2 — Phase 1
  | 'BANDIT_CHIEF'
  | 'MASTER_MERCHANT'
  | 'MERCENARY_CAPTAIN'
  // Tier 3 — Phase 2
  | 'VASSAL_LORD'
  | 'COURT_ADVISOR'
  | 'HIGH_PRIEST'
  | 'FOLK_HERO'
  | 'FACTION_LEADER'
  // Tier 4 — Phase 2
  | 'FOREIGN_RULER'
  | 'HEIR_APPARENT';

// ─── Tier 3/4 Supporting Enums ─────────────────────────────────────────────

export type CourtAdvisorRole =
  | 'CHANCELLOR'
  | 'MARSHAL'
  | 'SPYMASTER'
  | 'TREASURER'
  | 'COURT_PRIEST';

export type AdvisorLoyaltyTier =
  | 'DEVOTED'
  | 'RELIABLE'
  | 'CONDITIONAL'
  | 'SELF_SERVING'
  | 'TREASONOUS';

export type ForeignRulerStrategy =
  | 'EXPAND'
  | 'CONSOLIDATE'
  | 'DEFEND'
  | 'HOLY_WAR'
  | 'TRADE'
  | 'DESTABILIZE';

// ─── Memory Capacity by Tier ───────────────────────────────────────────────

export const MEMORY_CAPACITY: Record<NpcTier, number> = {
  1: 5,
  2: 15,
  3: 30,
  4: 60,
};

// ─── Noise Magnitude by Tier (fraction of final weight, e.g. 0.30 = ±30%) ─

export const NOISE_MAGNITUDE: Record<NpcTier, number> = {
  1: 0.30,
  2: 0.18,
  3: 0.10,
  4: 0.045,
};

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// Each creates a default NpcStateVector for the given character type with
// all baselines initialised to sensible neutral values and decay rates set
// per the design doc's personality drift model.
// ═══════════════════════════════════════════════════════════════════════════

function makeContinuousVar(value: number, baseline: number, decayRate = 0.04): ContinuousVar {
  return { value, baseline, decayRate };
}

// ── 4.1 Peasant Cohort Representative ─────────────────────────────────────
// One cohort per settlement. Represents aggregate mood of that settlement's
// peasant population — not an individual.

export function createPeasantCohortState(
  provinceId: string,
  settlementId: string,
  cohortSize: number,
  foodStockpile: number
): NpcStateVector {
  return {
    characterType: 'PEASANT_COHORT',
    tier: 1,
    provinceId,
    settlementId,

    continuous: {
      hunger:       makeContinuousVar(20,  20, 0.03),
      fear:         makeContinuousVar(15,  15, 0.04),
      unrest:       makeContinuousVar(10,  10, 0.03),
      piety:        makeContinuousVar(50,  50, 0.02),
      desperation:  makeContinuousVar(10,  10, 0.03),
      fatigue:      makeContinuousVar(20,  20, 0.05),
      trauma:       makeContinuousVar(0,   0,  0.001), // very slow decay
      hope:         makeContinuousVar(60,  60, 0.03),
      solidarity:   makeContinuousVar(20,  20, 0.02),
    },

    integers: {
      cohort_size:    cohortSize,
      food_stockpile: foodStockpile,
      season_debts:   0,
    },

    categorical: {
      location:        provinceId,
      collective_mood: 'CONTENT', // CONTENT | ANXIOUS | AGGRIEVED | RIOTING | FLED
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.2 Wandering Knight ───────────────────────────────────────────────────

export function createWanderingKnightState(
  provinceId: string,
  initialGold: number
): NpcStateVector {
  return {
    characterType: 'WANDERING_KNIGHT',
    tier: 1,
    provinceId,
    settlementId: null,

    continuous: {
      loyalty_to_current_lord: makeContinuousVar(0,   0,  0.02),
      ambition:                makeContinuousVar(55,  55, 0.02),
      honor:                   makeContinuousVar(60,  60, 0.01),
      greed:                   makeContinuousVar(40,  40, 0.02),
      martial_confidence:      makeContinuousVar(50,  50, 0.03),
      desperation:             makeContinuousVar(20,  20, 0.04),
      suspicion:               makeContinuousVar(25,  25, 0.03),
      idealism:                makeContinuousVar(45,  45, 0.02),
      fatigue:                 makeContinuousVar(15,  15, 0.05),
      restlessness:            makeContinuousVar(50,  50, 0.02),
    },

    integers: {
      gold:             initialGold,
      reputation_score: 30,
      battles_won:      0,
      lords_served:     0,
    },

    categorical: {
      location:          provinceId,
      employment_status: 'FREELANCE', // FREELANCE | HIRED | SWORN | DISGRACED
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.3 Monk / Hermit Mystic ───────────────────────────────────────────────

export function createMonkState(
  provinceId: string,
  affiliation: string = 'ORTHODOX'
): NpcStateVector {
  return {
    characterType: 'MONK',
    tier: 1,
    provinceId,
    settlementId: null,

    continuous: {
      piety:               makeContinuousVar(70,  70, 0.02),
      wisdom:              makeContinuousVar(55,  55, 0.01),
      charisma:            makeContinuousVar(45,  45, 0.02),
      asceticism:          makeContinuousVar(65,  65, 0.02),
      mysticism:           makeContinuousVar(40,  40, 0.02),
      isolation_drive:     makeContinuousVar(50,  50, 0.02),
      compassion:          makeContinuousVar(60,  60, 0.02),
      suspicion_of_power:  makeContinuousVar(40,  40, 0.02),
      fear:                makeContinuousVar(10,  10, 0.04),
      faith_in_order:      makeContinuousVar(60,  60, 0.01),
      prophecy_pressure:   makeContinuousVar(0,   0,  0.005), // very slow decay
    },

    integers: {
      pilgrimage_count: 0,
      known_heresies:   0,
    },

    categorical: {
      location:    provinceId,
      affiliation: affiliation, // ORTHODOX | REFORMED | HERMIT | HERETIC | MYSTIC_ORDER
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.4 Bandit Chief ──────────────────────────────────────────────────────

export function createBanditChiefState(
  provinceId: string,
  initialGold: number,
  bandSize: number
): NpcStateVector {
  return {
    characterType: 'BANDIT_CHIEF',
    tier: 2,
    provinceId,
    settlementId: null,

    continuous: {
      aggression:           makeContinuousVar(55,  55, 0.03),
      greed:                makeContinuousVar(65,  65, 0.02),
      fear:                 makeContinuousVar(20,  20, 0.04),
      loyalty_to_band:      makeContinuousVar(60,  60, 0.02),
      territorial:          makeContinuousVar(50,  50, 0.02),
      cunning:              makeContinuousVar(50,  50, 0.01),
      risk_tolerance:       makeContinuousVar(55,  55, 0.02),
      ambition:             makeContinuousVar(45,  45, 0.02),
      hunger:               makeContinuousVar(20,  20, 0.04),
      paranoia:             makeContinuousVar(30,  30, 0.03),
      morale:               makeContinuousVar(65,  65, 0.04),
      desperation:          makeContinuousVar(15,  15, 0.04),
      brutality:            makeContinuousVar(40,  40, 0.01),
      honor_among_thieves:  makeContinuousVar(50,  50, 0.01),
      reputation_fear:      makeContinuousVar(20,  20, 0.02),
      restlessness:         makeContinuousVar(40,  40, 0.03),
    },

    integers: {
      band_size:        bandSize,
      gold:             initialGold,
      hideout_strength: 0,
      active_provinces: 0,
      recent_kills:     0,
      bribes_paid:      0,
    },

    categorical: {
      location:         provinceId,
      current_activity: 'HIDING', // HIDING | EXTORTING | RAIDING | RECRUITING | FLEEING | NEGOTIATING
      threat_level:     'LOW',    // LOW | MEDIUM | HIGH | HUNTED
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.5 Master Merchant ────────────────────────────────────────────────────

export function createMasterMerchantState(
  provinceId: string,
  primaryCityId: string,
  initialGold: number
): NpcStateVector {
  return {
    characterType: 'MASTER_MERCHANT',
    tier: 2,
    provinceId,
    settlementId: primaryCityId,

    continuous: {
      greed:                makeContinuousVar(60,  60, 0.02),
      risk_tolerance:       makeContinuousVar(40,  40, 0.02),
      loyalty_to_realm:     makeContinuousVar(50,  50, 0.02),
      cunning:              makeContinuousVar(55,  55, 0.01),
      ambition:             makeContinuousVar(50,  50, 0.02),
      patience:             makeContinuousVar(55,  55, 0.02),
      fear:                 makeContinuousVar(20,  20, 0.04),
      suspicion:            makeContinuousVar(30,  30, 0.03),
      generosity:           makeContinuousVar(35,  35, 0.02),
      market_confidence:    makeContinuousVar(60,  60, 0.03),
      political_interest:   makeContinuousVar(30,  30, 0.02),
      guild_solidarity:     makeContinuousVar(50,  50, 0.02),
      bribery_tolerance:    makeContinuousVar(35,  35, 0.02),
      smuggling_drive:      makeContinuousVar(0,   0,  0.04),
      paranoia:             makeContinuousVar(25,  25, 0.03),
      reputation_pride:     makeContinuousVar(60,  60, 0.02),
      prestige:             makeContinuousVar(40,  40, 0.01),
      debt_anxiety:         makeContinuousVar(30,  30, 0.03),
      hoarding_drive:       makeContinuousVar(25,  25, 0.03),
      civic_investment:     makeContinuousVar(30,  30, 0.02),
    },

    integers: {
      gold:                    initialGold,
      active_trade_routes:     0,
      warehoused_goods:        0,
      outstanding_loans:       0,
      debts_owed:              0,
      smuggling_operations:    0,
      guild_rank:              1,
    },

    categorical: {
      location:             primaryCityId,
      economic_stance:      'EXPANDING',       // EXPANDING | CONSOLIDATING | CONTRACTING | FLEEING
      political_alignment:  'NEUTRAL',          // LOYAL | NEUTRAL | OPPOSED | COVERT_OPPOSITION
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.6 Mercenary Captain ──────────────────────────────────────────────────

export function createMercenaryCaptainState(
  provinceId: string,
  initialGold: number,
  companySize: number
): NpcStateVector {
  return {
    characterType: 'MERCENARY_CAPTAIN',
    tier: 2,
    provinceId,
    settlementId: null,

    continuous: {
      greed:                    makeContinuousVar(65,  65, 0.02),
      loyalty_to_employer:      makeContinuousVar(0,   0,  0.03),
      honor:                    makeContinuousVar(50,  50, 0.01),
      fear:                     makeContinuousVar(15,  15, 0.04),
      aggression:               makeContinuousVar(50,  50, 0.03),
      cunning:                  makeContinuousVar(55,  55, 0.01),
      ambition:                 makeContinuousVar(50,  50, 0.02),
      reputation_pride:         makeContinuousVar(60,  60, 0.02),
      desperation:              makeContinuousVar(10,  10, 0.04),
      battle_hunger:            makeContinuousVar(50,  50, 0.02),
      paranoia:                 makeContinuousVar(25,  25, 0.03),
      risk_tolerance:           makeContinuousVar(55,  55, 0.02),
      fatigue:                  makeContinuousVar(15,  15, 0.05),
      restlessness:             makeContinuousVar(45,  45, 0.03),
      solidarity_with_company:  makeContinuousVar(65,  65, 0.02),
      ideological_flexibility:  makeContinuousVar(70,  70, 0.01),
      patience:                 makeContinuousVar(45,  45, 0.02),
      cruelty:                  makeContinuousVar(35,  35, 0.01),
      independence_drive:       makeContinuousVar(50,  50, 0.02),
    },

    integers: {
      gold:                  initialGold,
      company_size:          companySize,
      company_reputation:    40,
      contracts_fulfilled:   0,
      contracts_broken:      0,
      sieges_participated:   0,
      days_unpaid:           0,
    },

    categorical: {
      location:        provinceId,
      contract_status: 'AVAILABLE', // AVAILABLE | UNDER_CONTRACT | NEGOTIATING | GONE_ROGUE
      current_employer: 'none',
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// TIER 3 FACTORY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

// ── 4.7 Vassal Lord ────────────────────────────────────────────────────────
// State is FULLY managed in the state vector — independent of Character.landedProvinceIds.

export function createVassalLordState(
  provinceId: string,
  initialArmySize: number,
  initialGold: number,
  provincesHeld: number = 1
): NpcStateVector {
  return {
    characterType: 'VASSAL_LORD',
    tier: 3,
    provinceId,
    settlementId: null,

    continuous: {
      loyalty_to_liege:       makeContinuousVar(65,  65, 0.02),
      ambition:               makeContinuousVar(45,  45, 0.02),
      greed:                  makeContinuousVar(40,  40, 0.02),
      fear:                   makeContinuousVar(15,  15, 0.03),
      honor:                  makeContinuousVar(55,  55, 0.01),
      piety:                  makeContinuousVar(45,  45, 0.02),
      paranoia:               makeContinuousVar(20,  20, 0.03),
      pride:                  makeContinuousVar(50,  50, 0.02),
      cunning:                makeContinuousVar(45,  45, 0.01),
      patience:               makeContinuousVar(50,  50, 0.02),
      martial_confidence:     makeContinuousVar(55,  55, 0.03),
      popularity:             makeContinuousVar(50,  50, 0.02),
      discontent:             makeContinuousVar(10,  10, 0.02),
      grudge_weight:          makeContinuousVar(0,   0,  0.01),
      faction_pull:           makeContinuousVar(0,   0,  0.02),
      envy:                   makeContinuousVar(15,  15, 0.02),
      political_savvy:        makeContinuousVar(40,  40, 0.01),
      generosity:             makeContinuousVar(35,  35, 0.02),
      cruelty:                makeContinuousVar(25,  25, 0.01),
      compassion:             makeContinuousVar(40,  40, 0.02),
      suspicion_of_liege:     makeContinuousVar(10,  10, 0.02),
      independence_drive:     makeContinuousVar(20,  20, 0.02),
      succession_anxiety:     makeContinuousVar(20,  20, 0.02),
      fatigue:                makeContinuousVar(15,  15, 0.05),
      corruption_tolerance:   makeContinuousVar(25,  25, 0.01),
      religious_fervor:       makeContinuousVar(40,  40, 0.02),
      tradition_attachment:   makeContinuousVar(50,  50, 0.01),
      personal_risk_tolerance: makeContinuousVar(40, 40, 0.02),
    },

    integers: {
      gold:                      initialGold,
      personal_army_size:        initialArmySize,  // SOURCE OF TRUTH — independent of Character
      provinces_held:            provincesHeld,
      faction_members_recruited: 0,
      plots_active:              0,
      years_in_service:          0,
      grudges_recorded:          0,
      marriages_arranged:        0,
      wars_fought_for_liege:     0,
    },

    categorical: {
      location:            provinceId,
      political_stance:    'LOYAL',    // LOYAL|WATCHING|DISCONTENTED|FACTION_MEMBER|IN_REVOLT
      faction_role:        'NONE',     // NONE|MEMBER|LEADER
      succession_position: 'OUT_OF_SUCCESSION', // HEIR|SECOND_IN_LINE|OUT_OF_SUCCESSION|CLAIMANT
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ── 4.8 Court Advisor (parameterised by role) ──────────────────────────────
// Base 25-state block + role-specific extension. Role stored in categorical.role.

export function createCourtAdvisorState(
  role: CourtAdvisorRole,
  provinceId: string,
  initialGold: number = 200
): NpcStateVector {
  // ── Base 25 continuous states ────────────────────────────────────────────
  const baseContinuous: ContinuousBlock = {
    loyalty_to_player:          makeContinuousVar(65,  65, 0.02),
    ambition:                   makeContinuousVar(40,  40, 0.02),
    competence_confidence:      makeContinuousVar(55,  55, 0.02),
    greed:                      makeContinuousVar(35,  35, 0.02),
    fear:                       makeContinuousVar(15,  15, 0.04),
    paranoia:                   makeContinuousVar(20,  20, 0.03),
    cunning:                    makeContinuousVar(45,  45, 0.01),
    idealism:                   makeContinuousVar(45,  45, 0.02),
    obedience:                  makeContinuousVar(60,  60, 0.02),
    independence:               makeContinuousVar(30,  30, 0.02),
    envy:                       makeContinuousVar(15,  15, 0.02),
    corruption:                 makeContinuousVar(10,  10, 0.01),
    discretion:                 makeContinuousVar(60,  60, 0.01),
    risk_tolerance:             makeContinuousVar(35,  35, 0.02),
    honor:                      makeContinuousVar(55,  55, 0.01),
    vanity:                     makeContinuousVar(40,  40, 0.02),
    suspicion_of_player:        makeContinuousVar(10,  10, 0.02),
    patience:                   makeContinuousVar(50,  50, 0.02),
    political_savvy:            makeContinuousVar(50,  50, 0.01),
    compassion:                 makeContinuousVar(40,  40, 0.02),
    pride:                      makeContinuousVar(45,  45, 0.02),
    faction_loyalty:            makeContinuousVar(0,   0,  0.02),
    personal_agenda_strength:   makeContinuousVar(20,  20, 0.02),
    burnout:                    makeContinuousVar(0,   0,  0.03),
    stress:                     makeContinuousVar(10,  10, 0.04),
  };

  // ── Role-specific extension states ──────────────────────────────────────
  const roleExtension: ContinuousBlock = buildAdvisorRoleExtension(role);

  return {
    characterType: 'COURT_ADVISOR',
    tier: 3,
    provinceId,
    settlementId: null,

    continuous: { ...baseContinuous, ...roleExtension },

    integers: {
      gold:               initialGold,
      missions_completed: 0,
      missions_failed:    0,
      blackmail_material: 0,
      secret_alliances:   0,
      years_in_position:  0,
    },

    categorical: {
      role:               role,
      current_assignment: 'NONE',
      loyalty_tier:       'RELIABLE', // DEVOTED|RELIABLE|CONDITIONAL|SELF_SERVING|TREASONOUS
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

/** Builds the role-specific continuous state extension block. */
function buildAdvisorRoleExtension(role: CourtAdvisorRole): ContinuousBlock {
  switch (role) {
    case 'CHANCELLOR': return {
      chancellor_diplomatic_pride:    makeContinuousVar(55, 55, 0.02),
      chancellor_hostility_to_war:    makeContinuousVar(40, 40, 0.02),
      chancellor_foreign_sympathy:    makeContinuousVar(20, 20, 0.02),
      chancellor_deal_addiction:      makeContinuousVar(35, 35, 0.02),
      chancellor_truth_flexibility:   makeContinuousVar(30, 30, 0.01),
      chancellor_prestige_sensitivity: makeContinuousVar(45, 45, 0.02),
      chancellor_network_investment:  makeContinuousVar(40, 40, 0.02),
      chancellor_legal_obsession:     makeContinuousVar(50, 50, 0.01),
    };
    case 'MARSHAL': return {
      marshal_tactical_creativity:   makeContinuousVar(50, 50, 0.02),
      marshal_troop_bond:            makeContinuousVar(45, 45, 0.02),
      marshal_glory_hunger:          makeContinuousVar(40, 40, 0.02),
      marshal_strategic_patience:    makeContinuousVar(50, 50, 0.02),
      marshal_insubordination_risk:  makeContinuousVar(5,  5,  0.03),
      marshal_logistics_discipline:  makeContinuousVar(55, 55, 0.02),
      marshal_cavalry_preference:    makeContinuousVar(45, 45, 0.01),
      marshal_fortress_mindset:      makeContinuousVar(40, 40, 0.02),
    };
    case 'SPYMASTER': return {
      spymaster_paranoia_professional:      makeContinuousVar(55, 55, 0.02),
      spymaster_network_confidence:         makeContinuousVar(50, 50, 0.02),
      spymaster_ruthlessness:               makeContinuousVar(35, 35, 0.01),
      spymaster_secrecy_addiction:          makeContinuousVar(40, 40, 0.01),
      spymaster_double_life_risk:           makeContinuousVar(0,  0,  0.02),
      spymaster_blackmail_comfort:          makeContinuousVar(30, 30, 0.02),
      spymaster_asset_loyalty_trust:        makeContinuousVar(55, 55, 0.02),
      spymaster_exposure_fear:              makeContinuousVar(10, 10, 0.03),
      spymaster_obsession_with_control:     makeContinuousVar(50, 50, 0.01),
      spymaster_moral_compartmentalization: makeContinuousVar(55, 55, 0.01),
    };
    case 'TREASURER': return {
      treasurer_fiscal_conservatism:      makeContinuousVar(60, 60, 0.02),
      treasurer_embezzlement_temptation:  makeContinuousVar(5,  5,  0.02),
      treasurer_market_intuition:         makeContinuousVar(50, 50, 0.02),
      treasurer_inflation_anxiety:        makeContinuousVar(35, 35, 0.02),
      treasurer_debt_aversion:            makeContinuousVar(50, 50, 0.02),
      treasurer_tax_creativity:           makeContinuousVar(40, 40, 0.02),
      treasurer_record_keeping_pride:     makeContinuousVar(65, 65, 0.01),
      treasurer_merchant_sympathy:        makeContinuousVar(30, 30, 0.02),
    };
    case 'COURT_PRIEST': return {
      courtpriest_zealotry:                  makeContinuousVar(50, 50, 0.01),
      courtpriest_political_ambition:        makeContinuousVar(30, 30, 0.02),
      courtpriest_empathy_for_poor:          makeContinuousVar(55, 55, 0.02),
      courtpriest_heresy_sensitivity:        makeContinuousVar(45, 45, 0.02),
      courtpriest_church_loyalty_vs_player:  makeContinuousVar(40, 40, 0.01),
      courtpriest_inquisition_drive:         makeContinuousVar(20, 20, 0.02),
      courtpriest_crusade_enthusiasm:        makeContinuousVar(30, 30, 0.02),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// TIER 4 FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════

// ── 4.9 Foreign Ruler ─────────────────────────────────────────────────────
// The most complex agent. 52 states. Ticks every game day.

export function createForeignRulerState(
  provinceId: string,
  realmId: string,
  initialGold: number = 5000,
  initialArmyStrength: number = 3000
): NpcStateVector {
  return {
    characterType: 'FOREIGN_RULER',
    tier: 4,
    provinceId,
    settlementId: null,

    continuous: {
      ambition:               makeContinuousVar(55,  55, 0.01),
      aggression:             makeContinuousVar(40,  40, 0.02),
      fear:                   makeContinuousVar(15,  15, 0.03),
      greed:                  makeContinuousVar(45,  45, 0.02),
      paranoia:               makeContinuousVar(25,  25, 0.02),
      pride:                  makeContinuousVar(55,  55, 0.02),
      piety:                  makeContinuousVar(45,  45, 0.02),
      honor:                  makeContinuousVar(50,  50, 0.01),
      cunning:                makeContinuousVar(50,  50, 0.01),
      patience:               makeContinuousVar(50,  50, 0.02),
      risk_tolerance:         makeContinuousVar(40,  40, 0.02),
      generosity:             makeContinuousVar(35,  35, 0.02),
      cruelty:                makeContinuousVar(25,  25, 0.01),
      diplomatic_openness:    makeContinuousVar(50,  50, 0.02),
      war_weariness:          makeContinuousVar(0,   0,  0.04),
      prestige_hunger:        makeContinuousVar(45,  45, 0.02),
      grudge_against_player:  makeContinuousVar(0,   0,  0.01),
      respect_for_player:     makeContinuousVar(30,  30, 0.02),
      religious_fervor:       makeContinuousVar(40,  40, 0.02),
      ideological_drive:      makeContinuousVar(45,  45, 0.01),
      succession_anxiety:     makeContinuousVar(20,  20, 0.02),
      isolation_drive:        makeContinuousVar(20,  20, 0.02),
      expansionism:           makeContinuousVar(40,  40, 0.02),
      mercantile_interest:    makeContinuousVar(40,  40, 0.02),
      propaganda_investment:  makeContinuousVar(30,  30, 0.02),
      coalition_building:     makeContinuousVar(25,  25, 0.02),
      spy_investment:         makeContinuousVar(30,  30, 0.02),
      military_obsession:     makeContinuousVar(35,  35, 0.02),
      economic_discipline:    makeContinuousVar(55,  55, 0.02),
      cultural_supremacy:     makeContinuousVar(40,  40, 0.01),
      vengeance_drive:        makeContinuousVar(0,   0,  0.02),
      paranoia_about_heirs:   makeContinuousVar(15,  15, 0.02),
      charisma:               makeContinuousVar(50,  50, 0.02),
      stubbornness:           makeContinuousVar(45,  45, 0.01),
      flexibility:            makeContinuousVar(45,  45, 0.02),
      legacy_focus:           makeContinuousVar(40,  40, 0.01),
    },

    integers: {
      gold:                  initialGold,
      total_army_strength:   initialArmyStrength,
      provinces_held:        1,
      active_wars:           0,
      active_alliances:      0,
      spy_networks_active:   0,
      marriages_arranged:    0,
      years_on_throne:       0,
      succession_stability:  50,
      diplomatic_incidents:  0,
      tribute_streams:       0,
    },

    categorical: {
      realm_id:                      realmId,
      primary_strategy:              'CONSOLIDATE', // EXPAND|CONSOLIDATE|DEFEND|HOLY_WAR|TRADE|DESTABILIZE
      diplomatic_posture_to_player:  'NEUTRAL',     // ALLIED|FRIENDLY|NEUTRAL|SUSPICIOUS|HOSTILE|AT_WAR
      current_military_focus:        'AT_REST',     // OFFENSIVE|DEFENSIVE|REBUILDING|AT_REST
      succession_state:              'SECURE',      // SECURE|CONTESTED|IN_CRISIS|NO_HEIR
      realm_stability:               'STABLE',      // STABLE|STRAINED|UNSTABLE|IN_REVOLT
    },

    memories:  [],
    cooldowns: {},
    lastTickEvaluated: -999,
  };
}

// ─── Convenience Dispatcher ────────────────────────────────────────────────
// Given a character type string, returns the default state with generic args.
// Used when spawning NPCs mid-game without specific context.

export function createDefaultNpcState(
  type: NpcCharacterType,
  provinceId: string,
  settlementId: string | null = null
): NpcStateVector {
  switch (type) {
    case 'PEASANT_COHORT':
      return createPeasantCohortState(provinceId, settlementId ?? provinceId, 1000, 200);
    case 'WANDERING_KNIGHT':
      return createWanderingKnightState(provinceId, 50);
    case 'MONK':
      return createMonkState(provinceId, 'ORTHODOX');
    case 'BANDIT_CHIEF':
      return createBanditChiefState(provinceId, 100, 20);
    case 'MASTER_MERCHANT':
      return createMasterMerchantState(provinceId, settlementId ?? provinceId, 500);
    case 'MERCENARY_CAPTAIN':
      return createMercenaryCaptainState(provinceId, 300, 100);
    case 'VASSAL_LORD':
      return createVassalLordState(provinceId, 500, 1000);
    case 'COURT_ADVISOR':
      return createCourtAdvisorState('CHANCELLOR', provinceId);
    case 'FOREIGN_RULER':
      return createForeignRulerState(provinceId, `realm_${provinceId}`);
  }
}
