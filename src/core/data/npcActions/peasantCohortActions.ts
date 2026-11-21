/**
 * peasantCohortActions.ts
 *
 * Full action catalog for the Peasant Cohort Representative (Tier 1).
 * 10 actions per sovereign_npc_simulation.md Section 4.1.
 * Every weight formula is fully implemented — zero stubs.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const PEASANT_COHORT_ACTIONS: ActionDefinition[] = [
  // ── WORK ──────────────────────────────────────────────────────────────────
  // Default productive action. Low weight only if conditions are dire.
  {
    id: 'WORK',
    baseWeight: 80,
    cooldownTicks: 7,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Less likely when fatigue is very high
      { kind: 'inverse_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.2 },
      // Less likely when fear is very high (paralysis)
      { kind: 'inverse_scale', stateKey: 'fear', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.2, minMultiplier: 0.3 },
      // Less likely during riot state
      { kind: 'threshold_gate', stateKey: 'collective_mood', block: 'categorical', op: '!=', value: 'RIOTING' },
      // Cannot work if fled
      { kind: 'threshold_gate', stateKey: 'collective_mood', block: 'categorical', op: '!=', value: 'FLED' },
    ],
  },

  // ── HOARD_FOOD ────────────────────────────────────────────────────────────
  // Withdraw from market and stockpile privately. Rises with hunger.
  {
    id: 'HOARD_FOOD',
    baseWeight: 5,
    cooldownTicks: 15,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Strong driver: hunger
      { kind: 'linear_scale', stateKey: 'hunger', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 8.0 },
      // Fear amplifies hoarding instinct
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Only if there's something to hoard (market food exists)
      { kind: 'threshold_gate', stateKey: 'province_food_days', block: 'world', op: '>', value: 5 },
    ],
  },

  // ── PETITION_LORD ─────────────────────────────────────────────────────────
  // Submit formal grievance. Lowers unrest temporarily if acknowledged.
  {
    id: 'PETITION_LORD',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Rises with unrest
      { kind: 'linear_scale', stateKey: 'unrest', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Hope required — if hope is very low, they give up petitioning
      { kind: 'threshold_gate', stateKey: 'hope', block: 'continuous', op: '>', value: 15 },
      // Not while rioting
      { kind: 'threshold_gate', stateKey: 'collective_mood', block: 'categorical', op: '!=', value: 'RIOTING' },
      // Not if already fled
      { kind: 'threshold_gate', stateKey: 'collective_mood', block: 'categorical', op: '!=', value: 'FLED' },
    ],
  },

  // ── FLEE_PROVINCE ─────────────────────────────────────────────────────────
  // Migrate to a neighboring province. Carries fear and trauma on arrival.
  {
    id: 'FLEE_PROVINCE',
    baseWeight: 1,
    cooldownTicks: 90, // major life decision
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Hard gate: requires extreme desperation or very high fear
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'desperation', block: 'continuous', op: '>=', value: 70 },
          { kind: 'threshold_gate', stateKey: 'fear', block: 'continuous', op: '>=', value: 80 },
          { kind: 'threshold_gate', stateKey: 'hunger', block: 'continuous', op: '>=', value: 85 },
        ],
      },
      // Desperation amplifier
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Active siege or disease dramatically raises flight probability
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 2.5 },
    ],
  },

  // ── FORM_SECRET_FACTION ───────────────────────────────────────────────────
  // Coalesce into a faction entity. Spawns a Tier 2/3 Survivor Faction Leader NPC.
  {
    id: 'FORM_SECRET_FACTION',
    baseWeight: 0.5,
    cooldownTicks: 120,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Requires high unrest
      { kind: 'threshold_gate', stateKey: 'unrest', block: 'continuous', op: '>=', value: 60 },
      // Requires high solidarity
      { kind: 'threshold_gate', stateKey: 'solidarity', block: 'continuous', op: '>=', value: 50 },
      // Not already a faction member
      { kind: 'threshold_gate', stateKey: 'collective_mood', block: 'categorical', op: '!=', value: 'FLED' },
      // Solidarity multiplier
      { kind: 'linear_scale', stateKey: 'solidarity', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      // Unrest amplifier
      { kind: 'linear_scale', stateKey: 'unrest', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
    ],
  },

  // ── RIOT ──────────────────────────────────────────────────────────────────
  // Uncontrolled property destruction. Requires unrest > 75.
  {
    id: 'RIOT',
    baseWeight: 0.8,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Hard gate: unrest must exceed 75
      { kind: 'threshold_gate', stateKey: 'unrest', block: 'continuous', op: '>', value: 75 },
      // Desperation amplifies riot probability
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 30, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Hope as inverse: more hope = less riot
      { kind: 'inverse_scale', stateKey: 'hope', block: 'continuous', domainMin: 0, domainMax: 60, maxMultiplier: 3.0, minMultiplier: 0.5 },
      // Garrison nearby suppresses riot
      { kind: 'categorical_boost', stateKey: 'player_garrison_present', block: 'world', matchValue: 'true', multiplier: 0.2 },
    ],
  },

  // ── REFUSE_LEVY ───────────────────────────────────────────────────────────
  // Don't show up when conscripted. Requires fear > 60 or loyalty < 20.
  {
    id: 'REFUSE_LEVY',
    baseWeight: 2,
    cooldownTicks: 45,
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'fear', block: 'continuous', op: '>', value: 60 },
          { kind: 'threshold_gate', stateKey: 'province_loyalty', block: 'world', op: '<', value: 20 },
        ],
      },
      // Fatigue makes refusal more tempting
      { kind: 'linear_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Desperation: starving cohorts refuse military service
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  // ── SUPPORT_REBEL ─────────────────────────────────────────────────────────
  // Fund or join a rebel cause with labor. Requires existing faction to exist.
  {
    id: 'SUPPORT_REBEL',
    baseWeight: 1,
    cooldownTicks: 30,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Must have meaningful unrest
      { kind: 'threshold_gate', stateKey: 'unrest', block: 'continuous', op: '>=', value: 50 },
      // Must have solidarity to act collectively
      { kind: 'threshold_gate', stateKey: 'solidarity', block: 'continuous', op: '>=', value: 35 },
      // Rising with both unrest and desperation
      { kind: 'linear_scale', stateKey: 'unrest', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Hope inverse: more hope = less support for rebels
      { kind: 'inverse_scale', stateKey: 'hope', block: 'continuous', domainMin: 0, domainMax: 70, maxMultiplier: 2.5, minMultiplier: 0.5 },
      // Piety can suppress rebellion (religious acceptance of suffering)
      { kind: 'inverse_scale', stateKey: 'piety', block: 'continuous', domainMin: 30, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.7 },
    ],
  },

  // ── PRAY ──────────────────────────────────────────────────────────────────
  // Raises piety, lowers unrest slightly. No world effect.
  {
    id: 'PRAY',
    baseWeight: 12,
    cooldownTicks: 3,
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // More likely when fearful or desperate
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 0, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 2.5 },
      // High piety means they are already inclined to pray
      { kind: 'linear_scale', stateKey: 'piety', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.0 },
    ],
  },

  // ── EMERGE_NOTABLE ────────────────────────────────────────────────────────
  // Spawns a Tier 2/3 NPC from the cohort under crisis conditions.
  {
    id: 'EMERGE_NOTABLE',
    baseWeight: 0.1,
    cooldownTicks: 365, // once per year at most per cohort
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      // Requires crisis — high combination of stress
      { kind: 'threshold_gate', stateKey: 'unrest', block: 'continuous', op: '>=', value: 70 },
      { kind: 'threshold_gate', stateKey: 'desperation', block: 'continuous', op: '>=', value: 60 },
      { kind: 'threshold_gate', stateKey: 'cohort_size', block: 'integer', op: '>=', value: 100 },
      // Solidarity needed — a notable needs followers
      { kind: 'threshold_gate', stateKey: 'solidarity', block: 'continuous', op: '>=', value: 40 },
      // Amplified by trauma (atrocity produces folk heroes)
      { kind: 'linear_scale', stateKey: 'trauma', block: 'continuous', domainMin: 0, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 6.0 },
    ],
  },
];
