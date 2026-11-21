/**
 * ActionWeightEngine.ts
 *
 * Pure, stateless engine for computing probabilistic action weights.
 * Based on sovereign_npc_simulation.md Section 5.
 *
 * Usage:
 *   const weights = computeActionWeights(stateVector, actionDefs, cooldowns, worldCtx, tier);
 *   const chosen  = sampleAction(weights);
 */

import type { NpcStateVector, NpcTier } from '../models/NpcStateVector';
import { NOISE_MAGNITUDE } from '../models/NpcStateVector';

// ─── Multiplier Type Definitions ───────────────────────────────────────────

/** Hard gate: action is REMOVED from pool if condition fails. */
export interface ThresholdGate {
  kind: 'threshold_gate';
  /** continuous or integer state key */
  stateKey: string;
  /** 'continuous' | 'integer' | 'categorical' | 'world' */
  block: 'continuous' | 'integer' | 'categorical' | 'world';
  op: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number | string;
}

/** Linear scale: multiplier rises linearly with state value between min/max. */
export interface LinearScale {
  kind: 'linear_scale';
  stateKey: string;
  block: 'continuous' | 'integer' | 'world';
  /** state value that maps to minMultiplier */
  domainMin: number;
  /** state value that maps to maxMultiplier */
  domainMax: number;
  minMultiplier: number;
  maxMultiplier: number;
}

/** Inverse scale: multiplier decreases as state value rises. */
export interface InverseScale {
  kind: 'inverse_scale';
  stateKey: string;
  block: 'continuous' | 'integer' | 'world';
  domainMin: number;
  domainMax: number;
  maxMultiplier: number; // at domainMin
  minMultiplier: number; // at domainMax
}

/** Combination gate: both states must be in range or action is removed. */
export interface CombinationGate {
  kind: 'combination_gate';
  conditions: ThresholdGate[];
  /** if true, ALL conditions must pass; if false, ANY condition passes */
  requireAll: boolean;
}

/** Negation modifier: a recently-taken action reduces this action's weight. */
export interface NegationModifier {
  kind: 'negation_modifier';
  /** The action that, if it fired recently, reduces this weight */
  triggerActionId: string;
  /** multiplier applied when trigger action was recently taken */
  multiplier: number;
  /** within how many ticks counts as "recent" */
  recentTicks: number;
}

/** Categorical match: boost if a categorical state equals a target value. */
export interface CategoricalBoost {
  kind: 'categorical_boost';
  stateKey: string;
  block: 'categorical' | 'world';
  matchValue: string;
  multiplier: number;
}

export type Multiplier =
  | ThresholdGate
  | LinearScale
  | InverseScale
  | CombinationGate
  | NegationModifier
  | CategoricalBoost;

// ─── Action Category ─────────────────────────────────────────────────────────

export type ActionCategory =
  | 'ROUTINE'      // WORK, PRAY, ATTEND_COURT
  | 'ECONOMIC'     // trade, market, smuggling actions
  | 'DIPLOMATIC'   // treaties, alliances, marriages
  | 'VIOLENT'      // raids, attacks, assassinations
  | 'TRUST'        // oaths, betrayal, alliance formation
  | 'DEFENSIVE'    // fortify, retreat, guard
  | 'IMPULSIVE'    // riot, duel, sudden flight
  | 'RELIGIOUS';   // preach, bless, crusade

export type VisibilityRadius = 'COURT' | 'PROVINCE' | 'REALM' | 'WORLD';

// ─── Action Definition ─────────────────────────────────────────────────────

export interface ActionDefinition {
  id: string;
  /** Starting probability if all states are neutral (Section 5.2 Layer 1) */
  baseWeight: number;
  /** Multipliers applied in order; any zero-producing ThresholdGate removes action. */
  multipliers: Multiplier[];
  /** Ticks before this action can fire again after being selected (Section 5.5) */
  cooldownTicks: number;
  /** Action category — used for trait noise modifiers (Section 11.2) */
  category: ActionCategory;
  /** How widely visible this action is when it fires (Section 7.3) */
  visibilityRadius: VisibilityRadius;
}

