/**
 * folkHeroActions.ts
 *
 * Action catalog for the Folk Hero (Tier 3).
 * The Folk Hero emerges from crisis conditions (EMERGE_NOTABLE from peasant cohort)
 * and represents the popular will crystallized into a single dangerous individual.
 * Derived from sovereign_npc_simulation.md §3 Tier 3 roles, §8.4 Generational Memory,
 * and §9.1 Loyalty Gradient emergent behavior.
 *
 * 20 actions across 4 categories.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const FOLK_HERO_ACTIONS: ActionDefinition[] = [

  // ── POPULAR LEADERSHIP (7 actions) ────────────────────────────────────────

  {
    id: 'FH_RALLY_PEASANTS',
    baseWeight: 15,
    cooldownTicks: 14,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'charisma', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'solidarity_with_people', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_GIVE_SPEECH',
    baseWeight: 20,
    cooldownTicks: 7,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'charisma', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_DISTRIBUTE_FOOD',
    baseWeight: 10,
    cooldownTicks: 14,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'province_famine', block: 'world', matchValue: 'true', multiplier: 3.0 },
    ],
  },
  {
    id: 'FH_SPREAD_LEGEND',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'fame', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'charisma', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'FH_RECRUIT_FOLLOWERS',
    baseWeight: 12,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'charisma', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'fame', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_PROTECT_REFUGEES',
    baseWeight: 10,
    cooldownTicks: 14,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'refugees_present', block: 'world', matchValue: 'true', multiplier: 3.0 },
    ],
  },
  {
    id: 'FH_PETITION_ON_BEHALF_OF_PEASANTS',
    baseWeight: 8,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'aggression', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.0, minMultiplier: 0.4 },
      { kind: 'linear_scale', stateKey: 'honor', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },

  // ── CONFRONTATION (5 actions) ─────────────────────────────────────────────

  {
    id: 'FH_DEFEND_VILLAGE',
    baseWeight: 12,
    cooldownTicks: 30,
    category: 'DEFENSIVE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'village_under_attack', block: 'world', matchValue: 'true', multiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_CHALLENGE_NOBLE_AUTHORITY',
    baseWeight: 6,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'FH_FORM_MILITIA',
    baseWeight: 5,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'follower_count', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_INSPIRE_REVOLT',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'fame', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'follower_count', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'FH_LEAD_MARCH_ON_CAPITAL',
    baseWeight: 1,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'follower_count', block: 'continuous', op: '>=', value: 70 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'fame', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },

  // ── OUTLAW PATH (4 actions) ────────────────────────────────────────────────

  {
    id: 'FH_BECOME_OUTLAW',
    baseWeight: 4,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'categorical_boost', stateKey: 'bounty_on_hero', block: 'world', matchValue: 'true', multiplier: 4.0 },
    ],
  },
  {
    id: 'FH_BECOME_BANDIT_KING',
    baseWeight: 2,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'legal_status', block: 'categorical', op: '==', value: 'OUTLAW' },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'follower_count', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
    ],
  },
  {
    id: 'FH_ORGANIZE_LABOR_STRIKE',
    baseWeight: 5,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'solidarity_with_people', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FH_FORGE_ALLIANCE_WITH_CLERGY',
    baseWeight: 5,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'piety', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },

  // ── RESOLUTION (4 actions) ─────────────────────────────────────────────────

  {
    id: 'FH_SEEK_ROYAL_RECOGNITION',
    baseWeight: 6,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'aggression', block: 'continuous', domainMin: 0, domainMax: 70, maxMultiplier: 2.0, minMultiplier: 0.3 },
    ],
  },
  {
    id: 'FH_NEGOTIATE_WITH_LORD',
    baseWeight: 7,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'honor', block: 'continuous', domainMin: 40, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'aggression', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 2.0, minMultiplier: 0.4 },
    ],
  },
  {
    id: 'FH_MARTYRDOM',
    baseWeight: 0.5,
    cooldownTicks: 9999,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'fear', block: 'continuous', op: '>=', value: 90 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 80, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 10.0 },
      { kind: 'inverse_scale', stateKey: 'self_preservation', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 5.0, minMultiplier: 0.1 },
    ],
  },
  {
    id: 'FH_FADE_INTO_OBSCURITY',
    baseWeight: 3,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'fame', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 3.0, minMultiplier: 0.1 },
    ],
  },
];
