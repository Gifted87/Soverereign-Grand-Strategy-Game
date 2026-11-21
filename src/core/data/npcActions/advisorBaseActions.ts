/**
 * advisorBaseActions.ts
 *
 * Shared base action pool for all 5 Court Advisor types (Tier 3).
 * These actions are available to every advisor role; specialisation actions
 * are added on top in each role-specific catalog file.
 * Based on sovereign_npc_simulation.md §4.8.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const ADVISOR_BASE_ACTIONS: ActionDefinition[] = [

  // ── LOYAL BAND (loyalty_to_player > 50) ────────────────────────────────

  {
    id: 'EXECUTE_ASSIGNED_MISSION',
    baseWeight: 45,
    cooldownTicks: 3,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'burnout', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.2 },
      { kind: 'threshold_gate', stateKey: 'current_assignment', block: 'categorical', op: '!=', value: 'NONE' },
    ],
  },
  {
    id: 'ADVISE_PLAYER',
    baseWeight: 20,
    cooldownTicks: 5,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'competence_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'burnout', block: 'continuous', domainMin: 20, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.4 },
    ],
  },
  {
    id: 'REPORT_THREAT',
    baseWeight: 12,
    cooldownTicks: 7,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'discretion', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 2.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'ATTEND_COUNCIL',
    baseWeight: 18,
    cooldownTicks: 3,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'inverse_scale', stateKey: 'burnout', block: 'continuous', domainMin: 0, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.3 },
    ],
  },

  // ── SELF-INTEREST BAND (always available) ─────────────────────────────

  {
    id: 'PURSUE_PERSONAL_AGENDA',
    baseWeight: 8,
    cooldownTicks: 15,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'personal_agenda_strength', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'BUILD_COURT_NETWORK',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 30, domainMax: 85, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'ACCUMULATE_BLACKMAIL',
    baseWeight: 2,
    cooldownTicks: 45,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'corruption', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'SEEK_SECRET_ALLIANCE',
    baseWeight: 2,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.3, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'REST_AND_RECOVER',
    baseWeight: 8,
    cooldownTicks: 10,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'burnout', block: 'continuous', domainMin: 30, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'stress', block: 'continuous', domainMin: 30, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  // ── SELF-SERVING BAND (loyalty_to_player < 40) ────────────────────────

  {
    id: 'OBSTRUCT_PLAYER_DECISION',
    baseWeight: 3,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 40 },
      { kind: 'linear_scale', stateKey: 'independence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'personal_agenda_strength', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'LEAK_INFORMATION',
    baseWeight: 1,
    cooldownTicks: 60,
    category: 'TRUST',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 35 },
      { kind: 'linear_scale', stateKey: 'corruption', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'faction_loyalty', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },

  // ── TREASONOUS BAND (loyalty < 15 or loyalty_tier == TREASONOUS) ──────

  {
    id: 'DEFECT_TO_RIVAL',
    baseWeight: 0.2,
    cooldownTicks: 365,
    category: 'TRUST',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 15 },
      { kind: 'linear_scale', stateKey: 'faction_loyalty', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      { kind: 'linear_scale', stateKey: 'corruption', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
    ],
  },
  {
    id: 'SABOTAGE_MISSION',
    baseWeight: 0.5,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 20 },
      { kind: 'threshold_gate', stateKey: 'loyalty_tier', block: 'categorical', op: '==', value: 'TREASONOUS' },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
    ],
  },
];