// ─── World Context ─────────────────────────────────────────────────────────
// A flat record of world-level boolean/numeric facts the weight formulas can query.

export interface WorldContext {
  /** Is there an active siege in the NPC's province? */
  province_besieged: boolean;
  /** Is there active disease in the NPC's province? */
  province_diseased: boolean;
  /** Realm inflation rate (1.0 = normal) */
  realm_inflation_rate: number;
  /** Is the player treasury in deficit? */
  realm_treasury_deficit: boolean;
  /** Is there an active holy war? */
  holy_war_active: boolean;
  /** Player tax policy encoded as 0 (LIGHT) / 1 (MODERATE) / 2 (HEAVY) */
  tax_level: number;
  /** Provincial road quality 0–100 */
  province_road_quality: number;
  /** Provincial loyalty 0–100 */
  province_loyalty: number;
  /** Provincial food stockpile days remaining */
  province_food_days: number;
  /** How many active player armies are nearby (0 = none) */
  player_armies_nearby: number;
  /** Whether the player has an active militia in this province */
  player_garrison_present: boolean;
  /** Optional: custom flags added by specific action executors */
  [key: string]: boolean | number | string;
}

// ─── Engine Functions ──────────────────────────────────────────────────────

function getStateValue(
  sv: NpcStateVector,
  block: 'continuous' | 'integer' | 'categorical' | 'world',
  key: string,
  world: WorldContext
): number | string | boolean {
  if (block === 'world') return world[key] ?? 0;
  if (block === 'continuous') return sv.continuous[key]?.value ?? 50;
  if (block === 'integer')    return sv.integers[key]   ?? 0;
  if (block === 'categorical')return sv.categorical[key] ?? '';
  return 0;
}

