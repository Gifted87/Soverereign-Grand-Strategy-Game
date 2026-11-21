/**
 * NPCFeedbackLoopSystem.ts
 *
 * Implements the complete NPC State-Action Feedback Loop as specified in
 * simulation.md — with 1:1 fidelity matching the environmental FeedbackLoopSystem.
 *
 * This system is the authoritative cross-character propagation engine. When any
 * NPC action fires anywhere in the simulation, that system calls the appropriate
 * handler here to ensure every downstream state mutation described in the spec
 * is applied precisely.
 *
 * Architecture:
 *  - PART 1 (State Modification Matrix): `tick()` drives autonomous drift —
 *    derived/continuous states that move each tick based on other states, just
 *    as environment FeedbackLoopSystem does for Tier 1-4 physical states.
 *  - PART 2 (Action Impact Matrix): Each public `applyAction_<ACTION>` method
 *    corresponds to exactly one named NPC action from the spec, implementing
 *    ALL effects listed for that action across all character tiers.
 *  - Cross-character effects (e.g., Peasant WORK → liege.gold, Knight DEFECT →
 *    old_lord.army_size) are resolved here via the GameLoop character registry.
 *
 * Tick Rate: every game day (driven by GameLoop tick scheduler).
 * Individual action handlers are called on-demand by the NPC AI decision system.
 *
 * Reference: simulation.md — PART 1 (Sections 1.1–1.9) and PART 2 (Sections 2.1–2.4)
 */

import type { GameLoop } from '../engine/GameLoop';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — mirrors FeedbackLoopSystem's clamp/delta/setTo pattern
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function delta(obj: Record<string, any>, field: string, amount: number, min = 0, max = 100) {
  obj[field] = clamp((obj[field] ?? 0) + amount, min, max);
}

function setTo(obj: Record<string, any>, field: string, value: any) {
  obj[field] = value;
}

function increment(obj: Record<string, any>, field: string, amount = 1, max = 9999999) {
  obj[field] = Math.min((obj[field] ?? 0) + amount, max);
}

function decrement(obj: Record<string, any>, field: string, amount = 1, min = 0) {
  obj[field] = Math.max((obj[field] ?? 0) - amount, min);
}

// ─────────────────────────────────────────────────────────────────────────────
// NPC Action type union — every action from simulation.md PART 2
// ─────────────────────────────────────────────────────────────────────────────

export type NPCSimulationActionType =
  // ── TIER 1: Peasant Cohort ──────────────────────────────────────
  | 'WORK'
  | 'HOARD_FOOD'
  | 'PETITION_LORD'
  | 'FLEE_PROVINCE'
  | 'FORM_SECRET_FACTION'
  | 'RIOT'
  | 'REFUSE_LEVY'
  | 'SUPPORT_REBEL'
  | 'PRAY'
  | 'EMERGE_NOTABLE'
  // ── TIER 1: Wandering Knight ────────────────────────────────────
  | 'SEEK_EMPLOYMENT'
  | 'CHALLENGE_DUEL'
  | 'TAKE_MERCENARY_JOB'
  | 'DEFECT'
  | 'INVESTIGATE_COURT'
  | 'SWEAR_FEALTY'
  | 'TRAIN'
  | 'PETITION_FOR_LAND'
  | 'HIDE_IDENTITY'
  | 'DEPART'
  // ── TIER 1: Monk / Hermit Mystic ───────────────────────────────
  | 'PREACH'
  | 'BLESS'
  | 'PROPHECY'
  | 'PILGRIMAGE'
  | 'WITHDRAW'
  | 'DENOUNCE'
  | 'PERFORM_MIRACLE'
  | 'REVEAL_HERESY'
  // ── TIER 2: Bandit Chief ────────────────────────────────────────
  | 'RAID_VILLAGE'
  | 'EXTORT_SETTLEMENT'
  | 'RECRUIT_DESERTERS'
  | 'ESTABLISH_HIDEOUT'
  | 'TERRORIZE_POPULATION'
  | 'RAID_SUPPLY_CONVOY'
  | 'ABANDON_HIDEOUT'
  | 'BRIBE_LOCAL_GUARD'
  | 'SELL_INTEL'
  | 'ACCEPT_AMNESTY'
  | 'EXPAND_TERRITORY'
  | 'EXECUTE_CAPTIVE'
  // ── TIER 2: Master Merchant ─────────────────────────────────────
  | 'ESTABLISH_TRADE_ROUTE'
  | 'RAISE_PRICES'
  | 'LOWER_PRICES'
  | 'HOARD_GOODS'
  | 'DUMP_GOODS'
  | 'SMUGGLE'
  | 'FUND_GUILD_LOBBY'
  | 'EXPOSE_COMPETITOR'
  | 'INVEST_IN_CITY_BUILDING'
  | 'ARRANGE_LOAN_FROM_MERCHANT'
  | 'MINT_MORE_COIN'
  | 'AUDIT_PROVINCE'
  | 'EMBEZZLE'
  | 'INVEST_TREASURY_IN_TRADE_ROUTE'
  | 'REDUCE_MILITARY_BUDGET'
  | 'FALSIFY_ACCOUNTS'
  | 'CALL_IN_OUTSTANDING_DEBTS'
  | 'PROPOSE_DEBASEMENT'
  // ── TIER 2: Mercenary Captain ───────────────────────────────────
  | 'ACCEPT_CONTRACT'
  | 'DESERT_CONTRACT'
  | 'SACK_CITY'
  | 'DEFECT_TO_ENEMY'
  | 'RECRUIT'
  | 'TRAIN_TROOPS'
  | 'DEMAND_BONUS_PAYMENT'
  | 'OCCUPY_PROVINCE'
  | 'NEGOTIATE_LAND_FOR_SERVICE'
  | 'RAID_FOR_SUPPLIES'
  | 'PROTECT_CONVOY'
  | 'RETIRE_COMPANY'
  | 'SEEK_NEW_CONTRACT'
  | 'SPREAD_REPUTATION'
  | 'FORM_MERCENARY_ALLIANCE'
  | 'ATTEMPT_LORDSHIP'
  // ── TIER 3: Vassal Lord ─────────────────────────────────────────
  | 'ANSWER_LEVY_CALL'
  | 'PAY_TAXES_IN_FULL'
  | 'SHARE_INTELLIGENCE'
  | 'SUPPORT_PLAYER_LAW'
  | 'OFFER_PERSONAL_LOAN'
  | 'VOLUNTEER_COUNSEL'
  | 'ATTEND_COURT'
  | 'ARRANGE_MARRIAGE_FOR_ALLIANCE'
  | 'LEAD_CAMPAIGN_IN_PLAYER_NAME'
  | 'IMPROVE_PROVINCE'
  | 'RECRUIT_PERSONAL_ARMY'
  | 'ARRANGE_PRIVATE_MARRIAGE'
  | 'BRIBE_PLAYER_ADVISOR'
  | 'INVESTIGATE_NEIGHBOR_VASSAL'
  | 'PETITION_LIEGE'
  | 'ENGAGE_IN_TRADE'
  | 'MANAGE_OWN_COURT'
  | 'SPREAD_RUMOR'
  | 'STOCKPILE_FOOD'
  | 'BUILD_PRIVATE_ALLIANCE'
  | 'DELAY_TAX_PAYMENT'
  | 'DRAG_FEET_ON_LEVY'
  | 'REFUSE_CAMPAIGN'
  | 'RECRUIT_FACTION'
  | 'FUND_OPPOSITION'
  | 'SEEK_FOREIGN_BACKING'
  | 'DEMAND_CONCESSIONS'
  | 'FORGE_CLAIM'
  | 'DECLARE_INDEPENDENCE'
  | 'SEIZE_PROVINCE'
  | 'ASSASSINATE_PLAYER_ADVISOR'
  | 'POISON_PLAYER'
  | 'INVITE_FOREIGN_INVASION'
  | 'BETRAY_MILITARY_ORDERS'
  | 'ACCEPT_PARDON'
  | 'SUBMIT_UNDER_TERMS'
  // ── TIER 3: Court Advisors — Chancellor ─────────────────────────
  | 'NEGOTIATE_TREATY'
  | 'FABRICATE_CLAIM'
  | 'ARRANGE_MARRIAGE_DEAL'
  | 'PLANT_PROPAGANDA'
  | 'EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY'
  | 'REQUEST_AUDIENCE_WITH_FOREIGN_RULER'
  | 'BRIBE_FOREIGN_AMBASSADOR'
  | 'DRAFT_PEACE_TERMS'
  | 'DRAFT_WAR_JUSTIFICATION'
  | 'MANAGE_HOSTAGE_SITUATION'
  | 'NEGOTIATE_TRADE_TREATY'
  | 'CRAFT_ALLIANCE_TERMS'
  | 'SPREAD_DISINFORMATION_ABROAD'
  | 'QUIETLY_SANCTION_FOREIGN_SPY'
  // ── TIER 3: Court Advisors — Marshal ────────────────────────────
  | 'TRAIN_ARMY'
  | 'ADVISE_ON_BATTLE_PLAN'
  | 'COMMAND_ARMY_IN_FIELD'
  | 'CONSCRIPT_LEVY'
  | 'COMMISSION_SIEGE_EQUIPMENT'
  | 'ORGANIZE_DEFENSIVE_LINE'
  | 'MISINTERPRET_ORDERS'
  | 'DEMAND_MORE_TROOPS_BEFORE_ADVANCING'
  | 'CLAIM_BATTLE_CREDIT'
  | 'PRIVATELY_RECRUIT_LOYAL_TROOPS'
  | 'NEGOTIATE_SURRENDER_TERMS'
  | 'RECOMMEND_TACTICAL_RETREAT'
  | 'PLAN_NIGHT_RAID'
  | 'SABOTAGE_RIVAL_GENERAL'
  // ── TIER 3: Court Advisors — Spymaster ──────────────────────────
  | 'WATCH_COURT'
  | 'INFILTRATE_FOREIGN_COURT'
  | 'RECRUIT_AGENT'
  | 'ASSIGN_ASSASSINATION'
  | 'FRAME_CHARACTER'
  | 'EXPOSE_PLOT'
  | 'FABRICATE_EVIDENCE'
  | 'BURN_NETWORK'
  | 'TURN_ENEMY_AGENT'
  | 'PLANT_DOUBLE_AGENT'
  | 'COVERTLY_MONITOR_PLAYER_ADVISOR'
  | 'BLACKMAIL_VASSAL'
  | 'INTERCEPT_COURIER'
  | 'LEAK_INTEL_TO_ENEMY'
  | 'MAP_ENEMY_SUPPLY_LINES'
  | 'PRODUCE_FORGED_DOCUMENT'
  // ── TIER 3: Court Advisors — Treasurer ──────────────────────────
  | 'COLLECT_TAXES'
  | 'ADVISE_ON_INVESTMENT'
  | 'AUDIT_ACCOUNTS'
  | 'NEGOTIATE_LOAN'
  | 'OVERSEE_MINT'
  | 'DRAFT_TRADE_AGREEMENT'
  | 'PROPOSE_BUDGET_CUT'
  | 'EMBEZZLE_FROM_TREASURY'
  | 'FALSIFY_TREASURY_REPORTS'
  | 'INVEST_IN_TRADE_ROUTE'
  | 'CALL_IN_DEBTS'
  | 'PROPOSE_TAX_RELIEF'
  // ── TIER 3: Court Advisors — Court Priest ───────────────────────
  | 'PREACH_IN_PROVINCE'
  | 'WARN_OF_EXCOMMUNICATION'
  | 'NEGOTIATE_WITH_HIGH_PRIEST'
  | 'DEMAND_CHURCH_TAX_EXEMPTION'
  | 'CALL_FOR_CRUSADE_PARTICIPATION'
  | 'CONDUCT_INQUISITION'
  | 'GRANT_ABSOLUTION'
  | 'PERFORM_WEDDING'
  | 'THREATEN_INTERDICT'
  | 'COVERTLY_REPORT_TO_HIGH_PRIEST'
  | 'RADICALIZE_CLERGY'
  // ── TIER 4: Foreign Ruler — Diplomatic ──────────────────────────
  | 'PROPOSE_ALLIANCE'
  | 'ACCEPT_ALLIANCE'
  | 'BREAK_ALLIANCE'
  | 'PROPOSE_PEACE'
  | 'REJECT_PEACE'
  | 'DEMAND_TRIBUTE'
  | 'OFFER_TRIBUTE'
  | 'PROPOSE_TRADE_TREATY'
  | 'PROPOSE_NON_AGGRESSION_PACT'
  | 'ARRANGE_ROYAL_MARRIAGE'
  | 'OFFER_HOSTAGE'
  | 'DEMAND_HOSTAGE'
  | 'RECALL_AMBASSADOR'
  | 'SEND_INSULT'
  | 'SEND_GIFT'
  | 'MEDIATE_THIRD_PARTY_CONFLICT'
  | 'FORM_COALITION_AGAINST_PLAYER'
  | 'INVITE_PLAYER_INTO_COALITION'
  // ── TIER 4: Foreign Ruler — Military ────────────────────────────
  | 'DECLARE_WAR'
  | 'FABRICATE_CASUS_BELLI'
  | 'MOBILIZE_ARMY'
  | 'DEMOBILIZE_ARMY'
  | 'LAUNCH_INVASION'
  | 'RAID_BORDER_PROVINCE'
  | 'SIEGE_PLAYER_FORTRESS'
  | 'SEND_EXPEDITIONARY_FORCE'
  | 'HIRE_MERCENARY_COMPANY'
  | 'FUND_PLAYER_REBEL'
  | 'ORDER_ASSASSINATION_OF_PLAYER'
  | 'BLOCKADE_PLAYER_COAST'
  | 'STRATEGIC_WITHDRAWAL'
  | 'OFFER_MILITARY_AID_TO_PLAYER_ENEMY'
  // ── TIER 4: Foreign Ruler — Economic ────────────────────────────
  | 'IMPOSE_TRADE_EMBARGO'
  | 'ESTABLISH_TRADE_ROUTE_WITH_PLAYER'
  | 'FLOOD_MARKET'
  | 'CORNER_IRON_MARKET'
  | 'FUND_BANDIT_GROUPS_IN_PLAYER_TERRITORY'
  | 'INVEST_IN_OWN_INFRASTRUCTURE'
  | 'DEBASE_OWN_CURRENCY'
  // ── TIER 4: Foreign Ruler — Intelligence ────────────────────────
  | 'PLANT_SPY_IN_PLAYER_COURT'
  | 'ATTEMPT_TO_TURN_PLAYER_ADVISOR'
  | 'INTERCEPT_PLAYER_COURIER'
  | 'SPREAD_PROPAGANDA_IN_PLAYER_PROVINCES'
  | 'MAP_PLAYER_ARMY_MOVEMENTS'
  | 'EXPOSE_OWN_DOUBLE_AGENT'
  // ── TIER 4: Foreign Ruler — Internal / Reactive ─────────────────
  | 'PURGE_DISLOYAL_VASSAL'
  | 'ELEVATE_NEW_VASSAL'
  | 'CHANGE_SUCCESSION_LAW'
  | 'INVEST_IN_MILITARY'
  | 'INVEST_IN_ECONOMY'
  | 'INVEST_IN_CHURCH'
  | 'CONDUCT_CENSUS'
  | 'REFORM_LAWS'
  | 'CALL_GREAT_COUNCIL'
  | 'PLAN_INVASION'
  | 'RESPOND_TO_EXCOMMUNICATION'
  | 'RESPOND_TO_PLAYER_AGGRESSION'
  | 'RESPOND_TO_ALLY_BEING_ATTACKED'
  | 'RESPOND_TO_SUCCESSION_CRISIS'
  | 'RESPOND_TO_PLAGUE';

// ─────────────────────────────────────────────────────────────────────────────
// Action payload
// ─────────────────────────────────────────────────────────────────────────────

export interface NPCSimulationActionPayload {
  action: NPCSimulationActionType;
  /** The NPC character performing the action */
  actorId: string;
  /** Primary target character ID (if applicable) */
  targetId?: string;
  /** Secondary target character ID (e.g., liege, rival) */
  secondaryTargetId?: string;
  /** Province ID context (if action has geographic scope) */
  provinceId?: string;
  /** Outcome flag — WIN | LOSE | PARTIAL (for duels, battles, etc.) */
  outcome?: 'WIN' | 'LOSE' | 'PARTIAL';
  /** Arbitrary numeric magnitude (e.g., gold transferred, army size recruited) */
  magnitude?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main system class
// ─────────────────────────────────────────────────────────────────────────────

export class NPCFeedbackLoopSystem {
  constructor(private gameLoop: GameLoop) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1 — AUTONOMOUS TICK (State Modification Matrix drift)
  // Derived and continuous states that shift each game day based on the current
  // character state vectors, implementing the [+]/[-] rules from simulation.md
  // Sections 1.1–1.9 as autonomous drift, not action-triggered.
  // ═══════════════════════════════════════════════════════════════════════════

