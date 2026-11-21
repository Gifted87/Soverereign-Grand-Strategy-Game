/**
 * StateDriftSystem.ts
 *
 * Applies per-tick decay/drift to all NPC continuous state variables,
 * moving each value toward its character-specific baseline.
 * Also applies environmental state modifiers from world conditions.
 *
 * Based on sovereign_npc_simulation.md Sections 2.2 and 7.2.
 */

import type { GameLoop } from '../engine/GameLoop';
import type { NpcStateVector, ContinuousVar } from '../models/NpcStateVector';

/** Clamp to [0, 100] */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Apply a single drift step: pull value toward baseline by decayRate fraction. */
function driftVar(v: ContinuousVar, forceDelta = 0): void {
  const pullStrength = (v.baseline - v.value) * v.decayRate;
  v.value = clamp(v.value + pullStrength + forceDelta);
}

/**
 * Run the drift system for one NPC state vector.
 * Called by NpcAISystem after computing environmental context.
 */
export function applyStateDrift(
  sv: NpcStateVector,
  env: EnvironmentalContext
): void {
  const c = sv.continuous;

  // ── Universal drift toward baseline ──────────────────────────────────────
  for (const key of Object.keys(c)) {
    driftVar(c[key]);
  }

  // ── Environmental overrides (Section 7.2) ─────────────────────────────────
  // These are additive deltas applied ON TOP of the baseline drift.

  // PROVINCE: active_siege = true
  if (env.provinceBesieged) {
    if (c.fear)        c.fear.value        = clamp(c.fear.value + 3);
    if (c.desperation) c.desperation.value = clamp(c.desperation.value + 2);
    if (c.hunger)      c.hunger.value      = clamp(c.hunger.value + 1);
    if (c.fatigue)     c.fatigue.value     = clamp(c.fatigue.value + 2);
    if (c.hope)        c.hope.value        = clamp(c.hope.value - 2);
  }

  // PROVINCE: disease_active = true
  if (env.provinceDisease) {
    if (c.fear)              c.fear.value              = clamp(c.fear.value + 2);
    if (c.market_confidence) c.market_confidence.value = clamp(c.market_confidence.value - 5);
    if (c.piety)             c.piety.value             = clamp(c.piety.value + 3); // crisis drives religion
    if (c.paranoia)          c.paranoia.value          = clamp(c.paranoia.value + 2);
  }

  // REALM: inflation_rate > 1.5
  if (env.inflationRate > 1.5) {
    if (c.hoarding_drive)    c.hoarding_drive.value    = clamp(c.hoarding_drive.value + 2);
    if (c.hunger)            c.hunger.value            = clamp(c.hunger.value + 1);
    if (c.market_confidence) c.market_confidence.value = clamp(c.market_confidence.value - 3);
    if (c.debt_anxiety)      c.debt_anxiety.value      = clamp(c.debt_anxiety.value + 2);
  }

  // REALM: treasury_balance < 0
  if (env.treasuryDeficit) {
    if (c.stress)                   c.stress.value                   = clamp((c.stress?.value ?? 50) + 5);
    if (c.burnout)                  c.burnout.value                  = clamp((c.burnout?.value ?? 0) + 3);
    if (c.embezzlement_temptation)  c.embezzlement_temptation.value  = clamp(c.embezzlement_temptation.value + 2);
    if (c.desperation)              c.desperation.value              = clamp(c.desperation.value + 1);
    // Mercenary-specific: days unpaid tracked as integer (incremented separately in executor)
  }

  // WORLD: holy_war_active = true
  if (env.holyWarActive) {
    if (c.piety)                c.piety.value                = clamp(c.piety.value + 2);
    if (c.crusade_enthusiasm)   c.crusade_enthusiasm.value   = clamp(c.crusade_enthusiasm.value + 3);
    if (c.ideological_drive)    c.ideological_drive.value    = clamp(c.ideological_drive.value + 2);
    if (c.fear)                 c.fear.value                 = clamp(c.fear.value + 1);
  }

  // Heavy taxation increases smuggling drive and unrest
  if (env.taxLevel === 'HEAVY') {
    if (c.smuggling_drive) c.smuggling_drive.value = clamp(c.smuggling_drive.value + 3);
    if (c.unrest)          c.unrest.value          = clamp(c.unrest.value + 1);
    if (c.desperation)     c.desperation.value     = clamp(c.desperation.value + 1);
    if (c.hope)            c.hope.value            = clamp(c.hope.value - 1);
  }

  // Low food in province increases hunger and fear
  if (env.provinceFoodDays < 15) {
    const urgency = (15 - env.provinceFoodDays) / 15; // 0–1 scale
    if (c.hunger)      c.hunger.value      = clamp(c.hunger.value + urgency * 4);
    if (c.fear)        c.fear.value        = clamp(c.fear.value + urgency * 2);
    if (c.desperation) c.desperation.value = clamp(c.desperation.value + urgency * 3);
    if (c.hope)        c.hope.value        = clamp(c.hope.value - urgency * 2);
  }

  // Prophecy pressure builds passively for monks (1 point per tick)
  if (c.prophecy_pressure) {
    c.prophecy_pressure.value = clamp(c.prophecy_pressure.value + 0.5);
  }

  // ── Advisor-Specific Inter-Agent Loop Conditions (§6.1–6.5) ─────────────

  // §6.1 Burnout Feedback Loop
  // Burnout drifts toward baseline via universal drift above, but additionally
  // rises faster when the advisor is actively stressed (stress > 60).
  if (c.burnout && c.stress && c.stress.value > 60) {
    const stressSpillover = (c.stress.value - 60) * 0.03;
    c.burnout.value = clamp(c.burnout.value + stressSpillover);
  }

  // §6.2 Embezzlement Temptation Loop (Treasurer)
  // Rises when treasury is in deficit AND advisor loyalty is declining.
  if (c.treasurer_embezzlement_temptation) {
    if (env.treasuryDeficit && c.loyalty_to_player && c.loyalty_to_player.value < 50) {
      const temptationRise = ((50 - c.loyalty_to_player.value) / 50) * 2.5;
      c.treasurer_embezzlement_temptation.value = clamp(c.treasurer_embezzlement_temptation.value + temptationRise);
    }
    // Temptation also rises with corruption and greed if deficit is ongoing
    if (env.treasuryDeficit && c.corruption && c.greed) {
      const corruptionPressure = (c.corruption.value * 0.01) + (c.greed.value * 0.01);
      c.treasurer_embezzlement_temptation.value = clamp(c.treasurer_embezzlement_temptation.value + corruptionPressure);
    }
  }

  // §6.3 Marshal Insubordination Risk Loop
  // Rises when marshal's judgment conflicts with orders (caution rising, loyalty falling).
  if (c.marshal_insubordination_risk) {
    const loyaltyPressure = c.loyalty_to_player ? Math.max(0, 50 - c.loyalty_to_player.value) * 0.05 : 0;
    const ambitionPressure = c.ambition ? Math.max(0, c.ambition.value - 50) * 0.03 : 0;
    const gloryPressure   = c.marshal_glory_hunger ? Math.max(0, c.marshal_glory_hunger.value - 60) * 0.04 : 0;
    c.marshal_insubordination_risk.value = clamp(c.marshal_insubordination_risk.value + loyaltyPressure + ambitionPressure + gloryPressure);
    // Active conflict (at_war) accelerates insubordination risk when caution > 60
    if (!env.provinceBesieged && c.marshal_strategic_patience && c.marshal_strategic_patience.value > 60) {
      c.marshal_insubordination_risk.value = clamp(c.marshal_insubordination_risk.value + 0.3);
    }
  }

  // §6.4 Church Power Loop (Court Priest)
  // church_loyalty_vs_player drifts up slowly when holy war is active and
  // player loyalty is declining — the priest's allegiance shifts to the church.
  if (c.courtpriest_church_loyalty_vs_player) {
    if (env.holyWarActive && c.loyalty_to_player && c.loyalty_to_player.value < 60) {
      const drift = (60 - c.loyalty_to_player.value) * 0.025;
      c.courtpriest_church_loyalty_vs_player.value = clamp(c.courtpriest_church_loyalty_vs_player.value + drift + 0.5);
    }
    // Zealotry feeds into church loyalty vs player
    if (c.courtpriest_zealotry && c.courtpriest_zealotry.value > 70) {
      const zealotDrift = (c.courtpriest_zealotry.value - 70) * 0.02;
      c.courtpriest_church_loyalty_vs_player.value = clamp(c.courtpriest_church_loyalty_vs_player.value + zealotDrift);
    }
  }

  // §6.5 Exposure Fear Loop (Spymaster)
  // Spymaster's exposure_fear rises when network_confidence is low (network is thin = paranoid),
  // and drops slowly when they recently burned the network (handled in executor).
  if (c.spymaster_exposure_fear) {
    if (c.spymaster_network_confidence && c.spymaster_network_confidence.value < 30) {
      const fearRise = (30 - c.spymaster_network_confidence.value) * 0.04;
      c.spymaster_exposure_fear.value = clamp(c.spymaster_exposure_fear.value + fearRise);
    }
    // Paranoia amplifies exposure fear
    if (c.paranoia && c.paranoia.value > 60) {
      c.spymaster_exposure_fear.value = clamp(c.spymaster_exposure_fear.value + (c.paranoia.value - 60) * 0.02);
    }
  }

  // §6.6 Loyalty Tier Synchronisation
  // Keep the categorical loyalty_tier in sync with the continuous loyalty_to_player.
  // This runs on every drift tick so action-gating is always accurate.
  if (sv.categorical && c.loyalty_to_player) {
    const loyalty = c.loyalty_to_player.value;
    if (loyalty >= 80)      sv.categorical['loyalty_tier'] = 'DEVOTED';
    else if (loyalty >= 60) sv.categorical['loyalty_tier'] = 'RELIABLE';
    else if (loyalty >= 40) sv.categorical['loyalty_tier'] = 'CONDITIONAL';
    else if (loyalty >= 20) sv.categorical['loyalty_tier'] = 'SELF_SERVING';
    else                    sv.categorical['loyalty_tier'] = 'TREASONOUS';
  }
}

