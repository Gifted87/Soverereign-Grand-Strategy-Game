/**
 * treasurerActions.ts
 *
 * Action catalog for the Treasurer court advisor (Tier 3).
 * Base advisor pool + 12 treasurer-specific specialisation actions.
 * Based on sovereign_npc_simulation.md §4.8 Treasurer Specialization.
 *
 * All 12 spec action IDs are present:
 *   COLLECT_TAXES, PROPOSE_BUDGET_CUT, PROPOSE_TAX_INCREASE,
 *   ARRANGE_LOAN_FROM_MERCHANT, MINT_MORE_COIN, AUDIT_PROVINCE,
 *   EMBEZZLE, INVEST_TREASURY_IN_TRADE_ROUTE, REDUCE_MILITARY_BUDGET,
 *   FALSIFY_ACCOUNTS, CALL_IN_OUTSTANDING_DEBTS, PROPOSE_DEBASEMENT
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';
import { ADVISOR_BASE_ACTIONS } from './advisorBaseActions';

const TREASURER_SPECIALISATION: ActionDefinition[] = [

  // ── HIGH-FREQUENCY ROUTINE ───────────────────────────────────────────────

  {
    // Core duty: dispatch tax agents. Effectiveness = competence × loyalty (§4.8)
    id: 'COLLECT_TAXES',
    baseWeight: 25,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 2.5 },
      { kind: 'linear_scale', stateKey: 'competence_confidence', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.6, maxMultiplier: 2.0 },
    ],
  },

  {
    // Advise spending cuts; fires when treasury is strained
    id: 'PROPOSE_BUDGET_CUT',
    baseWeight: 12,
    cooldownTicks: 45,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Recommend a new tax; angers population
    id: 'PROPOSE_TAX_INCREASE',
    baseWeight: 8,
    cooldownTicks: 120,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'treasurer_tax_creativity', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'treasurer_merchant_sympathy', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.4 },
    ],
  },

  {
    // Negotiate credit from a merchant house; rises with debt_aversion low
    id: 'ARRANGE_LOAN_FROM_MERCHANT',
    baseWeight: 6,
    cooldownTicks: 90,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 3.0 },
      { kind: 'inverse_scale', stateKey: 'treasurer_debt_aversion', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 4.0, minMultiplier: 0.3 },
      { kind: 'linear_scale', stateKey: 'treasurer_merchant_sympathy', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
    ],
  },

  {
    // Inflate supply; short-term income, long-term instability
    id: 'MINT_MORE_COIN',
    baseWeight: 4,
    cooldownTicks: 120,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'treasurer_inflation_anxiety', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 4.0, minMultiplier: 0.1 },
      { kind: 'linear_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 10, domainMax: 60, minMultiplier: 3.0, maxMultiplier: 0.3 },
    ],
  },

  {
    // Inspect a province for underpayment or embezzlement
    id: 'AUDIT_PROVINCE',
    baseWeight: 10,
    cooldownTicks: 60,
    category: 'ROUTINE',
    visibilityRadius: 'PROVINCE',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'linear_scale', stateKey: 'treasurer_record_keeping_pride', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'linear_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  {
    // Invest treasury gold in a trade route for returns
    id: 'INVEST_TREASURY_IN_TRADE_ROUTE',
    baseWeight: 7,
    cooldownTicks: 90,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'linear_scale', stateKey: 'treasurer_market_intuition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.5 },
      { kind: 'linear_scale', stateKey: 'treasurer_merchant_sympathy', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
    ],
  },

  {
    // Advise cutting military spending; creates conflict with Marshal
    id: 'REDUCE_MILITARY_BUDGET',
    baseWeight: 5,
    cooldownTicks: 120,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'treasurer_fiscal_conservatism', block: 'continuous', domainMin: 55, domainMax: 95, minMultiplier: 0.5, maxMultiplier: 4.0 },
    ],
  },

  {
    // Call in debts owed to the realm
    id: 'CALL_IN_OUTSTANDING_DEBTS',
    baseWeight: 8,
    cooldownTicks: 60,
    category: 'ECONOMIC',
    visibilityRadius: 'REALM',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 55 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 3.0 },
      { kind: 'linear_scale', stateKey: 'treasurer_debt_aversion', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
    ],
  },

  // ── SECRET / TREASONOUS ACTIONS ──────────────────────────────────────────

  {
    // Secret action: temptation > 70 AND loyalty < 40
    id: 'EMBEZZLE',
    baseWeight: 1,
    cooldownTicks: 30,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '<', value: 40 },
      { kind: 'threshold_gate', stateKey: 'treasurer_embezzlement_temptation', block: 'continuous', op: '>', value: 70 },
      { kind: 'linear_scale', stateKey: 'treasurer_embezzlement_temptation', block: 'continuous', domainMin: 70, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 6.0 },
      { kind: 'linear_scale', stateKey: 'corruption', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'inverse_scale', stateKey: 'treasurer_record_keeping_pride', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.3 },
    ],
  },

  {
    // Cover embezzlement or hide deficit from player; fires after EMBEZZLE
    id: 'FALSIFY_ACCOUNTS',
    baseWeight: 5,
    cooldownTicks: 15,
    category: 'TRUST',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'negation_modifier', triggerActionId: 'EMBEZZLE', multiplier: 12.0, recentTicks: 30 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'treasurer_record_keeping_pride', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.4 },
    ],
  },

  {
    // Short-term gain; long-term inflation + stability damage
    id: 'PROPOSE_DEBASEMENT',
    baseWeight: 2,
    cooldownTicks: 180,
    category: 'ECONOMIC',
    visibilityRadius: 'COURT',
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'loyalty_to_player', block: 'continuous', op: '>', value: 50 },
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'treasurer_tax_creativity', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.5 },
      { kind: 'inverse_scale', stateKey: 'treasurer_inflation_anxiety', block: 'continuous', domainMin: 0, domainMax: 100, maxMultiplier: 3.5, minMultiplier: 0.1 },
    ],
  },

];

export const TREASURER_ACTIONS: ActionDefinition[] = [
  ...ADVISOR_BASE_ACTIONS,
  ...TREASURER_SPECIALISATION,
];
