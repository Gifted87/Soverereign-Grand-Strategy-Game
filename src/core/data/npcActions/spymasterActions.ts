/**
 * spymasterActions.ts
 *
 * Action catalog for the Spymaster court advisor (Tier 3).
 * Base advisor pool + 16 spymaster-specific specialisation actions.
 * Based on sovereign_npc_simulation.md §4.8 Spymaster Specialization.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';
import { ADVISOR_BASE_ACTIONS } from './advisorBaseActions';

const SPYMASTER_SPECIALISATION: ActionDefinition[] = [
  {
    id: 'WATCH_COURT',
    baseWeight: 30,
    cooldownTicks: 3,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'spymaster_obsession_with_control', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_player', block: 'continuous', domainMin: 30, domainMax: 100, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'INFILTRATE_FOREIGN_COURT',
    baseWeight: 5,
    cooldownTicks: 60,
    category: 'TRUST',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'spymaster_network_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'RECRUIT_AGENT',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'spymaster_asset_loyalty_trust', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'ASSIGN_ASSASSINATION',
    baseWeight: 0.3,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'threshold_gate', stateKey: 'current_assignment', block: 'categorical', op: '==', value: 'ELIMINATE_TARGET' },
      { kind: 'linear_scale', stateKey: 'spymaster_ruthlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'spymaster_moral_compartmentalization', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FRAME_CHARACTER',
    baseWeight: 1,
    cooldownTicks: 120,
    category: 'TRUST',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'spymaster_ruthlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 55, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'EXPOSE_PLOT',
    baseWeight: 10,
    cooldownTicks: 15,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'spymaster_network_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'FABRICATE_EVIDENCE',
    baseWeight: 1,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'spymaster_ruthlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'spymaster_moral_compartmentalization', block: 'continuous', domainMin: 50, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    // Panic action — destroys own network to prevent capture when exposure_fear is extreme
    id: 'BURN_NETWORK',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'DEFENSIVE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'spymaster_exposure_fear', block: 'continuous', op: '>', value: 85 },
      { kind: 'linear_scale', stateKey: 'spymaster_exposure_fear', block: 'continuous', domainMin: 85, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 10.0 },
    ],
  },
  {
    id: 'TURN_ENEMY_AGENT',
    baseWeight: 3,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 55, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'spymaster_blackmail_comfort', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'PLANT_DOUBLE_AGENT',
    baseWeight: 2,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'spymaster_network_confidence', block: 'continuous', domainMin: 55, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 60, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    // Fires covertly when the spymaster has personal agenda > player loyalty
    id: 'COVERTLY_MONITOR_PLAYER_ADVISOR',
    baseWeight: 1,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 45 },
      { kind: 'linear_scale', stateKey: 'personal_agenda_strength', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'spymaster_obsession_with_control', block: 'continuous', domainMin: 50, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'BLACKMAIL_VASSAL',
    baseWeight: 1,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'blackmail_material', block: 'integer', op: '>', value: 0 },
      { kind: 'linear_scale', stateKey: 'spymaster_blackmail_comfort', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'INTERCEPT_COURIER',
    baseWeight: 8,
    cooldownTicks: 10,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'spymaster_paranoia_professional', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    // Treasonous action — gated on loyalty_tier == TREASONOUS
    id: 'LEAK_INTEL_TO_ENEMY',
    baseWeight: 0.2,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_tier', block: 'categorical', op: '==', value: 'TREASONOUS' },
      { kind: 'linear_scale', stateKey: 'spymaster_double_life_risk', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
    ],
  },
  {
    id: 'MAP_ENEMY_SUPPLY_LINES',
    baseWeight: 6,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'spymaster_network_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'PRODUCE_FORGED_DOCUMENT',
    baseWeight: 1,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'spymaster_ruthlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 60, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },
];

export const SPYMASTER_ACTIONS: ActionDefinition[] = [
  ...ADVISOR_BASE_ACTIONS,
  ...SPYMASTER_SPECIALISATION,
];