  tick() {
    this.tickTier1Characters();
    this.tickTier2Characters();
    this.tickTier3VassalLords();
    this.tickTier3CourtAdvisors();
    this.tickTier4ForeignRulers();
    this.detectClosedLoops();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.1 TIER 1: Peasant Cohort — Autonomous drift
  // ─────────────────────────────────────────────────────────────────────────
  private tickTier1Characters() {
    const cohorts = this.getCharactersByType('PEASANT_COHORT');
    for (const cohort of cohorts) {
      const c = cohort as any;

      // hunger ↑ if high taxes, desperation ticks; ↓ if food_stockpile > threshold
      if ((c.season_debts ?? 0) > 50) delta(c, 'hunger', 0.5);
      if ((c.food_stockpile ?? 0) > 1000) delta(c, 'hunger', -0.3);

      // fear ↓ slowly with each peaceful tick (no disaster nearby)
      if ((c.trauma ?? 0) < 20) delta(c, 'fear', -0.2);

      // unrest ↑ derived from hunger + fear + debt
      const unrestPressure = ((c.hunger ?? 0) * 0.3) + ((c.fear ?? 0) * 0.2) + ((c.season_debts ?? 0) * 0.01);
      if (unrestPressure > 30) delta(c, 'unrest', 0.4);
      else delta(c, 'unrest', -0.2);

      // desperation ↑ sustained hunger; ↓ after food relief
      if ((c.hunger ?? 0) > 70) delta(c, 'desperation', 0.5);
      else if ((c.hunger ?? 0) < 30) delta(c, 'desperation', -0.3);

      // trauma ↓ very slowly (generational decay)
      if ((c.trauma ?? 0) > 0) delta(c, 'trauma', -0.02);

      // hope ↓ sustained high unrest
      if ((c.unrest ?? 0) > 75) delta(c, 'hope', -0.3);
      else delta(c, 'hope', 0.1);

      // fatigue ↓ with rest ticks (passive recovery)
      delta(c, 'fatigue', -0.2);

      // collective_mood threshold state
      if ((c.unrest ?? 0) > 75) setTo(c, 'collective_mood', 'RIOTING');
      else if ((c.hunger ?? 0) > 70 && (c.trauma ?? 0) > 50) setTo(c, 'collective_mood', 'ANXIOUS');
      else if ((c.hope ?? 0) > 60 && (c.unrest ?? 0) < 30) setTo(c, 'collective_mood', 'CONTENT');
      else setTo(c, 'collective_mood', 'NEUTRAL');

      // solidarity ↓ with refugee influx (represented as cohort_size sudden increase)
      // (drift handled: no autonomous action, just clamp)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.2–1.4 TIER 1-2 Characters: Knight, Monk, Bandit, Merchant drift
  // ─────────────────────────────────────────────────────────────────────────
  private tickTier2Characters() {
    // Wandering Knights
    for (const knight of this.getCharactersByType('WANDERING_KNIGHT')) {
      const k = knight as any;
      // restlessness ↑ extended peace
      if ((k.employment_status ?? 'UNEMPLOYED') === 'UNEMPLOYED') delta(k, 'restlessness', 0.5);
      else delta(k, 'restlessness', -0.3);
      // fatigue ↓ rest
      if (!(k.is_in_combat)) delta(k, 'fatigue', -0.3);
      // ambition ↓ aging
      if ((k.age ?? 30) > 50) delta(k, 'ambition', -0.05);
    }

    // Monks / Hermits
    for (const monk of this.getCharactersByType('MONK')) {
      const m = monk as any;
      // wisdom ↑ age and isolation
      if ((m.age ?? 30) > 40) delta(m, 'wisdom', 0.1);
      if ((m.is_isolated ?? false)) delta(m, 'wisdom', 0.05);
      delta(m, 'mysticism', -0.01); // slight rational decay unless refreshed by prophecy
      // prophecy_pressure ↑ world crisis events (plague, comet)
      if (this.isWorldInCrisis()) delta(m, 'prophecy_pressure', 0.5);
    }

    // Bandit Chiefs
    for (const bandit of this.getCharactersByType('BANDIT_CHIEF')) {
      const b = bandit as any;
      // restlessness ↑ if no recent raids
      if ((b.ticks_since_last_raid ?? 0) > 10) delta(b, 'restlessness', 0.8);
      else b.ticks_since_last_raid = (b.ticks_since_last_raid ?? 0) + 1;
      // morale ↓ if band_size drops
      if ((b.band_size ?? 0) < 10) delta(b, 'morale', -1);
      // desperation ↑ low gold
      if ((b.gold ?? 0) < 50) delta(b, 'desperation', 0.5);
    }

    // Master Merchants
    for (const merchant of this.getCharactersByType('MASTER_MERCHANT')) {
      const m = merchant as any;
      // hoarding_drive ↑ when inflation high or war incoming
      const inflationRate = (this.gameLoop as any).globalInflationRate ?? 1.0;
      if (inflationRate > 1.5) delta(m, 'hoarding_drive', 0.5);
      else delta(m, 'hoarding_drive', -0.2);
      // market_confidence ↓ slow decay during war
      if (this.isRealmAtWar()) delta(m, 'market_confidence', -0.3);
      else delta(m, 'market_confidence', 0.1);
      // debt_anxiety ↑ when debts_owed > gold
      if ((m.debts_owed ?? 0) > (m.gold ?? 0)) delta(m, 'debt_anxiety', 0.5);
      else delta(m, 'debt_anxiety', -0.3);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.7 TIER 3: Vassal Lord — Autonomous drift
  // ─────────────────────────────────────────────────────────────────────────
  private tickTier3VassalLords() {
    for (const vassal of this.getCharactersByType('VASSAL_LORD')) {
      const v = vassal as any;

      // discontent = derived sum of high taxes + low loyalty + passed over
      const taxPressure = (v.last_tax_rate ?? 0) * 0.5;
      const loyaltyPressure = Math.max(0, 60 - (v.loyalty_to_liege ?? 50));
      const passedOver = (v.times_passed_over_for_council ?? 0) * 5;
      const newDiscontent = clamp(taxPressure + loyaltyPressure + passedOver);
      // Approach target discontent gradually
      if (newDiscontent > (v.discontent ?? 0)) delta(v, 'discontent', 0.5);
      else delta(v, 'discontent', -0.3);

      // grudge_weight ↑ slights per tick if not resolved
      if ((v.unresolved_slights ?? 0) > 0) delta(v, 'grudge_weight', 0.3);

      // independence_drive ↑ large army + far distance
      if ((v.personal_army_size ?? 0) > 500 && (v.distance_from_capital ?? 0) > 5) {
        delta(v, 'independence_drive', 0.2);
      }

      // faction_pull ↑ other discontented vassals present
      const discontentedVassals = this.getCharactersByType('VASSAL_LORD')
        .filter(other => other.id !== vassal.id && (other as any).discontent > 60);
      if (discontentedVassals.length > 2) delta(v, 'faction_pull', 0.3);

      // fatigue ↓ at rest
      if (!(v.in_active_campaign)) delta(v, 'fatigue', -0.2);

      // tradition_attachment ↑ aging
      if ((v.age ?? 30) > 45) delta(v, 'tradition_attachment', 0.05);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.8 TIER 3: Court Advisors — Autonomous drift
  // ─────────────────────────────────────────────────────────────────────────
  private tickTier3CourtAdvisors() {
    for (const advisor of this.getCharactersByType('COURT_ADVISOR')) {
      const a = advisor as any;

      // independence ↑ time in position
      increment(a, 'years_in_position', 1 / 365); // fractional daily
      if ((a.years_in_position ?? 0) > 5) delta(a, 'independence', 0.05);

      // burnout/stress ↑ consecutive active assignments
      if (a.is_on_active_assignment) {
        delta(a, 'stress', 0.2);
        delta(a, 'burnout', 0.1);
      } else {
        delta(a, 'stress', -0.3);
        delta(a, 'burnout', -0.1);
      }

      // corruption ↑ unchecked treasury access
      if (a.has_unchecked_treasury_access) delta(a, 'corruption', 0.2);

      // personal_agenda_strength ↑ ambition + player neglect
      if ((a.ambition ?? 0) > 60 && !(a.was_recently_consulted)) {
        delta(a, 'personal_agenda_strength', 0.3);
      } else if (a.was_recently_consulted) {
        delta(a, 'personal_agenda_strength', -0.2);
      }

      // obedience ↓ high competence + low loyalty
      if ((a.competence_confidence ?? 0) > 70 && (a.loyalty_to_player ?? 50) < 40) {
        delta(a, 'obedience', -0.3);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.9 TIER 4: Foreign Ruler — Autonomous drift
  // ─────────────────────────────────────────────────────────────────────────
  private tickTier4ForeignRulers() {
    for (const ruler of this.getCharactersByType('FOREIGN_RULER')) {
      const r = ruler as any;

      // war_weariness ↑ active wars; ↓ peace ticks
      if ((r.active_wars ?? 0) > 0) delta(r, 'war_weariness', 0.3);
      else delta(r, 'war_weariness', -0.2);

      // grudge_against_player decays slowly over generations
      if ((r.grudge_against_player ?? 0) > 0) delta(r, 'grudge_against_player', -0.01);

      // expansionism ↑ full treasury, high army; ↓ war weariness + debt
      const treasury = (r.gold ?? 0);
      if (treasury > 5000 && (r.total_army_strength ?? 0) > 1000) delta(r, 'expansionism', 0.2);
      if ((r.war_weariness ?? 0) > 60) delta(r, 'expansionism', -0.3);

      // coalition_building ↑ fear_of_player ↑
      if ((r.fear ?? 0) > 70) delta(r, 'coalition_building', 0.4);

      // legacy_focus ↑ age > 50
      if ((r.age ?? 30) > 50) delta(r, 'legacy_focus', 0.05);

      // isolation_drive ↑ plague abroad or internal revolts
      if (this.isPlagueSpreading() || this.isRealmAtWar()) delta(r, 'isolation_drive', 0.2);

      // personality traits drift toward baseline
      this.driftTowardBaseline(r, 'ambition');
      this.driftTowardBaseline(r, 'aggression');
      this.driftTowardBaseline(r, 'greed');
      this.driftTowardBaseline(r, 'patience');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Closed Loop Detectors — mirrors environment FeedbackLoopSystem's 4 loops
  // These are the 3 canonical closed loops from simulation.md SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  private detectClosedLoops() {
    this.detectEconomicEngine();
    this.detectPoliticalEngine();
    this.detectInformationEngine();
  }

  /**
   * Loop 1 — Economic Engine:
   * Peasant WORK → food/gold → Lord COLLECT_TAXES → Treasury → Player spends →
   * Merchant HOARD_GOODS → Peasant hunger rises
   */
  private detectEconomicEngine() {
    const cohorts = this.getCharactersByType('PEASANT_COHORT');
    for (const cohort of cohorts) {
      const c = cohort as any;
      const merchants = this.getCharactersByType('MASTER_MERCHANT');
      for (const merchant of merchants) {
        const m = merchant as any;
        // If merchants are hoarding AND peasant food is low → hunger pressure
        if ((m.hoarding_drive ?? 0) > 70 && (c.food_stockpile ?? 0) < 200) {
          delta(c, 'hunger', 1.5);
          this.alert(`${merchant.firstName ?? 'A merchant'} is hoarding goods while peasants starve in the province.`, 'URGENT');
        }
      }
    }
  }

  /**
   * Loop 2 — Political Engine:
   * Peasant hunger → unrest → FORM_SECRET_FACTION → Vassal recruits →
   * Faction grows → DECLARE_INDEPENDENCE
   */
  private detectPoliticalEngine() {
    const cohorts = this.getCharactersByType('PEASANT_COHORT');
    for (const cohort of cohorts) {
      const c = cohort as any;
      if ((c.hunger ?? 0) > 70 && (c.unrest ?? 0) > 75) {
        // Signal to vassal lords in same province
        const vassals = this.getCharactersByType('VASSAL_LORD')
          .filter(v => (v as any).province_id === c.province_id);
        for (const vassal of vassals) {
          const v = vassal as any;
          delta(v, 'faction_pull', 1.0);
          if ((v.faction_pull ?? 0) > 90 && (v.discontent ?? 0) > 75) {
            this.alert(`${vassal.firstName ?? 'A vassal lord'} is on the verge of declaring independence as faction pressure reaches critical mass!`, 'CRITICAL');
            this.chronicle(`The realm trembles — ${vassal.firstName ?? 'A vassal'}'s faction swells with desperate peasant fury.`);
          }
        }
      }
    }
  }

  /**
   * Loop 3 — Information Engine:
   * Action fired → Spymaster WATCH_COURT captures it → LEAK_INTEL → Foreign Ruler
   * paranoia ↑ → Foreign Ruler fires PLANT_SPY or DECLARE_WAR
   */
  private detectInformationEngine() {
    const spymasters = this.getCharactersByType('COURT_ADVISOR')
      .filter(a => (a as any).advisor_role === 'SPYMASTER');
    for (const spy of spymasters) {
      const s = spy as any;
      if ((s.network_confidence ?? 0) > 80 && (s.intel ?? 0) > 60) {
        const foreignRulers = this.getCharactersByType('FOREIGN_RULER');
        for (const ruler of foreignRulers) {
          const r = ruler as any;
          if ((r.paranoia ?? 0) > 80) {
            // Foreign ruler is paranoid and well-informed — triggers offensive action
            this.gameLoop.eventBus?.publish('FOREIGN_RULER_THREATENS', {
              rulerId: ruler.id,
              reason: 'SPY_NETWORK_DETECTED',
              paranoia: r.paranoia,
            });
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2 — ACTION IMPACT MATRIX
  // Public dispatch entry point — calls per-action handlers
  // ═══════════════════════════════════════════════════════════════════════════

  applyAction(payload: NPCSimulationActionPayload) {
    const actor = this.getCharacter(payload.actorId);
    if (!actor) return;
    const target = payload.targetId ? this.getCharacter(payload.targetId) : null;

    switch (payload.action) {

      // ── TIER 1: Peasant Cohort ─────────────────────────────────────────────

      case 'WORK':                    return this.action_WORK(actor, target, payload);
      case 'HOARD_FOOD':              return this.action_HOARD_FOOD(actor, payload);
      case 'PETITION_LORD':           return this.action_PETITION_LORD(actor, target, payload);
      case 'FLEE_PROVINCE':           return this.action_FLEE_PROVINCE(actor, payload);
      case 'FORM_SECRET_FACTION':     return this.action_FORM_SECRET_FACTION(actor, payload);
      case 'RIOT':                    return this.action_RIOT(actor, payload);
      case 'REFUSE_LEVY':             return this.action_REFUSE_LEVY(actor, target, payload);
      case 'SUPPORT_REBEL':           return this.action_SUPPORT_REBEL(actor, target, payload);
      case 'PRAY':                    return this.action_PRAY(actor, payload);
      case 'EMERGE_NOTABLE':          return this.action_EMERGE_NOTABLE(actor, payload);

      // ── TIER 1: Wandering Knight ───────────────────────────────────────────

      case 'SEEK_EMPLOYMENT':         return this.action_SEEK_EMPLOYMENT(actor, target, payload);
      case 'CHALLENGE_DUEL':          return this.action_CHALLENGE_DUEL(actor, target, payload);
      case 'TAKE_MERCENARY_JOB':      return this.action_TAKE_MERCENARY_JOB(actor, target, payload);
      case 'DEFECT':                  return this.action_DEFECT(actor, target, payload);
      case 'INVESTIGATE_COURT':       return this.action_INVESTIGATE_COURT(actor, target, payload);
      case 'SWEAR_FEALTY':            return this.action_SWEAR_FEALTY(actor, target, payload);
      case 'TRAIN':                   return this.action_TRAIN(actor, payload);
      case 'PETITION_FOR_LAND':       return this.action_PETITION_FOR_LAND(actor, payload);
      case 'HIDE_IDENTITY':           return this.action_HIDE_IDENTITY(actor, payload);
      case 'DEPART':                  return this.action_DEPART(actor, payload);

      // ── TIER 1: Monk / Hermit Mystic ──────────────────────────────────────

      case 'PREACH':                  return this.action_PREACH(actor, payload);
      case 'BLESS':                   return this.action_BLESS(actor, target, payload);
      case 'PROPHECY':                return this.action_PROPHECY(actor, payload);
      case 'PILGRIMAGE':              return this.action_PILGRIMAGE(actor, payload);
      case 'WITHDRAW':                return this.action_WITHDRAW(actor, payload);
      case 'DENOUNCE':                return this.action_DENOUNCE(actor, target, payload);
      case 'PERFORM_MIRACLE':         return this.action_PERFORM_MIRACLE(actor, payload);
      case 'REVEAL_HERESY':           return this.action_REVEAL_HERESY(actor, target, payload);

      // ── TIER 2: Bandit Chief ───────────────────────────────────────────────

      case 'RAID_VILLAGE':            return this.action_RAID_VILLAGE(actor, target, payload);
      case 'EXTORT_SETTLEMENT':       return this.action_EXTORT_SETTLEMENT(actor, target, payload);
      case 'RECRUIT_DESERTERS':       return this.action_RECRUIT_DESERTERS(actor, target, payload);
      case 'ESTABLISH_HIDEOUT':       return this.action_ESTABLISH_HIDEOUT(actor, payload);
      case 'TERRORIZE_POPULATION':    return this.action_TERRORIZE_POPULATION(actor, target, payload);
      case 'RAID_SUPPLY_CONVOY':      return this.action_RAID_SUPPLY_CONVOY(actor, target, payload);
      case 'ABANDON_HIDEOUT':         return this.action_ABANDON_HIDEOUT(actor, payload);
      case 'BRIBE_LOCAL_GUARD':       return this.action_BRIBE_LOCAL_GUARD(actor, target, payload);
      case 'SELL_INTEL':              return this.action_SELL_INTEL(actor, target, payload);
      case 'ACCEPT_AMNESTY':          return this.action_ACCEPT_AMNESTY(actor, target, payload);
      case 'EXPAND_TERRITORY':        return this.action_EXPAND_TERRITORY(actor, payload);
      case 'EXECUTE_CAPTIVE':         return this.action_EXECUTE_CAPTIVE(actor, target, payload);

      // ── TIER 2: Master Merchant ────────────────────────────────────────────

      case 'ESTABLISH_TRADE_ROUTE':   return this.action_ESTABLISH_TRADE_ROUTE(actor, payload);
      case 'RAISE_PRICES':            return this.action_RAISE_PRICES(actor, payload);
      case 'LOWER_PRICES':            return this.action_LOWER_PRICES(actor, payload);
      case 'HOARD_GOODS':             return this.action_HOARD_GOODS(actor, payload);
      case 'DUMP_GOODS':              return this.action_DUMP_GOODS(actor, payload);
      case 'SMUGGLE':                 return this.action_SMUGGLE(actor, payload);
      case 'FUND_GUILD_LOBBY':        return this.action_FUND_GUILD_LOBBY(actor, payload);
      case 'EXPOSE_COMPETITOR':       return this.action_EXPOSE_COMPETITOR(actor, target, payload);
      case 'INVEST_IN_CITY_BUILDING': return this.action_INVEST_IN_CITY_BUILDING(actor, payload);
      case 'ARRANGE_LOAN_FROM_MERCHANT': return this.action_ARRANGE_LOAN_FROM_MERCHANT(actor, target, payload);
      case 'MINT_MORE_COIN':          return this.action_MINT_MORE_COIN(actor, payload);
      case 'AUDIT_PROVINCE':          return this.action_AUDIT_PROVINCE(actor, payload);
      case 'EMBEZZLE':                return this.action_EMBEZZLE(actor, payload);
      case 'INVEST_TREASURY_IN_TRADE_ROUTE': return this.action_INVEST_TREASURY_IN_TRADE_ROUTE(actor, payload);
      case 'REDUCE_MILITARY_BUDGET':  return this.action_REDUCE_MILITARY_BUDGET(actor, target, payload);
      case 'FALSIFY_ACCOUNTS':        return this.action_FALSIFY_ACCOUNTS(actor, payload);
      case 'CALL_IN_OUTSTANDING_DEBTS': return this.action_CALL_IN_OUTSTANDING_DEBTS(actor, target, payload);
      case 'PROPOSE_DEBASEMENT':      return this.action_PROPOSE_DEBASEMENT(actor, payload);

      // ── TIER 2: Mercenary Captain ──────────────────────────────────────────

      case 'ACCEPT_CONTRACT':         return this.action_ACCEPT_CONTRACT(actor, target, payload);
      case 'DESERT_CONTRACT':         return this.action_DESERT_CONTRACT(actor, target, payload);
      case 'SACK_CITY':               return this.action_SACK_CITY(actor, target, payload);
      case 'DEFECT_TO_ENEMY':         return this.action_DEFECT_TO_ENEMY(actor, target, payload);
      case 'RECRUIT':                 return this.action_RECRUIT(actor, target, payload);
      case 'TRAIN_TROOPS':            return this.action_TRAIN_TROOPS(actor, payload);
      case 'DEMAND_BONUS_PAYMENT':    return this.action_DEMAND_BONUS_PAYMENT(actor, target, payload);
      case 'OCCUPY_PROVINCE':         return this.action_OCCUPY_PROVINCE(actor, target, payload);
      case 'NEGOTIATE_LAND_FOR_SERVICE': return this.action_NEGOTIATE_LAND_FOR_SERVICE(actor, payload);
      case 'RAID_FOR_SUPPLIES':       return this.action_RAID_FOR_SUPPLIES(actor, target, payload);
      case 'PROTECT_CONVOY':          return this.action_PROTECT_CONVOY(actor, target, payload);
      case 'RETIRE_COMPANY':          return this.action_RETIRE_COMPANY(actor, payload);
      case 'SEEK_NEW_CONTRACT':       return this.action_SEEK_NEW_CONTRACT(actor, payload);
      case 'SPREAD_REPUTATION':       return this.action_SPREAD_REPUTATION(actor, payload);
      case 'FORM_MERCENARY_ALLIANCE': return this.action_FORM_MERCENARY_ALLIANCE(actor, target, payload);
      case 'ATTEMPT_LORDSHIP':        return this.action_ATTEMPT_LORDSHIP(actor, payload);

      // ── TIER 3: Vassal Lord ────────────────────────────────────────────────

      case 'ANSWER_LEVY_CALL':              return this.action_ANSWER_LEVY_CALL(actor, target, payload);
      case 'PAY_TAXES_IN_FULL':             return this.action_PAY_TAXES_IN_FULL(actor, target, payload);
      case 'SHARE_INTELLIGENCE':            return this.action_SHARE_INTELLIGENCE(actor, target, payload);
      case 'SUPPORT_PLAYER_LAW':            return this.action_SUPPORT_PLAYER_LAW(actor, target, payload);
      case 'OFFER_PERSONAL_LOAN':           return this.action_OFFER_PERSONAL_LOAN(actor, target, payload);
      case 'VOLUNTEER_COUNSEL':             return this.action_VOLUNTEER_COUNSEL(actor, target, payload);
      case 'ATTEND_COURT':                  return this.action_ATTEND_COURT(actor, target, payload);
      case 'ARRANGE_MARRIAGE_FOR_ALLIANCE': return this.action_ARRANGE_MARRIAGE_FOR_ALLIANCE(actor, payload);
      case 'LEAD_CAMPAIGN_IN_PLAYER_NAME':  return this.action_LEAD_CAMPAIGN_IN_PLAYER_NAME(actor, target, payload);
      case 'IMPROVE_PROVINCE':              return this.action_IMPROVE_PROVINCE(actor, payload);
      case 'RECRUIT_PERSONAL_ARMY':         return this.action_RECRUIT_PERSONAL_ARMY(actor, target, payload);
      case 'ARRANGE_PRIVATE_MARRIAGE':      return this.action_ARRANGE_PRIVATE_MARRIAGE(actor, target, payload);
      case 'BRIBE_PLAYER_ADVISOR':          return this.action_BRIBE_PLAYER_ADVISOR(actor, target, payload);
      case 'INVESTIGATE_NEIGHBOR_VASSAL':   return this.action_INVESTIGATE_NEIGHBOR_VASSAL(actor, target, payload);
      case 'PETITION_LIEGE':                return this.action_PETITION_LIEGE(actor, target, payload);
      case 'ENGAGE_IN_TRADE':               return this.action_ENGAGE_IN_TRADE(actor, payload);
      case 'MANAGE_OWN_COURT':              return this.action_MANAGE_OWN_COURT(actor, payload);
      case 'SPREAD_RUMOR':                  return this.action_SPREAD_RUMOR(actor, target, payload);
      case 'STOCKPILE_FOOD':                return this.action_STOCKPILE_FOOD_VASSAL(actor, payload);
      case 'BUILD_PRIVATE_ALLIANCE':        return this.action_BUILD_PRIVATE_ALLIANCE(actor, payload);
      case 'DELAY_TAX_PAYMENT':             return this.action_DELAY_TAX_PAYMENT(actor, target, payload);
      case 'DRAG_FEET_ON_LEVY':             return this.action_DRAG_FEET_ON_LEVY(actor, target, payload);
      case 'REFUSE_CAMPAIGN':               return this.action_REFUSE_CAMPAIGN(actor, target, payload);
      case 'RECRUIT_FACTION':               return this.action_RECRUIT_FACTION(actor, payload);
      case 'FUND_OPPOSITION':               return this.action_FUND_OPPOSITION(actor, target, payload);
      case 'SEEK_FOREIGN_BACKING':          return this.action_SEEK_FOREIGN_BACKING(actor, target, payload);
      case 'DEMAND_CONCESSIONS':            return this.action_DEMAND_CONCESSIONS(actor, target, payload);
      case 'FORGE_CLAIM':                   return this.action_FORGE_CLAIM(actor, payload);
      case 'DECLARE_INDEPENDENCE':          return this.action_DECLARE_INDEPENDENCE(actor, target, payload);
      case 'SEIZE_PROVINCE':                return this.action_SEIZE_PROVINCE(actor, target, payload);
      case 'ASSASSINATE_PLAYER_ADVISOR':    return this.action_ASSASSINATE_PLAYER_ADVISOR(actor, target, payload);
      case 'POISON_PLAYER':                 return this.action_POISON_PLAYER(actor, target, payload);
      case 'INVITE_FOREIGN_INVASION':       return this.action_INVITE_FOREIGN_INVASION(actor, target, payload);
      case 'BETRAY_MILITARY_ORDERS':        return this.action_BETRAY_MILITARY_ORDERS(actor, target, payload);
      case 'ACCEPT_PARDON':                 return this.action_ACCEPT_PARDON(actor, target, payload);
      case 'SUBMIT_UNDER_TERMS':            return this.action_SUBMIT_UNDER_TERMS(actor, payload);

      // ── TIER 3: Chancellor ─────────────────────────────────────────────────

      case 'NEGOTIATE_TREATY':              return this.action_NEGOTIATE_TREATY(actor, target, payload);
      case 'FABRICATE_CLAIM':               return this.action_FABRICATE_CLAIM(actor, target, payload);
      case 'ARRANGE_MARRIAGE_DEAL':         return this.action_ARRANGE_MARRIAGE_DEAL(actor, payload);
      case 'PLANT_PROPAGANDA':              return this.action_PLANT_PROPAGANDA(actor, payload);
      case 'EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY': return this.action_EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY(actor, target, payload);
      case 'REQUEST_AUDIENCE_WITH_FOREIGN_RULER': return this.action_REQUEST_AUDIENCE_WITH_FOREIGN_RULER(actor, target, payload);
      case 'BRIBE_FOREIGN_AMBASSADOR':      return this.action_BRIBE_FOREIGN_AMBASSADOR(actor, target, payload);
      case 'DRAFT_PEACE_TERMS':             return this.action_DRAFT_PEACE_TERMS(actor, payload);
      case 'DRAFT_WAR_JUSTIFICATION':       return this.action_DRAFT_WAR_JUSTIFICATION(actor, target, payload);
      case 'MANAGE_HOSTAGE_SITUATION':      return this.action_MANAGE_HOSTAGE_SITUATION(actor, payload);
      case 'NEGOTIATE_TRADE_TREATY':        return this.action_NEGOTIATE_TRADE_TREATY(actor, target, payload);
      case 'CRAFT_ALLIANCE_TERMS':          return this.action_CRAFT_ALLIANCE_TERMS(actor, payload);
      case 'SPREAD_DISINFORMATION_ABROAD':  return this.action_SPREAD_DISINFORMATION_ABROAD(actor, target, payload);
      case 'QUIETLY_SANCTION_FOREIGN_SPY':  return this.action_QUIETLY_SANCTION_FOREIGN_SPY(actor, payload);

      // ── TIER 3: Marshal ────────────────────────────────────────────────────

      case 'TRAIN_ARMY':                    return this.action_TRAIN_ARMY(actor, target, payload);
      case 'ADVISE_ON_BATTLE_PLAN':         return this.action_ADVISE_ON_BATTLE_PLAN(actor, payload);
      case 'COMMAND_ARMY_IN_FIELD':         return this.action_COMMAND_ARMY_IN_FIELD(actor, payload);
      case 'CONSCRIPT_LEVY':                return this.action_CONSCRIPT_LEVY(actor, target, payload);
      case 'COMMISSION_SIEGE_EQUIPMENT':    return this.action_COMMISSION_SIEGE_EQUIPMENT(actor, target, payload);
      case 'ORGANIZE_DEFENSIVE_LINE':       return this.action_ORGANIZE_DEFENSIVE_LINE(actor, payload);
      case 'MISINTERPRET_ORDERS':           return this.action_MISINTERPRET_ORDERS(actor, target, payload);
      case 'DEMAND_MORE_TROOPS_BEFORE_ADVANCING': return this.action_DEMAND_MORE_TROOPS_BEFORE_ADVANCING(actor, target, payload);
      case 'CLAIM_BATTLE_CREDIT':           return this.action_CLAIM_BATTLE_CREDIT(actor, target, payload);
      case 'PRIVATELY_RECRUIT_LOYAL_TROOPS': return this.action_PRIVATELY_RECRUIT_LOYAL_TROOPS(actor, target, payload);
      case 'NEGOTIATE_SURRENDER_TERMS':     return this.action_NEGOTIATE_SURRENDER_TERMS(actor, payload);
      case 'RECOMMEND_TACTICAL_RETREAT':    return this.action_RECOMMEND_TACTICAL_RETREAT(actor, target, payload);
      case 'PLAN_NIGHT_RAID':               return this.action_PLAN_NIGHT_RAID(actor, payload);
      case 'SABOTAGE_RIVAL_GENERAL':        return this.action_SABOTAGE_RIVAL_GENERAL(actor, target, payload);

      // ── TIER 3: Spymaster ──────────────────────────────────────────────────

      case 'WATCH_COURT':                   return this.action_WATCH_COURT(actor, target, payload);
      case 'INFILTRATE_FOREIGN_COURT':      return this.action_INFILTRATE_FOREIGN_COURT(actor, target, payload);
      case 'RECRUIT_AGENT':                 return this.action_RECRUIT_AGENT(actor, target, payload);
      case 'ASSIGN_ASSASSINATION':          return this.action_ASSIGN_ASSASSINATION(actor, target, payload);
      case 'FRAME_CHARACTER':               return this.action_FRAME_CHARACTER(actor, target, payload);
      case 'EXPOSE_PLOT':                   return this.action_EXPOSE_PLOT(actor, target, payload);
      case 'FABRICATE_EVIDENCE':            return this.action_FABRICATE_EVIDENCE(actor, payload);
      case 'BURN_NETWORK':                  return this.action_BURN_NETWORK(actor, payload);
      case 'TURN_ENEMY_AGENT':              return this.action_TURN_ENEMY_AGENT(actor, target, payload);
      case 'PLANT_DOUBLE_AGENT':            return this.action_PLANT_DOUBLE_AGENT(actor, target, payload);
      case 'COVERTLY_MONITOR_PLAYER_ADVISOR': return this.action_COVERTLY_MONITOR_PLAYER_ADVISOR(actor, target, payload);
      case 'BLACKMAIL_VASSAL':              return this.action_BLACKMAIL_VASSAL(actor, target, payload);
      case 'INTERCEPT_COURIER':             return this.action_INTERCEPT_COURIER(actor, target, payload);
      case 'LEAK_INTEL_TO_ENEMY':           return this.action_LEAK_INTEL_TO_ENEMY(actor, target, payload);
      case 'MAP_ENEMY_SUPPLY_LINES':        return this.action_MAP_ENEMY_SUPPLY_LINES(actor, payload);
      case 'PRODUCE_FORGED_DOCUMENT':       return this.action_PRODUCE_FORGED_DOCUMENT(actor, payload);

      // ── TIER 3: Treasurer ──────────────────────────────────────────────────

      case 'COLLECT_TAXES':                 return this.action_COLLECT_TAXES(actor, target, payload);
      case 'ADVISE_ON_INVESTMENT':          return this.action_ADVISE_ON_INVESTMENT(actor, payload);
      case 'AUDIT_ACCOUNTS':                return this.action_AUDIT_ACCOUNTS(actor, target, payload);
      case 'NEGOTIATE_LOAN':                return this.action_NEGOTIATE_LOAN(actor, target, payload);
      case 'OVERSEE_MINT':                  return this.action_OVERSEE_MINT(actor, target, payload);
      case 'DRAFT_TRADE_AGREEMENT':         return this.action_DRAFT_TRADE_AGREEMENT(actor, target, payload);
      case 'PROPOSE_BUDGET_CUT':            return this.action_PROPOSE_BUDGET_CUT(actor, target, payload);
      case 'EMBEZZLE_FROM_TREASURY':        return this.action_EMBEZZLE_FROM_TREASURY(actor, target, payload);
      case 'FALSIFY_TREASURY_REPORTS':      return this.action_FALSIFY_TREASURY_REPORTS(actor, payload);
      case 'INVEST_IN_TRADE_ROUTE':         return this.action_INVEST_IN_TRADE_ROUTE(actor, payload);
      case 'CALL_IN_DEBTS':                 return this.action_CALL_IN_DEBTS(actor, target, payload);
      case 'PROPOSE_TAX_RELIEF':            return this.action_PROPOSE_TAX_RELIEF(actor, target, payload);

      // ── TIER 3: Court Priest ───────────────────────────────────────────────

      case 'PREACH_IN_PROVINCE':            return this.action_PREACH_IN_PROVINCE(actor, payload);
      case 'WARN_OF_EXCOMMUNICATION':       return this.action_WARN_OF_EXCOMMUNICATION(actor, target, payload);
      case 'NEGOTIATE_WITH_HIGH_PRIEST':    return this.action_NEGOTIATE_WITH_HIGH_PRIEST(actor, payload);
      case 'DEMAND_CHURCH_TAX_EXEMPTION':   return this.action_DEMAND_CHURCH_TAX_EXEMPTION(actor, target, payload);
      case 'CALL_FOR_CRUSADE_PARTICIPATION':return this.action_CALL_FOR_CRUSADE_PARTICIPATION(actor, payload);
      case 'CONDUCT_INQUISITION':           return this.action_CONDUCT_INQUISITION(actor, payload);
      case 'GRANT_ABSOLUTION':              return this.action_GRANT_ABSOLUTION(actor, target, payload);
      case 'PERFORM_WEDDING':               return this.action_PERFORM_WEDDING(actor, target, payload);
      case 'THREATEN_INTERDICT':            return this.action_THREATEN_INTERDICT(actor, target, payload);
      case 'COVERTLY_REPORT_TO_HIGH_PRIEST':return this.action_COVERTLY_REPORT_TO_HIGH_PRIEST(actor, payload);
      case 'RADICALIZE_CLERGY':             return this.action_RADICALIZE_CLERGY(actor, payload);

      // ── TIER 4: Foreign Ruler — Diplomatic ────────────────────────────────

      case 'PROPOSE_ALLIANCE':              return this.action_PROPOSE_ALLIANCE(actor, target, payload);
      case 'ACCEPT_ALLIANCE':               return this.action_ACCEPT_ALLIANCE(actor, payload);
      case 'BREAK_ALLIANCE':                return this.action_BREAK_ALLIANCE(actor, payload);
      case 'PROPOSE_PEACE':                 return this.action_PROPOSE_PEACE(actor, payload);
      case 'REJECT_PEACE':                  return this.action_REJECT_PEACE(actor, payload);
      case 'DEMAND_TRIBUTE':                return this.action_DEMAND_TRIBUTE(actor, target, payload);
      case 'OFFER_TRIBUTE':                 return this.action_OFFER_TRIBUTE(actor, target, payload);
      case 'PROPOSE_TRADE_TREATY':          return this.action_PROPOSE_TRADE_TREATY(actor, payload);
      case 'PROPOSE_NON_AGGRESSION_PACT':   return this.action_PROPOSE_NON_AGGRESSION_PACT(actor, payload);
      case 'ARRANGE_ROYAL_MARRIAGE':        return this.action_ARRANGE_ROYAL_MARRIAGE(actor, payload);
      case 'OFFER_HOSTAGE':                 return this.action_OFFER_HOSTAGE(actor, target, payload);
      case 'DEMAND_HOSTAGE':                return this.action_DEMAND_HOSTAGE(actor, target, payload);
      case 'RECALL_AMBASSADOR':             return this.action_RECALL_AMBASSADOR(actor, payload);
      case 'SEND_INSULT':                   return this.action_SEND_INSULT(actor, target, payload);
      case 'SEND_GIFT':                     return this.action_SEND_GIFT(actor, target, payload);
      case 'MEDIATE_THIRD_PARTY_CONFLICT':  return this.action_MEDIATE_THIRD_PARTY_CONFLICT(actor, payload);
      case 'FORM_COALITION_AGAINST_PLAYER': return this.action_FORM_COALITION_AGAINST_PLAYER(actor, payload);
      case 'INVITE_PLAYER_INTO_COALITION':  return this.action_INVITE_PLAYER_INTO_COALITION(actor, target, payload);

      // ── TIER 4: Foreign Ruler — Military ──────────────────────────────────

      case 'DECLARE_WAR':                   return this.action_DECLARE_WAR(actor, target, payload);
      case 'FABRICATE_CASUS_BELLI':         return this.action_FABRICATE_CASUS_BELLI(actor, payload);
      case 'MOBILIZE_ARMY':                 return this.action_MOBILIZE_ARMY(actor, target, payload);
      case 'DEMOBILIZE_ARMY':               return this.action_DEMOBILIZE_ARMY(actor, payload);
      case 'LAUNCH_INVASION':               return this.action_LAUNCH_INVASION(actor, payload);
      case 'RAID_BORDER_PROVINCE':          return this.action_RAID_BORDER_PROVINCE(actor, target, payload);
      case 'SIEGE_PLAYER_FORTRESS':         return this.action_SIEGE_PLAYER_FORTRESS(actor, payload);
      case 'SEND_EXPEDITIONARY_FORCE':      return this.action_SEND_EXPEDITIONARY_FORCE(actor, payload);
      case 'HIRE_MERCENARY_COMPANY':        return this.action_HIRE_MERCENARY_COMPANY(actor, payload);
      case 'FUND_PLAYER_REBEL':             return this.action_FUND_PLAYER_REBEL(actor, target, payload);
      case 'ORDER_ASSASSINATION_OF_PLAYER': return this.action_ORDER_ASSASSINATION_OF_PLAYER(actor, target, payload);
      case 'BLOCKADE_PLAYER_COAST':         return this.action_BLOCKADE_PLAYER_COAST(actor, target, payload);
      case 'STRATEGIC_WITHDRAWAL':          return this.action_STRATEGIC_WITHDRAWAL(actor, payload);
      case 'OFFER_MILITARY_AID_TO_PLAYER_ENEMY': return this.action_OFFER_MILITARY_AID_TO_PLAYER_ENEMY(actor, target, payload);

      // ── TIER 4: Foreign Ruler — Economic ──────────────────────────────────

      case 'IMPOSE_TRADE_EMBARGO':          return this.action_IMPOSE_TRADE_EMBARGO(actor, target, payload);
      case 'ESTABLISH_TRADE_ROUTE_WITH_PLAYER': return this.action_ESTABLISH_TRADE_ROUTE_WITH_PLAYER(actor, target, payload);
      case 'FLOOD_MARKET':                  return this.action_FLOOD_MARKET(actor, target, payload);
      case 'CORNER_IRON_MARKET':            return this.action_CORNER_IRON_MARKET(actor, target, payload);
      case 'FUND_BANDIT_GROUPS_IN_PLAYER_TERRITORY': return this.action_FUND_BANDIT_GROUPS_IN_PLAYER_TERRITORY(actor, target, payload);
      case 'INVEST_IN_OWN_INFRASTRUCTURE':  return this.action_INVEST_IN_OWN_INFRASTRUCTURE(actor, payload);
      case 'DEBASE_OWN_CURRENCY':           return this.action_DEBASE_OWN_CURRENCY(actor, payload);

      // ── TIER 4: Foreign Ruler — Intelligence ──────────────────────────────

      case 'PLANT_SPY_IN_PLAYER_COURT':     return this.action_PLANT_SPY_IN_PLAYER_COURT(actor, payload);
      case 'ATTEMPT_TO_TURN_PLAYER_ADVISOR':return this.action_ATTEMPT_TO_TURN_PLAYER_ADVISOR(actor, target, payload);
      case 'INTERCEPT_PLAYER_COURIER':      return this.action_INTERCEPT_PLAYER_COURIER(actor, payload);
      case 'SPREAD_PROPAGANDA_IN_PLAYER_PROVINCES': return this.action_SPREAD_PROPAGANDA_IN_PLAYER_PROVINCES(actor, payload);
      case 'MAP_PLAYER_ARMY_MOVEMENTS':     return this.action_MAP_PLAYER_ARMY_MOVEMENTS(actor, payload);
      case 'EXPOSE_OWN_DOUBLE_AGENT':       return this.action_EXPOSE_OWN_DOUBLE_AGENT(actor, payload);

      // ── TIER 4: Foreign Ruler — Internal / Reactive ───────────────────────

      case 'PURGE_DISLOYAL_VASSAL':         return this.action_PURGE_DISLOYAL_VASSAL(actor, target, payload);
      case 'ELEVATE_NEW_VASSAL':            return this.action_ELEVATE_NEW_VASSAL(actor, target, payload);
      case 'CHANGE_SUCCESSION_LAW':         return this.action_CHANGE_SUCCESSION_LAW(actor, payload);
      case 'INVEST_IN_MILITARY':            return this.action_INVEST_IN_MILITARY(actor, payload);
      case 'INVEST_IN_ECONOMY':             return this.action_INVEST_IN_ECONOMY(actor, payload);
      case 'INVEST_IN_CHURCH':              return this.action_INVEST_IN_CHURCH(actor, payload);
      case 'CONDUCT_CENSUS':                return this.action_CONDUCT_CENSUS(actor, payload);
      case 'REFORM_LAWS':                   return this.action_REFORM_LAWS(actor, payload);
      case 'CALL_GREAT_COUNCIL':            return this.action_CALL_GREAT_COUNCIL(actor, payload);
      case 'PLAN_INVASION':                 return this.action_PLAN_INVASION(actor, payload);
      case 'RESPOND_TO_EXCOMMUNICATION':    return this.action_RESPOND_TO_EXCOMMUNICATION(actor, payload);
      case 'RESPOND_TO_PLAYER_AGGRESSION':  return this.action_RESPOND_TO_PLAYER_AGGRESSION(actor, payload);
      case 'RESPOND_TO_ALLY_BEING_ATTACKED':return this.action_RESPOND_TO_ALLY_BEING_ATTACKED(actor, payload);
      case 'RESPOND_TO_SUCCESSION_CRISIS':  return this.action_RESPOND_TO_SUCCESSION_CRISIS(actor, payload);
      case 'RESPOND_TO_PLAGUE':             return this.action_RESPOND_TO_PLAGUE(actor, payload);

      default:
        console.warn(`[NPCFeedbackLoopSystem] Unknown action: ${payload.action}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.1 — TIER 1 ACTION HANDLERS: Peasant Cohort (10)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * WORK
   * [+] food_stockpile, fatigue, solidarity, liege.gold (via tax)
   * [-] hunger, unrest
   */
  private action_WORK(actor: any, target: any, p: NPCSimulationActionPayload) {
    const goldGenerated = p.magnitude ?? 100;
    increment(actor, 'food_stockpile', 500);
    delta(actor, 'fatigue', 5);
    delta(actor, 'solidarity', 2);
    delta(actor, 'hunger', -8);
    delta(actor, 'unrest', -3);
    // Transfer gold to liege via taxation
    const liege = this.getLiegeOf(actor);
    if (liege) {
      increment(liege, 'gold', Math.floor(goldGenerated * 0.1)); // tax fraction
    }
  }

  /**
   * HOARD_FOOD
   * [+] food_stockpile (self), hunger (market/others)
   * [-] desperation, market_food_supply
   */
  private action_HOARD_FOOD(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'food_stockpile', 800);
    delta(actor, 'desperation', -10);
    // Other cohorts in same province feel hunger increase
    const provinceCohorts = this.getSameProvinceCharacters(actor, 'PEASANT_COHORT');
    for (const other of provinceCohorts) {
      delta(other as any, 'hunger', 3);
    }
    // Province food supply contracts
    this.modifyProvinceState(actor.province_id, 'market_food_supply', -200);
  }

  /**
   * PETITION_LORD
   * [+] liege.stress
   * [-] unrest (temporarily)
   */
  private action_PETITION_LORD(actor: any, target: any, p: NPCSimulationActionPayload) {
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'stress', 5);
    delta(actor, 'unrest', -5);
  }

  /**
   * FLEE_PROVINCE
   * [+] location (changes), dest_province.unrest, dest_province.hunger
   * [-] cohort_size (origin)
   */
  private action_FLEE_PROVINCE(actor: any, p: NPCSimulationActionPayload) {
    const fleeingSize = p.magnitude ?? 50;
    decrement(actor, 'cohort_size', fleeingSize);
    setTo(actor, 'collective_mood', 'FLEEING');
    // Destination province becomes more stressed
    if (p.provinceId) {
      this.modifyProvinceState(p.provinceId, 'ambient_unrest', 10);
      this.modifyProvinceState(p.provinceId, 'hunger', 5);
    }
    this.chronicle(`${fleeingSize} peasants have fled the province in desperation.`);
  }

  /**
   * FORM_SECRET_FACTION
   * [+] solidarity, faction_strength
   * [-] fear
   * (Spawns Faction Leader)
   */
  private action_FORM_SECRET_FACTION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'solidarity', 10);
    increment(actor, 'faction_strength', 1);
    delta(actor, 'fear', -5);
    this.gameLoop.eventBus?.publish('SECRET_FACTION_FORMED', {
      actorId: actor.id,
      provinceId: actor.province_id,
    });
    this.chronicle(`A secret faction stirs among the common folk.`);
  }

  /**
   * RIOT
   * [+] unrest, fear (local merchants)
   * [-] province_infrastructure, food_stockpile
   */
  private action_RIOT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'unrest', 15);
    this.modifyProvinceState(actor.province_id, 'infrastructure_integrity', -10);
    decrement(actor, 'food_stockpile', 300);
    // Local merchants become afraid
    const merchants = this.getSameProvinceCharacters(actor, 'MASTER_MERCHANT');
    for (const m of merchants) delta(m as any, 'fear', 15);
    this.alert(`Riots break out! Province infrastructure suffers and merchants cower.`, 'URGENT');
  }

  /**
   * REFUSE_LEVY
   * [+] liege.discontent
   * [-] fatigue, liege.army_size
   */
  private action_REFUSE_LEVY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      delta(liege, 'discontent', 10);
      decrement(liege, 'army_size', p.magnitude ?? 100);
    }
    delta(actor, 'fatigue', -5); // Saved from levy
  }

  /**
   * SUPPORT_REBEL
   * [+] rebel_army_size, solidarity
   * [-] gold, fear
   */
  private action_SUPPORT_REBEL(actor: any, target: any, p: NPCSimulationActionPayload) {
    const goldCost = p.magnitude ?? 50;
    decrement(actor, 'gold', goldCost);
    delta(actor, 'fear', -8);
    delta(actor, 'solidarity', 5);
    if (target) increment(target, 'army_size', Math.floor(goldCost * 2));
  }

  /**
   * PRAY
   * [+] piety, hope
   * [-] unrest, trauma (slowly)
   */
  private action_PRAY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'piety', 3);
    delta(actor, 'hope', 5);
    delta(actor, 'unrest', -4);
    delta(actor, 'trauma', -1);
  }

  /**
   * EMERGE_NOTABLE
   * [+] (Spawns Tier 2/3 NPC)
   * [-] cohort_size
   */
  private action_EMERGE_NOTABLE(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'cohort_size', 1);
    this.gameLoop.eventBus?.publish('NOTABLE_EMERGED', {
      sourceProvinceId: actor.province_id,
      sourceActorId: actor.id,
    });
    this.chronicle(`A notable figure emerges from among the common folk.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.1 — TIER 1 ACTION HANDLERS: Wandering Knight (10)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * SEEK_EMPLOYMENT
   * [+] employment_status
   * [-] desperation, restlessness
   */
  private action_SEEK_EMPLOYMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    setTo(actor, 'employment_status', 'EMPLOYED');
    delta(actor, 'desperation', -15);
    delta(actor, 'restlessness', -10);
    if (target) increment(target, 'army_size', 1);
  }

  /**
   * CHALLENGE_DUEL
   * [WIN] [+] reputation_score, martial_confidence
   * [LOSE] [-] martial_confidence, health
   */
  private action_CHALLENGE_DUEL(actor: any, target: any, p: NPCSimulationActionPayload) {
    if (p.outcome === 'WIN') {
      delta(actor, 'reputation_score', 10);
      delta(actor, 'martial_confidence', 10);
      increment(actor, 'battles_won', 1);
      if (target) delta(target, 'martial_confidence', -8);
    } else {
      delta(actor, 'martial_confidence', -10);
      delta(actor, 'health', -15);
    }
  }

  /**
   * TAKE_MERCENARY_JOB
   * [+] gold, employment_status
   * [-] honor, idealism
   */
  private action_TAKE_MERCENARY_JOB(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 200);
    setTo(actor, 'employment_status', 'MERCENARY');
    delta(actor, 'honor', -8);
    delta(actor, 'idealism', -5);
  }

  /**
   * DEFECT
   * [+] lords_served, destination_lord.army_size
   * [-] reputation_score, honor, old_lord.army_size
   */
  private action_DEFECT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'lords_served', 1);
    delta(actor, 'reputation_score', -15);
    delta(actor, 'honor', -10);
    const oldLord = this.getLiegeOf(actor);
    if (oldLord) decrement(oldLord, 'army_size', 1);
    if (target) increment(target, 'army_size', 1);
    setTo(actor, 'liege_id', target?.id ?? null);
  }

  /**
   * INVESTIGATE_COURT
   * [+] suspicion, liege.paranoia
   * [-] ignorance
   */
  private action_INVESTIGATE_COURT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'suspicion', 10);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'paranoia', 5);
  }

  /**
   * SWEAR_FEALTY
   * [+] honor, loyalty_to_current_lord
   * [-] restlessness, independence
   */
  private action_SWEAR_FEALTY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'honor', 8);
    delta(actor, 'loyalty_to_current_lord', 15);
    delta(actor, 'restlessness', -10);
    delta(actor, 'ambition', -5);
    setTo(actor, 'employment_status', 'SWORN_VASSAL');
    if (target) setTo(actor, 'liege_id', target.id);
  }

  /**
   * TRAIN
   * [+] martial_confidence, fatigue
   * [-] food_stockpile, gold
   */
  private action_TRAIN(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'martial_confidence', 8);
    delta(actor, 'fatigue', 10);
    decrement(actor, 'food_stockpile', 100);
    decrement(actor, 'gold', 20);
  }

  /**
   * PETITION_FOR_LAND
   * [+] ambition
   * [-] patience
   */
  private action_PETITION_FOR_LAND(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'ambition', 5);
    delta(actor, 'patience', -8);
  }

  /**
   * HIDE_IDENTITY
   * [+] paranoia
   * [-] reputation_score, honor
   */
  private action_HIDE_IDENTITY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', 8);
    delta(actor, 'reputation_score', -5);
    delta(actor, 'honor', -5);
  }

  /**
   * DEPART
   * [→] Changes location
   * [+] fatigue
   * [-] restlessness
   */
  private action_DEPART(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'fatigue', 5);
    delta(actor, 'restlessness', -8);
    if (p.provinceId) setTo(actor, 'province_id', p.provinceId);
    this.gameLoop.eventBus?.publish('CHARACTER_DEPARTED', { actorId: actor.id, provinceId: p.provinceId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.1 — TIER 1 ACTION HANDLERS: Monk / Hermit Mystic (8)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PREACH
   * [+] province.piety, charisma
   * [-] province.unrest, isolation_drive
   */
  private action_PREACH(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'charisma', 3);
    delta(actor, 'isolation_drive', -5);
    this.modifyProvinceState(actor.province_id, 'ambient_piety', 8);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -6);
  }

  /**
   * BLESS
   * [+] target.morale, target.hope
   * [-] own fatigue
   */
  private action_BLESS(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'fatigue', 5);
    if (target) {
      delta(target, 'morale', 8);
      delta(target, 'hope', 6);
    }
  }

  /**
   * PROPHECY
   * [+] local.mysticism, prophecy_pressure
   * [-] faith_in_order
   */
  private action_PROPHECY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prophecy_pressure', -30); // Released pressure
    this.modifyProvinceState(actor.province_id, 'mysticism', 15);
    delta(actor, 'faith_in_order', -5);
    this.gameLoop.eventBus?.publish('PROPHECY_DELIVERED', {
      actorId: actor.id,
      provinceId: actor.province_id,
    });
    this.chronicle(`${actor.firstName ?? 'A mystic'} delivers a prophecy that shakes the foundations of faith.`);
  }

  /**
   * PILGRIMAGE
   * [+] piety, wisdom, pilgrimage_count
   * [-] isolation_drive (draws toward world)
   */
  private action_PILGRIMAGE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'piety', 10);
    delta(actor, 'wisdom', 5);
    increment(actor, 'pilgrimage_count', 1);
    delta(actor, 'isolation_drive', -5);
    if (p.provinceId) setTo(actor, 'province_id', p.provinceId);
  }

  /**
   * WITHDRAW
   * [+] asceticism, mysticism, isolation_drive
   * [-] compassion, charisma (from absence)
   */
  private action_WITHDRAW(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'asceticism', 10);
    delta(actor, 'mysticism', 8);
    delta(actor, 'isolation_drive', 10);
    delta(actor, 'compassion', -3);
    setTo(actor, 'is_isolated', true);
  }

  /**
   * DENOUNCE
   * [+] target.suspicion_of_power, local unrest (if powerful figure)
   * [-] own safety
   */
  private action_DENOUNCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    if (target) {
      delta(target, 'suspicion_of_power', 10);
      delta(target, 'prestige', -8);
    }
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 5);
    this.gameLoop.eventBus?.publish('CHARACTER_DENOUNCED', { actorId: actor.id, targetId: target?.id });
  }

