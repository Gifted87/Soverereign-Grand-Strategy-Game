/**
 * chancellorActions.ts
 *
 * Action catalog for the Chancellor court advisor (Tier 3).
 * Base advisor pool + 14 chancellor-specific specialisation actions.
 * Based on sovereign_npc_simulation.md §4.8 Chancellor Specialization.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';
import { ADVISOR_BASE_ACTIONS } from './advisorBaseActions';

const CHANCELLOR_SPECIALISATION: ActionDefinition[] = [
  {
    id: 'NEGOTIATE_TREATY',
    baseWeight: 15,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'current_assignment', block: 'categorical', op: '==', value: 'NEGOTIATE' },
      { kind: 'linear_scale', stateKey: 'chancellor_diplomatic_pride', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'FABRICATE_CLAIM',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'chancellor_truth_flexibility', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.3, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'ARRANGE_MARRIAGE_DEAL',
    baseWeight: 4,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'chancellor_diplomatic_pride', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'PLANT_PROPAGANDA',
    baseWeight: 3,
    cooldownTicks: 45,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'chancellor_truth_flexibility', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'chancellor_network_investment', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'REQUEST_AUDIENCE_WITH_FOREIGN_RULER',
    baseWeight: 4,
    cooldownTicks: 45,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'chancellor_diplomatic_pride', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'BRIBE_FOREIGN_AMBASSADOR',
    baseWeight: 2,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'chancellor_truth_flexibility', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.3, maxMultiplier: 4.0 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
    ],
  },
  {
    id: 'DRAFT_PEACE_TERMS',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'holy_war_active', block: 'world', matchValue: 'true', multiplier: 2.0 },
      { kind: 'linear_scale', stateKey: 'chancellor_hostility_to_war', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'DRAFT_WAR_JUSTIFICATION',
    baseWeight: 3,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'chancellor_legal_obsession', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'chancellor_hostility_to_war', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 2.0, minMultiplier: 0.3 },
    ],
  },
  {
    id: 'MANAGE_HOSTAGE_SITUATION',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'NEGOTIATE_TRADE_TREATY',
    baseWeight: 8,
    cooldownTicks: 60,
    category: 'ECONOMIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'chancellor_diplomatic_pride', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'CRAFT_ALLIANCE_TERMS',
    baseWeight: 5,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'chancellor_legal_obsession', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'SPREAD_DISINFORMATION_ABROAD',
    baseWeight: 2,
    cooldownTicks: 45,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'chancellor_truth_flexibility', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.3, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    // Low-weight covert action; fires when chancellor's personal agenda > player loyalty
    id: 'QUIETLY_SANCTION_FOREIGN_SPY',
    baseWeight: 0.5,
    cooldownTicks: 120,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 45 },
      { kind: 'linear_scale', stateKey: 'chancellor_foreign_sympathy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 55, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
];

export const CHANCELLOR_ACTIONS: ActionDefinition[] = [
  ...ADVISOR_BASE_ACTIONS,
  ...CHANCELLOR_SPECIALISATION,
];
