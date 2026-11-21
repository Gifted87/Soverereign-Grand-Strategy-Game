/**
 * banditChiefActions.ts
 *
 * Full action catalog for the Bandit Chief (Tier 2).
 * 20 actions per sovereign_npc_simulation.md Section 4.4.
 */

import type { ActionDefinition } from '../../systems/ActionWeightEngine';

export const BANDIT_CHIEF_ACTIONS: ActionDefinition[] = [
  // ── RAID_SUPPLY_CONVOY ────────────────────────────────────────────────────
  // Intercept a civilian or military convoy.
  {
    id: 'RAID_SUPPLY_CONVOY',
    baseWeight: 10,
    cooldownTicks: 12,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.5 },
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 10 },
      // Road quality: better roads = more convoys = more targets
      { kind: 'linear_scale', stateKey: 'province_road_quality', block: 'world', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Hunted state makes risky raids less likely
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.2 },
      // Fear suppresses bold raids
      { kind: 'inverse_scale', stateKey: 'fear', block: 'continuous', domainMin: 0, domainMax: 90, maxMultiplier: 1.5, minMultiplier: 0.3 },
    ],
  },

  // ── RAID_VILLAGE ──────────────────────────────────────────────────────────
  // Extract resources by force from a settlement.
  {
    id: 'RAID_VILLAGE',
    baseWeight: 8,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 15 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 20, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 4.0 },
      // Brutality amplifies village raids over softer targets
      { kind: 'linear_scale', stateKey: 'brutality', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // Player garrison deters
      { kind: 'categorical_boost', stateKey: 'player_garrison_present', block: 'world', matchValue: 'true', multiplier: 0.15 },
      // Hunted status greatly reduces village raid boldness
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.1 },
    ],
  },

  // ── EXTORT_SETTLEMENT ─────────────────────────────────────────────────────
  // Demand ongoing payment in exchange for not raiding.
  {
    id: 'EXTORT_SETTLEMENT',
    baseWeight: 6,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 20 },
      { kind: 'linear_scale', stateKey: 'reputation_fear', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 4.0 },
      // Cunning over brute aggression — less violent approach
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.3 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HIGH', multiplier: 0.5 },
    ],
  },

  // ── RECRUIT ───────────────────────────────────────────────────────────────
  // Grow band size from desperate locals.
  {
    id: 'RECRUIT',
    baseWeight: 7,
    cooldownTicks: 15,
    multipliers: [
      // Needs gold to support new recruits
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 50 },
      // More desperate peasants = easier recruitment
      { kind: 'linear_scale', stateKey: 'province_loyalty', block: 'world', domainMin: 80, domainMax: 10, minMultiplier: 0.5, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 2.5 },
      // Morale must be reasonable to attract recruits
      { kind: 'threshold_gate', stateKey: 'morale', block: 'continuous', op: '>=', value: 30 },
    ],
  },

  // ── BRIBE_LOCAL_GUARD ─────────────────────────────────────────────────────
  // Pay off local enforcers to look away.
  {
    id: 'BRIBE_LOCAL_GUARD',
    baseWeight: 5,
    cooldownTicks: 20,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 100 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // More urgent when threat level is high
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HIGH', multiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 5.0 },
    ],
  },

  // ── ESTABLISH_HIDEOUT ─────────────────────────────────────────────────────
  // Fortify a location as a permanent base.
  {
    id: 'ESTABLISH_HIDEOUT',
    baseWeight: 3,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 200 },
      { kind: 'threshold_gate', stateKey: 'hideout_strength', block: 'integer', op: '<', value: 10 },
      { kind: 'linear_scale', stateKey: 'territorial', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'paranoia', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── ABANDON_HIDEOUT ───────────────────────────────────────────────────────
  // Flee to a new province if threatened.
  {
    id: 'ABANDON_HIDEOUT',
    baseWeight: 1,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'hideout_strength', block: 'integer', op: '>=', value: 1 },
      // Only when hunted or high fear
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'threat_level', block: 'categorical', op: '==', value: 'HUNTED' },
          { kind: 'threshold_gate', stateKey: 'fear', block: 'continuous', op: '>=', value: 70 },
        ],
      },
      { kind: 'linear_scale', stateKey: 'fear', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
    ],
  },

  // ── BLOCKADE_ROAD ─────────────────────────────────────────────────────────
  // Cut off a trade route segment entirely.
  {
    id: 'BLOCKADE_ROAD',
    baseWeight: 3,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 30 },
      { kind: 'linear_scale', stateKey: 'territorial', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.1 },
    ],
  },

  // ── SELL_INTEL ────────────────────────────────────────────────────────────
  // Pass information to a rival lord for gold.
  {
    id: 'SELL_INTEL',
    baseWeight: 2,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      // Desperation drives selling of information
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 20, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // Honor among thieves suppresses selling out
      { kind: 'inverse_scale', stateKey: 'honor_among_thieves', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.3 },
    ],
  },

  // ── ACCEPT_AMNESTY ────────────────────────────────────────────────────────
  // If offered by player, dissolve band and enter legitimate service.
  {
    id: 'ACCEPT_AMNESTY',
    baseWeight: 0.5,
    cooldownTicks: 180,
    multipliers: [
      // Requires player to have offered amnesty (world flag)
      { kind: 'threshold_gate', stateKey: 'amnesty_offered', block: 'world', op: '>', value: 0 },
      // Desperation makes amnesty more attractive
      { kind: 'linear_scale', stateKey: 'desperation', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Hunted makes surrender much more likely
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 4.0 },
      // Ambition: if they aspire to more, amnesty is attractive
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 50, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
    ],
  },

  // ── EXPAND_TERRITORY ──────────────────────────────────────────────────────
  // Muscle into an adjacent province.
  {
    id: 'EXPAND_TERRITORY',
    baseWeight: 2,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 40 },
      { kind: 'threshold_gate', stateKey: 'active_provinces', block: 'integer', op: '<', value: 4 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'territorial', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 3.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.05 },
    ],
  },

  // ── ATTACK_WEAKENED_ARMY ──────────────────────────────────────────────────
  // Opportunistically strike a supply-starved or diseased army.
  {
    id: 'ATTACK_WEAKENED_ARMY',
    baseWeight: 1,
    cooldownTicks: 30,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 50 },
      // Only when risk is manageable
      { kind: 'threshold_gate', stateKey: 'threat_level', block: 'categorical', op: '!=', value: 'HUNTED' },
      { kind: 'linear_scale', stateKey: 'aggression', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'linear_scale', stateKey: 'risk_tolerance', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Province diseased = weakened garrisons
      { kind: 'categorical_boost', stateKey: 'province_diseased', block: 'world', matchValue: 'true', multiplier: 3.0 },
    ],
  },

  // ── KIDNAP_MERCHANT ───────────────────────────────────────────────────────
  // Hold a merchant for ransom.
  {
    id: 'KIDNAP_MERCHANT',
    baseWeight: 2,
    cooldownTicks: 40,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 15 },
      { kind: 'linear_scale', stateKey: 'greed', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Active trade = targets available
      { kind: 'linear_scale', stateKey: 'province_road_quality', block: 'world', domainMin: 30, domainMax: 80, minMultiplier: 0.5, maxMultiplier: 2.5 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.2 },
    ],
  },

  // ── EXECUTE_CAPTIVE ───────────────────────────────────────────────────────
  // If ransom refused; damages local morale and raises fear.
  {
    id: 'EXECUTE_CAPTIVE',
    baseWeight: 0.5,
    cooldownTicks: 30,
    multipliers: [
      // Must have a captive (world flag)
      { kind: 'threshold_gate', stateKey: 'has_captive', block: 'world', op: '>', value: 0 },
      // Ransom must have been refused
      { kind: 'threshold_gate', stateKey: 'ransom_refused', block: 'world', op: '>', value: 0 },
      { kind: 'linear_scale', stateKey: 'brutality', block: 'continuous', domainMin: 30, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 6.0 },
      // Honor among thieves somewhat suppresses killing captives
      { kind: 'inverse_scale', stateKey: 'honor_among_thieves', block: 'continuous', domainMin: 30, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.5 },
    ],
  },

  // ── TERRORIZE_POPULATION ──────────────────────────────────────────────────
  // Deliberate atrocity to maximize fear reputation.
  {
    id: 'TERRORIZE_POPULATION',
    baseWeight: 0.8,
    cooldownTicks: 45,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 20 },
      // Requires low fear reputation to need boosting
      { kind: 'inverse_scale', stateKey: 'reputation_fear', block: 'continuous', domainMin: 0, domainMax: 80, maxMultiplier: 3.0, minMultiplier: 0.3 },
      { kind: 'linear_scale', stateKey: 'brutality', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      // Honor among thieves acts as a check
      { kind: 'inverse_scale', stateKey: 'honor_among_thieves', block: 'continuous', domainMin: 20, domainMax: 80, maxMultiplier: 2.0, minMultiplier: 0.2 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.05 },
    ],
  },

  // ── NEGOTIATE_WITH_LORD ───────────────────────────────────────────────────
  // Parley; offer intel or extortion removal for gold.
  {
    id: 'NEGOTIATE_WITH_LORD',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      // Ambition: negotiation is a step toward legitimacy
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.5, maxMultiplier: 3.0 },
      // More likely when hunted or desperate
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 4.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HIGH', multiplier: 2.0 },
    ],
  },

  // ── RECRUIT_DESERTERS ─────────────────────────────────────────────────────
  // Absorb deserting soldiers from armies.
  {
    id: 'RECRUIT_DESERTERS',
    baseWeight: 3,
    cooldownTicks: 20,
    multipliers: [
      // Player treasury deficit = unpaid soldiers = deserters available
      { kind: 'categorical_boost', stateKey: 'realm_treasury_deficit', block: 'world', matchValue: 'true', multiplier: 5.0 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 50 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 30, domainMax: 80, minMultiplier: 0.8, maxMultiplier: 3.0 },
    ],
  },

  // ── BURN_GRANARY ──────────────────────────────────────────────────────────
  // Economic warfare; extreme desperation or paid contract.
  {
    id: 'BURN_GRANARY',
    baseWeight: 0.3,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 25 },
      {
        kind: 'combination_gate',
        requireAll: false,
        conditions: [
          { kind: 'threshold_gate', stateKey: 'desperation', block: 'continuous', op: '>=', value: 80 },
          { kind: 'threshold_gate', stateKey: 'paid_arson_contract', block: 'world', op: '>', value: 0 },
        ],
      },
      { kind: 'linear_scale', stateKey: 'brutality', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 5.0 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 0.1 },
    ],
  },

  // ── FORM_ALLIANCE_WITH_OTHER_BAND ─────────────────────────────────────────
  // Merge or coordinate with another bandit group.
  {
    id: 'FORM_ALLIANCE_WITH_OTHER_BAND',
    baseWeight: 1,
    cooldownTicks: 60,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 20 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 1.0, maxMultiplier: 4.0 },
      { kind: 'linear_scale', stateKey: 'cunning', block: 'continuous', domainMin: 40, domainMax: 90, minMultiplier: 0.8, maxMultiplier: 3.0 },
      // Honor among thieves: some trust in other criminals required
      { kind: 'threshold_gate', stateKey: 'honor_among_thieves', block: 'continuous', op: '>=', value: 35 },
      { kind: 'categorical_boost', stateKey: 'threat_level', block: 'categorical', matchValue: 'HUNTED', multiplier: 2.0 },
    ],
  },

  // ── ASPIRE_TO_LORDSHIP ────────────────────────────────────────────────────
  // High ambition + gold + band_size trigger a political play toward legitimacy.
  {
    id: 'ASPIRE_TO_LORDSHIP',
    baseWeight: 0.1,
    cooldownTicks: 180,
    multipliers: [
      { kind: 'threshold_gate', stateKey: 'ambition', block: 'continuous', op: '>=', value: 75 },
      { kind: 'threshold_gate', stateKey: 'gold', block: 'integer', op: '>=', value: 500 },
      { kind: 'threshold_gate', stateKey: 'band_size', block: 'integer', op: '>=', value: 80 },
      { kind: 'linear_scale', stateKey: 'ambition', block: 'continuous', domainMin: 75, domainMax: 100, minMultiplier: 1.0, maxMultiplier: 8.0 },
      // Not possible when hunted
      { kind: 'threshold_gate', stateKey: 'threat_level', block: 'categorical', op: '!=', value: 'HUNTED' },
    ],
  },
];
