/**
 * foreignRulerActions.ts
 *
 * Action catalog for the Foreign Ruler (Tier 4).
 * 58+ actions across 6 categories per sovereign_npc_simulation.md §4.9.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const FOREIGN_RULER_ACTIONS: ActionDefinition[] = [

  // ── DIPLOMATIC (18 actions) ──────────────────────────────────────────────

  {
    id: 'PROPOSE_ALLIANCE',
    baseWeight: 15,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'diplomatic_openness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'BREAK_ALLIANCE',
    baseWeight: 5,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'diplomatic_posture_to_player', block: 'categorical', op: '==', value: 'ALLIED' },
      { kind: 'linear_scale', stateKey: 'grudge_against_player', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'FORM_COALITION_AGAINST_PLAYER',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'active_alliances', block: 'integer', op: '>=', value: 2 },
      { kind: 'linear_scale', stateKey: 'coalition_building', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 }, // fear of player expansion
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'OFFER_ROYAL_MARRIAGE',
    baseWeight: 8,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'diplomatic_openness', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'SEND_INSULT',
    baseWeight: 5,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'pride', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'grudge_against_player', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'DEMAND_TRIBUTE',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'pride', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },

  // ── MILITARY (14 actions) ────────────────────────────────────────────────

  {
    id: 'DECLARE_WAR',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      // World gate: Needs a valid casus belli
      { kind: 'categorical_boost', stateKey: 'casus_belli_exists', block: 'world', matchValue: 'true', multiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'expansionism', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'war_weariness', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.1 },
    ],
  },
  {
    id: 'LAUNCH_RAID',
    baseWeight: 8,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 2.5, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'FUND_REBELS_IN_PLAYER_REALM',
    baseWeight: 5,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 1000 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'grudge_against_player', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'OFFER_MILITARY_AID_TO_PLAYER_ENEMY',
    baseWeight: 4,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 500 },
      { kind: 'linear_scale', stateKey: 'grudge_against_player', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'coalition_building', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  // ── ECONOMIC (7 actions) ─────────────────────────────────────────────────

  {
    id: 'IMPOSE_TRADE_EMBARGO',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'ECONOMIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'grudge_against_player', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'mercantile_interest', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 2.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'DEBASE_OWN_CURRENCY',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '<', value: 500 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'economic_discipline', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 3.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'FLOOD_MARKET',
    baseWeight: 1,
    cooldownTicks: 180,
    category: 'ECONOMIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 2000 },
      // Implicitly needs warehoused goods - modeled as high mercantile interest and gold
      { kind: 'linear_scale', stateKey: 'mercantile_interest', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },

  // ── INTELLIGENCE (6 actions) ─────────────────────────────────────────────

  {
    id: 'PLANT_SPY_IN_PLAYER_COURT',
    baseWeight: 4,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT', // covert
    multipliers: [
      { kind: 'linear_scale', stateKey: 'spy_investment', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.0 },
    ],
  },
  {
    id: 'EXPOSE_OWN_DOUBLE_AGENT',
    baseWeight: 1,
    cooldownTicks: 180,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'spy_networks_active', block: 'integer', op: '>', value: 0 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },

  // ── INTERNAL (10 actions) ────────────────────────────────────────────────

  {
    // Two-phase invasion: this sets the world flag `invasion_preparing`
    id: 'PLAN_INVASION',
    baseWeight: 1,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'expansionism', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'military_obsession', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 2000 },
    ],
  },
  {
    id: 'PURGE_DISLOYAL_VASSAL',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'realm_stability', block: 'categorical', op: '==', value: 'UNSTABLE' },
      { kind: 'linear_scale', stateKey: 'cruelty', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },

  // ── REACTIVE (5 actions - triggered by world context) ────────────────────

  {
    id: 'RESPOND_TO_EXCOMMUNICATION',
    baseWeight: 10,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'excommunicated', block: 'world', matchValue: 'true', multiplier: 10.0 },
      { kind: 'linear_scale', stateKey: 'piety', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'RESPOND_TO_PLAGUE',
    baseWeight: 15,
    cooldownTicks: 180,
    category: 'DEFENSIVE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 8.0 },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
];