/** Box-Muller Gaussian sample, mean=0 stddev=1 */
function gaussianSample(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Apply Gaussian noise to a weight based on tier noise magnitude.
 * An optional traitNoiseMultiplier further scales the sigma before sampling.
 */
export function applyNoise(
  weight: number,
  tier: NpcTier,
  rng: () => number,
  traitNoiseMultiplier: number = 1.0
): number {
  const sigma = (NOISE_MAGNITUDE[tier] / 3) * traitNoiseMultiplier;
  const noise = gaussianSample(rng) * sigma;
  return Math.max(0, weight * (1 + noise));
}

/**
 * Compute the trait noise multiplier for a given action category based on
 * the character's active traits (Section 11.2).
 */
export function traitNoiseMultiplierFor(
  category: ActionCategory,
  traits: string[],
  worldFlags: Record<string, boolean | number | string> = {}
): number {
  let mult = 1.0;
  if (traits.includes('WRATHFUL')   && category === 'VIOLENT')    mult *= 2.0;
  if (traits.includes('PARANOID')   && category === 'TRUST')      mult *= 0.5;
  if (traits.includes('DRUNKARD')   && worldFlags['feast_active']) mult *= 3.0;
  if (traits.includes('PATIENT')    && category === 'IMPULSIVE')  mult *= 0.3;
  if (traits.includes('CRAVEN')     && category === 'DEFENSIVE')  mult *= 2.0;
  return mult;
}

/** Evaluate a single multiplier; returns null if it hard-gates the action out. */
function evalMultiplier(
  m: Multiplier,
  sv: NpcStateVector,
  world: WorldContext,
  recentActions: Record<string, number>, // actionId → tick it last fired
  currentTick: number
): number | null {
  switch (m.kind) {
    case 'threshold_gate': {
      const raw = getStateValue(sv, m.block, m.stateKey, world);
      const val  = typeof raw === 'number' ? raw : 0;
      const sval = typeof raw === 'string' ? raw : String(raw);
      let pass: boolean;
      switch (m.op) {
        case '>':  pass = val > (m.value as number); break;
        case '>=': pass = val >= (m.value as number); break;
        case '<':  pass = val < (m.value as number); break;
        case '<=': pass = val <= (m.value as number); break;
        case '==': pass = typeof m.value === 'string' ? sval === m.value : val === m.value; break;
        case '!=': pass = typeof m.value === 'string' ? sval !== m.value : val !== m.value; break;
        default:   pass = false;
      }
      return pass ? 1 : null; // null = remove from pool
    }

    case 'linear_scale': {
      const raw = getStateValue(sv, m.block, m.stateKey, world);
      const val = typeof raw === 'number' ? raw : 0;
      const t = Math.max(0, Math.min(1, (val - m.domainMin) / (m.domainMax - m.domainMin)));
      return m.minMultiplier + t * (m.maxMultiplier - m.minMultiplier);
    }

    case 'inverse_scale': {
      const raw = getStateValue(sv, m.block, m.stateKey, world);
      const val = typeof raw === 'number' ? raw : 0;
      const t = Math.max(0, Math.min(1, (val - m.domainMin) / (m.domainMax - m.domainMin)));
      return m.maxMultiplier - t * (m.maxMultiplier - m.minMultiplier);
    }

    case 'combination_gate': {
      const results = m.conditions.map(c => evalMultiplier(c, sv, world, recentActions, currentTick));
      if (m.requireAll) {
        // All must pass — any null gates it out
        if (results.some(r => r === null)) return null;
      } else {
        // Any must pass — if all null, gate it out
        if (results.every(r => r === null)) return null;
      }
      return 1;
    }

    case 'negation_modifier': {
      const lastFired = recentActions[m.triggerActionId] ?? -999;
      if (currentTick - lastFired <= m.recentTicks) {
        return m.multiplier;
      }
      return 1;
    }

    case 'categorical_boost': {
      const raw = getStateValue(sv, m.block, m.stateKey, world);
      return String(raw) === m.matchValue ? m.multiplier : 1;
    }
  }
}

/**
 * Compute final weights for all available actions.
 *
 * Returns a map of { actionId → finalWeight }.
 * Actions gated out have weight 0 and should not be sampled.
 *
 * @param traits Optional list of trait IDs from Character.traits for noise modifiers (§11.2)
 */
export function computeActionWeights(
  sv: NpcStateVector,
  actionDefs: ActionDefinition[],
  currentTick: number,
  world: WorldContext,
  rng: () => number,
  traits: string[] = []
): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const action of actionDefs) {
    // Cooldown check
    const cooldownEnds = sv.cooldowns[action.id] ?? 0;
    if (currentTick < cooldownEnds) {
      weights[action.id] = 0;
      continue;
    }

    // Build recentActions map from cooldowns (action was used if cooldown > 0)
    const recentActions: Record<string, number> = {};
    for (const [aid, endsAt] of Object.entries(sv.cooldowns)) {
      if (endsAt > 0) recentActions[aid] = endsAt - (actionDefs.find(a => a.id === aid)?.cooldownTicks ?? 0);
    }

    // Layer 1: base weight
    let weight = action.baseWeight;

    // Layer 2: apply multipliers
    let gated = false;
    for (const m of action.multipliers) {
      const result = evalMultiplier(m, sv, world, recentActions, currentTick);
      if (result === null) {
        gated = true;
        break;
      }
      weight *= result;
    }

    if (gated) {
      weights[action.id] = 0;
      continue;
    }

    // Layer 3: noise (with trait modifier if applicable)
    const noiseMultiplier = traitNoiseMultiplierFor(action.category, traits, world);
    weight = applyNoise(weight, sv.tier, rng, noiseMultiplier);
    weights[action.id] = weight;
  }

  return weights;
}

/**
 * Weighted random sampling — selects one action ID from the weight map.
 * Returns null if all weights are 0.
 */
export function sampleAction(weights: Record<string, number>, rng: () => number): string | null {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;

  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }

  // Fallback (floating point edge case)
  return entries[entries.length - 1][0];
}