  /**
   * PERFORM_MIRACLE
   * [+] charisma, piety, province.hope
   * [-] fatigue
   */
  private action_PERFORM_MIRACLE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'charisma', 10);
    delta(actor, 'piety', 8);
    delta(actor, 'fatigue', 15);
    this.modifyProvinceState(actor.province_id, 'ambient_piety', 20);
    this.modifyProvinceState(actor.province_id, 'hope', 15);
    this.alert(`${actor.firstName ?? 'A holy figure'} performs a miracle! Faith surges across the province.`, 'NORMAL');
  }

  /**
   * REVEAL_HERESY
   * [+] target.known_heresies, province fear
   * [-] target.faith_in_order
   */
  private action_REVEAL_HERESY(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'known_heresies', 1);
    if (target) delta(target, 'faith_in_order', -15);
    this.modifyProvinceState(actor.province_id, 'fear', 10);
    this.gameLoop.eventBus?.publish('HERESY_REVEALED', { actorId: actor.id, provinceId: actor.province_id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.2 — TIER 2 ACTION HANDLERS: Bandit Chief (12)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RAID_VILLAGE
   * [+] gold, aggression, province.trauma
   * [-] honor, province.food_stockpile, province.hope
   */
  private action_RAID_VILLAGE(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 200);
    delta(actor, 'aggression', 5);
    this.modifyProvinceState(actor.province_id, 'trauma', 15);
    this.modifyProvinceState(actor.province_id, 'food_stockpile', -400);
    this.modifyProvinceState(actor.province_id, 'hope', -10);
    actor.ticks_since_last_raid = 0;
    this.alert(`Bandits raid the province! Food stores plundered, trauma spreads.`, 'URGENT');
  }

  /**
   * EXTORT_SETTLEMENT
   * [+] gold, morale
   * [-] province.loyalty, province.hope
   */
  private action_EXTORT_SETTLEMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 150);
    delta(actor, 'morale', 5);
    this.modifyProvinceState(actor.province_id, 'loyalty', -5);
    this.modifyProvinceState(actor.province_id, 'hope', -5);
  }

  /**
   * RECRUIT_DESERTERS
   * [+] band_size
   * [-] local.cohort_size (some peasants join)
   */
  private action_RECRUIT_DESERTERS(actor: any, target: any, p: NPCSimulationActionPayload) {
    const recruited = p.magnitude ?? 20;
    increment(actor, 'band_size', recruited);
    this.modifyProvinceState(actor.province_id, 'cohort_size', -recruited);
  }

  /**
   * ESTABLISH_HIDEOUT
   * [+] territorial, hideout_strength
   */
  private action_ESTABLISH_HIDEOUT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'territorial', 10);
    increment(actor, 'hideout_strength', 20);
    setTo(actor, 'current_activity', 'SETTLED');
  }

  /**
   * TERRORIZE_POPULATION
   * [+] reputation_fear, province.fear, brutality
   * [-] province.hope
   */
  private action_TERRORIZE_POPULATION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'reputation_fear', 10);
    delta(actor, 'brutality', 8);
    this.modifyProvinceState(actor.province_id, 'fear', 20);
    this.modifyProvinceState(actor.province_id, 'hope', -15);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 15);
    // Peasant cohort fear spikes
    for (const cohort of this.getSameProvinceCharacters(actor, 'PEASANT_COHORT')) {
      delta(cohort as any, 'fear', 20);
      delta(cohort as any, 'trauma', 10);
    }
  }

  /**
   * RAID_SUPPLY_CONVOY
   * [+] gold, food, desperation (releases)
   * [-] desperation, local.food_stockpile
   */
  private action_RAID_SUPPLY_CONVOY(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 300);
    increment(actor, 'food', 500);
    delta(actor, 'desperation', -10);
    if (target) decrement(target, 'food_stockpile', 500);
  }

  /**
   * ABANDON_HIDEOUT
   * [-] territorial, hideout_strength
   */
  private action_ABANDON_HIDEOUT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'territorial', -15);
    decrement(actor, 'hideout_strength', 30);
    setTo(actor, 'current_activity', 'FLEEING');
  }

  /**
   * BRIBE_LOCAL_GUARD
   * [+] paranoia (relief), security
   * [-] gold, paranoia (initial spend)
   */
  private action_BRIBE_LOCAL_GUARD(actor: any, target: any, p: NPCSimulationActionPayload) {
    const cost = p.magnitude ?? 100;
    decrement(actor, 'gold', cost);
    delta(actor, 'paranoia', -10);
    increment(actor, 'bribes_paid', cost);
    if (target) delta(target, 'corruption', 5); // Guard's corruption rises
  }

  /**
   * SELL_INTEL
   * [+] gold
   * [-] honor_among_thieves, loyalty_to_band
   */
  private action_SELL_INTEL(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 200);
    delta(actor, 'honor_among_thieves', -15);
    delta(actor, 'loyalty_to_band', -10);
    if (target) increment(target, 'intel', 10);
  }

  /**
   * ACCEPT_AMNESTY
   * [+] safety, honor_among_thieves (restored)
   * [-] brutality, aggression, reputation_fear
   * [→] Transitions NPC out of bandit role
   */
  private action_ACCEPT_AMNESTY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'brutality', -20);
    delta(actor, 'aggression', -10);
    delta(actor, 'reputation_fear', -20);
    delta(actor, 'honor_among_thieves', 5);
    setTo(actor, 'current_activity', 'REFORMED');
    this.gameLoop.eventBus?.publish('BANDIT_AMNESTIED', { actorId: actor.id });
    this.chronicle(`${actor.firstName ?? 'A bandit chief'} accepts the Lord's amnesty and lays down their arms.`);
  }

  /**
   * EXPAND_TERRITORY
   * [+] active_provinces, territorial
   * [-] restlessness
   */
  private action_EXPAND_TERRITORY(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'active_provinces', 1);
    delta(actor, 'territorial', 8);
    delta(actor, 'restlessness', -10);
  }

  /**
   * EXECUTE_CAPTIVE
   * [+] brutality, reputation_fear, recent_kills
   * [-] honor_among_thieves
   */
  private action_EXECUTE_CAPTIVE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'brutality', 10);
    delta(actor, 'reputation_fear', 8);
    increment(actor, 'recent_kills', 1);
    delta(actor, 'honor_among_thieves', -5);
    this.modifyProvinceState(actor.province_id, 'fear', 10);
    if (target) {
      setTo(target, 'isAlive', false);
      this.chronicle(`${actor.firstName ?? 'A bandit'} executes a captive. Fear spreads through the province.`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.2 — TIER 2 ACTION HANDLERS: Master Merchant (18)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ESTABLISH_TRADE_ROUTE
   * [+] active_trade_routes, market_confidence, loyalty_to_realm
   * [-] risk_tolerance (commitment made)
   */
  private action_ESTABLISH_TRADE_ROUTE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'active_trade_routes', 1);
    delta(actor, 'market_confidence', 8);
    delta(actor, 'loyalty_to_realm', 5);
    delta(actor, 'risk_tolerance', -3);
  }

  /**
   * RAISE_PRICES
   * [+] gold, hoarding_drive (greed sated)
   * [-] province.hunger, merchant.popularity
   */
  private action_RAISE_PRICES(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 300);
    delta(actor, 'greed', 5);
    this.modifyProvinceState(actor.province_id, 'hunger', 8);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 4);
    // Peasant cohorts in the province suffer hunger
    for (const cohort of this.getSameProvinceCharacters(actor, 'PEASANT_COHORT')) {
      delta(cohort as any, 'hunger', 5);
    }
  }

  /**
   * LOWER_PRICES
   * [+] province.loyalty (goodwill), popularity
   * [-] gold (short term)
   */
  private action_LOWER_PRICES(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'generosity', 5);
    decrement(actor, 'gold', p.magnitude ?? 100);
    this.modifyProvinceState(actor.province_id, 'hunger', -5);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -3);
  }

  /**
   * HOARD_GOODS
   * [+] warehoused_goods, hoarding_drive
   * [-] market_food_supply, province.hunger
   */
  private action_HOARD_GOODS(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'warehoused_goods', p.magnitude ?? 500);
    delta(actor, 'hoarding_drive', 5);
    this.modifyProvinceState(actor.province_id, 'hunger', 5);
    this.modifyProvinceState(actor.province_id, 'market_food_supply', -300);
  }

  /**
   * DUMP_GOODS
   * [+] market supply, market_confidence
   * [-] hoarding_drive, warehoused_goods
   */
  private action_DUMP_GOODS(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'warehoused_goods', p.magnitude ?? 500);
    delta(actor, 'hoarding_drive', -10);
    delta(actor, 'market_confidence', 5);
    this.modifyProvinceState(actor.province_id, 'hunger', -5);
  }

  /**
   * SMUGGLE
   * [+] gold, smuggling_operations
   * [-] loyalty_to_realm, smuggling (legal risk)
   */
  private action_SMUGGLE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 250);
    increment(actor, 'smuggling_operations', 1);
    delta(actor, 'loyalty_to_realm', -8);
    delta(actor, 'smuggling_drive', -5); // drive satisfied
  }

  /**
   * FUND_GUILD_LOBBY
   * [+] guild_solidarity, guild_rank (potential)
   * [-] gold
   */
  private action_FUND_GUILD_LOBBY(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 300);
    delta(actor, 'guild_solidarity', 10);
    increment(actor, 'guild_rank', 1);
  }

  /**
   * EXPOSE_COMPETITOR
   * [+] reputation_pride (own), competitor.scandal
   * [-] guild_solidarity
   */
  private action_EXPOSE_COMPETITOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'reputation_pride', 8);
    delta(actor, 'guild_solidarity', -10);
    if (target) {
      delta(target, 'prestige', -15);
      delta(target, 'guild_rank', -1);
    }
  }

  /**
   * INVEST_IN_CITY_BUILDING
   * [+] province.prestige, civic_investment
   * [-] gold
   */
  private action_INVEST_IN_CITY_BUILDING(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 500);
    delta(actor, 'civic_investment', 10);
    delta(actor, 'reputation_pride', 5);
    this.modifyProvinceState(actor.province_id, 'infrastructure_integrity', 10);
    this.modifyProvinceState(actor.province_id, 'prestige', 5);
  }

  /**
   * ARRANGE_LOAN_FROM_MERCHANT
   * [+] player.gold, merchant.outstanding_loans
   * [-] debt_aversion, player.future_income
   */
  private action_ARRANGE_LOAN_FROM_MERCHANT(actor: any, target: any, p: NPCSimulationActionPayload) {
    const loanAmount = p.magnitude ?? 500;
    increment(actor, 'outstanding_loans', loanAmount);
    delta(actor, 'debt_anxiety', -5); // Issuing loan is a confident act
    if (target) {
      increment(target, 'gold', loanAmount);
      increment(target, 'debts_owed', loanAmount);
    }
  }

  /**
   * MINT_MORE_COIN
   * [+] player.gold, inflation_rate
   * [-] inflation_anxiety, coin_purity
   */
  private action_MINT_MORE_COIN(actor: any, p: NPCSimulationActionPayload) {
    const amount = p.magnitude ?? 400;
    increment(actor, 'gold', amount);
    (this.gameLoop as any).globalInflationRate = ((this.gameLoop as any).globalInflationRate ?? 1.0) + 0.05;
    delta(actor, 'inflation_anxiety', 5);
    decrement(actor, 'coin_purity', 5);
  }

  /**
   * AUDIT_PROVINCE
   * [+] record_keeping_pride, player.gold (recovered)
   * [-] vassal.loyalty, corruption_tolerance
   */
  private action_AUDIT_PROVINCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'record_keeping_pride', 8);
    delta(actor, 'corruption_tolerance', -5);
    increment(actor, 'gold', p.magnitude ?? 150); // Recovered funds
    // Vassals in province feel scrutinized
    for (const vassal of this.getSameProvinceCharacters(actor, 'VASSAL_LORD')) {
      delta(vassal as any, 'loyalty_to_liege', -3);
    }
  }

  /**
   * EMBEZZLE
   * [+] gold (personal), embezzlement_temptation
   * [-] player.gold, loyalty_to_player
   */
  private action_EMBEZZLE(actor: any, p: NPCSimulationActionPayload) {
    const stolen = p.magnitude ?? 200;
    increment(actor, 'gold', stolen);
    delta(actor, 'embezzlement_temptation', 5);
    delta(actor, 'corruption', 8);
    // Steal from liege
    const liege = this.getLiegeOf(actor);
    if (liege) decrement(liege, 'gold', stolen);
  }

  /**
   * INVEST_TREASURY_IN_TRADE_ROUTE
   * [+] market_intuition, future_income
   * [-] current_gold, risk_tolerance
   */
  private action_INVEST_TREASURY_IN_TRADE_ROUTE(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 400);
    increment(actor, 'active_trade_routes', 1);
    delta(actor, 'market_confidence', 5);
    delta(actor, 'risk_tolerance', -5);
  }

  /**
   * REDUCE_MILITARY_BUDGET
   * [+] player.gold
   * [-] player.army_morale, marshal.opinion
   */
  private action_REDUCE_MILITARY_BUDGET(actor: any, target: any, p: NPCSimulationActionPayload) {
    const savedGold = p.magnitude ?? 200;
    increment(actor, 'gold', savedGold);
    // Army morale drops
    this.gameLoop.eventBus?.publish('MILITARY_BUDGET_CUT', { actorId: actor.id, savings: savedGold });
    if (target) delta(target, 'opinion', -10); // Marshal's opinion
  }

  /**
   * FALSIFY_ACCOUNTS
   * [+] embezzlement_temptation (hidden)
   * [-] record_keeping_pride, honesty
   */
  private action_FALSIFY_ACCOUNTS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'embezzlement_temptation', 8);
    delta(actor, 'record_keeping_pride', -10);
    delta(actor, 'corruption', 5);
  }

  /**
   * CALL_IN_OUTSTANDING_DEBTS
   * [+] player.gold
   * [-] vassal/merchant.gold, popularity
   */
  private action_CALL_IN_OUTSTANDING_DEBTS(actor: any, target: any, p: NPCSimulationActionPayload) {
    const debtAmount = p.magnitude ?? 300;
    increment(actor, 'gold', debtAmount);
    decrement(actor, 'outstanding_loans', debtAmount);
    if (target) {
      decrement(target, 'gold', debtAmount);
      delta(target, 'loyalty_to_realm', -5);
    }
  }

  /**
   * PROPOSE_DEBASEMENT
   * [+] player.short_term_gold, inflation_rate
   * [-] merchant_sympathy, market_confidence
   */
  private action_PROPOSE_DEBASEMENT(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 300);
    (this.gameLoop as any).globalInflationRate = ((this.gameLoop as any).globalInflationRate ?? 1.0) + 0.1;
    delta(actor, 'market_confidence', -10);
    // All merchants in realm lose sympathy
    for (const m of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(m as any, 'loyalty_to_realm', -5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.2 — TIER 2 ACTION HANDLERS: Mercenary Captain (16)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ACCEPT_CONTRACT
   * [+] desperation (relief), contracts_fulfilled (potential), employment
   * [-] independence_drive, restlessness
   */
  private action_ACCEPT_CONTRACT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'desperation', -15);
    delta(actor, 'independence_drive', -5);
    delta(actor, 'restlessness', -10);
    setTo(actor, 'contract_status', 'ACTIVE');
    if (target) setTo(actor, 'current_employer', target.id);
  }

  /**
   * DESERT_CONTRACT
   * [+] contracts_broken
   * [-] honor, loyalty_to_employer, company_reputation
   */
  private action_DESERT_CONTRACT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'contracts_broken', 1);
    delta(actor, 'honor', -15);
    delta(actor, 'loyalty_to_employer', -30);
    delta(actor, 'company_reputation', -10);
    setTo(actor, 'contract_status', 'DESERTED');
    if (target) delta(target, 'trust_of_mercenaries', -10);
  }

  /**
   * SACK_CITY
   * [+] gold, cruelty, province.trauma
   * [-] honor, company_reputation, employer.respect
   */
  private action_SACK_CITY(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 800);
    delta(actor, 'cruelty', 15);
    delta(actor, 'honor', -20);
    delta(actor, 'company_reputation', -15);
    this.modifyProvinceState(actor.province_id, 'trauma', 30);
    this.modifyProvinceState(actor.province_id, 'infrastructure_integrity', -40);
    this.modifyProvinceState(actor.province_id, 'hunger', 20);
    if (target) delta(target, 'respect_for_mercenaries', -10);
    this.alert(`A city has been sacked! Trauma and destruction spread across the province.`, 'CRITICAL');
  }

  /**
   * DEFECT_TO_ENEMY
   * [+] gold, contracts_broken
   * [-] honor, loyalty_to_employer
   */
  private action_DEFECT_TO_ENEMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 400);
    increment(actor, 'contracts_broken', 1);
    delta(actor, 'honor', -20);
    delta(actor, 'loyalty_to_employer', -40);
    setTo(actor, 'current_employer', target?.id ?? null);
    if (target) increment(target, 'army_size', actor.company_size ?? 0);
  }

  /**
   * RECRUIT
   * [+] company_size
   * [-] gold, local.cohort_size
   */
  private action_RECRUIT(actor: any, target: any, p: NPCSimulationActionPayload) {
    const recruited = p.magnitude ?? 50;
    increment(actor, 'company_size', recruited);
    decrement(actor, 'gold', recruited * 2);
    this.modifyProvinceState(actor.province_id, 'cohort_size', -recruited);
  }

  /**
   * TRAIN_TROOPS
   * [+] company_reputation, solidarity_with_company
   * [-] fatigue, gold
   */
  private action_TRAIN_TROOPS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'company_reputation', 5);
    delta(actor, 'solidarity_with_company', 8);
    delta(actor, 'fatigue', 10);
    decrement(actor, 'gold', p.magnitude ?? 100);
  }

  /**
   * DEMAND_BONUS_PAYMENT
   * [+] gold, greed
   * [-] patience, employer.opinion
   */
  private action_DEMAND_BONUS_PAYMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'greed', 5);
    delta(actor, 'patience', -8);
    if (target) {
      const bonus = p.magnitude ?? 200;
      decrement(target, 'gold', bonus);
      increment(actor, 'gold', bonus);
      delta(target, 'respect_for_mercenaries', -5);
    }
  }

  /**
   * OCCUPY_PROVINCE
   * [+] leverage, fear (local)
   * [-] loyalty_to_employer
   */
  private action_OCCUPY_PROVINCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'independence_drive', 5);
    delta(actor, 'loyalty_to_employer', -5);
    this.modifyProvinceState(actor.province_id, 'fear', 15);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 10);
  }

  /**
   * NEGOTIATE_LAND_FOR_SERVICE
   * [+] ambition
   * [-] battle_hunger (aiming to settle)
   */
  private action_NEGOTIATE_LAND_FOR_SERVICE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'ambition', 10);
    delta(actor, 'battle_hunger', -8);
  }

  /**
   * RAID_FOR_SUPPLIES
   * [+] food, morale
   * [-] local.food_stockpile, local.hope
   */
  private action_RAID_FOR_SUPPLIES(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'food', 600);
    delta(actor, 'morale', 5);
    this.modifyProvinceState(actor.province_id, 'food_stockpile', -500);
    this.modifyProvinceState(actor.province_id, 'hope', -8);
  }

  /**
   * PROTECT_CONVOY
   * [+] gold, honor, merchant.market_confidence
   * [-] restlessness, fatigue
   */
  private action_PROTECT_CONVOY(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 150);
    delta(actor, 'honor', 5);
    delta(actor, 'restlessness', -8);
    delta(actor, 'fatigue', 5);
    if (target) delta(target, 'market_confidence', 8);
  }

  /**
   * RETIRE_COMPANY
   * [+] prestige (leaves sim)
   * [-] company_size (disbands)
   */
  private action_RETIRE_COMPANY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prestige', 15);
    decrement(actor, 'company_size', actor.company_size ?? 0);
    setTo(actor, 'contract_status', 'RETIRED');
    this.gameLoop.eventBus?.publish('MERCENARY_RETIRED', { actorId: actor.id });
    this.chronicle(`${actor.firstName ?? 'A mercenary captain'} retires with glory and honor.`);
  }

  /**
   * SEEK_NEW_CONTRACT
   * [+] ambition
   * [-] restlessness
   */
  private action_SEEK_NEW_CONTRACT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'ambition', 5);
    delta(actor, 'restlessness', -5);
    setTo(actor, 'contract_status', 'SEEKING');
  }

  /**
   * SPREAD_REPUTATION
   * [+] company_reputation, pride
   * [-] gold
   */
  private action_SPREAD_REPUTATION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'company_reputation', 10);
    decrement(actor, 'gold', p.magnitude ?? 100);
    delta(actor, 'reputation_pride', 5);
  }

  /**
   * FORM_MERCENARY_ALLIANCE
   * [+] effective_strength
   * [-] independence_drive
   */
  private action_FORM_MERCENARY_ALLIANCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'independence_drive', -8);
    increment(actor, 'allied_mercenary_companies', 1);
    if (target) increment(target, 'allied_mercenary_companies', 1);
  }

  /**
   * ATTEMPT_LORDSHIP
   * [+] ambition (transitions to Tier 3)
   * [-] ideological_flexibility
   */
  private action_ATTEMPT_LORDSHIP(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'ambition', 15);
    delta(actor, 'ideological_flexibility', -10);
    this.gameLoop.eventBus?.publish('MERCENARY_SEEKS_LORDSHIP', { actorId: actor.id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Vassal Lord (38)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ANSWER_LEVY_CALL
   * [+] player.army_size, fatigue, wars_fought_for_liege
   * [-] personal_army_size, province.cohort_size
   */
  private action_ANSWER_LEVY_CALL(actor: any, target: any, p: NPCSimulationActionPayload) {
    const levySize = p.magnitude ?? 200;
    delta(actor, 'fatigue', 10);
    increment(actor, 'wars_fought', 1);
    decrement(actor, 'personal_army_size', levySize);
    delta(actor, 'loyalty_to_liege', 3); // Good faith
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'army_size', levySize);
    this.modifyProvinceState(actor.province_id, 'cohort_size', -Math.floor(levySize * 0.3));
  }

  /**
   * PAY_TAXES_IN_FULL
   * [+] player.gold, liege_opinion
   * [-] gold, discontent
   */
  private action_PAY_TAXES_IN_FULL(actor: any, target: any, p: NPCSimulationActionPayload) {
    const taxAmount = p.magnitude ?? 300;
    decrement(actor, 'gold', taxAmount);
    delta(actor, 'discontent', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      increment(liege, 'gold', taxAmount);
      delta(actor, 'loyalty_to_liege', 3);
    }
  }

  /**
   * SHARE_INTELLIGENCE
   * [+] player.intel, loyalty_to_liege
   * [-] paranoia
   */
  private action_SHARE_INTELLIGENCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'loyalty_to_liege', 5);
    delta(actor, 'paranoia', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'intel', 10);
  }

  /**
   * SUPPORT_PLAYER_LAW
   * [+] player.authority, political_savvy
   * [-] faction_pull
   */
  private action_SUPPORT_PLAYER_LAW(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'political_savvy', 5);
    delta(actor, 'faction_pull', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'authority', 5);
  }

  /**
   * OFFER_PERSONAL_LOAN
   * [+] player.gold, player.debt
   * [-] gold, greed
   */
  private action_OFFER_PERSONAL_LOAN(actor: any, target: any, p: NPCSimulationActionPayload) {
    const loanAmount = p.magnitude ?? 400;
    decrement(actor, 'gold', loanAmount);
    delta(actor, 'greed', -3);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      increment(liege, 'gold', loanAmount);
      increment(liege, 'debts_owed', loanAmount);
    }
  }

  /**
   * VOLUNTEER_COUNSEL
   * [+] liege_opinion
   * [-] independence_drive
   */
  private action_VOLUNTEER_COUNSEL(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'independence_drive', -3);
    delta(actor, 'loyalty_to_liege', 3);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'stress', -3);
  }

  /**
   * ATTEND_COURT
   * [+] prestige (both), loyalty_to_liege
   * [-] isolation_drive
   */
  private action_ATTEND_COURT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prestige', 3);
    delta(actor, 'loyalty_to_liege', 5);
    delta(actor, 'isolation_drive', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'prestige', 2);
  }

  /**
   * ARRANGE_MARRIAGE_FOR_ALLIANCE
   * [+] marriages_arranged, alliance_strength
   * [-] succession_anxiety
   */
  private action_ARRANGE_MARRIAGE_FOR_ALLIANCE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'marriages_arranged', 1);
    delta(actor, 'succession_anxiety', -8);
  }

  /**
   * LEAD_CAMPAIGN_IN_PLAYER_NAME
   * [WIN] [+] prestige, martial_confidence, player.war_score
   * [LOSE] [-] prestige, martial_confidence
   * [-] fatigue, personal_army_size
   */
  private action_LEAD_CAMPAIGN_IN_PLAYER_NAME(actor: any, target: any, p: NPCSimulationActionPayload) {
    const casualties = p.magnitude ?? 100;
    delta(actor, 'fatigue', 15);
    decrement(actor, 'personal_army_size', casualties);
    if (p.outcome === 'WIN') {
      delta(actor, 'prestige', 10);
      delta(actor, 'martial_confidence', 10);
      const liege = target ?? this.getLiegeOf(actor);
      if (liege) delta(liege, 'war_score', 10);
    } else if (p.outcome === 'LOSE') {
      delta(actor, 'prestige', -8);
      delta(actor, 'martial_confidence', -8);
    }
  }

  /**
   * IMPROVE_PROVINCE
   * [+] province.wealth, popularity
   * [-] gold
   */
  private action_IMPROVE_PROVINCE(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 300);
    delta(actor, 'popularity', 10);
    this.modifyProvinceState(actor.province_id, 'infrastructure_integrity', 15);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -5);
    // Peasant cohorts in province feel improved conditions
    for (const cohort of this.getSameProvinceCharacters(actor, 'PEASANT_COHORT')) {
      delta(cohort as any, 'hope', 8);
      delta(cohort as any, 'hunger', -3);
    }
  }

  /**
   * RECRUIT_PERSONAL_ARMY
   * [+] personal_army_size, independence_drive, player.suspicion
   * [-] gold, province.cohort_size
   */
  private action_RECRUIT_PERSONAL_ARMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const recruited = p.magnitude ?? 200;
    increment(actor, 'personal_army_size', recruited);
    delta(actor, 'independence_drive', 5);
    decrement(actor, 'gold', recruited * 2);
    this.modifyProvinceState(actor.province_id, 'cohort_size', -Math.floor(recruited * 0.5));
    // Liege becomes suspicious
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'paranoia', 5);
  }

  /**
   * ARRANGE_PRIVATE_MARRIAGE
   * [+] marriages_arranged, independence
   * [-] player.opinion (if unsanctioned)
   */
  private action_ARRANGE_PRIVATE_MARRIAGE(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'marriages_arranged', 1);
    delta(actor, 'succession_anxiety', -10);
    delta(actor, 'independence', 5);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'trust_of_vassal', -8); // Unsanctioned
  }

  /**
   * BRIBE_PLAYER_ADVISOR
   * [+] advisor.faction_loyalty, plots_active
   * [-] gold, honor
   */
  private action_BRIBE_PLAYER_ADVISOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    const bribeAmount = p.magnitude ?? 200;
    decrement(actor, 'gold', bribeAmount);
    delta(actor, 'honor', -5);
    increment(actor, 'plots_active', 1);
    if (target) {
      delta(target, 'faction_loyalty', 15);
      delta(target, 'corruption', 8);
    }
  }

  /**
   * INVESTIGATE_NEIGHBOR_VASSAL
   * [+] intel, paranoia
   * [-] neighbor.opinion
   */
  private action_INVESTIGATE_NEIGHBOR_VASSAL(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', 5);
    increment(actor, 'intel', 10);
    if (target) delta(target, 'opinion', -5);
  }

  /**
   * PETITION_LIEGE
   * [+] expectation (awaits response)
   * [-] patience
   */
  private action_PETITION_LIEGE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'patience', -8);
    setTo(actor, 'petition_pending', true);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'stress', 3);
  }

  /**
   * ENGAGE_IN_TRADE
   * [+] gold, merchant_sympathy
   * [-] martial_focus
   */
  private action_ENGAGE_IN_TRADE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 150);
    delta(actor, 'martial_confidence', -3);
  }

  /**
   * MANAGE_OWN_COURT
   * [+] popularity, province.stability
   * [-] restlessness
   */
  private action_MANAGE_OWN_COURT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'popularity', 5);
    delta(actor, 'restlessness', -5);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -3);
  }

  /**
   * SPREAD_RUMOR
   * [+] target.discontent, plots_active
   * [-] honor
   */
  private action_SPREAD_RUMOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'honor', -5);
    increment(actor, 'plots_active', 1);
    if (target) {
      delta(target, 'discontent', 10);
      delta(target, 'prestige', -5);
    }
  }

  /**
   * STOCKPILE_FOOD (Vassal)
   * [+] province.food_stockpile, survival_odds
   * [-] gold, market.food
   */
  private action_STOCKPILE_FOOD_VASSAL(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 200);
    this.modifyProvinceState(actor.province_id, 'food_stockpile', 1000);
  }

  /**
   * BUILD_PRIVATE_ALLIANCE
   * [+] faction_pull, independence_drive
   * [-] loyalty_to_liege
   */
  private action_BUILD_PRIVATE_ALLIANCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'faction_pull', 8);
    delta(actor, 'independence_drive', 5);
    delta(actor, 'loyalty_to_liege', -5);
    increment(actor, 'plots_active', 1);
  }

  /**
   * DELAY_TAX_PAYMENT
   * [+] gold (retained), player.treasury_deficit
   * [-] loyalty_to_liege, player.opinion
   */
  private action_DELAY_TAX_PAYMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    const retainedGold = p.magnitude ?? 200;
    increment(actor, 'gold', retainedGold);
    delta(actor, 'loyalty_to_liege', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      decrement(liege, 'gold', retainedGold);
      delta(liege, 'trust_of_vassal', -5);
    }
  }

  /**
   * DRAG_FEET_ON_LEVY
   * [+] personal_army_size (retained)
   * [-] player.army_size, loyalty_to_liege
   */
  private action_DRAG_FEET_ON_LEVY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const retained = p.magnitude ?? 100;
    increment(actor, 'personal_army_size', retained);
    delta(actor, 'loyalty_to_liege', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) decrement(liege, 'army_size', retained);
  }

  /**
   * REFUSE_CAMPAIGN
   * [+] discontent, independence_drive
   * [-] loyalty_to_liege, honor
   */
  private action_REFUSE_CAMPAIGN(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'discontent', 5);
    delta(actor, 'independence_drive', 8);
    delta(actor, 'loyalty_to_liege', -10);
    delta(actor, 'honor', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'trust_of_vassal', -10);
  }

  /**
   * RECRUIT_FACTION
   * [+] faction_members_recruited, faction_pull
   * [-] loyalty_to_liege, fear (crosses Rubicon)
   */
  private action_RECRUIT_FACTION(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'faction_members_recruited', 1);
    delta(actor, 'faction_pull', 10);
    delta(actor, 'loyalty_to_liege', -8);
    delta(actor, 'fear', 5); // High stakes
    increment(actor, 'plots_active', 1);
    this.gameLoop.eventBus?.publish('FACTION_RECRUITMENT', { actorId: actor.id });
  }

  /**
   * FUND_OPPOSITION
   * [+] rival_claimant.gold, plots_active
   * [-] gold, loyalty_to_liege
   */
  private action_FUND_OPPOSITION(actor: any, target: any, p: NPCSimulationActionPayload) {
    const fundAmount = p.magnitude ?? 300;
    decrement(actor, 'gold', fundAmount);
    delta(actor, 'loyalty_to_liege', -10);
    increment(actor, 'plots_active', 1);
    if (target) increment(target, 'gold', fundAmount);
  }

  /**
   * SEEK_FOREIGN_BACKING
   * [+] foreign.intel, treason_flags
   * [-] loyalty_to_liege
   */
  private action_SEEK_FOREIGN_BACKING(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'loyalty_to_liege', -15);
    increment(actor, 'treason_flags', 1);
    if (target) increment(target, 'intel', 10);
    this.gameLoop.eventBus?.publish('VASSAL_SEEKS_FOREIGN_BACKING', { actorId: actor.id, targetId: target?.id });
  }

  /**
   * DEMAND_CONCESSIONS
   * [+] player.stress, independence_drive
   * [-] patience
   */
  private action_DEMAND_CONCESSIONS(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'independence_drive', 5);
    delta(actor, 'patience', -8);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'stress', 8);
  }

  /**
   * FORGE_CLAIM
   * [+] plots_active, ambition
   * [-] gold, honor
   */
  private action_FORGE_CLAIM(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 200);
    delta(actor, 'ambition', 8);
    delta(actor, 'honor', -10);
    increment(actor, 'plots_active', 1);
  }

  /**
   * DECLARE_INDEPENDENCE
   * [+] active_wars, independence_drive
   * [-] loyalty_to_liege (to 0), fear
   */
  private action_DECLARE_INDEPENDENCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    setTo(actor, 'loyalty_to_liege', 0);
    delta(actor, 'independence_drive', 20);
    delta(actor, 'fear', 10); // Existential gamble
    increment(actor, 'wars_fought', 1);
    setTo(actor, 'faction_role', 'REBEL_LEADER');
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      delta(liege, 'trust_of_vassal', -30);
      delta(liege, 'stress', 20);
    }
    this.alert(`${actor.firstName ?? 'A vassal'} has declared independence! Civil war breaks out!`, 'CRITICAL');
    this.chronicle(`${actor.firstName ?? 'A lord'} raises their banner in open rebellion against the realm.`);
  }

  /**
   * SEIZE_PROVINCE
   * [+] provinces_held, greed
   * [-] honor, player.opinion
   */
  private action_SEIZE_PROVINCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'provinces_held', 1);
    delta(actor, 'greed', 5);
    delta(actor, 'honor', -10);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'trust_of_vassal', -15);
  }

  /**
   * ASSASSINATE_PLAYER_ADVISOR
   * [+] plots_active, cruelty
   * [-] honor, player.advisor_count
   */
  private action_ASSASSINATE_PLAYER_ADVISOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'cruelty', 10);
    delta(actor, 'honor', -15);
    increment(actor, 'plots_active', 1);
    if (target) {
      setTo(target, 'isAlive', false);
      this.alert(`${target.firstName ?? 'An advisor'} has been assassinated!`, 'CRITICAL');
      this.chronicle(`${target.firstName ?? 'An advisor'} dies in suspicious circumstances.`);
    }
  }

  /**
   * POISON_PLAYER
   * [WIN] Triggers succession crisis
   * [-] honor, fear (extreme risk)
   */
  private action_POISON_PLAYER(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'honor', -25);
    delta(actor, 'fear', 20); // Extreme personal risk
    if (p.outcome === 'WIN' && target) {
      setTo(target, 'health', 0);
      setTo(target, 'isAlive', false);
      this.gameLoop.eventBus?.publish('PLAYER_POISONED', { actorId: actor.id, targetId: target.id });
      this.alert(`THE PLAYER HAS BEEN POISONED! A succession crisis erupts!`, 'CRITICAL');
    }
  }

  /**
   * INVITE_FOREIGN_INVASION
   * [+] foreign.invasion_causebelli
   * [-] loyalty_to_liege, honor
   */
  private action_INVITE_FOREIGN_INVASION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'loyalty_to_liege', -20);
    delta(actor, 'honor', -15);
    increment(actor, 'treason_flags', 1);
    if (target) delta(target, 'expansionism', 10);
    this.gameLoop.eventBus?.publish('FOREIGN_INVASION_INVITED', { actorId: actor.id, invitedRulerId: target?.id });
  }

  /**
   * BETRAY_MILITARY_ORDERS
   * [+] enemy.war_score
   * [-] loyalty_to_liege, troop_bond
   */
  private action_BETRAY_MILITARY_ORDERS(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'loyalty_to_liege', -20);
    delta(actor, 'honor', -15);
    increment(actor, 'treason_flags', 1);
    if (target) delta(target, 'war_score', 15);
    this.gameLoop.eventBus?.publish('MILITARY_BETRAYAL', { actorId: actor.id });
  }

  /**
   * ACCEPT_PARDON
   * [+] loyalty_to_liege
   * [-] grudge_weight, discontent
   */
  private action_ACCEPT_PARDON(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'loyalty_to_liege', 15);
    delta(actor, 'grudge_weight', -15);
    delta(actor, 'discontent', -10);
    setTo(actor, 'faction_role', 'NONE');
    decrement(actor, 'treason_flags', 1);
    this.chronicle(`${actor.firstName ?? 'A rebel'} accepts the liege's pardon and returns to loyalty.`);
  }

  /**
   * SUBMIT_UNDER_TERMS
   * [+] peace
   * [-] independence_drive, faction_role (to NONE)
   */
  private action_SUBMIT_UNDER_TERMS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'independence_drive', -20);
    setTo(actor, 'faction_role', 'NONE');
    delta(actor, 'pride', -10);
    this.gameLoop.eventBus?.publish('VASSAL_SUBMITS', { actorId: actor.id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Chancellor (14)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * NEGOTIATE_TREATY
   * [+] player.diplomatic_standing, diplomatic_pride
   * [-] hostility_to_war
   */
  private action_NEGOTIATE_TREATY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'diplomatic_pride', 8);
    delta(actor, 'hostility_to_war', -5);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'diplomatic_standing', 10);
    if (target) delta(target, 'diplomatic_openness', 5);
  }

  /**
   * FABRICATE_CLAIM
   * [+] player.casus_belli
   * [-] truth_flexibility, target.opinion
   */
  private action_FABRICATE_CLAIM(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'truth_flexibility', -5);
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'casus_belli_count', 1);
    if (target) delta(target, 'respect_for_player', -10);
  }

  /**
   * ARRANGE_MARRIAGE_DEAL
   * [+] alliance_strength
   * [-] royal_family_available
   */
  private action_ARRANGE_MARRIAGE_DEAL(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'diplomatic_pride', 5);
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'active_alliances', 1);
  }

  /**
   * PLANT_PROPAGANDA
   * [+] player.prestige, province.loyalty
   * [-] gold
   */
  private action_PLANT_PROPAGANDA(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 200);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'prestige', 5);
    this.modifyProvinceState(actor.province_id, 'loyalty', 8);
  }

  /**
   * EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY
   * [+] player.security
   * [-] target.diplomatic_standing
   */
  private action_EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'security', 8);
    if (target) delta(target, 'diplomatic_standing', -10);
  }

  /**
   * REQUEST_AUDIENCE_WITH_FOREIGN_RULER
   * [+] foreign.diplomatic_openness
   * [-] time
   */
  private action_REQUEST_AUDIENCE_WITH_FOREIGN_RULER(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'stress', 3);
    if (target) delta(target, 'diplomatic_openness', 5);
  }

  /**
   * BRIBE_FOREIGN_AMBASSADOR
   * [+] intel, foreign.corruption
   * [-] gold
   */
  private action_BRIBE_FOREIGN_AMBASSADOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 300);
    increment(actor, 'intel', 10);
    if (target) delta(target, 'corruption', 8);
  }

  /**
   * DRAFT_PEACE_TERMS
   * [+] peace_probability
   * [-] player.war_weariness
   */
  private action_DRAFT_PEACE_TERMS(actor: any, p: NPCSimulationActionPayload) {
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'war_weariness', -5);
    this.gameLoop.eventBus?.publish('PEACE_TERMS_DRAFTED', { actorId: actor.id });
  }

  /**
   * DRAFT_WAR_JUSTIFICATION
   * [+] legal_obsession (satiated), player.casus_belli
   * [-] target.respect
   */
  private action_DRAFT_WAR_JUSTIFICATION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'legal_obsession', -5); // Itch scratched
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'casus_belli_count', 1);
    if (target) delta(target, 'respect_for_player', -5);
  }

  /**
   * MANAGE_HOSTAGE_SITUATION
   * [+] player.leverage
   * [-] stress
   */
  private action_MANAGE_HOSTAGE_SITUATION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'stress', 8);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'leverage', 10);
  }

  /**
   * NEGOTIATE_TRADE_TREATY
   * [+] merchant.market_confidence, trade_income
   * [-] isolation_drive
   */
  private action_NEGOTIATE_TRADE_TREATY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'isolation_drive', -5);
    for (const merchant of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(merchant as any, 'market_confidence', 5);
    }
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'trade_income', 100);
  }

  /**
   * CRAFT_ALLIANCE_TERMS
   * [+] alliance_pool
   * [-] diplomatic_pride (expended effort)
   */
  private action_CRAFT_ALLIANCE_TERMS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'diplomatic_pride', -3);
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'alliance_pool', 1);
  }

  /**
   * SPREAD_DISINFORMATION_ABROAD
   * [+] foreign.paranoia
   * [-] truth_flexibility
   */
  private action_SPREAD_DISINFORMATION_ABROAD(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'truth_flexibility', -5);
    if (target) delta(target, 'paranoia', 10);
  }

  /**
   * QUIETLY_SANCTION_FOREIGN_SPY
   * [+] faction_loyalty
   * [-] loyalty_to_player, discretion
   */
  private action_QUIETLY_SANCTION_FOREIGN_SPY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'faction_loyalty', 10);
    delta(actor, 'loyalty_to_player', -8);
    delta(actor, 'discretion', -5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Marshal (14)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * TRAIN_ARMY
   * [+] player.army_quality, troop_bond
   * [-] fatigue, player.gold
   */
  private action_TRAIN_ARMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'troop_bond', 10);
    delta(actor, 'fatigue', 8);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      delta(liege, 'army_quality', 5);
      decrement(liege, 'gold', p.magnitude ?? 200);
    }
  }

  /**
   * ADVISE_ON_BATTLE_PLAN
   * [+] tactical_creativity
   * [-] stress
   */
  private action_ADVISE_ON_BATTLE_PLAN(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'tactical_creativity', 5);
    delta(actor, 'stress', 5);
  }

  /**
   * COMMAND_ARMY_IN_FIELD
   * [WIN] [+] glory_hunger (sated)
   * [-] fatigue, army_size (casualties)
   */
  private action_COMMAND_ARMY_IN_FIELD(actor: any, p: NPCSimulationActionPayload) {
    const casualties = p.magnitude ?? 100;
    delta(actor, 'fatigue', 15);
    const liege = this.getLiegeOf(actor);
    if (liege) decrement(liege, 'army_size', casualties);
    if (p.outcome === 'WIN') delta(actor, 'glory_hunger', -15); // Sated
    else delta(actor, 'glory_hunger', 5);
  }

  /**
   * CONSCRIPT_LEVY
   * [+] player.army_size
   * [-] province.cohort_size, province.fatigue, province.unrest
   */
  private action_CONSCRIPT_LEVY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const levySize = p.magnitude ?? 300;
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'army_size', levySize);
    this.modifyProvinceState(actor.province_id, 'cohort_size', -levySize);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 8);
    // Peasants in province become fatigued
    for (const cohort of this.getSameProvinceCharacters(actor, 'PEASANT_COHORT')) {
      delta(cohort as any, 'fatigue', 10);
      delta(cohort as any, 'unrest', 5);
    }
  }

  /**
   * COMMISSION_SIEGE_EQUIPMENT
   * [+] siege_efficiency
   * [-] player.gold
   */
  private action_COMMISSION_SIEGE_EQUIPMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'siege_efficiency', 10);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) decrement(liege, 'gold', p.magnitude ?? 400);
  }

  /**
   * ORGANIZE_DEFENSIVE_LINE
   * [+] fortress_mindset, local.defense
   * [-] mobility
   */
  private action_ORGANIZE_DEFENSIVE_LINE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'fortress_mindset', 8);
    delta(actor, 'mobility', -5);
    this.modifyProvinceState(actor.province_id, 'defensibility', 10);
  }

  /**
   * MISINTERPRET_ORDERS
   * [+] insubordination_risk
   * [-] obedience, player.battle_success
   */
  private action_MISINTERPRET_ORDERS(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'obedience', -8);
    delta(actor, 'insubordination_risk', 10);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'battle_success', -5);
  }

  /**
   * DEMAND_MORE_TROOPS_BEFORE_ADVANCING
   * [+] strategic_patience
   * [-] player.momentum
   */
  private action_DEMAND_MORE_TROOPS_BEFORE_ADVANCING(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'strategic_patience', 8);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'momentum', -10);
  }

  /**
   * CLAIM_BATTLE_CREDIT
   * [+] vanity, prestige
   * [-] player_opinion_of_marshal, rival.envy
   */
  private action_CLAIM_BATTLE_CREDIT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'vanity', 8);
    delta(actor, 'prestige', 5);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'trust_of_advisor', -5);
    if (target) delta(target, 'envy', 10); // Rival marshal
  }

  /**
   * PRIVATELY_RECRUIT_LOYAL_TROOPS
   * [+] personal_army_size
   * [-] loyalty_to_player, player.gold (embezzled)
   */
  private action_PRIVATELY_RECRUIT_LOYAL_TROOPS(actor: any, target: any, p: NPCSimulationActionPayload) {
    const recruited = p.magnitude ?? 100;
    increment(actor, 'personal_army_size', recruited);
    delta(actor, 'loyalty_to_player', -8);
    delta(actor, 'corruption', 5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) decrement(liege, 'gold', recruited * 2);
  }

  /**
   * NEGOTIATE_SURRENDER_TERMS
   * [+] survival
   * [-] glory_hunger, honor
   */
  private action_NEGOTIATE_SURRENDER_TERMS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'glory_hunger', -5);
    delta(actor, 'honor', -5);
    this.gameLoop.eventBus?.publish('SURRENDER_NEGOTIATED', { actorId: actor.id });
  }

  /**
   * RECOMMEND_TACTICAL_RETREAT
   * [+] army_preservation
   * [-] glory_hunger, morale
   */
  private action_RECOMMEND_TACTICAL_RETREAT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'glory_hunger', -5);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) delta(liege, 'morale', -5);
  }

  /**
   * PLAN_NIGHT_RAID
   * [+] tactical_creativity
   * [-] risk_tolerance
   */
  private action_PLAN_NIGHT_RAID(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'tactical_creativity', 8);
    delta(actor, 'risk_tolerance', -5);
  }

  /**
   * SABOTAGE_RIVAL_GENERAL
   * [+] envy (satiated)
   * [-] honor, rival.success_chance
   */
  private action_SABOTAGE_RIVAL_GENERAL(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'envy', -10); // Satiated
    delta(actor, 'honor', -8);
    if (target) delta(target, 'martial_confidence', -10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Spymaster (16)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * WATCH_COURT
   * [+] network_confidence, intel
   * [-] target.privacy
   */
  private action_WATCH_COURT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'network_confidence', 5);
    increment(actor, 'intel', 10);
    if (target) delta(target, 'privacy', -5);
  }

  /**
   * INFILTRATE_FOREIGN_COURT
   * [+] foreign.paranoia, intel
   * [-] network_investment (gold)
   */
  private action_INFILTRATE_FOREIGN_COURT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'intel', 15);
    decrement(actor, 'gold', p.magnitude ?? 300);
    if (target) delta(target, 'paranoia', 8);
  }

  /**
   * RECRUIT_AGENT
   * [+] network_size
   * [-] gold
   */
  private action_RECRUIT_AGENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'network_size', 1);
    decrement(actor, 'gold', p.magnitude ?? 150);
    if (target) delta(target, 'corruption', 5); // Turned agent
  }

  /**
   * ASSIGN_ASSASSINATION
   * [+] ruthlessness, target.mortality
   * [-] exposure_fear, target.health
   */
  private action_ASSIGN_ASSASSINATION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'ruthlessness', 10);
    delta(actor, 'exposure_fear', 8);
    if (target) delta(target, 'health', -20);
    // Registered as a plot in IntelligenceSystem
    this.gameLoop.eventBus?.publish('ASSASSINATION_ASSIGNED', { actorId: actor.id, targetId: target?.id });
  }

  /**
   * FRAME_CHARACTER
   * [+] plots_active
   * [-] truth_flexibility, honor
   */
  private action_FRAME_CHARACTER(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'plots_active', 1);
    delta(actor, 'truth_flexibility', -5);
    delta(actor, 'honor', -5);
    if (target) {
      delta(target, 'prestige', -15);
      delta(target, 'discontent', 10);
    }
  }

  /**
   * EXPOSE_PLOT
   * [+] player.security
   * [-] paranoia_professional
   */
  private action_EXPOSE_PLOT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia_professional', -8);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'security', 10);
    this.gameLoop.eventBus?.publish('PLOT_EXPOSED_BY_SPY', { actorId: actor.id, targetId: target?.id });
  }

  /**
   * FABRICATE_EVIDENCE
   * [+] blackmail_material
   * [-] honor
   */
  private action_FABRICATE_EVIDENCE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'blackmail_material', 1);
    delta(actor, 'honor', -8);
  }

  /**
   * BURN_NETWORK
   * [+] security (prevents capture)
   * [-] network_confidence, intel_capacity
   */
  private action_BURN_NETWORK(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'network_confidence', -20);
    delta(actor, 'intel', -15);
    delta(actor, 'network_size', -5);
  }

  /**
   * TURN_ENEMY_AGENT
   * [+] asset_loyalty_trust
   * [-] enemy_intel
   */
  private action_TURN_ENEMY_AGENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'turned_agents', 1);
    delta(actor, 'network_confidence', 5);
    if (target) {
      setTo(target, 'is_double_agent', true);
      delta(target, 'loyalty_to_employer', -30);
    }
  }

  /**
   * PLANT_DOUBLE_AGENT
   * [+] double_life_risk, intel
   * [-] enemy_security
   */
  private action_PLANT_DOUBLE_AGENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'intel', 15);
    increment(actor, 'planted_agents', 1);
    decrement(actor, 'gold', p.magnitude ?? 200);
  }

  /**
   * COVERTLY_MONITOR_PLAYER_ADVISOR
   * [+] paranoia_professional
   * [-] trust
   */
  private action_COVERTLY_MONITOR_PLAYER_ADVISOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia_professional', 5);
    if (target) delta(target, 'privacy', -8);
  }

  /**
   * BLACKMAIL_VASSAL
   * [+] blackmail_material, leverage
   * [-] vassal.loyalty
   */
  private action_BLACKMAIL_VASSAL(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'blackmail_material', 1);
    delta(actor, 'leverage', 10);
    if (target) {
      delta(target, 'loyalty_to_liege', -15);
      delta(target, 'fear', 10);
      delta(target, 'corruption_tolerance', 5); // Complies through fear
    }
  }

  /**
   * INTERCEPT_COURIER
   * [+] intel
   * [-] target.diplomacy
   */
  private action_INTERCEPT_COURIER(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'intel', 10);
    if (target) delta(target, 'diplomatic_standing', -5);
  }

  /**
   * LEAK_INTEL_TO_ENEMY
   * [+] enemy.intel, faction_loyalty
   * [-] loyalty_to_player
   */
  private action_LEAK_INTEL_TO_ENEMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'faction_loyalty', 10);
    delta(actor, 'loyalty_to_player', -15);
    if (target) increment(target, 'intel', 15);
  }

  /**
   * MAP_ENEMY_SUPPLY_LINES
   * [+] player.tactical_advantage
   * [-] time, agents_at_risk
   */
  private action_MAP_ENEMY_SUPPLY_LINES(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'intel', 10);
    delta(actor, 'stress', 5);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'tactical_advantage', 10);
  }

  /**
   * PRODUCE_FORGED_DOCUMENT
   * [+] leverage
   * [-] truth_flexibility
   */
  private action_PRODUCE_FORGED_DOCUMENT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'leverage', 8);
    delta(actor, 'truth_flexibility', -5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Treasurer (12)
  // Drawn from simulation.md Treasurer section
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * COLLECT_TAXES
   * [+] player.gold, record_keeping_pride
   * [-] province.peasant.happiness
   */
  private action_COLLECT_TAXES(actor: any, target: any, p: NPCSimulationActionPayload) {
    const taxAmount = p.magnitude ?? 400;
    delta(actor, 'record_keeping_pride', 3);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'gold', taxAmount);
    // Peasants feel the burden
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'season_debts', 5);
      delta(cohort as any, 'unrest', 2);
    }
  }

  /**
   * ADVISE_ON_INVESTMENT
   * [+] deal_addiction (satiated), player.future_income
   * [-] risk_tolerance
   */
  private action_ADVISE_ON_INVESTMENT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'deal_addiction', -5); // Satisfied
    delta(actor, 'risk_tolerance', -3);
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'trade_income', 50);
  }

  /**
   * AUDIT_ACCOUNTS
   * [+] record_keeping_pride, player.gold (recovered)
   * [-] corruption_tolerance
   */
  private action_AUDIT_ACCOUNTS(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'record_keeping_pride', 8);
    delta(actor, 'corruption_tolerance', -10);
    const recovered = p.magnitude ?? 200;
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'gold', recovered);
  }

  /**
   * NEGOTIATE_LOAN
   * [+] player.gold, debt_aversion (sated through action)
   * [-] player.future_income
   */
  private action_NEGOTIATE_LOAN(actor: any, target: any, p: NPCSimulationActionPayload) {
    const loanAmount = p.magnitude ?? 500;
    const liege = this.getLiegeOf(actor);
    if (liege) {
      increment(liege, 'gold', loanAmount);
      increment(liege, 'debts_owed', loanAmount);
    }
    delta(actor, 'debt_aversion', -5);
  }

  /**
   * OVERSEE_MINT
   * [+] coin_purity, inflation_anxiety
   * [-] inflation_rate
   */
  private action_OVERSEE_MINT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'coin_purity', 5);
    delta(actor, 'inflation_anxiety', -3);
    (this.gameLoop as any).globalInflationRate = Math.max(1.0,
      ((this.gameLoop as any).globalInflationRate ?? 1.0) - 0.02
    );
  }

  /**
   * DRAFT_TRADE_AGREEMENT
   * [+] market_confidence, deal_addiction (satiated)
   * [-] isolation_drive
   */
  private action_DRAFT_TRADE_AGREEMENT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'deal_addiction', -8);
    for (const m of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(m as any, 'market_confidence', 5);
    }
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'isolation_drive', -3);
  }

  /**
   * PROPOSE_BUDGET_CUT
   * [+] player.gold (savings)
   * [-] province.fatigue (reduced labor support)
   */
  private action_PROPOSE_BUDGET_CUT(actor: any, target: any, p: NPCSimulationActionPayload) {
    const saved = p.magnitude ?? 200;
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) increment(liege, 'gold', saved);
    // Cohorts feel less support
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'fatigue', 3);
    }
  }

  /**
   * EMBEZZLE_FROM_TREASURY
   * [+] gold (personal), embezzlement_temptation
   * [-] player.gold, loyalty_to_player
   */
  private action_EMBEZZLE_FROM_TREASURY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const stolen = p.magnitude ?? 300;
    increment(actor, 'gold', stolen);
    delta(actor, 'embezzlement_temptation', 8);
    delta(actor, 'corruption', 10);
    delta(actor, 'loyalty_to_player', -10);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) decrement(liege, 'gold', stolen);
  }

  /**
   * FALSIFY_TREASURY_REPORTS
   * [+] embezzlement_temptation (hidden gains persist)
   * [-] record_keeping_pride, honesty
   */
  private action_FALSIFY_TREASURY_REPORTS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'embezzlement_temptation', 5);
    delta(actor, 'record_keeping_pride', -10);
    delta(actor, 'corruption', 8);
  }

  /**
   * INVEST_IN_TRADE_ROUTE
   * [+] market_intuition, future_income
   * [-] current_gold, risk_tolerance
   */
  private action_INVEST_IN_TRADE_ROUTE(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 400);
    delta(actor, 'market_confidence', 5);
    delta(actor, 'risk_tolerance', -3);
  }

  /**
   * CALL_IN_DEBTS
   * [+] player.gold
   * [-] vassal/merchant.gold, popularity
   */
  private action_CALL_IN_DEBTS(actor: any, target: any, p: NPCSimulationActionPayload) {
    const debtAmount = p.magnitude ?? 300;
    const liege = this.getLiegeOf(actor);
    if (liege) increment(liege, 'gold', debtAmount);
    if (target) {
      decrement(target, 'gold', debtAmount);
      delta(target, 'loyalty_to_realm', -5);
    }
  }

  /**
   * PROPOSE_TAX_RELIEF
   * [+] province.loyalty, peasant.hope
   * [-] player.gold (short term)
   */
  private action_PROPOSE_TAX_RELIEF(actor: any, target: any, p: NPCSimulationActionPayload) {
    const relief = p.magnitude ?? 200;
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) decrement(liege, 'gold', relief);
    this.modifyProvinceState(actor.province_id, 'loyalty', 8);
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'hope', 8);
      delta(cohort as any, 'season_debts', -5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 3 ACTION HANDLERS: Court Priest (11)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PREACH_IN_PROVINCE
   * [+] province.piety
   * [-] province.unrest, empathy_for_poor
   */
  private action_PREACH_IN_PROVINCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'empathy_for_poor', -2);
    this.modifyProvinceState(actor.province_id, 'ambient_piety', 10);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -8);
  }

  /**
   * WARN_OF_EXCOMMUNICATION
   * [+] target.fear, target.piety (forced)
   * [-] target.loyalty_to_church
   */
  private action_WARN_OF_EXCOMMUNICATION(actor: any, target: any, p: NPCSimulationActionPayload) {
    if (target) {
      delta(target, 'fear', 15);
      delta(target, 'piety', 5); // Forced compliance
      delta(target, 'loyalty_to_church', -8);
    }
  }

  /**
   * NEGOTIATE_WITH_HIGH_PRIEST
   * [+] church_relations
   * [-] political_ambition
   */
  private action_NEGOTIATE_WITH_HIGH_PRIEST(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'church_relations', 10);
    delta(actor, 'political_ambition', -5);
    const liege = this.getLiegeOf(actor);
    if (liege) delta(liege, 'piety', 3);
  }

  /**
   * DEMAND_CHURCH_TAX_EXEMPTION
   * [+] church_loyalty_vs_player
   * [-] player.tax_income, treasurer.opinion
   */
  private action_DEMAND_CHURCH_TAX_EXEMPTION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'church_loyalty_vs_player', 10);
    const liege = this.getLiegeOf(actor);
    if (liege) decrement(liege, 'tax_income', p.magnitude ?? 200);
    const treasurer = this.getAdvisorOfRole(actor, 'TREASURER');
    if (treasurer) delta(treasurer, 'opinion', -5);
  }

  /**
   * CALL_FOR_CRUSADE_PARTICIPATION
   * [+] crusade_enthusiasm
   * [-] player.army_size, isolation_drive
   */
  private action_CALL_FOR_CRUSADE_PARTICIPATION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'crusade_enthusiasm', 10);
    delta(actor, 'isolation_drive', -5);
    this.gameLoop.eventBus?.publish('CRUSADE_CALLED', { actorId: actor.id });
    this.alert(`${actor.firstName ?? 'The Court Priest'} calls for Crusade! The faithful prepare for holy war.`, 'URGENT');
  }

  /**
   * CONDUCT_INQUISITION
   * [+] inquisition_drive, heresy_sensitivity, province.fear
   * [-] province.unrest (suppression), known_heresies
   */
  private action_CONDUCT_INQUISITION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'inquisition_drive', 10);
    delta(actor, 'heresy_sensitivity', 5);
    this.modifyProvinceState(actor.province_id, 'fear', 20);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', -5); // Fear suppresses unrest
    // Reduce known heresies
    decrement(actor, 'known_heresies', 1);
    this.alert(`An Inquisition sweeps the province! Heretics are rooted out and fear grips the populace.`, 'URGENT');
  }

  /**
   * GRANT_ABSOLUTION
   * [+] player.piety, player.prestige
   * [-] zealotry (compromised)
   */
  private action_GRANT_ABSOLUTION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'zealotry', -5);
    if (target) {
      delta(target, 'piety', 8);
      delta(target, 'prestige', 5);
      delta(target, 'stress', -5);
    }
  }

  /**
   * PERFORM_WEDDING
   * [+] player.prestige, alliance_strength
   * [-] time
   */
  private action_PERFORM_WEDDING(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'stress', 5);
    const liege = this.getLiegeOf(actor);
    if (liege) {
      delta(liege, 'prestige', 5);
      increment(liege, 'active_alliances', 1);
    }
    this.chronicle(`A grand wedding is performed, sealing an alliance.`);
  }

  /**
   * THREATEN_INTERDICT
   * [+] province.fear, liege.stress
   * [-] province.hope, liege.opinion
   */
  private action_THREATEN_INTERDICT(actor: any, target: any, p: NPCSimulationActionPayload) {
    this.modifyProvinceState(actor.province_id, 'fear', 15);
    this.modifyProvinceState(actor.province_id, 'hope', -12);
    const liege = target ?? this.getLiegeOf(actor);
    if (liege) {
      delta(liege, 'stress', 15);
      delta(liege, 'piety', -5);
    }
  }

  /**
   * COVERTLY_REPORT_TO_HIGH_PRIEST
   * [+] church_loyalty_vs_player
   * [-] loyalty_to_player, discretion
   */
  private action_COVERTLY_REPORT_TO_HIGH_PRIEST(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'church_loyalty_vs_player', 10);
    delta(actor, 'loyalty_to_player', -8);
    delta(actor, 'discretion', -5);
    this.gameLoop.eventBus?.publish('HIGH_PRIEST_INFORMED', { actorId: actor.id });
  }

  /**
   * RADICALIZE_CLERGY
   * [+] province.unrest, zealotry
   * [-] faith_in_order, empathy_for_poor
   */
  private action_RADICALIZE_CLERGY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'zealotry', 10);
    delta(actor, 'faith_in_order', -8);
    delta(actor, 'empathy_for_poor', -5);
    this.modifyProvinceState(actor.province_id, 'ambient_unrest', 15);
    this.alert(`The clergy is radicalized! Religious extremism sweeps the province.`, 'URGENT');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 4 ACTION HANDLERS: Foreign Ruler — Diplomatic (18)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PROPOSE_ALLIANCE
   * [+] active_alliances, target.respect_for_player
   * [-] isolation_drive
   */
  private action_PROPOSE_ALLIANCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'isolation_drive', -5);
    increment(actor, 'active_alliances', 1);
    if (target) delta(target, 'respect_for_player', 5);
  }

  /**
   * ACCEPT_ALLIANCE
   * [+] coalition_building
   * [-] fear, isolation_drive
   */
  private action_ACCEPT_ALLIANCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'coalition_building', 8);
    delta(actor, 'fear', -5);
    delta(actor, 'isolation_drive', -8);
  }

  /**
   * BREAK_ALLIANCE
   * [+] independence, paranoia
   * [-] honor, active_alliances
   */
  private action_BREAK_ALLIANCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', 8);
    delta(actor, 'honor', -10);
    decrement(actor, 'active_alliances', 1);
  }

  /**
   * PROPOSE_PEACE
   * [+] peace_probability
   * [-] war_weariness, pride
   */
  private action_PROPOSE_PEACE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'war_weariness', -5);
    delta(actor, 'pride', -3);
    this.gameLoop.eventBus?.publish('PEACE_PROPOSED', { actorId: actor.id });
  }

  /**
   * REJECT_PEACE
   * [+] stubbornness, war_weariness
   * [-] flexibility
   */
  private action_REJECT_PEACE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'stubbornness', 8);
    delta(actor, 'war_weariness', 5);
    delta(actor, 'flexibility', -5);
  }

  /**
   * DEMAND_TRIBUTE
   * [+] greed, aggression
   * [-] diplomatic_openness, target.respect
   */
  private action_DEMAND_TRIBUTE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'greed', 5);
    delta(actor, 'aggression', 5);
    delta(actor, 'diplomatic_openness', -5);
    if (target) delta(target, 'respect_for_player', -10);
  }

  /**
   * OFFER_TRIBUTE
   * [+] survival, peace
   * [-] pride, gold
   */
  private action_OFFER_TRIBUTE(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 300);
    delta(actor, 'pride', -10);
    delta(actor, 'war_weariness', -5);
    if (target) {
      increment(target, 'gold', p.magnitude ?? 300);
      increment(target, 'tribute_streams', 1);
    }
  }

  /**
   * PROPOSE_TRADE_TREATY
   * [+] mercantile_interest
   * [-] isolation_drive
   */
  private action_PROPOSE_TRADE_TREATY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'mercantile_interest', 8);
    delta(actor, 'isolation_drive', -5);
  }

  /**
   * PROPOSE_NON_AGGRESSION_PACT
   * [+] diplomatic_openness
   * [-] expansionism
   */
  private action_PROPOSE_NON_AGGRESSION_PACT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'diplomatic_openness', 8);
    delta(actor, 'expansionism', -5);
  }

  /**
   * ARRANGE_ROYAL_MARRIAGE
   * [+] marriages_arranged, alliances
   * [-] succession_anxiety
   */
  private action_ARRANGE_ROYAL_MARRIAGE(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'marriages_arranged', 1);
    increment(actor, 'active_alliances', 1);
    delta(actor, 'succession_anxiety', -10);
  }

  /**
   * OFFER_HOSTAGE
   * [+] trust
   * [-] pride, succession_anxiety
   */
  private action_OFFER_HOSTAGE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'pride', -5);
    delta(actor, 'succession_anxiety', 5); // Risk of heir being hostage
    if (target) delta(target, 'trust_of_foreign_ruler', 10);
  }

  /**
   * DEMAND_HOSTAGE
   * [+] leverage, paranoia
   * [-] target.respect
   */
  private action_DEMAND_HOSTAGE(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'leverage', 10);
    delta(actor, 'paranoia', -5); // Security gained
    if (target) delta(target, 'respect_for_player', -8);
  }

  /**
   * RECALL_AMBASSADOR
   * [+] isolation_drive, hostility
   * [-] diplomatic_openness
   */
  private action_RECALL_AMBASSADOR(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'isolation_drive', 8);
    delta(actor, 'diplomatic_openness', -10);
    delta(actor, 'aggression', 5);
    this.gameLoop.eventBus?.publish('AMBASSADOR_RECALLED', { actorId: actor.id });
  }

  /**
   * SEND_INSULT
   * [+] prestige_hunger (satiated), target.grudge
   * [-] target.respect
   */
  private action_SEND_INSULT(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prestige_hunger', -8); // Itch scratched
    if (target) {
      delta(target, 'grudge_against_player', 15);
      delta(target, 'respect_for_player', -15);
    }
    this.alert(`${actor.firstName ?? 'A foreign ruler'} sends a diplomatic insult! Relations deteriorate.`, 'URGENT');
  }

  /**
   * SEND_GIFT
   * [+] target.respect
   * [-] gold, greed
   */
  private action_SEND_GIFT(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 200);
    delta(actor, 'greed', -3);
    if (target) delta(target, 'respect_for_player', 10);
  }

  /**
   * MEDIATE_THIRD_PARTY_CONFLICT
   * [+] prestige, diplomatic_openness
   * [-] isolation_drive
   */
  private action_MEDIATE_THIRD_PARTY_CONFLICT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prestige', 5);
    delta(actor, 'diplomatic_openness', 5);
    delta(actor, 'isolation_drive', -5);
  }

  /**
   * FORM_COALITION_AGAINST_PLAYER
   * [+] coalition_building, active_alliances
   * [-] player.security
   */
  private action_FORM_COALITION_AGAINST_PLAYER(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'coalition_building', 10);
    increment(actor, 'active_alliances', 1);
    this.gameLoop.eventBus?.publish('COALITION_FORMED', { actorId: actor.id });
    this.alert(`A coalition is forming against the realm! Foreign rulers unite!`, 'CRITICAL');
  }

  /**
   * INVITE_PLAYER_INTO_COALITION
   * [+] player.alliances
   * [-] fear_of_player
   */
  private action_INVITE_PLAYER_INTO_COALITION(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'fear', -5);
    if (target) increment(target, 'active_alliances', 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 4 ACTION HANDLERS: Foreign Ruler — Military (14)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DECLARE_WAR
   * [+] active_wars, aggression, war_weariness (starts ticking)
   * [-] peace, isolation_drive
   */
  private action_DECLARE_WAR(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'active_wars', 1);
    delta(actor, 'aggression', 10);
    delta(actor, 'war_weariness', 5);
    delta(actor, 'isolation_drive', -5);
    this.gameLoop.eventBus?.publish('WAR_DECLARED', { actorId: actor.id, targetId: target?.id });
    this.alert(`${actor.firstName ?? 'A foreign ruler'} declares war! The realm is under threat.`, 'CRITICAL');
    this.chronicle(`The drums of war sound. ${actor.firstName ?? 'A foreign power'} has declared war.`);
  }

  /**
   * FABRICATE_CASUS_BELLI
   * [+] expansionism, cunning
   * [-] honor
   */
  private action_FABRICATE_CASUS_BELLI(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'expansionism', 5);
    delta(actor, 'cunning', 5);
    delta(actor, 'honor', -8);
    increment(actor, 'casus_belli_count', 1);
  }

  /**
   * MOBILIZE_ARMY
   * [+] total_army_strength (active)
   * [-] gold, economic_discipline
   */
  private action_MOBILIZE_ARMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    const mobilized = p.magnitude ?? 1000;
    increment(actor, 'total_army_strength', mobilized);
    decrement(actor, 'gold', mobilized * 0.5);
    delta(actor, 'economic_discipline', -5);
  }

  /**
   * DEMOBILIZE_ARMY
   * [+] economic_discipline
   * [-] total_army_strength, military_obsession
   */
  private action_DEMOBILIZE_ARMY(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'total_army_strength', p.magnitude ?? 500);
    delta(actor, 'economic_discipline', 8);
    delta(actor, 'military_obsession', -5);
  }

  /**
   * LAUNCH_INVASION
   * [+] expansionism
   * [-] total_army_strength (attrition starts)
   */
  private action_LAUNCH_INVASION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'expansionism', 10);
    decrement(actor, 'total_army_strength', p.magnitude ?? 200); // Initial attrition
    this.gameLoop.eventBus?.publish('INVASION_LAUNCHED', { actorId: actor.id });
    this.alert(`INVASION! Enemy forces cross the border!`, 'CRITICAL');
  }

  /**
   * RAID_BORDER_PROVINCE
   * [+] gold, aggression
   * [-] target.border_security, honor
   */
  private action_RAID_BORDER_PROVINCE(actor: any, target: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 400);
    delta(actor, 'aggression', 5);
    delta(actor, 'honor', -5);
    this.modifyProvinceState(actor.province_id, 'infrastructure_integrity', -15);
    this.modifyProvinceState(actor.province_id, 'trauma', 10);
  }

  /**
   * SIEGE_PLAYER_FORTRESS
   * [+] military_obsession
   * [-] army_size, patience
   */
  private action_SIEGE_PLAYER_FORTRESS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'military_obsession', 5);
    decrement(actor, 'total_army_strength', p.magnitude ?? 300);
    delta(actor, 'patience', -5);
  }

  /**
   * SEND_EXPEDITIONARY_FORCE
   * [+] prestige_hunger
   * [-] army_size (deployed)
   */
  private action_SEND_EXPEDITIONARY_FORCE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'prestige_hunger', -8);
    decrement(actor, 'total_army_strength', p.magnitude ?? 500);
  }

  /**
   * HIRE_MERCENARY_COMPANY
   * [+] total_army_strength
   * [-] gold
   */
  private action_HIRE_MERCENARY_COMPANY(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'total_army_strength', p.magnitude ?? 500);
    decrement(actor, 'gold', p.magnitude ? p.magnitude * 2 : 1000);
  }

  /**
   * FUND_PLAYER_REBEL
   * [+] player_unrest, rebel.gold
   * [-] gold, diplomatic_openness
   */
  private action_FUND_PLAYER_REBEL(actor: any, target: any, p: NPCSimulationActionPayload) {
    const fundAmount = p.magnitude ?? 400;
    decrement(actor, 'gold', fundAmount);
    delta(actor, 'diplomatic_openness', -5);
    if (target) increment(target, 'gold', fundAmount);
    // Increase unrest in player's provinces
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'unrest', 3);
    }
  }

  /**
   * ORDER_ASSASSINATION_OF_PLAYER
   * [WIN] Triggers crisis
   * [FAIL] [+] paranoia
   * [-] honor, gold
   */
  private action_ORDER_ASSASSINATION_OF_PLAYER(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 500);
    delta(actor, 'honor', -15);
    if (p.outcome === 'LOSE') {
      delta(actor, 'paranoia', 10); // Failed attempt backfires
    } else if (p.outcome === 'WIN' && target) {
      setTo(target, 'health', 0);
      this.gameLoop.eventBus?.publish('PLAYER_ASSASSINATED', { actorId: actor.id, targetId: target.id });
      this.alert(`ASSASSINATION ATTEMPT SUCCEEDED! The player is dead!`, 'CRITICAL');
    }
  }

  /**
   * BLOCKADE_PLAYER_COAST
   * [+] player.economic_stress
   * [-] fleet_upkeep
   */
  private action_BLOCKADE_PLAYER_COAST(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 300); // Fleet upkeep
    this.gameLoop.eventBus?.publish('COAST_BLOCKADED', { actorId: actor.id });
    for (const merchant of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(merchant as any, 'market_confidence', -8);
      delta(merchant as any, 'fear', 5);
    }
    this.alert(`The coast is blockaded! Trade and supply lines are severed.`, 'CRITICAL');
  }

  /**
   * STRATEGIC_WITHDRAWAL
   * [+] army_preservation
   * [-] pride, total_army_strength (desertion)
   */
  private action_STRATEGIC_WITHDRAWAL(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'pride', -5);
    decrement(actor, 'total_army_strength', p.magnitude ?? 100); // Desertion during retreat
  }

  /**
   * OFFER_MILITARY_AID_TO_PLAYER_ENEMY
   * [+] player_enemy.army_size
   * [-] player.respect
   */
  private action_OFFER_MILITARY_AID_TO_PLAYER_ENEMY(actor: any, target: any, p: NPCSimulationActionPayload) {
    if (target) increment(target, 'army_size', p.magnitude ?? 500);
    this.gameLoop.eventBus?.publish('MILITARY_AID_OFFERED', { actorId: actor.id, beneficiaryId: target?.id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 4 ACTION HANDLERS: Foreign Ruler — Economic (7)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * IMPOSE_TRADE_EMBARGO
   * [+] isolation_drive, player.economic_stress
   * [-] mercantile_interest, own.trade_income
   */
  private action_IMPOSE_TRADE_EMBARGO(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'isolation_drive', 8);
    delta(actor, 'mercantile_interest', -5);
    decrement(actor, 'trade_income', 200);
    for (const merchant of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(merchant as any, 'market_confidence', -8);
      delta(merchant as any, 'fear', 5);
    }
    this.alert(`A trade embargo has been imposed! Markets destabilize.`, 'URGENT');
  }

  /**
   * ESTABLISH_TRADE_ROUTE_WITH_PLAYER
   * [+] mercantile_interest, gold
   * [-] isolation_drive
   */
  private action_ESTABLISH_TRADE_ROUTE_WITH_PLAYER(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'mercantile_interest', 8);
    delta(actor, 'isolation_drive', -5);
    increment(actor, 'gold', p.magnitude ?? 300);
  }

  /**
   * FLOOD_MARKET
   * [+] player.inflation/market_crash
   * [-] own.warehoused_goods
   */
  private action_FLOOD_MARKET(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'warehoused_goods', p.magnitude ?? 1000);
    (this.gameLoop as any).globalInflationRate = ((this.gameLoop as any).globalInflationRate ?? 1.0) + 0.15;
    for (const merchant of this.getAllCharactersByType('MASTER_MERCHANT')) {
      delta(merchant as any, 'market_confidence', -15);
    }
    this.alert(`Foreign rulers flood the market! Inflation surges and merchant confidence collapses.`, 'CRITICAL');
  }

  /**
   * CORNER_IRON_MARKET
   * [+] military_obsession, player.recruitment_cost
   * [-] gold
   */
  private action_CORNER_IRON_MARKET(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'military_obsession', 5);
    decrement(actor, 'gold', p.magnitude ?? 800);
    this.gameLoop.eventBus?.publish('IRON_MARKET_CORNERED', { actorId: actor.id });
    this.alert(`The iron market has been cornered! Military recruitment costs skyrocket.`, 'URGENT');
  }

  /**
   * FUND_BANDIT_GROUPS_IN_PLAYER_TERRITORY
   * [+] player.unrest
   * [-] gold, honor
   */
  private action_FUND_BANDIT_GROUPS_IN_PLAYER_TERRITORY(actor: any, target: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 400);
    delta(actor, 'honor', -8);
    // Spawn or buff bandit activity
    for (const bandit of this.getAllCharactersByType('BANDIT_CHIEF')) {
      increment(bandit as any, 'gold', 200);
      delta(bandit as any, 'morale', 5);
    }
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'fear', 5);
      delta(cohort as any, 'unrest', 3);
    }
  }

  /**
   * INVEST_IN_OWN_INFRASTRUCTURE
   * [+] economic_discipline, provinces_wealth
   * [-] gold
   */
  private action_INVEST_IN_OWN_INFRASTRUCTURE(actor: any, p: NPCSimulationActionPayload) {
    decrement(actor, 'gold', p.magnitude ?? 600);
    delta(actor, 'economic_discipline', 8);
    increment(actor, 'provinces_wealth', 100);
  }

  /**
   * DEBASE_OWN_CURRENCY
   * [+] short_term_gold, inflation
   * [-] economic_discipline
   */
  private action_DEBASE_OWN_CURRENCY(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'gold', p.magnitude ?? 500);
    delta(actor, 'economic_discipline', -8);
    (this.gameLoop as any).globalInflationRate = ((this.gameLoop as any).globalInflationRate ?? 1.0) + 0.08;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 4 ACTION HANDLERS: Foreign Ruler — Intelligence (6)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PLANT_SPY_IN_PLAYER_COURT
   * [+] spy_networks_active, spy_investment
   * [-] gold
   */
  private action_PLANT_SPY_IN_PLAYER_COURT(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'spy_networks_active', 1);
    delta(actor, 'spy_investment', 8);
    decrement(actor, 'gold', p.magnitude ?? 400);
  }

  /**
   * ATTEMPT_TO_TURN_PLAYER_ADVISOR
   * [+] paranoia, leverage
   * [-] gold
   */
  private action_ATTEMPT_TO_TURN_PLAYER_ADVISOR(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', -5); // Gaining leverage reduces paranoia
    delta(actor, 'leverage', 8);
    decrement(actor, 'gold', p.magnitude ?? 500);
    if (target && p.outcome === 'WIN') {
      delta(target, 'faction_loyalty', 20); // Turned against own liege
      delta(target, 'loyalty_to_player', -20);
    }
  }

  /**
   * INTERCEPT_PLAYER_COURIER
   * [+] intel, cunning
   * [-] target.privacy
   */
  private action_INTERCEPT_PLAYER_COURIER(actor: any, p: NPCSimulationActionPayload) {
    increment(actor, 'intel', 10);
    delta(actor, 'cunning', 3);
  }

  /**
   * SPREAD_PROPAGANDA_IN_PLAYER_PROVINCES
   * [+] propaganda_investment, player.unrest
   * [-] gold
   */
  private action_SPREAD_PROPAGANDA_IN_PLAYER_PROVINCES(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'propaganda_investment', 8);
    decrement(actor, 'gold', p.magnitude ?? 300);
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'unrest', 5);
      delta(cohort as any, 'hope', -3);
    }
  }

  /**
   * MAP_PLAYER_ARMY_MOVEMENTS
   * [+] tactical_advantage
   * [-] spy_investment
   */
  private action_MAP_PLAYER_ARMY_MOVEMENTS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'tactical_advantage', 8);
    delta(actor, 'spy_investment', -5);
  }

  /**
   * EXPOSE_OWN_DOUBLE_AGENT
   * [+] paranoia
   * [-] spy_networks_active, network_confidence
   */
  private action_EXPOSE_OWN_DOUBLE_AGENT(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', 10);
    decrement(actor, 'spy_networks_active', 1);
    delta(actor, 'spy_investment', -8);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 4 ACTION HANDLERS: Foreign Ruler — Internal (15)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PURGE_DISLOYAL_VASSAL
   * [+] realm_stability, cruelty
   * [-] vassal_pool, popularity
   */
  private action_PURGE_DISLOYAL_VASSAL(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'cruelty', 8);
    delta(actor, 'realm_stability', 5);
    if (target) setTo(target, 'isAlive', false);
    this.chronicle(`${actor.firstName ?? 'The foreign ruler'} purges a disloyal vassal. Realm stability improves through fear.`);
  }

  /**
   * ELEVATE_NEW_VASSAL
   * [+] vassal.loyalty
   * [-] crown_land, paranoia
   */
  private action_ELEVATE_NEW_VASSAL(actor: any, target: any, p: NPCSimulationActionPayload) {
    delta(actor, 'paranoia', -3);
    if (target) {
      delta(target, 'loyalty_to_liege', 20);
      setTo(target, 'liege_id', actor.id);
    }
  }

  /**
   * CHANGE_SUCCESSION_LAW
   * [+] succession_stability
   * [-] vassal.loyalty (traditionalists)
   */
  private action_CHANGE_SUCCESSION_LAW(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'succession_stability', 10);
    delta(actor, 'succession_anxiety', -5);
    for (const vassal of this.getAllCharactersByType('VASSAL_LORD')) {
      delta(vassal as any, 'tradition_attachment', 5);
      delta(vassal as any, 'loyalty_to_liege', -3);
    }
  }

  /**
   * INVEST_IN_MILITARY
   * [+] military_obsession, total_army_strength
   * [-] gold, economic_discipline
   */
  private action_INVEST_IN_MILITARY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'military_obsession', 8);
    increment(actor, 'total_army_strength', p.magnitude ?? 500);
    decrement(actor, 'gold', p.magnitude ? p.magnitude * 2 : 1000);
    delta(actor, 'economic_discipline', -5);
  }

  /**
   * INVEST_IN_ECONOMY
   * [+] economic_discipline
   * [-] gold
   */
  private action_INVEST_IN_ECONOMY(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'economic_discipline', 10);
    decrement(actor, 'gold', p.magnitude ?? 600);
  }

  /**
   * INVEST_IN_CHURCH
   * [+] religious_fervor, piety
   * [-] gold
   */
  private action_INVEST_IN_CHURCH(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'religious_fervor', 8);
    delta(actor, 'piety', 5);
    decrement(actor, 'gold', p.magnitude ?? 400);
  }

  /**
   * CONDUCT_CENSUS
   * [+] bureaucratic_efficiency
   * [-] unrest (intrusive)
   */
  private action_CONDUCT_CENSUS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'bureaucratic_efficiency', 8);
    for (const cohort of this.getAllCharactersByType('PEASANT_COHORT')) {
      delta(cohort as any, 'unrest', 3);
    }
  }

  /**
   * REFORM_LAWS
   * [+] realm_stability
   * [-] tradition_attachment
   */
  private action_REFORM_LAWS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'realm_stability', 10);
    for (const vassal of this.getAllCharactersByType('VASSAL_LORD')) {
      delta(vassal as any, 'tradition_attachment', 5);
    }
  }

  /**
   * CALL_GREAT_COUNCIL
   * [+] realm_stability, loyalty
   * [-] absolute_power, independence
   */
  private action_CALL_GREAT_COUNCIL(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'realm_stability', 8);
    delta(actor, 'authority', -5);
    for (const vassal of this.getAllCharactersByType('VASSAL_LORD')) {
      delta(vassal as any, 'loyalty_to_liege', 5);
      delta(vassal as any, 'independence_drive', -3);
    }
    this.chronicle(`A Great Council is convened. Vassals gather and the realm strengthens.`);
  }

  /**
   * PLAN_INVASION
   * [+] expansionism, military_obsession
   * [-] patience
   */
  private action_PLAN_INVASION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'expansionism', 8);
    delta(actor, 'military_obsession', 5);
    delta(actor, 'patience', -5);
  }

  /**
   * RESPOND_TO_EXCOMMUNICATION
   * Variable based on piety:
   * [HIGH PIETY] [+] pride, submits → piety
   * [LOW PIETY]  [+] stubbornness, ignores → defiance
   */
  private action_RESPOND_TO_EXCOMMUNICATION(actor: any, p: NPCSimulationActionPayload) {
    const piety = actor.piety ?? 50;
    if (piety > 60) {
      delta(actor, 'pride', -5);
      delta(actor, 'piety', 5); // Submits and repents
      delta(actor, 'prestige', -3);
    } else {
      delta(actor, 'stubbornness', 8);
      delta(actor, 'isolation_drive', 5);
    }
    this.gameLoop.eventBus?.publish('EXCOMMUNICATION_RESPONSE', { actorId: actor.id, piety });
  }

  /**
   * RESPOND_TO_PLAYER_AGGRESSION
   * [+] fear/aggression, war_weariness
   */
  private action_RESPOND_TO_PLAYER_AGGRESSION(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'war_weariness', 5);
    const strength = (actor.total_army_strength ?? 0);
    const playerStrength = (this.getPlayerArmyStrength());
    if (playerStrength > strength) {
      delta(actor, 'fear', 10);
      delta(actor, 'isolation_drive', 5);
    } else {
      delta(actor, 'aggression', 8);
      delta(actor, 'expansionism', 3);
    }
  }

  /**
   * RESPOND_TO_ALLY_BEING_ATTACKED
   * [HONOR: help] [+] honor
   * [DECLINE] [+] shame/paranoia
   */
  private action_RESPOND_TO_ALLY_BEING_ATTACKED(actor: any, p: NPCSimulationActionPayload) {
    const honor = actor.honor ?? 50;
    if (honor > 60) {
      delta(actor, 'honor', 8);
      increment(actor, 'active_wars', 1);
      this.gameLoop.eventBus?.publish('ALLY_AID_PROVIDED', { actorId: actor.id });
    } else {
      delta(actor, 'paranoia', 5);
      delta(actor, 'honor', -5); // Shame for declining
    }
  }

  /**
   * RESPOND_TO_SUCCESSION_CRISIS
   * [+] succession_anxiety, paranoia
   */
  private action_RESPOND_TO_SUCCESSION_CRISIS(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'succession_anxiety', 10);
    delta(actor, 'paranoia', 8);
    delta(actor, 'paranoia_about_heirs', 10);
    this.gameLoop.eventBus?.publish('SUCCESSION_CRISIS', { actorId: actor.id });
    this.alert(`A succession crisis grips the foreign realm! Instability spreads.`, 'URGENT');
  }

  /**
   * RESPOND_TO_PLAGUE
   * [+] isolation_drive, fear, piety
   */
  private action_RESPOND_TO_PLAGUE(actor: any, p: NPCSimulationActionPayload) {
    delta(actor, 'isolation_drive', 10);
    delta(actor, 'fear', 10);
    delta(actor, 'piety', 5); // Turn to God in crisis
    delta(actor, 'mercantile_interest', -5); // Embargo sick provinces
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getCharacter(id: string): any | null {
    return (this.gameLoop as any).characters?.[id] ?? null;
  }

  private getCharactersByType(type: string): any[] {
    const chars = (this.gameLoop as any).characters ?? {};
    return Object.values(chars).filter((c: any) => c.characterType === type);
  }

  private getAllCharactersByType(type: string): any[] {
    return this.getCharactersByType(type);
  }

  private getLiegeOf(actor: any): any | null {
    const liegeId = actor.liege_id ?? actor.liegeId;
    if (!liegeId) return null;
    return this.getCharacter(liegeId);
  }

  private getAdvisorOfRole(sourceCharacter: any, role: string): any | null {
    const advisorIds = sourceCharacter.advisorIds ?? {};
    const roleKey = role.toLowerCase();
    const advisorId = advisorIds[roleKey];
    if (!advisorId) return null;
    return this.getCharacter(advisorId);
  }

  private getSameProvinceCharacters(actor: any, type: string): any[] {
    const provinceId = actor.province_id;
    if (!provinceId) return [];
    return this.getCharactersByType(type)
      .filter((c: any) => c.province_id === provinceId && c.id !== actor.id);
  }

  private modifyProvinceState(provinceId: string | undefined, field: string, amount: number) {
    if (!provinceId) return;
    const prov = (this.gameLoop as any).provinces?.[provinceId];
    if (!prov) return;
    // Check tier1Env first (environmental state)
    if (prov.tier1Env && field in prov.tier1Env) {
      delta(prov.tier1Env, field, amount);
    } else {
      // Direct province field (social state)
      if (prov[field] !== undefined) {
        delta(prov, field, amount);
      }
    }
  }

  private getPlayerArmyStrength(): number {
    const playerChar = Object.values((this.gameLoop as any).characters ?? {})
      .find((c: any) => c.isPlayer);
    return (playerChar as any)?.army_size ?? 0;
  }

  private isWorldInCrisis(): boolean {
    return this.isPlagueSpreading() || this.isRealmAtWar();
  }

  private isPlagueSpreading(): boolean {
    const provinces = (this.gameLoop as any).provinces ?? {};
    return Object.values(provinces).some(
      (p: any) => p.tier1Env?.disease_reservoir > 50 || p.tier1Env?.disaster === 'PLAGUE'
    );
  }

  private isRealmAtWar(): boolean {
    return Object.values((this.gameLoop as any).characters ?? {}).some(
      (c: any) => (c.active_wars ?? 0) > 0
    );
  }

  private driftTowardBaseline(actor: any, trait: string) {
    const baseline = actor[`${trait}_baseline`] ?? 50;
    const current = actor[trait] ?? 50;
    const diff = baseline - current;
    if (Math.abs(diff) > 0.5) {
      actor[trait] = clamp(current + diff * 0.001); // Very slow drift
    }
  }

  private alert(msg: string, severity: 'NORMAL' | 'URGENT' | 'CRITICAL') {
    (this.gameLoop as any).alertSystem?.queueAlert(msg, severity);
  }

  private chronicle(msg: string) {
    const clock = (this.gameLoop as any).clock;
    (this.gameLoop as any).chronicleSystem?.add(
      clock?.currentYear ?? 1,
      clock?.currentDay ?? 1,
      msg,
      'NORMAL'
    );
  }
}
