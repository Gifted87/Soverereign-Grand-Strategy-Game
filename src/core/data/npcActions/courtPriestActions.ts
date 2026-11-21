/**
 * courtPriestActions.ts
 *
 * Action catalog for the Court Priest advisor (Tier 3).
 * Base advisor pool + 11 specialisation actions.
 * Based on sovereign_npc_simulation.md §4.8 Court Priest Specialization.
 *
 * All 11 spec action IDs are present:
 *   PREACH_IN_PROVINCE, WARN_OF_EXCOMMUNICATION, NEGOTIATE_WITH_HIGH_PRIEST,
 *   DEMAND_CHURCH_TAX_EXEMPTION, CALL_FOR_CRUSADE_PARTICIPATION,
 *   CONDUCT_INQUISITION, GRANT_ABSOLUTION, PERFORM_WEDDING,
 *   THREATEN_INTERDICT, COVERTLY_REPORT_TO_HIGH_PRIEST, RADICALIZE_CLERGY
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';
import { ADVISOR_BASE_ACTIONS } from './advisorBaseActions';

const COURT_PRIEST_SPECIALISATION: ActionDefinition[] = [

  // ── LOYAL / ROUTINE ─────────────────────────────────────────────────────

  {
    // Raise piety in a province, lower unrest; core duty
    id: 'PREACH_IN_PROVINCE',
    baseWeight: 22,
    cooldownTicks: 15,
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.0 },
    ],
  },

  {
    // Public warning that excommunication is near; destabilises realm if ignored
    id: 'WARN_OF_EXCOMMUNICATION',
    baseWeight: 6,
    cooldownTicks: 90,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 55 },
      { kind: 'linear_scale', stateKey: 'courtpriest_church_loyalty_vs_player', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 4.5 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Diplomatic channel to the High Priest; can protect or harm player relations
    id: 'NEGOTIATE_WITH_HIGH_PRIEST',
    baseWeight: 8,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'courtpriest_political_ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Church formally requests tax exemption; cuts treasury income
    id: 'DEMAND_CHURCH_TAX_EXEMPTION',
    baseWeight: 4,
    cooldownTicks: 180,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'courtpriest_political_ambition', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'courtpriest_church_loyalty_vs_player', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
  },

  {
    // Urge player to join a crusade; may divert treasury
    id: 'CALL_FOR_CRUSADE_PARTICIPATION',
    baseWeight: 5,
    cooldownTicks: 90,
    category: 'RELIGIOUS',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'courtpriest_crusade_enthusiasm', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 5.5 },
      { kind: 'categorical_boost', stateKey: 'holy_war_active', block: 'world', matchValue: 'true', multiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Root out heretics; can produce false positives if inquisition_drive is extreme
    id: 'CONDUCT_INQUISITION',
    baseWeight: 4,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 45 },
      { kind: 'linear_scale', stateKey: 'courtpriest_inquisition_drive', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'courtpriest_heresy_sensitivity', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 50, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Reduce piety penalty from sinful player actions
    id: 'GRANT_ABSOLUTION',
    baseWeight: 8,
    cooldownTicks: 45,
    category: 'RELIGIOUS',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.5, minMultiplier: 0.5 },
    ],
  },

  {
    // Perform a diplomatic marriage ceremony; raises prestige
    id: 'PERFORM_WEDDING',
    baseWeight: 6,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  // ── COVERT / HOSTILE ACTIONS ─────────────────────────────────────────────

  {
    // Province-level religious sanction; extreme action
    id: 'THREATEN_INTERDICT',
    baseWeight: 0.5,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 30 },
      { kind: 'linear_scale', stateKey: 'courtpriest_church_loyalty_vs_player', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'courtpriest_political_ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Covert report to church hierarchy if church loyalty > player loyalty
    id: 'COVERTLY_REPORT_TO_HIGH_PRIEST',
    baseWeight: 3,
    cooldownTicks: 60,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 60 },
      { kind: 'linear_scale', stateKey: 'courtpriest_church_loyalty_vs_player', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 0.8, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'discretion', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Amplifies religious tension across the realm; requires zealotry > 75
    id: 'RADICALIZE_CLERGY',
    baseWeight: 1,
    cooldownTicks: 120,
    category: 'RELIGIOUS',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'courtpriest_zealotry', block: 'continuous', op: '>', value: 75 },
      { kind: 'linear_scale', stateKey: 'courtpriest_zealotry', block: 'continuous', domainMin: 75, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 3.5, minMultiplier: 0.5 },
      { kind: 'linear_scale', stateKey: 'courtpriest_political_ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

];

export const COURT_PRIEST_ACTIONS: ActionDefinition[] = [
  ...ADVISOR_BASE_ACTIONS,
  ...COURT_PRIEST_SPECIALISATION,
];
