/**
 * masterMerchantActions.ts
 *
 * Full action catalog for the Master Merchant (Tier 2).
 * 22 actions per sovereign_npc_simulation.md Section 4.5.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const MASTER_MERCHANT_ACTIONS: ActionDefinition[] = [
  // ── ESTABLISH_TRADE_ROUTE ─────────────────────────────────────────────────
  {
    id: 'ESTABLISH_TRADE_ROUTE',
    baseWeight: 12,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'market_confidence', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'threshold_gate', stateKey: 'economic_stance', block: 'categorical', op: '==', value: 'EXPANDING' },
      { kind: 'linear_scale', stateKey: 'risk_tolerance', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
      // Province road quality affects route profitability
      { kind: 'linear_scale', stateKey: 'province_road_quality', block: 'world', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.0 },
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 0.1 },
    ],
  },

  // ── CLOSE_TRADE_ROUTE ─────────────────────────────────────────────────────
  {
    id: 'CLOSE_TRADE_ROUTE',
    baseWeight: 3,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'active_trade_routes', block: 'integer', op: '>=', value: 1 },
      // Closes when confidence is low or stance is contracting
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'market_confidence', block: 'continuous', op: '<', value: 30 },
          { kind: 'threshold_gate', stateKey: 'economic_stance', block: 'categorical', op: '==', value: 'CONTRACTING' },
        ],
      },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },

  // ── RAISE_PRICES ──────────────────────────────────────────────────────────
  {
    id: 'RAISE_PRICES',
    baseWeight: 8,
    cooldownTicks: 15,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      // Shortage conditions amplify price raising
      { kind: 'linear_scale', stateKey: 'province_food_days', block: 'world', domainMin: 30, domainMax: 0, minMultiplier: 0.5, maxMultiplier: 4.0 },
      // Reputation pride suppresses excessive gouging
      { kind: 'inverse_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 40, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.5 },
      { kind: 'linear_scale', stateKey: 'market_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  // ── LOWER_PRICES ──────────────────────────────────────────────────────────
  {
    id: 'LOWER_PRICES',
    baseWeight: 4,
    cooldownTicks: 20,
    multipliers: [
      // Used to undercut competition or expand market share
      { kind: 'threshold_gate', stateKey: 'warehoused_goods', block: 'integer', op: '>=', value: 100 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Loyalty to realm: player-friendly action
      { kind: 'linear_scale', stateKey: 'loyalty_to_realm', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  // ── STOCKPILE_GOODS ───────────────────────────────────────────────────────
  {
    id: 'STOCKPILE_GOODS',
    baseWeight: 6,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 300 },
      { kind: 'linear_scale', stateKey: 'hoarding_drive', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'patience', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // High inflation context: buy before it gets worse
      { kind: 'linear_scale', stateKey: 'realm_inflation_rate', block: 'world', domainMin: 1.0, domainMax: 2.0, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },

  // ── DUMP_GOODS ────────────────────────────────────────────────────────────
  {
    id: 'DUMP_GOODS',
    baseWeight: 3,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'warehoused_goods', block: 'integer', op: '>=', value: 200 },
      // Sell at peak market confidence
      { kind: 'linear_scale', stateKey: 'market_confidence', block: 'continuous', domainMin: 60, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
    ],
  },

  // ── OFFER_LOAN_TO_PLAYER ──────────────────────────────────────────────────
  {
    id: 'OFFER_LOAN_TO_PLAYER',
    baseWeight: 2,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 500 },
      // Treasury deficit means player needs funds
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Positive alignment means they extend credit
      { kind: 'categorical_boost', stateKey: 'political_alignment', block: 'categorical', matchValue: 'LOYAL', multiplier: 2.0 },
      { kind: 'categorical_boost', stateKey: 'political_alignment', block: 'categorical', matchValue: 'OPPOSED', multiplier: 0.1 },
    ],
  },

  // ── CALL_IN_LOAN ──────────────────────────────────────────────────────────
  {
    id: 'CALL_IN_LOAN',
    baseWeight: 1,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'outstanding_loans', block: 'integer', op: '>=', value: 100 },
      // Debt anxiety drives early recall
      { kind: 'linear_scale', stateKey: 'debt_anxiety', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── BRIBE_TAX_COLLECTOR ───────────────────────────────────────────────────
  {
    id: 'BRIBE_TAX_COLLECTOR',
    baseWeight: 4,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 150 },
      // Heavy taxes dramatically increase bribery drive
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '2', multiplier: 5.0 },
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '1', multiplier: 2.0 },
      { kind: 'linear_scale', stateKey: 'bribery_tolerance', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 4.0 },
      // Reputation pride suppresses illegal activity
      { kind: 'inverse_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 50, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.3 },
    ],
  },

  // ── ESTABLISH_SMUGGLING_ROUTE ─────────────────────────────────────────────
  {
    id: 'ESTABLISH_SMUGGLING_ROUTE',
    baseWeight: 1,
    cooldownTicks: 45,
    multipliers: [
      // Hard gate: only kicks in at heavy taxation
      { kind: 'threshold_gate', stateKey: 'smuggling_drive', block: 'continuous', op: '>=', value: 50 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 250 },
      { kind: 'linear_scale', stateKey: 'smuggling_drive', block: 'continuous', domainMin: 50, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 40, domainMax: 90, maxMultiplier: 2.0, minMultiplier: 0.2 },
    ],
  },

  // ── FUND_GUILD_LOBBY ──────────────────────────────────────────────────────
  {
    id: 'FUND_GUILD_LOBBY',
    baseWeight: 2,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 400 },
      { kind: 'linear_scale', stateKey: 'political_interest', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'guild_solidarity', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '2', multiplier: 3.0 },
    ],
  },

  // ── BRIBE_CUSTOMS_OFFICIAL ────────────────────────────────────────────────
  {
    id: 'BRIBE_CUSTOMS_OFFICIAL',
    baseWeight: 3,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 100 },
      { kind: 'linear_scale', stateKey: 'bribery_tolerance', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '2', multiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'active_trade_routes', block: 'integer', domainMin: 1, domainMax: 8, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── INVEST_IN_CITY_BUILDING ───────────────────────────────────────────────
  {
    id: 'INVEST_IN_CITY_BUILDING',
    baseWeight: 3,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 600 },
      { kind: 'linear_scale', stateKey: 'civic_investment', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'market_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
      { kind: 'categorical_boost', stateKey: 'economic_stance', block: 'categorical', matchValue: 'EXPANDING', multiplier: 2.0 },
    ],
  },

  // ── FINANCE_MERCENARY_HIRE ────────────────────────────────────────────────
  {
    id: 'FINANCE_MERCENARY_HIRE',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 800 },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'political_interest', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Province besieged: need immediate protection
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 6.0 },
    ],
  },

  // ── SPREAD_MARKET_RUMOR ───────────────────────────────────────────────────
  {
    id: 'SPREAD_MARKET_RUMOR',
    baseWeight: 3,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Reputation pride somewhat suppresses manipulation
      { kind: 'inverse_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 50, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.4 },
    ],
  },

  // ── MOVE_OPERATIONS ───────────────────────────────────────────────────────
  {
    id: 'MOVE_OPERATIONS',
    baseWeight: 1,
    cooldownTicks: 90,
    multipliers: [
      // Move when conditions are very unfavorable
      { kind: 'threshold_gate', stateKey: 'economic_stance', block: 'categorical', op: '==', value: 'FLEEING' },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'categorical_boost', stateKey: 'province_besieged', block: 'world', matchValue: 'true', multiplier: 8.0 },
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 4.0 },
    ],
  },

  // ── FUND_RIVAL_LORD ───────────────────────────────────────────────────────
  {
    id: 'FUND_RIVAL_LORD',
    baseWeight: 0.5,
    cooldownTicks: 90,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 600 },
      { kind: 'threshold_gate', stateKey: 'political_alignment', block: 'categorical', op: '==', value: 'COVERT_OPPOSITION' },
      { kind: 'linear_scale', stateKey: 'political_interest', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },

  // ── PETITION_FOR_LAW_CHANGE ───────────────────────────────────────────────
  {
    id: 'PETITION_FOR_LAW_CHANGE',
    baseWeight: 2,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'political_interest', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'tax_level', block: 'world', matchValue: '2', multiplier: 4.0 },
      // Only if not overtly opposed (petition is legitimate channel)
      { kind: 'threshold_gate', stateKey: 'political_alignment', block: 'categorical', op: '!=', value: 'COVERT_OPPOSITION' },
    ],
  },

  // ── HIRE_PRIVATE_GUARD ────────────────────────────────────────────────────
  {
    id: 'HIRE_PRIVATE_GUARD',
    baseWeight: 3,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'active_trade_routes', block: 'integer', domainMin: 2, domainMax: 8, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── SEEK_MONOPOLY ─────────────────────────────────────────────────────────
  {
    id: 'SEEK_MONOPOLY',
    baseWeight: 1,
    cooldownTicks: 90,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 800 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'economic_stance', block: 'categorical', matchValue: 'EXPANDING', multiplier: 2.5 },
    ],
  },

  // ── EXPOSE_COMPETITOR ─────────────────────────────────────────────────────
  {
    id: 'EXPOSE_COMPETITOR',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'reputation_pride', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
      // Only valid if they're not running smuggling themselves
      { kind: 'threshold_gate', stateKey: 'smuggling_operations', block: 'integer', op: '<', value: 1 },
    ],
  },

  // ── RETIRE ────────────────────────────────────────────────────────────────
  {
    id: 'RETIRE',
    baseWeight: 0.2,
    cooldownTicks: 730, // very rare; permanent
    multipliers: [
      // Must have enough gold to retire comfortably
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 3000 },
      // Must be in a fearful or dangerous situation
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'fear', block: 'continuous', op: '>=', value: 70 },
          { kind: 'threshold_gate', stateKey: 'economic_stance', block: 'categorical', op: '==', value: 'FLEEING' },
        ],
      },
      { kind: 'linear_scale', stateKey: 'debt_anxiety', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
    ],
  },
];
