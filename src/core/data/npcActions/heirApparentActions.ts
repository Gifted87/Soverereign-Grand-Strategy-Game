/**
 * heirApparentActions.ts
 *
 * Action catalog for the Heir Apparent (Tier 4 core role).
 * Drives the Succession Arc and internal court politics.
 * Derived from sovereign_npc_simulation.md §4.7 (Heir Apparent).
 *
 * 18 actions across 4 categories.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const HEIR_APPARENT_ACTIONS: ActionDefinition[] = [

  // ── SUCCESSION PREPARATION (6 actions) ───────────────────────────────────

  {
    id: 'HA_BUILD_POWER_BASE',
    baseWeight: 15,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'impatience_for_throne', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HA_COURT_VASSAL_LOYALTY',
    baseWeight: 10,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_UNDERMINE_SIBLING_RIVAL',
    baseWeight: 8,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HA_REQUEST_MORE_RESPONSIBILITY',
    baseWeight: 12,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HA_STUDY_STATECRAFT',
    baseWeight: 15,
    cooldownTicks: 180,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'competence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'HA_TRAIN_WITH_MILITARY',
    baseWeight: 10,
    cooldownTicks: 180,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'martial_inclination', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.0 },
    ],
  },

  // ── REBELLION / USURPATION (4 actions) ───────────────────────────────────

  {
    id: 'HA_PLOT_USURPATION',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 30, maxMultiplier: 8.0, minMultiplier: 0.0 },
      { kind: 'linear_scale', stateKey: 'impatience_for_throne', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'HA_FLEE_COURT_TO_REBEL',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 6.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'fear_of_ruler', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'HA_ASSASSINATE_RULER',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 20, maxMultiplier: 10.0, minMultiplier: 0.0 },
      { kind: 'linear_scale', stateKey: 'impatience_for_throne', block: 'continuous', domainMin: 80, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'ruthlessness', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },
  {
    id: 'HA_GATHER_REBEL_ARMY',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_ruler', block: 'continuous', op: '<', value: 30 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'martial_inclination', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },

  // ── SCANDAL & VICE (5 actions) ───────────────────────────────────────────

  {
    id: 'HA_ENGAGE_IN_SCANDAL',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'hedonism', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'inverse_scale', stateKey: 'competence', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_SQUANDER_ROYAL_FUNDS',
    baseWeight: 6,
    cooldownTicks: 120,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'hedonism', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'competence', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.5, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_INSULT_POWERFUL_VASSAL',
    baseWeight: 4,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'arrogance', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'inverse_scale', stateKey: 'competence', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_MARRY_IN_SECRET',
    baseWeight: 2,
    cooldownTicks: 730,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'romanticism', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_EMBRACE_FOREIGN_CULTURE',
    baseWeight: 3,
    cooldownTicks: 365,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'openness', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'traditionalism', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.2 },
    ],
  },

  // ── RELATIONSHIP WITH RULER (3 actions) ──────────────────────────────────

  {
    id: 'HA_SEEK_RULERS_APPROVAL',
    baseWeight: 10,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'desire_for_approval', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'HA_PUBLICLY_DISAGREE_WITH_RULER',
    baseWeight: 5,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_ruler', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'HA_RECONCILE_WITH_RULER',
    baseWeight: 6,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_ruler', block: 'continuous', op: '<', value: 60 },
      { kind: 'linear_scale', stateKey: 'fear_of_ruler', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'competence', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
];
