/**
 * mercenaryCaptainActions.ts
 *
 * Full action catalog for the Mercenary Captain (Tier 2).
 * 18 actions per sovereign_npc_simulation.md Section 4.6.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const MERCENARY_CAPTAIN_ACTIONS: ActionDefinition[] = [
  // ── ACCEPT_CONTRACT ───────────────────────────────────────────────────────
  {
    id: 'ACCEPT_CONTRACT',
    baseWeight: 15,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'AVAILABLE' },
      // Desperation: need gold
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 10, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Holy war active: contracts pay well
      { kind: 'categorical_boost', stateKey: 'holy_war_active', block: 'world', matchValue: 'true', multiplier: 3.0 },
      // Battle hunger drives toward combat contracts
      { kind: 'linear_scale', stateKey: 'battle_hunger', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── REJECT_CONTRACT ───────────────────────────────────────────────────────
  {
    id: 'REJECT_CONTRACT',
    baseWeight: 3,
    cooldownTicks: 15,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'NEGOTIATING' },
      // Reject if honor is high and the cause is dishonorable (abstracted as low realm loyalty)
      { kind: 'linear_scale', stateKey: 'honor', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Low desperation means they can afford to wait for better terms
      { kind: 'inverse_scale', stateKey: 'desperation', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.3 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── RENEGOTIATE_MID_CONTRACT ──────────────────────────────────────────────
  {
    id: 'RENEGOTIATE_MID_CONTRACT',
    baseWeight: 2,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      // Requires significant service (company has done more than expected)
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 1 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Province besieged = leverage for renegotiation
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 3.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── DESERT_CONTRACT ───────────────────────────────────────────────────────
  {
    id: 'DESERT_CONTRACT',
    baseWeight: 0.5,
    cooldownTicks: 90,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      // Requires low loyalty to employer
      { kind: 'threshold_gate', stateKey: 'loyalty_to_employer', block: 'continuous', op: '<', value: 25 },
      { kind: 'linear_scale', stateKey: 'days_unpaid', block: 'integer', domainMin: 15, domainMax: 45, minMultiplier: 0.5, maxMultiplier: 8.0 },
      // Reputation pride suppresses desertion
      { kind: 'inverse_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 40, domainMax: 90, maxMultiplier: 2.0, minMultiplier: 0.2 },
      { kind: 'linear_scale', stateKey: 'restlessness', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── SACK_CITY ─────────────────────────────────────────────────────────────
  {
    id: 'SACK_CITY',
    baseWeight: 0.2,
    cooldownTicks: 180,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      // Requires extended non-payment
      { kind: 'threshold_gate', stateKey: 'days_unpaid', block: 'integer', op: '>', value: 30 },
      { kind: 'linear_scale', stateKey: 'days_unpaid', block: 'integer', domainMin: 30, domainMax: 60, minMultiplier: 1.0, maxMultiplier: 10.0 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Solidarity with company drives taking care of own men
      { kind: 'linear_scale', stateKey: 'solidarity_with_company', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Honor strongly suppresses sacking
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 20, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.1 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── DEFECT_TO_ENEMY ───────────────────────────────────────────────────────
  {
    id: 'DEFECT_TO_ENEMY',
    baseWeight: 0.3,
    cooldownTicks: 120,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      { kind: 'threshold_gate', stateKey: 'loyalty_to_employer', block: 'continuous', op: '<', value: 20 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 60, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'ideological_flexibility', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Honor is a strong brake
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 20, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.05 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── RECRUIT_MERCENARY ───────────────────────────────────────────────────────────────
  {
    id: 'RECRUIT_MERCENARY',
    baseWeight: 6,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // After losses, rebuilding is urgent
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── TRAIN_TROOPS ──────────────────────────────────────────────────────────
  {
    id: 'TRAIN_TROOPS',
    baseWeight: 8,
    cooldownTicks: 15,
    multipliers: [
      // Only when not under contract (or idle during long campaigns)
      { kind: 'inverse_scale', stateKey: 'battle_hunger', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.5, minMultiplier: 0.5 },
      { kind: 'linear_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
      { kind: 'linear_scale', stateKey: 'company_size', block: 'integer', domainMin: 20, domainMax: 500, minMultiplier: 0.5, maxMultiplier: 2.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── DEMAND_BONUS_PAYMENT ──────────────────────────────────────────────────
  {
    id: 'DEMAND_BONUS_PAYMENT',
    baseWeight: 3,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      // After a major victory
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 1 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'solidarity_with_company', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 2.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── OCCUPY_PROVINCE ───────────────────────────────────────────────────────
  {
    id: 'OCCUPY_PROVINCE',
    baseWeight: 0.5,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      { kind: 'threshold_gate', stateKey: 'days_unpaid', block: 'integer', op: '>=', value: 20 },
      { kind: 'linear_scale', stateKey: 'days_unpaid', block: 'integer', domainMin: 20, domainMax: 50, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'company_size', block: 'integer', domainMin: 100, domainMax: 1000, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── NEGOTIATE_LAND_FOR_SERVICE ────────────────────────────────────────────
  {
    id: 'NEGOTIATE_LAND_FOR_SERVICE',
    baseWeight: 1,
    cooldownTicks: 90,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'ambition', block: 'continuous', op: '>=', value: 60 },
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 2 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 60, domainMax: 95, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Greed must be lower than ambition for this to override pure cash
      { kind: 'inverse_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── RAID_FOR_SUPPLIES ─────────────────────────────────────────────────────
  {
    id: 'RAID_FOR_SUPPLIES',
    baseWeight: 1,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'UNDER_CONTRACT' },
      // Only when supply is critically low
      { kind: 'threshold_gate', stateKey: 'days_unpaid', block: 'integer', op: '>=', value: 10 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'solidarity_with_company', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'honor', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.3 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── PROTECT_CONVOY ────────────────────────────────────────────────────────
  {
    id: 'PROTECT_CONVOY',
    baseWeight: 5,
    cooldownTicks: 15,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'AVAILABLE' },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'battle_hunger', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.5 },
      { kind: 'linear_scale', stateKey: 'province_road_quality', block: 'world', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── RETIRE_COMPANY ────────────────────────────────────────────────────────
  {
    id: 'RETIRE_COMPANY',
    baseWeight: 0.1,
    cooldownTicks: 730,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 2000 },
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 5 },
      { kind: 'linear_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Low greed (content to stop)
      { kind: 'inverse_scale', stateKey: 'greed', block: 'continuous', domainMin: 20, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── SEEK_NEW_CONTRACT ─────────────────────────────────────────────────────
  {
    id: 'SEEK_NEW_CONTRACT',
    baseWeight: 10,
    cooldownTicks: 15,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'AVAILABLE' },
      { kind: 'linear_scale', stateKey: 'battle_hunger', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 10, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'categorical_boost', stateKey: 'holy_war_active', block: 'world', matchValue: 'true', multiplier: 2.0 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── SPREAD_REPUTATION ─────────────────────────────────────────────────────
  {
    id: 'SPREAD_REPUTATION',
    baseWeight: 4,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.5 },
      // Must have something to brag about
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 1 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── FORM_MERCENARY_ALLIANCE ───────────────────────────────────────────────
  {
    id: 'FORM_MERCENARY_ALLIANCE',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'contract_status', block: 'categorical', op: '==', value: 'AVAILABLE' },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'company_size', block: 'integer', domainMin: 50, domainMax: 500, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },

  // ── ATTEMPT_LORDSHIP ──────────────────────────────────────────────────────
  {
    id: 'ATTEMPT_LORDSHIP',
    baseWeight: 0.1,
    cooldownTicks: 180,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'ambition', block: 'continuous', op: '>=', value: 75 },
      { kind: 'threshold_gate', stateKey: 'contracts_fulfilled', block: 'integer', op: '>=', value: 3 },
      { kind: 'threshold_gate', stateKey: 'company_reputation', block: 'integer', op: '>=', value: 60 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 75, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      // Low greed: they want land, not just gold
      { kind: 'inverse_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.4 },
    ],
    category: 'VIOLENT',
    visibilityRadius: 'PROVINCE',
  },
];

