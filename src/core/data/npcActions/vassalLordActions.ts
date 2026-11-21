/**
 * vassalLordActions.ts
 *
 * Full action catalog for the Vassal Lord (Tier 3).
 * 38 actions across 5 loyalty-gated bands per sovereign_npc_simulation.md §4.7.
 * DECLARE_INDEPENDENCE weight formula implements §5.3 verbatim.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

// ─── SHARED BASE ACTIONS (Loyal Band — loyalty_to_liege > 50) ──────────────

const LOYAL_ACTIONS: ActionDefinition[] = [
  {
    id: 'ANSWER_LEVY_CALL',
    baseWeight: 40,
    cooldownTicks: 30,
    category: 'ROUTINE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.3 },
    ],
  },
  {
    id: 'PAY_TAXES_IN_FULL',
    baseWeight: 35,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 2.5 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 100 },
    ],
  },
  {
    id: 'SHARE_INTELLIGENCE',
    baseWeight: 10,
    cooldownTicks: 15,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 60, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'cunning', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 1.5, minMultiplier: 0.8 },
    ],
  },
  {
    id: 'SUPPORT_PLAYER_LAW',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 65 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 65, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'OFFER_PERSONAL_LOAN',
    baseWeight: 3,
    cooldownTicks: 90,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 70 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 1000 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 5.0 },
    ],
  },
  {
    id: 'ATTEND_COURT',
    baseWeight: 15,
    cooldownTicks: 15,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 2.0 },
      { kind: 'inverse_scale', stateKey: 'fatigue', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 1.2, minMultiplier: 0.5 },
    ],
  },
  {
    id: 'ARRANGE_MARRIAGE_FOR_ALLIANCE',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 60 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
  {
    id: 'LEAD_CAMPAIGN_IN_PLAYER_NAME',
    baseWeight: 4,
    cooldownTicks: 120,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 70 },
      { kind: 'linear_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 40, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'threshold_gate', stateKey: 'personal_army_size', block: 'integer', op: '>=', value: 500 },
    ],
  },
  {
    id: 'VOLUNTEER_COUNSEL',
    baseWeight: 6,
    cooldownTicks: 10,
    category: 'ROUTINE',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },
];

// ─── SELF-INTEREST ACTIONS (always available) ──────────────────────────────

const SELF_INTEREST_ACTIONS: ActionDefinition[] = [
  {
    id: 'IMPROVE_PROVINCE',
    baseWeight: 20,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'RECRUIT_PERSONAL_ARMY',
    baseWeight: 8,
    cooldownTicks: 30,
    category: 'DEFENSIVE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 300 },
      { kind: 'linear_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.0 },
    ],
  },
  {
    id: 'ARRANGE_PRIVATE_MARRIAGE',
    baseWeight: 3,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 50, domainMax: 100, maxMultiplier: 2.0, minMultiplier: 0.8 },
    ],
  },
  {
    id: 'BRIBE_PLAYER_ADVISOR',
    baseWeight: 2,
    cooldownTicks: 60,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 300 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'corruption_tolerance', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.3, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'INVESTIGATE_NEIGHBOR_VASSAL',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 15, domainMax: 70, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'PETITION_LIEGE',
    baseWeight: 10,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'discontent', block: 'continuous', domainMin: 10, domainMax: 60, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'threshold_gate', stateKey: 'political_stance', block: 'categorical', op: '!=', value: 'IN_REVOLT' },
    ],
  },
  {
    id: 'ENGAGE_IN_TRADE',
    baseWeight: 12,
    cooldownTicks: 7,
    category: 'ECONOMIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'SPREAD_RUMOR',
    baseWeight: 3,
    cooldownTicks: 30,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'envy', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'STOCKPILE_FOOD',
    baseWeight: 10,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 150 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 15, domainMax: 60, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'BUILD_PRIVATE_ALLIANCE',
    baseWeight: 3,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'independence_drive', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'MANAGE_OWN_COURT',
    baseWeight: 18,
    cooldownTicks: 7,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'linear_scale', stateKey: 'popularity', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.0 },
    ],
  },
];

// ─── DISCONTENTED ACTIONS (loyalty_to_liege < 50) ─────────────────────────

const DISCONTENTED_ACTIONS: ActionDefinition[] = [
  {
    id: 'DELAY_TAX_PAYMENT',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 50 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 5.0, minMultiplier: 1.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 20, domainMax: 70, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'DRAG_FEET_ON_LEVY',
    baseWeight: 5,
    cooldownTicks: 30,
    category: 'DEFENSIVE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 50 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 0, domainMax: 50, maxMultiplier: 4.0, minMultiplier: 1.0 },
    ],
  },
  {
    id: 'REFUSE_CAMPAIGN',
    baseWeight: 3,
    cooldownTicks: 60,
    category: 'DEFENSIVE',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 40 },
      { kind: 'inverse_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 0, domainMax: 40, maxMultiplier: 5.0, minMultiplier: 1.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },
  {
    id: 'RECRUIT_FACTION',
    baseWeight: 1,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 40 },
      { kind: 'linear_scale', stateKey: 'discontent', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'political_savvy', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FUND_OPPOSITION',
    baseWeight: 0.8,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 35 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 500 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'SEEK_FOREIGN_BACKING',
    baseWeight: 0.5,
    cooldownTicks: 90,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 35 },
      { kind: 'linear_scale', stateKey: 'independence_drive', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 5.0 },
    ],
  },
  {
    id: 'DEMAND_CONCESSIONS',
    baseWeight: 2,
    cooldownTicks: 60,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 45 },
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'pride', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'FORGE_CLAIM',
    baseWeight: 0.5,
    cooldownTicks: 120,
    category: 'DIPLOMATIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 40 },
      { kind: 'threshold_gate', stateKey: 'cunning', block: 'continuous', op: '>=', value: 55 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'corruption_tolerance', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
];

// ─── HOSTILE ACTIONS (loyalty < 25 OR faction_pull > 60) ─────────────────

const HOSTILE_ACTIONS: ActionDefinition[] = [
  {
    // §5.3 weight formula implemented verbatim
    id: 'DECLARE_INDEPENDENCE',
    baseWeight: 0.5,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      // Hard gate: loyalty must be < 20 (zeroes weight if loyalty ≥ 20)
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 20 },
      // Must have military capacity
      { kind: 'threshold_gate', stateKey: 'personal_army_size', block: 'integer', op: '>', value: 2000 },
      // Player has no free armies nearby → 4.0×
      { kind: 'categorical_boost', stateKey: 'player_armies_nearby', block: 'world', matchValue: '0', multiplier: 4.0 },
      // Faction support → 6.0×
      { kind: 'linear_scale', stateKey: 'faction_pull', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Financial runway → 2.5×
      { kind: 'linear_scale', stateKey: 'gold', block: 'integer', domainMin: 5000, domainMax: 15000, minMultiplier: 1.0, maxMultiplier: 2.5 },
      // Foreign backer → 3.0× if present
      { kind: 'categorical_boost', stateKey: 'foreign_backer_present', block: 'world', matchValue: 'true', multiplier: 3.0 },
      // Deep personal grievance → 2.0×
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 80, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 2.0 },
      // Less likely if they are the heir
      { kind: 'categorical_boost', stateKey: 'succession_position', block: 'categorical', matchValue: 'HEIR', multiplier: 0.3 },
      // Loyalty multiplier (must be low to pass gate, then scales 8× at loyalty=0)
      { kind: 'inverse_scale', stateKey: 'loyalty_to_liege', block: 'continuous', domainMin: 0, domainMax: 20, maxMultiplier: 8.0, minMultiplier: 1.0 },
    ],
  },
  {
    id: 'SEIZE_PROVINCE',
    baseWeight: 0.3,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 25 },
      { kind: 'threshold_gate', stateKey: 'personal_army_size', block: 'integer', op: '>', value: 1000 },
      { kind: 'categorical_boost', stateKey: 'player_armies_nearby', block: 'world', matchValue: '0', multiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },
  {
    id: 'ASSASSINATE_PLAYER_ADVISOR',
    baseWeight: 0.1,
    cooldownTicks: 180,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 25 },
      { kind: 'threshold_gate', stateKey: 'cunning', block: 'continuous', op: '>=', value: 60 },
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
    ],
  },
  {
    id: 'INVITE_FOREIGN_INVASION',
    baseWeight: 0.05,
    cooldownTicks: 365,
    category: 'DIPLOMATIC',
    visibilityRadius: 'WORLD',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 15 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
    ],
  },
  {
    id: 'BETRAY_MILITARY_ORDERS',
    baseWeight: 0.2,
    cooldownTicks: 90,
    category: 'VIOLENT',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 25 },
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'martial_confidence', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },
  {
    id: 'POISON_PLAYER',
    baseWeight: 0.05,
    cooldownTicks: 365,
    category: 'VIOLENT',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_liege', block: 'continuous', op: '<', value: 10 },
      { kind: 'threshold_gate', stateKey: 'cunning', block: 'continuous', op: '>=', value: 70 },
      { kind: 'linear_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 80, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 10.0 },
      { kind: 'threshold_gate', stateKey: 'personal_army_size', block: 'integer', op: '>=', value: 500 },
    ],
  },
];

// ─── REDEMPTION ACTIONS (if player extends olive branch) ──────────────────

const REDEMPTION_ACTIONS: ActionDefinition[] = [
  {
    id: 'ACCEPT_PARDON',
    baseWeight: 5,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      // Only fires when player has offered pardon (world flag)
      { kind: 'categorical_boost', stateKey: 'pardon_offered', block: 'world', matchValue: 'true', multiplier: 20.0 },
      { kind: 'inverse_scale', stateKey: 'grudge_weight', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 2.0, minMultiplier: 0.2 },
    ],
  },
  {
    id: 'SUBMIT_UNDER_TERMS',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'DIPLOMATIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'categorical_boost', stateKey: 'pardon_offered', block: 'world', matchValue: 'true', multiplier: 15.0 },
      { kind: 'threshold_gate', stateKey: 'political_stance', block: 'categorical', op: '==', value: 'IN_REVOLT' },
      // More likely when losing
      { kind: 'inverse_scale', stateKey: 'personal_army_size', block: 'integer', domainMin: 0, domainMax: 3000, maxMultiplier: 5.0, minMultiplier: 0.5 },
    ],
  },
];

// ─── Combined Export ───────────────────────────────────────────────────────

export const VASSAL_LORD_ACTIONS: ActionDefinition[] = [
  ...LOYAL_ACTIONS,
  ...SELF_INTEREST_ACTIONS,
  ...DISCONTENTED_ACTIONS,
  ...HOSTILE_ACTIONS,
  ...REDEMPTION_ACTIONS,
];
