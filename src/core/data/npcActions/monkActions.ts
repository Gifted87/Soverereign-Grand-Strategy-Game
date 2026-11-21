/**
 * monkActions.ts
 *
 * Full action catalog for the Monk / Hermit Mystic (Tier 1).
 * 8 actions per sovereign_npc_simulation.md Section 4.3.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const MONK_ACTIONS: ActionDefinition[] = [
  // ── PREACH ────────────────────────────────────────────────────────────────
  // Raises piety of province, lowers unrest slightly.
  {
    id: 'PREACH',
    baseWeight: 30,
    cooldownTicks: 7,
    multipliers: [
      // Not withdrawn
      { kind: 'threshold_gate', stateKey: 'affiliation', block: 'categorical', op: '!=', value: 'HERMIT' },
      // Compassion drives outreach
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // High piety amplifies preaching drive
      { kind: 'linear_scale', stateKey: 'piety', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.0 },
      // Isolation drive suppresses public preaching
      { kind: 'inverse_scale', stateKey: 'isolation_drive', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 1.5, minMultiplier: 0.3 },
      // In crisis, preaching is more urgent
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 2.0 },
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 1.5 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── BLESS ─────────────────────────────────────────────────────────────────
  // Grants a temporary stat boost to a character or army.
  {
    id: 'BLESS',
    baseWeight: 8,
    cooldownTicks: 21,
    multipliers: [
      // Requires meaningful piety
      { kind: 'threshold_gate', stateKey: 'piety', block: 'continuous', op: '>=', value: 50 },
      // Compassion is required to want to help others
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Active military action in the area raises urgency for blessing armies
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 3.0 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── PROPHECY ──────────────────────────────────────────────────────────────
  // Triggers a narrative event; content shaped by world state. Fires when pressure peaks.
  {
    id: 'PROPHECY',
    baseWeight: 0.3,
    cooldownTicks: 90,
    multipliers: [
      // Hard gate: prophecy pressure must be high
      { kind: 'threshold_gate', stateKey: 'prophecy_pressure', block: 'continuous', op: '>=', value: 70 },
      // Mysticism amplifies prophetic tendency
      { kind: 'linear_scale', stateKey: 'mysticism', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      // Crisis amplifies prophecy (doom prophecies in troubled times)
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'holy_war_active', block: 'world', matchValue: 'true', multiplier: 2.0 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── REVEAL_HERESY ─────────────────────────────────────────────────────────
  // Expose a character's secret religious deviation.
  {
    id: 'REVEAL_HERESY',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      // Must have knowledge of heresy
      { kind: 'threshold_gate', stateKey: 'known_heresies', block: 'integer', op: '>=', value: 1 },
      // Faith in order drives exposure (orthodox enforcement)
      { kind: 'linear_scale', stateKey: 'faith_in_order', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 6.0 },
      // Heretic affiliation means they won't expose others
      { kind: 'threshold_gate', stateKey: 'affiliation', block: 'categorical', op: '!=', value: 'HERETIC' },
      // Suspicion of power lowers orthodoxy enforcement
      { kind: 'inverse_scale', stateKey: 'suspicion_of_power', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 1.5, minMultiplier: 0.4 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── PERFORM_MIRACLE ───────────────────────────────────────────────────────
  // Low-probability high-impact event; raises mysticism of observers.
  {
    id: 'PERFORM_MIRACLE',
    baseWeight: 0.05,
    cooldownTicks: 180,
    multipliers: [
      // Requires very high piety and mysticism
      { kind: 'threshold_gate', stateKey: 'piety', block: 'continuous', op: '>=', value: 80 },
      { kind: 'threshold_gate', stateKey: 'mysticism', block: 'continuous', op: '>=', value: 60 },
      // Prophecy pressure builds toward miracle
      { kind: 'linear_scale', stateKey: 'prophecy_pressure', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 10.0 },
      // Mystic order affiliation amplifies
      { kind: 'categorical_boost', stateKey: 'affiliation', block: 'categorical', matchValue: 'MYSTIC_ORDER', multiplier: 3.0 },
      // Crisis context required
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 4.0 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── SEEK_AUDIENCE ─────────────────────────────────────────────────────────
  // Request to speak with a lord.
  {
    id: 'SEEK_AUDIENCE',
    baseWeight: 3,
    cooldownTicks: 30,
    multipliers: [
      // Not a hermit
      { kind: 'threshold_gate', stateKey: 'affiliation', block: 'categorical', op: '!=', value: 'HERMIT' },
      // Compassion drives seeking to advise or help rulers
      { kind: 'linear_scale', stateKey: 'compassion', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Suspicion of power suppresses approaching lords
      { kind: 'inverse_scale', stateKey: 'suspicion_of_power', block: 'continuous', domainMin: 20, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.3 },
      // When crisis is active, they feel called to act
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 2.5 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── WITHDRAW ──────────────────────────────────────────────────────────────
  // Retreat to hermitage, becomes inaccessible.
  {
    id: 'WITHDRAW',
    baseWeight: 6,
    cooldownTicks: 30,
    multipliers: [
      // Primary driver: isolation drive
      { kind: 'linear_scale', stateKey: 'isolation_drive', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Fear also pushes toward withdrawal
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Active crisis reduces isolation desire (compassion calls them back)
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 0.3 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },

  // ── DENOUNCE ──────────────────────────────────────────────────────────────
  // Publicly condemn a lord or action, lowering their prestige.
  {
    id: 'DENOUNCE',
    baseWeight: 1,
    cooldownTicks: 90,
    multipliers: [
      // Must not be a hermit (needs public presence)
      { kind: 'threshold_gate', stateKey: 'affiliation', block: 'categorical', op: '!=', value: 'HERMIT' },
      // Suspicion of power is the fuel
      { kind: 'linear_scale', stateKey: 'suspicion_of_power', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Courage (inverse of fear) needed to speak publicly against power
      { kind: 'inverse_scale', stateKey: 'fear', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.3 },
      // Wisdom makes denouncement measured and effective
      { kind: 'linear_scale', stateKey: 'wisdom', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // High taxation triggers prophetic moral outrage
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '2', multiplier: 3.0 },
    ],
    category: 'RELIGIOUS',
    visibilityRadius: 'PROVINCE',
  },
];

