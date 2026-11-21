/**
 * marshalActions.ts
 *
 * Action catalog for the Marshal court advisor (Tier 3).
 * Base advisor pool + 14 marshal-specific specialisation actions.
 * Based on sovereign_npc_simulation.md §4.8 Marshal Specialization.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';
import { ADVISOR_BASE_ACTIONS } from './advisorBaseActions';

const MARSHAL_SPECIALISATION: ActionDefinition[] = [
  {
    id: 'TRAIN_ARMY',
    baseWeight: 25,
    cooldownTicks: 15,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'marshal_troop_bond', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
      { kind: 'linear_scale', stateKey: 'marshal_logistics_discipline', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.0 },
    ],
  },
  {
    id: 'ADVISE_ON_BATTLE_PLAN',
    baseWeight: 15,
    cooldownTicks: 7,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'marshal_tactical_creativity', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'burnout', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 1.5, minMultiplier: 0.4 },
    ],
  },
  {
    id: 'COMMAND_ARMY_IN_FIELD',
    baseWeight: 10,
    cooldownTicks: 30,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 60 },
      { kind: 'threshold_gate', stateKey: 'current_assignment', block: 'categorical', op: '==', value: 'CAMPAIGN' },
      { kind: 'linear_scale', stateKey: 'marshal_glory_hunger', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'marshal_tactical_creativity', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'CONSCRIPT_LEVY',
    baseWeight: 8,
    cooldownTicks: 60,
    category: 'ROUTINE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 55, domainMax: 100, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'COMMISSION_SIEGE_EQUIPMENT',
    baseWeight: 4,
    cooldownTicks: 60,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'marshal_tactical_creativity', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'ORGANIZE_DEFENSIVE_LINE',
    baseWeight: 10,
    cooldownTicks: 15,
    category: 'DEFENSIVE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'marshal_fortress_mindset', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 5.0 },
    ],
  },
  {
    // Fires when insubordination_risk > 70 — withholds cavalry, causes player force to be weakened
    id: 'MISINTERPRET_ORDERS',
    baseWeight: 0.5,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'marshal_insubordination_risk', block: 'continuous', op: '>', value: 70 },
      { kind: 'linear_scale', stateKey: 'marshal_insubordination_risk', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 4.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'DEMAND_MORE_TROOPS_BEFORE_ADVANCING',
    baseWeight: 3,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'marshal_strategic_patience', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 0.3, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'marshal_logistics_discipline', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'CLAIM_BATTLE_CREDIT',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'ROUTINE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'marshal_glory_hunger', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'vanity', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    // Personal force grown outside player's knowledge; triggers when ambition high + loyalty declining
    id: 'PRIVATELY_RECRUIT_LOYAL_TROOPS',
    baseWeight: 1,
    cooldownTicks: 60,
    category: 'DEFENSIVE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'ambition', block: 'continuous', op: '>=', value: 65 },
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 50 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 65, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'marshal_troop_bond', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'NEGOTIATE_SURRENDER_TERMS',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'RECOMMEND_TACTICAL_RETREAT',
    baseWeight: 6,
    cooldownTicks: 15,
    category: 'DEFENSIVE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'marshal_strategic_patience', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'marshal_glory_hunger', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'PLAN_NIGHT_RAID',
    baseWeight: 4,
    cooldownTicks: 30,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'marshal_tactical_creativity', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'marshal_cavalry_preference', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'SABOTAGE_RIVAL_GENERAL',
    baseWeight: 1,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'envy', block: 'continuous', op: '>=', value: 50 },
      { kind: 'linear_scale', stateKey: 'envy', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.5, minMultiplier: 0.2 },
    ],
  },
];

export const MARSHAL_ACTIONS: ActionDefinition[] = [
  ...ADVISOR_BASE_ACTIONS,
  ...MARSHAL_SPECIALISATION,
];
