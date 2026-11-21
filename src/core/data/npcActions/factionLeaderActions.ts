/**
 * factionLeaderActions.ts
 *
 * Action catalog for the Survivor Faction Leader (Tier 3).
 * Spawned when FORM_SECRET_FACTION fires from a peasant or discontented vassal cohort.
 * Drives the political opposition arc — from underground movement to open rebellion.
 * Derived from sovereign_npc_simulation.md §3 Tier 3 roles, §6.1 Hunger-Revolt Loop,
 * and §9.2 Economic Class Polarization.
 *
 * 20 actions across 4 categories.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const FACTION_LEADER_ACTIONS: ActionDefinition[] = [

  // ── FACTION BUILDING (6 actions) ──────────────────────────────────────────

  {
    id: 'FL_RECRUIT_MEMBER',
    baseWeight: 15,
    cooldownTicks: 14,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'charisma', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_FUND_FACTION',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_FORM_ALLIANCE_WITH_VASSAL',
    baseWeight: 5,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_SPREAD_PROPAGANDA',
    baseWeight: 10,
    cooldownTicks: 21,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'FL_HOLD_SECRET_MEETING',
    baseWeight: 12,
    cooldownTicks: 14,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 10, domainMax: 60, minMultiplier: 1.0, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'FL_PURGE_WEAK_MEMBERS',
    baseWeight: 3,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cruelty', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },

  // ── CONFRONTATION (6 actions) ─────────────────────────────────────────────

  {
    id: 'FL_DECLARE_FACTION_DEMANDS',
    baseWeight: 4,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'faction_strength', block: 'continuous', op: '>=', value: 40 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_SEEK_FOREIGN_BACKER',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_ASSASSINATE_LOYALIST',
    baseWeight: 1,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cruelty', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 300 },
    ],
  },
  {
    id: 'FL_SABOTAGE_INFRASTRUCTURE',
    baseWeight: 4,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 30, domainMax: 70, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'FL_RAID_SUPPLY_LINES',
    baseWeight: 5,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.5 },
      { kind: 'categorical_boost', stateKey: 'army_in_transit', block: 'world', matchValue: 'true', multiplier: 2.5 },
    ],
  },
  {
    id: 'FL_SEIZE_PROVINCE',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'faction_strength', block: 'continuous', op: '>=', value: 60 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 500 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },

  // ── ESCALATION / RESOLUTION (5 actions) ──────────────────────────────────

  {
    id: 'FL_DECLARE_REBELLION',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'faction_strength', block: 'continuous', op: '>=', value: 70 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 1000 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'inverse_scale', stateKey: 'fear', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.0, minMultiplier: 0.1 },
    ],
  },
  {
    id: 'FL_DECLARE_COUNTER_GOVERNMENT',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'faction_strength', block: 'continuous', op: '>=', value: 80 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
    ],
  },
  {
    id: 'FL_NEGOTIATE_PEACE_WITH_PLAYER',
    baseWeight: 6,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'war_weariness', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'aggression', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.0, minMultiplier: 0.3 },
    ],
  },
  {
    id: 'FL_ACCEPT_PARDON_FOR_FACTION',
    baseWeight: 5,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'threshold_gate', stateKey: 'pardon_offered', block: 'categorical', op: '==', value: 'true' },
    ],
  },
  {
    id: 'FL_DISSOLVE_FACTION',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'inverse_scale', stateKey: 'faction_strength', block: 'continuous', domainMin: 0, domainMax: 30, maxMultiplier: 5.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },

  // ── INTERNAL POLITICS (3 actions) ─────────────────────────────────────────

  {
    id: 'FL_ELECT_NEW_LEADER',
    baseWeight: 3,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'charisma', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'FL_MARTYRDOM_OF_MEMBER',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FL_DEMAND_CONCESSIONS',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'faction_strength', block: 'continuous', op: '>=', value: 40 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
];
