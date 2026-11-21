/**
 * wanderingKnightActions.ts
 *
 * Full action catalog for the Wandering Knight (Tier 1).
 * 10 actions per sovereign_npc_simulation.md Section 4.2.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const WANDERING_KNIGHT_ACTIONS: ActionDefinition[] = [
  // ── SEEK_EMPLOYMENT ───────────────────────────────────────────────────────
  // Approach a lord's court and offer service.
  {
    id: 'SEEK_EMPLOYMENT',
    baseWeight: 15,
    cooldownTicks: 30,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      // Only when not already employed
      { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'FREELANCE' },
      // Desperation is the primary driver
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 10, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Ambition also pushes toward employment
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Not if disgraced — reduced chance
      { kind: 'categorical_boost', stateKey: 'employment_status', block: 'categorical', matchValue: 'DISGRACED', multiplier: 0.3 },
    ],
  },

  // ── CHALLENGE_DUEL ────────────────────────────────────────────────────────
  // Issue a challenge to prove martial worth.
  {
    id: 'CHALLENGE_DUEL',
    baseWeight: 3,
    cooldownTicks: 60,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      // Must have confidence
      { kind: 'threshold_gate', stateKey: 'martial_confidence', block: 'continuous', op: '>=', value: 55 },
      // Honor drive amplifies
      { kind: 'linear_scale', stateKey: 'honor', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      // Ambition as fuel for proving worth
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Fatigue reduces willingness to fight
      { kind: 'inverse_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.2 },
    ],
  },

  // ── TAKE_MERCENARY_JOB ────────────────────────────────────────────────────
  // Join a mercenary band for gold only, no loyalty bond.
  {
    id: 'TAKE_MERCENARY_JOB',
    baseWeight: 8,
    cooldownTicks: 45,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      // Only when FREELANCE or DISGRACED
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'FREELANCE' },
          { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'DISGRACED' },
        ],
      },
      // Greed is primary driver over honor
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Honor suppresses mercenary work
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 40, domainMax: 90, maxMultiplier: 2.0, minMultiplier: 0.4 },
      // Desperation overrides honor concerns
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── DEFECT ────────────────────────────────────────────────────────────────
  // Leave current employer, causes reputation damage.
  {
    id: 'DEFECT',
    baseWeight: 0.5,
    cooldownTicks: 90,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      // Must be employed to defect
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'HIRED' },
          { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'SWORN' },
        ],
      },
      // Low loyalty is required
      { kind: 'threshold_gate', stateKey: 'loyalty_to_current_lord', block: 'continuous', op: '<', value: 30 },
      // Restlessness amplifies departure
      { kind: 'linear_scale', stateKey: 'restlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Greed: better offer available makes defection tempting
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Honor strongly suppresses defection
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 30, domainMax: 90, maxMultiplier: 2.0, minMultiplier: 0.1 },
    ],
  },

  // ── INVESTIGATE_COURT ─────────────────────────────────────────────────────
  // Covertly gather information on a lord's character.
  {
    id: 'INVESTIGATE_COURT',
    baseWeight: 4,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      // Suspicion drives investigation
      { kind: 'linear_scale', stateKey: 'suspicion', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Cunning-equivalent: idealism (ironically, idealists investigate more to find virtue)
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.0 },
    ],
  },

  // ── SWEAR_FEALTY ──────────────────────────────────────────────────────────
  // Become a sworn knight; deep loyalty commitment.
  {
    id: 'SWEAR_FEALTY',
    baseWeight: 2,
    cooldownTicks: 120,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      // Must be HIRED (trial period) first
      { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'HIRED' },
      // High loyalty to current lord required
      { kind: 'threshold_gate', stateKey: 'loyalty_to_current_lord', block: 'continuous', op: '>=', value: 65 },
      // Idealism and honor drive fealty oath
      { kind: 'linear_scale', stateKey: 'honor', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'idealism', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Low desperation (not doing it out of desperation)
      { kind: 'inverse_scale', stateKey: 'desperation', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 1.5, minMultiplier: 0.5 },
    ],
  },

  // ── TRAIN ─────────────────────────────────────────────────────────────────
  // Raise martial confidence; consumes time and food.
  {
    id: 'TRAIN',
    baseWeight: 10,
    cooldownTicks: 15,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      // Primary driver: low confidence means they feel the need to train
      { kind: 'inverse_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 20, domainMax: 100, maxMultiplier: 3.0, minMultiplier: 0.5 },
      // Ambition amplifies training motivation
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // Cannot train when exhausted
      { kind: 'inverse_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.2 },
    ],
  },

  // ── PETITION_FOR_LAND ─────────────────────────────────────────────────────
  // Ask employer for a minor holding.
  {
    id: 'PETITION_FOR_LAND',
    baseWeight: 1,
    cooldownTicks: 60,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      // Must be sworn
      { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'SWORN' },
      // High loyalty means good standing to ask
      { kind: 'threshold_gate', stateKey: 'loyalty_to_current_lord', block: 'continuous', op: '>=', value: 60 },
      // Ambition is the primary driver
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Reputation needed to be taken seriously
      { kind: 'linear_scale', stateKey: 'reputation_score', block: 'integer', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  // ── HIDE_IDENTITY ─────────────────────────────────────────────────────────
  // Conceal past employment or disgrace.
  {
    id: 'HIDE_IDENTITY',
    baseWeight: 2,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      // Only relevant when disgraced or has many lords served
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'employment_status', block: 'categorical', op: '==', value: 'DISGRACED' },
          { kind: 'threshold_gate', stateKey: 'lords_served', block: 'integer', op: '>=', value: 3 },
        ],
      },
      // Suspicion drives concealment behavior
      { kind: 'linear_scale', stateKey: 'suspicion', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },

  // ── DEPART ────────────────────────────────────────────────────────────────
  // Leave a location entirely for a new province.
  {
    id: 'DEPART',
    baseWeight: 5,
    cooldownTicks: 45,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      // Restlessness is the core driver
      { kind: 'linear_scale', stateKey: 'restlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Fear of local conditions can trigger departure
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Province besieged greatly amplifies departure
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 5.0 },
      // If sworn, leaving is disloyal — honor suppresses it
      { kind: 'categorical_boost', stateKey: 'employment_status', block: 'categorical', matchValue: 'SWORN', multiplier: 0.1 },
    ],
  },
];
