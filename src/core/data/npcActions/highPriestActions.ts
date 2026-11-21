/**
 * highPriestActions.ts
 *
 * Action catalog for the High Priest / Pope equivalent (Tier 3).
 * The most powerful religious agent in the simulation.
 * Derived from sovereign_npc_simulation.md §4.8 COURT PRIEST + Tier 3 role descriptions
 * and feedback loops §6.4 (The Church Power Loop) and §9.5 (Religion as Political Tool).
 *
 * 25 actions across 5 categories.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const HIGH_PRIEST_ACTIONS: ActionDefinition[] = [

  // ── DOCTRINAL / AUTHORITY (8 actions) ────────────────────────────────────

  {
    id: 'HP_EXCOMMUNICATE_RULER',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 8.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.8, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'HP_LIFT_EXCOMMUNICATION',
    baseWeight: 8,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'ruler_excommunicated', block: 'world', matchValue: 'true', multiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'generosity', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'threshold_gate', stateKey: 'player_penance_paid', block: 'categorical', op: '==', value: 'true' },
    ],
  },
  {
    id: 'HP_CALL_CRUSADE',
    baseWeight: 1,
    cooldownTicks: 730,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'crusade_enthusiasm', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_ISSUE_PAPAL_BULL',
    baseWeight: 5,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_PLACE_INTERDICT',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 6.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },
  {
    id: 'HP_LIFT_INTERDICT',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'interdict_active', block: 'world', matchValue: 'true', multiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'generosity', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_DECLARE_HERESY',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'inquisition_drive', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'HP_CANONIZE_SAINT',
    baseWeight: 4,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'prestige_sensitivity', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },

  // ── POLITICAL (8 actions) ─────────────────────────────────────────────────

  {
    id: 'HP_DEMAND_CHURCH_LAND',
    baseWeight: 4,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'legal_obsession', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_APPOINT_BISHOP',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'network_investment', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_SUPPORT_SUCCESSION_CLAIMANT',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 4.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'HP_ALLY_WITH_FOREIGN_RULER',
    baseWeight: 3,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'HP_SEND_LEGATE',
    baseWeight: 7,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'network_investment', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HP_COMMUNICATE_CLERGY_NETWORK',
    baseWeight: 12,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'network_investment', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_NEGOTIATE_CONCORDAT',
    baseWeight: 5,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'legal_obsession', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'diplomatic_pride', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },

  // ── INQUISITION (3 actions) ───────────────────────────────────────────────

  {
    id: 'HP_SUMMON_INQUISITION',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'inquisition_drive', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'HP_RADICALIZE_REGIONAL_CHURCH',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'zealotry', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'HP_DEMAND_CRUSADE_CONTRIBUTION',
    baseWeight: 6,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'crusade_enthusiasm', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },

  // ── PASTORAL (4 actions) ──────────────────────────────────────────────────

  {
    id: 'HP_BLESS_ARMY',
    baseWeight: 10,
    cooldownTicks: 60,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'empathy_for_poor', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'crusade_enthusiasm', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HP_GRANT_ABSOLUTION_TO_RULER',
    baseWeight: 7,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'generosity', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HP_OFFER_ECCLESIASTICAL_SUPPORT',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'empathy_for_poor', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HP_CONDEMN_RULER',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 30, maxMultiplier: 5.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
    ],
  },

  // ── WITHDRAWAL (2 actions) ────────────────────────────────────────────────

  {
    id: 'HP_THREATEN_SCHISM',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'RELIGIOUS',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'respect_for_player', block: 'continuous', domainMin: 0, domainMax: 20, maxMultiplier: 10.0, minMultiplier: 0.0 },
      { kind: 'linear_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 80, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
    ],
  },
  {
    id: 'HP_WITHDRAW_FROM_POLITICS',
    baseWeight: 3,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'political_ambition', block: 'continuous', domainMin: 0, domainMax: 30, maxMultiplier: 5.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'empathy_for_poor', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
];