// ─── Environmental Context ─────────────────────────────────────────────────

export interface EnvironmentalContext {
  provinceBesieged: boolean;
  provinceDisease:  boolean;
  inflationRate:    number;
  treasuryDeficit:  boolean;
  holyWarActive:    boolean;
  taxLevel:         'LIGHT' | 'MODERATE' | 'HEAVY';
  provinceFoodDays: number;
  provinceRoadQuality: number;
}

/**
 * Build an EnvironmentalContext from the GameLoop state for a given province.
 */
export function buildEnvironmentalContext(
  engine: GameLoop,
  provinceId: string
): EnvironmentalContext {
  const prov = engine.provinces[provinceId];
  return {
    provinceBesieged:    prov?.isBesieged   ?? false,
    provinceDisease:     prov?.disease      != null,
    inflationRate:       engine.treasury.inflationRate ?? 1.0,
    treasuryDeficit:     engine.treasury.goldBalance < 0,
    holyWarActive:       engine.holyWars.length > 0,
    taxLevel:            engine.taxPolicy,
    provinceFoodDays:    computeFoodDays(engine, provinceId),
    provinceRoadQuality: prov?.roadQuality ?? 50,
  };
}

function computeFoodDays(engine: GameLoop, provinceId: string): number {
  const prov = engine.provinces[provinceId];
  if (!prov) return 30;
  const stockpile = prov.stockpiles?.food ?? engine.resources.food / Math.max(1, Object.keys(engine.provinces).length);
  const consumption = (prov.population?.total ?? 1000) * 0.01;
  return consumption > 0 ? Math.floor(stockpile / consumption) : 60;
}
