/**
 * AdvisorActionExecutor.ts
 *
 * Concrete world-state side effects for every Court Advisor action.
 * Covers all 5 roles: CHANCELLOR, MARSHAL, SPYMASTER, TREASURER, COURT_PRIEST.
 * Each action modifies real game state per sovereign_npc_simulation.md §7.1.
 *
 * Action IDs strictly match the spec in §4.8 and the action catalog files.
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { NpcAgent } from '../NpcActionExecutor';
import { recordMemory } from '../NpcMemorySystem';
import { nanoid } from 'nanoid';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function adjustContinuous(agent: NpcAgent, key: string, delta: number): void {
  const sv = agent.stateVector;
  if (sv.continuous[key]) {
    sv.continuous[key].value = clamp(sv.continuous[key].value + delta);
  }
}

function adjustInteger(agent: NpcAgent, key: string, delta: number): void {
  const sv = agent.stateVector;
  sv.integers[key] = Math.max(0, (sv.integers[key] ?? 0) + delta);
}

function getContinuous(agent: NpcAgent, key: string): number {
  return agent.stateVector.continuous[key]?.value ?? 0;
}

function getInteger(agent: NpcAgent, key: string): number {
  return agent.stateVector.integers[key] ?? 0;
}

/**
 * Synchronise loyalty_tier categorical from loyalty_to_player continuous value.
 * Called at the end of any action that modifies loyalty.
 */
function syncLoyaltyTier(agent: NpcAgent): void {
  const loyalty = getContinuous(agent, 'loyalty_to_player');
  const sv = agent.stateVector;
  if (loyalty >= 80)       sv.categorical['loyalty_tier'] = 'DEVOTED';
  else if (loyalty >= 60)  sv.categorical['loyalty_tier'] = 'RELIABLE';
  else if (loyalty >= 40)  sv.categorical['loyalty_tier'] = 'CONDITIONAL';
  else if (loyalty >= 20)  sv.categorical['loyalty_tier'] = 'SELF_SERVING';
  else                     sv.categorical['loyalty_tier'] = 'TREASONOUS';
}

export function executeAdvisorAction(
  actionId: string,
  agent: NpcAgent,
  engine: GameLoop,
  currentTick: number
): void {
  const sv = agent.stateVector;
  const prov = engine.provinces[agent.provinceId];
  const char = engine.characters[agent.id];
  const year = engine.clock.currentYear;
  const day = engine.clock.currentDay;

  if (!char || !prov) return;

  const charName = `${char.firstName} ${char.lastName}`;
  const role = sv.categorical['role'] ?? 'ADVISOR';

  // ── Track mission completion for burnout accumulation ──────────────────
  // burnout is incremented by StateDriftSystem; we track completed missions here.
  const completionActions = new Set([
    'EXECUTE_ASSIGNED_MISSION', 'NEGOTIATE_TREATY', 'ARRANGE_MARRIAGE_DEAL',
    'DRAFT_PEACE_TERMS', 'NEGOTIATE_TRADE_TREATY', 'TRAIN_ARMY',
    'COMMAND_ARMY_IN_FIELD', 'INFILTRATE_FOREIGN_COURT', 'ASSIGN_ASSASSINATION',
    'COLLECT_TAXES', 'AUDIT_PROVINCE', 'PREACH_IN_PROVINCE',
    'CONDUCT_INQUISITION', 'PERFORM_WEDDING', 'NEGOTIATE_WITH_HIGH_PRIEST',
  ]);
  if (completionActions.has(actionId)) {
    adjustInteger(agent, 'missions_completed', 1);
    adjustContinuous(agent, 'burnout', 3);
    adjustContinuous(agent, 'stress', 2);
  }

  switch (actionId) {

    // ════════════════════════════════════════════════════════════════════════
    // ADVISOR BASE ACTIONS (shared across all roles)
    // ════════════════════════════════════════════════════════════════════════

    case 'EXECUTE_ASSIGNED_MISSION': {
      const successChance = (getContinuous(agent, 'competence_confidence') / 100) *
                            (getContinuous(agent, 'loyalty_to_player') / 100);
      const success = engine.rng.next() < successChance;
      if (success) {
        adjustContinuous(agent, 'competence_confidence', 2);
        engine.chronicleSystem.add(year, day,
          `${charName} successfully completed their assigned mission.`, 'NORMAL');
      } else {
        adjustInteger(agent, 'missions_failed', 1);
        adjustContinuous(agent, 'competence_confidence', -3);
        adjustContinuous(agent, 'stress', 5);
        engine.chronicleSystem.add(year, day,
          `${charName} failed to complete their assigned mission.`, 'NORMAL');
      }
      sv.categorical['current_assignment'] = 'NONE';
      syncLoyaltyTier(agent);
      break;
    }

    case 'ADVISE_PLAYER': {
      // Competent advisors improve royal decision outcomes
      adjustContinuous(agent, 'loyalty_to_player', 1);
      adjustContinuous(agent, 'competence_confidence', 1);
      prov.stability = clamp(prov.stability + 1, 0, 100);
      engine.chronicleSystem.add(year, day,
        `${charName} offered counsel on affairs of state.`, 'FLAVOR');
      syncLoyaltyTier(agent);
      break;
    }

    case 'REPORT_THREAT': {
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 8;
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.alertSystem.queueAlert(
        `${charName} has reported a credible internal threat to the crown.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'ATTEND_COUNCIL': {
      adjustContinuous(agent, 'burnout', 1);
      adjustContinuous(agent, 'political_savvy', 0.5);
      prov.stability = clamp(prov.stability + 0.5, 0, 100);
      engine.chronicleSystem.add(year, day,
        `${charName} attended the royal council.`, 'FLAVOR');
      break;
    }

    case 'PURSUE_PERSONAL_AGENDA': {
      adjustContinuous(agent, 'ambition', 2);
      adjustContinuous(agent, 'personal_agenda_strength', 1);
      adjustContinuous(agent, 'loyalty_to_player', -0.5); // agenda pulls away from player
      syncLoyaltyTier(agent);
      break;
    }

    case 'BUILD_COURT_NETWORK': {
      adjustContinuous(agent, 'political_savvy', 3);
      adjustInteger(agent, 'secret_alliances', 1);
      adjustContinuous(agent, 'cunning', 1);
      break;
    }

    case 'ACCUMULATE_BLACKMAIL': {
      adjustContinuous(agent, 'cunning', 2);
      adjustInteger(agent, 'blackmail_material', 1);
      adjustContinuous(agent, 'discretion', -1); // gathering secrets is risky
      engine.chronicleSystem.add(year, day,
        `${charName} has been quietly accumulating compromising material on court members.`, 'FLAVOR');
      break;
    }

    case 'SEEK_SECRET_ALLIANCE': {
      adjustContinuous(agent, 'independence', 3);
      adjustContinuous(agent, 'faction_loyalty', 2);
      adjustInteger(agent, 'secret_alliances', 1);
      adjustContinuous(agent, 'loyalty_to_player', -1);
      syncLoyaltyTier(agent);
      break;
    }

    case 'REST_AND_RECOVER': {
      adjustContinuous(agent, 'burnout', -15);
      adjustContinuous(agent, 'stress', -15);
      adjustContinuous(agent, 'fear', -3);
      engine.chronicleSystem.add(year, day,
        `${charName} took a period of rest to recover from the demands of their office.`, 'FLAVOR');
      break;
    }

    case 'OBSTRUCT_PLAYER_DECISION': {
      prov.stability = clamp(prov.stability - 3, 0, 100);
      adjustContinuous(agent, 'independence', 2);
      engine.alertSystem.queueAlert(
        `${charName} is actively obstructing royal decrees, slowing implementation.`, 'URGENT');
      recordMemory(sv, 'GENERAL', agent.id, currentTick, 40, 'NEGATIVE',
        `${charName} obstructed the player's decisions`, false);
      break;
    }

    case 'LEAK_INFORMATION': {
      engine.resources.goods['intel'] = Math.max(0,
        (engine.resources.goods['intel'] || 0) - 15);
      adjustContinuous(agent, 'loyalty_to_player', -5);
      adjustContinuous(agent, 'corruption', 5);
      engine.alertSystem.queueAlert(
        `Intelligence leak detected! ${charName} appears to be sharing sensitive information.`, 'URGENT');
      syncLoyaltyTier(agent);
      break;
    }

    case 'DEFECT_TO_RIVAL': {
      adjustContinuous(agent, 'loyalty_to_player', -100);
      sv.categorical['loyalty_tier'] = 'TREASONOUS';
      // Record a treachery memory on the agent themselves and the player char
      recordMemory(sv, 'BETRAYAL', 'player', currentTick, 95, 'TRAUMATIC',
        `${charName} defected to a rival court`, true);
      engine.alertSystem.queueAlert(
        `TREACHERY! ${charName} has abandoned their post and defected to a rival realm!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `${charName} has committed the ultimate act of treason — defecting to our enemies.`, 'CRITICAL');
      // Propagate fear/paranoia to all co-located advisors
      Object.values(engine.characters).forEach((c: any) => {
        if (!c.isPlayer && c.isAlive && c.stateVector &&
            c.stateVector.provinceId === agent.provinceId &&
            c.id !== agent.id) {
          if (c.stateVector.continuous['paranoia'])
            c.stateVector.continuous['paranoia'].value = clamp(
              c.stateVector.continuous['paranoia'].value + 15);
          if (c.stateVector.continuous['fear'])
            c.stateVector.continuous['fear'].value = clamp(
              c.stateVector.continuous['fear'].value + 10);
        }
      });
      break;
    }

    case 'SABOTAGE_MISSION': {
      adjustInteger(agent, 'missions_failed', 1);
      prov.stability = clamp(prov.stability - 8, 0, 100);
      adjustContinuous(agent, 'stress', 10);
      engine.alertSystem.queueAlert(
        `${charName} deliberately sabotaged their own mission — a catastrophic act of treachery!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `${charName} sabotaged the crown's mission from within.`, 'CRITICAL');
      sv.categorical['current_assignment'] = 'NONE';
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHANCELLOR ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'NEGOTIATE_TREATY': {
      const skill = (getContinuous(agent, 'chancellor_diplomatic_pride') +
                     getContinuous(agent, 'political_savvy')) / 200;
      const success = engine.rng.next() < (0.4 + skill * 0.5);
      if (success) {
        engine.treasury.goldBalance += 100;
        prov.stability = clamp(prov.stability + 3, 0, 100);
        adjustContinuous(agent, 'chancellor_diplomatic_pride', 3);
        engine.chronicleSystem.add(year, day,
          `Chancellor ${charName} successfully concluded a treaty, bringing diplomatic and economic benefits.`, 'NORMAL');
      } else {
        adjustContinuous(agent, 'chancellor_diplomatic_pride', -5);
        adjustContinuous(agent, 'stress', 8);
        engine.chronicleSystem.add(year, day,
          `Chancellor ${charName}'s treaty negotiations ended without agreement.`, 'NORMAL');
      }
      break;
    }

    case 'FABRICATE_CLAIM': {
      const quality = getContinuous(agent, 'chancellor_truth_flexibility') *
                      getContinuous(agent, 'cunning') / 10000;
      const detected = engine.rng.next() < (0.15 - quality * 0.1);
      if (detected) {
        adjustContinuous(agent, 'honor', -10);
        adjustContinuous(agent, 'loyalty_to_player', -8);
        prov.stability = clamp(prov.stability - 5, 0, 100);
        engine.alertSystem.queueAlert(
          `Scandal! ${charName}'s fabricated claim has been exposed by a foreign court!`, 'URGENT');
      } else {
        // Add a casus belli to the player character
        const playerChar = Object.values(engine.characters).find((c: any) => c.isPlayer) as any;
        if (playerChar) {
          playerChar.casusBelli = playerChar.casusBelli ?? [];
          playerChar.casusBelli.push(`fabricated_claim_${agent.provinceId}_${nanoid(6)}`);
        }
        adjustContinuous(agent, 'cunning', 3);
        engine.chronicleSystem.add(year, day,
          `Chancellor ${charName} fabricated a convincing claim — a new legal pretext for expansion is available.`, 'NORMAL');
      }
      break;
    }

    case 'ARRANGE_MARRIAGE_DEAL': {
      const prestigeGain = 10 + Math.floor(getContinuous(agent, 'chancellor_diplomatic_pride') * 0.3);
      prov.stability = clamp(prov.stability + 4, 0, 100);
      engine.treasury.goldBalance -= 50; // dowry cost
      adjustContinuous(agent, 'chancellor_diplomatic_pride', 4);
      adjustContinuous(agent, 'loyalty_to_player', 2);
      engine.chronicleSystem.add(year, day,
        `A strategic marriage arranged by ${charName} has cemented a diplomatic alliance.`, 'NORMAL');
      engine.alertSystem.queueAlert(
        `Diplomatic marriage arranged by ${charName}. Realm prestige +${prestigeGain}.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PLANT_PROPAGANDA': {
      // Raise loyalty in a random neighboring province
      const neighbors = prov.neighbors ?? [];
      if (neighbors.length > 0) {
        const targetId = neighbors[Math.floor(engine.rng.next() * neighbors.length)];
        const target = engine.provinces[targetId];
        if (target) {
          target.loyalty = clamp(target.loyalty + 8, 0, 100);
          engine.chronicleSystem.add(year, day,
            `Chancellor ${charName} planted propaganda in ${target.name}, improving loyalty to the crown.`, 'NORMAL');
        }
      }
      adjustContinuous(agent, 'chancellor_truth_flexibility', 1);
      adjustContinuous(agent, 'cunning', 2);
      break;
    }

    case 'EXPOSE_ENEMY_PLOT_VIA_DIPLOMACY': {
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 20;
      adjustContinuous(agent, 'chancellor_network_investment', 3);
      adjustContinuous(agent, 'loyalty_to_player', 2);
      engine.alertSystem.queueAlert(
        `Chancellor ${charName} uncovered a foreign conspiracy through diplomatic channels!`, 'URGENT');
      syncLoyaltyTier(agent);
      break;
    }

    case 'REQUEST_AUDIENCE_WITH_FOREIGN_RULER': {
      const accepted = engine.rng.next() < 0.6;
      adjustContinuous(agent, 'chancellor_diplomatic_pride', accepted ? 3 : -2);
      adjustContinuous(agent, 'stress', accepted ? -2 : 4);
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} ${accepted ? 'secured' : 'was refused'} an audience with a foreign ruler.`, 'NORMAL');
      break;
    }

    case 'BRIBE_FOREIGN_AMBASSADOR': {
      const bribeAmount = 100 + Math.floor(engine.rng.next() * 150);
      adjustInteger(agent, 'gold', -bribeAmount);
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 12;
      adjustContinuous(agent, 'chancellor_truth_flexibility', 2);
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} bribed a foreign ambassador, securing favourable intelligence.`, 'NORMAL');
      break;
    }

    case 'DRAFT_PEACE_TERMS': {
      adjustContinuous(agent, 'chancellor_legal_obsession', 2);
      adjustContinuous(agent, 'chancellor_diplomatic_pride', 2);
      prov.stability = clamp(prov.stability + 2, 0, 100);
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} has drafted comprehensive peace terms, ready for negotiation.`, 'NORMAL');
      break;
    }

    case 'DRAFT_WAR_JUSTIFICATION': {
      // Adds a casus belli documentation to player
      adjustContinuous(agent, 'chancellor_legal_obsession', 3);
      const playerChar2 = Object.values(engine.characters).find((c: any) => c.isPlayer) as any;
      if (playerChar2) {
        playerChar2.casusBelli = playerChar2.casusBelli ?? [];
        playerChar2.casusBelli.push(`war_justification_${nanoid(6)}`);
      }
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} completed formal documentation justifying a declaration of war.`, 'NORMAL');
      break;
    }

    case 'MANAGE_HOSTAGE_SITUATION': {
      const resolved = engine.rng.next() < (getContinuous(agent, 'cunning') / 100 * 0.7);
      if (resolved) {
        prov.stability = clamp(prov.stability + 5, 0, 100);
        adjustContinuous(agent, 'cunning', 4);
        adjustContinuous(agent, 'loyalty_to_player', 3);
        engine.chronicleSystem.add(year, day,
          `Chancellor ${charName} successfully managed a delicate hostage situation.`, 'NORMAL');
      } else {
        prov.stability = clamp(prov.stability - 3, 0, 100);
        adjustContinuous(agent, 'stress', 10);
        engine.alertSystem.queueAlert(
          `The hostage situation managed by ${charName} has deteriorated!`, 'URGENT');
      }
      syncLoyaltyTier(agent);
      break;
    }

    case 'NEGOTIATE_TRADE_TREATY': {
      const income = 75 + Math.floor(getContinuous(agent, 'chancellor_diplomatic_pride') * 0.5);
      engine.treasury.goldBalance += income;
      adjustContinuous(agent, 'chancellor_diplomatic_pride', 3);
      adjustContinuous(agent, 'loyalty_to_player', 2);
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} concluded a profitable trade treaty, adding ${income} gold to the treasury.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'CRAFT_ALLIANCE_TERMS': {
      adjustContinuous(agent, 'chancellor_legal_obsession', 3);
      adjustContinuous(agent, 'chancellor_diplomatic_pride', 2);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} has crafted alliance terms ready for a partner realm's review.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'SPREAD_DISINFORMATION_ABROAD': {
      // Raises foreign ruler's suspicion of their own advisors
      adjustContinuous(agent, 'cunning', 4);
      adjustContinuous(agent, 'chancellor_truth_flexibility', 2);
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 5;
      engine.chronicleSystem.add(year, day,
        `Chancellor ${charName} spread carefully crafted disinformation through foreign channels.`, 'FLAVOR');
      break;
    }

    case 'QUIETLY_SANCTION_FOREIGN_SPY': {
      // Covert action — reduces intel and loyalty
      engine.resources.goods['intel'] = Math.max(0,
        (engine.resources.goods['intel'] || 0) - 8);
      adjustContinuous(agent, 'loyalty_to_player', -3);
      adjustContinuous(agent, 'faction_loyalty', 2);
      // Small chance of detection
      if (engine.rng.next() < 0.1) {
        engine.alertSystem.queueAlert(
          `Spies report Chancellor ${charName} may be quietly assisting a foreign intelligence operative!`, 'URGENT');
      }
      syncLoyaltyTier(agent);
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // MARSHAL ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'TRAIN_ARMY': {
      const trainingGain = 50 + Math.floor(getContinuous(agent, 'marshal_troop_bond') * 0.8);
      engine.resources.manpower += trainingGain;
      adjustContinuous(agent, 'marshal_troop_bond', 2);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} trained fresh recruits — ${trainingGain} manpower added.`, 'FLAVOR');
      syncLoyaltyTier(agent);
      break;
    }

    case 'ADVISE_ON_BATTLE_PLAN': {
      // Boosts effectiveness of next military action
      adjustContinuous(agent, 'marshal_tactical_creativity', 3);
      adjustContinuous(agent, 'competence_confidence', 2);
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} refined the royal battle plans.`, 'FLAVOR');
      break;
    }

    case 'COMMAND_ARMY_IN_FIELD': {
      // Autonomous command — outcome scaled by tactical_creativity and loyalty
      const successRate = (getContinuous(agent, 'marshal_tactical_creativity') *
                           getContinuous(agent, 'loyalty_to_player')) / 10000;
      const victory = engine.rng.next() < (0.3 + successRate * 0.6);
      if (victory) {
        adjustContinuous(agent, 'marshal_glory_hunger', 5);
        adjustContinuous(agent, 'marshal_troop_bond', 4);
        adjustContinuous(agent, 'competence_confidence', 5);
        adjustInteger(agent, 'missions_completed', 1);
        engine.chronicleSystem.add(year, day,
          `Marshal ${charName} led the royal army to a significant field victory!`, 'URGENT');
        engine.alertSystem.queueAlert(
          `Victory in the field! Marshal ${charName} has triumphed.`, 'NORMAL');
      } else {
        engine.resources.manpower = Math.max(0, engine.resources.manpower - 200);
        adjustContinuous(agent, 'competence_confidence', -8);
        adjustContinuous(agent, 'stress', 15);
        adjustInteger(agent, 'missions_failed', 1);
        engine.chronicleSystem.add(year, day,
          `Marshal ${charName} suffered a setback commanding the army in the field.`, 'URGENT');
      }
      break;
    }

    case 'CONSCRIPT_LEVY': {
      const levySize = 80 + Math.floor(getContinuous(agent, 'loyalty_to_player') * 1.5);
      engine.resources.manpower += levySize;
      prov.loyalty = clamp(prov.loyalty - 4, 0, 100);
      // Peasant cohorts in this province get fatigue + unrest
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'PEASANT_COHORT' &&
            c.stateVector.provinceId === agent.provinceId) {
          if (c.stateVector.continuous['fatigue'])
            c.stateVector.continuous['fatigue'].value = clamp(
              c.stateVector.continuous['fatigue'].value + 10);
          if (c.stateVector.continuous['unrest'])
            c.stateVector.continuous['unrest'].value = clamp(
              c.stateVector.continuous['unrest'].value + 5);
        }
      });
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} conscripted ${levySize} men from the provinces.`, 'NORMAL');
      break;
    }

    case 'COMMISSION_SIEGE_EQUIPMENT': {
      const cost = 60 + Math.floor(engine.rng.next() * 80);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - cost);
      adjustContinuous(agent, 'marshal_logistics_discipline', 2);
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} commissioned siege equipment at a cost of ${cost} gold.`, 'NORMAL');
      break;
    }

    case 'ORGANIZE_DEFENSIVE_LINE': {
      prov.fortificationLevel = clamp(prov.fortificationLevel + 0.2, 0, 5);
      adjustContinuous(agent, 'marshal_fortress_mindset', 2);
      adjustContinuous(agent, 'marshal_logistics_discipline', 2);
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} organised a defensive line in ${prov.name}.`, 'NORMAL');
      break;
    }

    case 'MISINTERPRET_ORDERS': {
      // Intentional disobedience disguised as incompetence
      const casualtyImpact = 150 + Math.floor(engine.rng.next() * 200);
      engine.resources.manpower = Math.max(0, engine.resources.manpower - casualtyImpact);
      adjustContinuous(agent, 'marshal_insubordination_risk', -15); // tension partially released
      adjustContinuous(agent, 'loyalty_to_player', -8);
      adjustContinuous(agent, 'marshal_glory_hunger', 3);
      engine.alertSystem.queueAlert(
        `Marshal ${charName} 'misinterpreted' battle orders — a flank was left exposed, costing ${casualtyImpact} men!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName}'s 'misinterpretation' of royal orders caused a costly military setback.`, 'CRITICAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'DEMAND_MORE_TROOPS_BEFORE_ADVANCING': {
      adjustContinuous(agent, 'marshal_strategic_patience', 2);
      adjustContinuous(agent, 'marshal_logistics_discipline', 2);
      engine.alertSystem.queueAlert(
        `Marshal ${charName} refuses to advance without additional reinforcements.`, 'URGENT');
      // Creates a pending player decision
      engine.pendingEvents.push({
        id: `event_marshal_demand_${nanoid()}`,
        type: 'COURT_PETITION',
        title: `Marshal Demands Reinforcements`,
        description: `Marshal ${charName} refuses to advance the campaign without ${Math.floor(100 + engine.rng.next() * 200)} additional troops. Morale among the army is wavering.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Send the requested reinforcements', action: 'SPEND_MANPOWER', amount: 150, effect: '+Marshal loyalty, campaign continues' },
          { label: 'Order the Marshal to advance anyway', action: 'IGNORE', effect: '-Marshal loyalty, insubordination_risk rises' },
        ],
      });
      break;
    }

    case 'CLAIM_BATTLE_CREDIT': {
      // Marshal takes personal credit, raising vanity and potentially envy of others
      adjustContinuous(agent, 'vanity', 6);
      adjustContinuous(agent, 'marshal_glory_hunger', -5); // satiated temporarily
      adjustContinuous(agent, 'competence_confidence', 3);
      // Other advisors in same province get envious
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && !c.isPlayer && c.id !== agent.id &&
            c.stateVector?.provinceId === agent.provinceId) {
          if (c.stateVector.continuous['envy'])
            c.stateVector.continuous['envy'].value = clamp(
              c.stateVector.continuous['envy'].value + 5);
        }
      });
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} claimed credit for a recent military success, cementing their reputation.`, 'NORMAL');
      break;
    }

    case 'PRIVATELY_RECRUIT_LOYAL_TROOPS': {
      // Secret personal army outside player's knowledge
      const recruits = 150 + Math.floor(engine.rng.next() * 150);
      adjustInteger(agent, 'gold', -Math.floor(recruits * 0.6));
      // Store private army size as an integer on the state vector
      if (!sv.integers['private_army_size']) sv.integers['private_army_size'] = 0;
      sv.integers['private_army_size'] += recruits;
      adjustContinuous(agent, 'ambition', 3);
      adjustContinuous(agent, 'independence', 3);
      // 20% chance the spymaster notices
      if (engine.rng.next() < 0.2) {
        engine.alertSystem.queueAlert(
          `Intelligence warning: Marshal ${charName} is quietly recruiting soldiers answerable only to them — ${recruits} troops so far.`, 'URGENT');
      }
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} expanded their private retinue, raising personal troops outside the royal army.`, 'FLAVOR');
      break;
    }

    case 'NEGOTIATE_SURRENDER_TERMS': {
      // Only fires when marshal has low loyalty — implies they're not fighting for player
      const treason = getContinuous(agent, 'loyalty_to_player') < 30;
      if (treason) {
        engine.alertSystem.queueAlert(
          `CRITICAL: Marshal ${charName} has been caught negotiating surrender with the enemy!`, 'CRITICAL');
        adjustContinuous(agent, 'loyalty_to_player', -15);
      } else {
        engine.chronicleSystem.add(year, day,
          `Marshal ${charName} opened discussions on surrender terms with the besieged enemy.`, 'NORMAL');
        adjustContinuous(agent, 'cunning', 3);
      }
      syncLoyaltyTier(agent);
      break;
    }

    case 'RECOMMEND_TACTICAL_RETREAT': {
      adjustContinuous(agent, 'marshal_strategic_patience', 3);
      adjustContinuous(agent, 'marshal_glory_hunger', -2);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Marshal ${charName} recommended a tactical withdrawal to regroup and preserve the army.`, 'NORMAL');
      engine.alertSystem.queueAlert(
        `Marshal ${charName} advises a tactical retreat — morale preserved, position regained.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PLAN_NIGHT_RAID': {
      // Offensive action; success scales with tactical_creativity
      const raidSuccess = engine.rng.next() < (getContinuous(agent, 'marshal_tactical_creativity') / 150);
      if (raidSuccess) {
        const goldPlundered = 50 + Math.floor(engine.rng.next() * 100);
        engine.treasury.goldBalance += goldPlundered;
        adjustContinuous(agent, 'marshal_tactical_creativity', 3);
        adjustContinuous(agent, 'marshal_glory_hunger', 4);
        engine.chronicleSystem.add(year, day,
          `Marshal ${charName}'s night raid was a brilliant success, netting ${goldPlundered} gold and sowing panic.`, 'NORMAL');
      } else {
        engine.resources.manpower = Math.max(0, engine.resources.manpower - 50);
        adjustContinuous(agent, 'marshal_tactical_creativity', -2);
        engine.chronicleSystem.add(year, day,
          `Marshal ${charName}'s night raid failed — troops withdrew with losses.`, 'NORMAL');
      }
      break;
    }

    case 'SABOTAGE_RIVAL_GENERAL': {
      // Damages manpower; fired from envy
      engine.resources.manpower = Math.max(0, engine.resources.manpower - 80);
      adjustContinuous(agent, 'envy', -10); // tension released
      adjustContinuous(agent, 'honor', -8);
      adjustContinuous(agent, 'cunning', 3);
      engine.alertSystem.queueAlert(
        `Marshal ${charName} sabotaged a rival commander's supply train out of jealousy — manpower lost!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `A rival general's campaign was disrupted by sabotage traced back to Marshal ${charName}.`, 'CRITICAL');
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SPYMASTER ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'WATCH_COURT': {
      // Passive intelligence gathering; raises paranoia, grows network confidence
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 5;
      adjustContinuous(agent, 'spymaster_paranoia_professional', 0.5);
      adjustContinuous(agent, 'spymaster_network_confidence', 1);
      // Small chance to discover a plot
      if (engine.rng.next() < 0.12) {
        engine.alertSystem.queueAlert(
          `Spymaster ${charName} detected suspicious activity within the court. Investigating further.`, 'NORMAL');
      }
      break;
    }

    case 'INFILTRATE_FOREIGN_COURT': {
      const successRate = getContinuous(agent, 'spymaster_network_confidence') *
                          getContinuous(agent, 'cunning') / 10000;
      const success = engine.rng.next() < (0.3 + successRate * 0.5);
      if (success) {
        engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 20;
        adjustContinuous(agent, 'spymaster_network_confidence', 4);
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} successfully placed an agent in a foreign court.`, 'NORMAL');
      } else {
        adjustContinuous(agent, 'spymaster_exposure_fear', 15);
        adjustContinuous(agent, 'spymaster_network_confidence', -5);
        engine.alertSystem.queueAlert(
          `Spymaster ${charName}'s infiltration attempt was compromised — our operative is at risk.`, 'URGENT');
      }
      break;
    }

    case 'RECRUIT_AGENT': {
      adjustContinuous(agent, 'spymaster_network_confidence', 3);
      adjustContinuous(agent, 'spymaster_asset_loyalty_trust', 2);
      adjustInteger(agent, 'gold', -30);
      engine.chronicleSystem.add(year, day,
        `Spymaster ${charName} recruited a new intelligence asset.`, 'FLAVOR');
      break;
    }

    case 'ASSIGN_ASSASSINATION': {
      // Dispatch assassin against a target
      const targets = Object.values(engine.characters).filter(
        (c: any) => !c.isPlayer && c.isAlive && !c.stateVector
      ) as any[];
      if (targets.length > 0) {
        const target = targets[Math.floor(engine.rng.next() * targets.length)];
        const successChance = getContinuous(agent, 'spymaster_ruthlessness') / 100 * 0.6;
        const assassinated = engine.rng.next() < successChance;
        if (assassinated) {
          target.isAlive = false;
          target.causeOfDeath = 'ASSASSINATION';
          target.deathDate = currentTick;
          engine.chronicleSystem.add(year, day,
            `${target.firstName} ${target.lastName} was found dead — an assassination arranged by Spymaster ${charName}.`, 'CRITICAL');
          engine.alertSystem.queueAlert(
            `A target has been eliminated by Spymaster ${charName}.`, 'URGENT');
        } else {
          adjustContinuous(agent, 'spymaster_exposure_fear', 20);
          engine.alertSystem.queueAlert(
            `An assassination attempt ordered by ${charName} failed — our agents are exposed!`, 'CRITICAL');
        }
        adjustContinuous(agent, 'spymaster_ruthlessness', 2);
        adjustContinuous(agent, 'spymaster_moral_compartmentalization', 2);
        adjustContinuous(agent, 'paranoia', 10);
      }
      break;
    }

    case 'FRAME_CHARACTER': {
      const suspects2 = Object.values(engine.characters).filter(
        (c: any) => !c.isPlayer && c.isAlive && c.landedProvinceIds?.includes(agent.provinceId)
      ) as any[];
      if (suspects2.length > 0) {
        const target2 = suspects2[Math.floor(engine.rng.next() * suspects2.length)];
        adjustContinuous(agent, 'cunning', 5);
        adjustContinuous(agent, 'spymaster_ruthlessness', 2);
        engine.alertSystem.queueAlert(
          `${target2.firstName} ${target2.lastName} has been framed with fabricated evidence — their reputation is destroyed.`, 'NORMAL');
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} successfully framed ${target2.firstName} ${target2.lastName}, removing a potential rival.`, 'NORMAL');
      }
      break;
    }

    case 'EXPOSE_PLOT': {
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 10;
      prov.stability = clamp(prov.stability + 6, 0, 100);
      adjustContinuous(agent, 'loyalty_to_player', 3);
      engine.alertSystem.queueAlert(
        `Spymaster ${charName} exposed a dangerous plot within the realm!`, 'URGENT');
      engine.chronicleSystem.add(year, day,
        `A conspiracy against the crown was uncovered and dismantled by Spymaster ${charName}.`, 'URGENT');
      syncLoyaltyTier(agent);
      break;
    }

    case 'FABRICATE_EVIDENCE': {
      adjustContinuous(agent, 'cunning', 3);
      adjustContinuous(agent, 'spymaster_ruthlessness', 1);
      adjustContinuous(agent, 'spymaster_moral_compartmentalization', 2);
      // 15% detection risk
      if (engine.rng.next() < 0.15) {
        adjustContinuous(agent, 'spymaster_exposure_fear', 20);
        engine.alertSystem.queueAlert(
          `Warning: Fabricated evidence from ${charName}'s network may have been detected.`, 'URGENT');
      } else {
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} produced forged documents that will stand up to scrutiny.`, 'FLAVOR');
      }
      break;
    }

    case 'BURN_NETWORK': {
      // Panic action — destroys entire intel network to prevent capture
      engine.resources.goods['intel'] = 0;
      adjustContinuous(agent, 'spymaster_network_confidence', -60);
      adjustContinuous(agent, 'spymaster_exposure_fear', -50); // fear subsides
      adjustContinuous(agent, 'paranoia', 25);
      adjustContinuous(agent, 'spymaster_asset_loyalty_trust', -20);
      engine.alertSystem.queueAlert(
        `EMERGENCY: Spymaster ${charName} burned the entire intelligence network to avoid exposure! All agents are stand-down.`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `Spymaster ${charName} destroyed the royal spy network in a panic — years of work undone.`, 'CRITICAL');
      recordMemory(sv, 'GENERAL', 'player', currentTick, 80, 'TRAUMATIC',
        `${charName} burned the spy network`, false);
      break;
    }

    case 'TURN_ENEMY_AGENT': {
      const success3 = engine.rng.next() < (getContinuous(agent, 'cunning') / 100 * 0.65);
      if (success3) {
        engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 25;
        adjustContinuous(agent, 'spymaster_network_confidence', 5);
        adjustContinuous(agent, 'spymaster_asset_loyalty_trust', 3);
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} successfully turned a foreign agent — they now work for us.`, 'NORMAL');
      } else {
        adjustContinuous(agent, 'spymaster_exposure_fear', 10);
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName}'s attempt to turn an enemy agent failed.`, 'NORMAL');
      }
      break;
    }

    case 'PLANT_DOUBLE_AGENT': {
      const success4 = engine.rng.next() < (getContinuous(agent, 'spymaster_network_confidence') / 150);
      if (success4) {
        adjustContinuous(agent, 'cunning', 5);
        adjustContinuous(agent, 'spymaster_network_confidence', 4);
        engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 15;
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} planted a double agent in a foreign intelligence apparatus.`, 'NORMAL');
      } else {
        adjustContinuous(agent, 'spymaster_exposure_fear', 15);
        engine.alertSystem.queueAlert(
          `Spymaster ${charName}'s double agent operation was compromised!`, 'URGENT');
      }
      break;
    }

    case 'COVERTLY_MONITOR_PLAYER_ADVISOR': {
      // Spymaster watches another advisor — used when own agenda is active
      adjustContinuous(agent, 'spymaster_obsession_with_control', 2);
      adjustContinuous(agent, 'paranoia', 3);
      adjustContinuous(agent, 'personal_agenda_strength', 1);
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 8;
      // 5% chance the monitored advisor notices
      if (engine.rng.next() < 0.05) {
        engine.alertSystem.queueAlert(
          `A court advisor reports feeling watched — Spymaster ${charName} may be monitoring their colleagues.`, 'NORMAL');
      }
      break;
    }

    case 'BLACKMAIL_VASSAL': {
      const leverage = getInteger(agent, 'blackmail_material');
      if (leverage > 0) {
        const extracted = 80 + Math.floor(engine.rng.next() * 120);
        engine.treasury.goldBalance += extracted;
        adjustInteger(agent, 'gold', 40); // personal cut
        adjustInteger(agent, 'blackmail_material', -1);
        adjustContinuous(agent, 'spymaster_blackmail_comfort', 3);
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} leveraged blackmail material to extract ${extracted} gold from a vassal.`, 'NORMAL');
        engine.alertSystem.queueAlert(
          `A vassal was blackmailed by the Spymaster. Treasury gained ${extracted} gold.`, 'NORMAL');
      }
      break;
    }

    case 'INTERCEPT_COURIER': {
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 6;
      adjustContinuous(agent, 'spymaster_paranoia_professional', 1);
      // Small chance of finding useful blackmail material
      if (engine.rng.next() < 0.15) {
        adjustInteger(agent, 'blackmail_material', 1);
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} intercepted a courier carrying compromising material.`, 'NORMAL');
      }
      break;
    }

    case 'LEAK_INTEL_TO_ENEMY': {
      // Treasonous action — only fires when loyalty_tier == TREASONOUS
      engine.resources.goods['intel'] = 0;
      adjustContinuous(agent, 'spymaster_double_life_risk', 20);
      adjustContinuous(agent, 'loyalty_to_player', -20);
      engine.alertSystem.queueAlert(
        `CRITICAL BREACH: Spymaster ${charName} is actively leaking all royal intelligence to a foreign power!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `The realm's intelligence has been completely compromised by Spymaster ${charName}.`, 'CRITICAL');
      // Propagate fear/paranoia through all court agents
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector && c.stateVector.provinceId === agent.provinceId) {
          if (c.stateVector.continuous['paranoia'])
            c.stateVector.continuous['paranoia'].value = clamp(
              c.stateVector.continuous['paranoia'].value + 20);
        }
      });
      syncLoyaltyTier(agent);
      break;
    }

    case 'MAP_ENEMY_SUPPLY_LINES': {
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 12;
      adjustContinuous(agent, 'spymaster_network_confidence', 2);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Spymaster ${charName} mapped the enemy's supply lines — a strategic advantage secured.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PRODUCE_FORGED_DOCUMENT': {
      adjustContinuous(agent, 'cunning', 2);
      adjustContinuous(agent, 'spymaster_ruthlessness', 1);
      const detected2 = engine.rng.next() < 0.1;
      if (detected2) {
        adjustContinuous(agent, 'spymaster_exposure_fear', 15);
        engine.alertSystem.queueAlert(
          `A forged document traced to Spymaster ${charName} has been identified by a foreign court.`, 'URGENT');
      } else {
        engine.chronicleSystem.add(year, day,
          `Spymaster ${charName} produced a high-quality forged document for court use.`, 'FLAVOR');
      }
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TREASURER ACTIONS (spec §4.8)
    // ════════════════════════════════════════════════════════════════════════

    case 'COLLECT_TAXES': {
      // effectiveness = competence × loyalty (per spec)
      const efficiency = (getContinuous(agent, 'competence_confidence') / 100) *
                         (getContinuous(agent, 'loyalty_to_player') / 100);
      const collected = Math.floor(150 + efficiency * 200);
      engine.treasury.goldBalance += collected;
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Treasurer ${charName} collected ${collected} gold in taxes from the provinces.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PROPOSE_BUDGET_CUT': {
      // Creates a pending player decision
      engine.pendingEvents.push({
        id: `event_budget_cut_${nanoid()}`,
        type: 'COURT_PETITION',
        title: 'Treasurer Proposes Budget Cuts',
        description: `Treasurer ${charName} warns that expenditures must be reduced immediately. Cutting the military budget by 20% would save ${Math.floor(200 + engine.rng.next() * 300)} gold over three months, but will anger the Marshal.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Approve the budget cuts', action: 'REDUCE_BUDGET', effect: '+Gold, -Marshal loyalty, -Manpower growth' },
          { label: 'Maintain current spending', action: 'IGNORE', effect: 'Treasury deficit continues to worsen' },
        ],
      });
      adjustContinuous(agent, 'treasurer_fiscal_conservatism', 2);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      syncLoyaltyTier(agent);
      break;
    }

    case 'PROPOSE_TAX_INCREASE': {
      engine.pendingEvents.push({
        id: `event_tax_increase_${nanoid()}`,
        type: 'COURT_PETITION',
        title: 'Treasurer Proposes Tax Increase',
        description: `Treasurer ${charName} recommends raising provincial taxes by 15%. This would generate significant revenue but will raise unrest and may push merchants toward smuggling.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Approve the tax increase', action: 'RAISE_TAX', effect: '+200 gold/month, +Unrest, +Smuggling drive' },
          { label: 'Partially increase taxes', action: 'PARTIAL_TAX', effect: '+100 gold/month, moderate unrest' },
          { label: 'Decline the proposal', action: 'IGNORE', effect: 'No change, treasurer disappointed' },
        ],
      });
      adjustContinuous(agent, 'treasurer_tax_creativity', 2);
      break;
    }

    case 'ARRANGE_LOAN_FROM_MERCHANT': {
      const loanAmount = 300 + Math.floor(engine.rng.next() * 500);
      const interestRate = 0.15 + (1 - getContinuous(agent, 'treasurer_merchant_sympathy') / 100) * 0.1;
      engine.treasury.goldBalance += loanAmount;
      // Record debt (simplified)
      if (!sv.integers['outstanding_debt']) sv.integers['outstanding_debt'] = 0;
      sv.integers['outstanding_debt'] += Math.floor(loanAmount * (1 + interestRate));
      adjustContinuous(agent, 'treasurer_debt_aversion', -5);
      adjustContinuous(agent, 'treasurer_merchant_sympathy', 3);
      engine.chronicleSystem.add(year, day,
        `Treasurer ${charName} arranged a loan of ${loanAmount} gold from a merchant house at ${Math.round(interestRate * 100)}% interest.`, 'NORMAL');
      break;
    }

    case 'MINT_MORE_COIN': {
      // Short-term treasury boost, long-term inflation
      const minted = 200 + Math.floor(engine.rng.next() * 200);
      engine.treasury.goldBalance += minted;
      engine.treasury.inflationRate = (engine.treasury.inflationRate ?? 1.0) + 0.08;
      adjustContinuous(agent, 'treasurer_inflation_anxiety', 10);
      adjustContinuous(agent, 'treasurer_fiscal_conservatism', -5);
      engine.alertSystem.queueAlert(
        `Treasurer ${charName} minted ${minted} gold worth of coin. Inflation is rising.`, 'URGENT');
      engine.chronicleSystem.add(year, day,
        `The royal mint produced excess coin at ${charName}'s order — prices are beginning to climb.`, 'URGENT');
      // Ripple: merchant market_confidence drops, peasant hunger eventually rises (via drift)
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'MASTER_MERCHANT') {
          if (c.stateVector.continuous['market_confidence'])
            c.stateVector.continuous['market_confidence'].value = clamp(
              c.stateVector.continuous['market_confidence'].value - 5);
        }
      });
      break;
    }

    case 'AUDIT_PROVINCE': {
      // Detect embezzlement or underpayment
      const embezzlementDetected = engine.rng.next() < 0.25;
      if (embezzlementDetected) {
        const recovered = 100 + Math.floor(engine.rng.next() * 200);
        engine.treasury.goldBalance += recovered;
        adjustContinuous(agent, 'loyalty_to_player', 5);
        engine.alertSystem.queueAlert(
          `Treasurer ${charName} discovered and recovered ${recovered} gold in underpaid taxes during an audit of ${prov.name}!`, 'URGENT');
        engine.chronicleSystem.add(year, day,
          `An audit of ${prov.name} by ${charName} uncovered significant tax evasion.`, 'URGENT');
      } else {
        engine.chronicleSystem.add(year, day,
          `Treasurer ${charName} audited ${prov.name} — accounts appear to be in order.`, 'FLAVOR');
      }
      adjustContinuous(agent, 'treasurer_record_keeping_pride', 2);
      syncLoyaltyTier(agent);
      break;
    }

    case 'EMBEZZLE': {
      // Secret theft — temptation > 70 AND loyalty < 40
      const stolen = 200 + Math.floor(engine.rng.next() * 200);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - stolen);
      adjustInteger(agent, 'gold', stolen);
      adjustContinuous(agent, 'corruption', 12);
      adjustContinuous(agent, 'treasurer_embezzlement_temptation', -15); // temporarily satisfied
      adjustContinuous(agent, 'treasurer_record_keeping_pride', -8);
      // 10% detection risk each time
      if (engine.rng.next() < 0.1) {
        engine.alertSystem.queueAlert(
          `TREASURY SCANDAL: Signs of embezzlement found in the royal accounts — ${charName} is a prime suspect!`, 'CRITICAL');
        adjustContinuous(agent, 'fear', 20);
        adjustContinuous(agent, 'stress', 20);
      }
      break;
    }

    case 'INVEST_TREASURY_IN_TRADE_ROUTE': {
      const investment = 150 + Math.floor(engine.rng.next() * 100);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - investment);
      // Return on investment after a delay (simplified: immediate smaller return)
      const returns = Math.floor(investment * (0.6 + getContinuous(agent, 'treasurer_market_intuition') / 200));
      engine.treasury.goldBalance += returns;
      adjustContinuous(agent, 'treasurer_market_intuition', 3);
      engine.chronicleSystem.add(year, day,
        `Treasurer ${charName} invested ${investment} gold in trade infrastructure, generating ${returns} gold in immediate returns.`, 'NORMAL');
      break;
    }

    case 'REDUCE_MILITARY_BUDGET': {
      // Creates conflict with Marshal — inter-agent tension
      const savings = 80 + Math.floor(engine.rng.next() * 120);
      engine.treasury.goldBalance += savings;
      engine.resources.manpower = Math.max(0, engine.resources.manpower - 50);
      // Marshal gets insubordination_risk boost
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.categorical?.['role'] === 'MARSHAL') {
          if (c.stateVector.continuous['marshal_insubordination_risk'])
            c.stateVector.continuous['marshal_insubordination_risk'].value = clamp(
              c.stateVector.continuous['marshal_insubordination_risk'].value + 10);
          if (c.stateVector.continuous['envy'])
            c.stateVector.continuous['envy'].value = clamp(
              c.stateVector.continuous['envy'].value + 8);
        }
      });
      engine.alertSystem.queueAlert(
        `Treasurer ${charName} recommended cutting the military budget, saving ${savings} gold. The Marshal is furious.`, 'URGENT');
      engine.chronicleSystem.add(year, day,
        `Military budget cut proposed by ${charName} — treasury benefits, but marshal relations strained.`, 'NORMAL');
      break;
    }

    case 'FALSIFY_ACCOUNTS': {
      // Cover embezzlement or deficit from player sight
      adjustContinuous(agent, 'cunning', 4);
      adjustContinuous(agent, 'corruption', 5);
      adjustContinuous(agent, 'treasurer_record_keeping_pride', -10);
      // 10% chance audit catches it later
      if (engine.rng.next() < 0.1) {
        engine.alertSystem.queueAlert(
          `An independent audit found discrepancies suggesting ${charName} has been falsifying royal accounts!`, 'CRITICAL');
        adjustContinuous(agent, 'fear', 15);
        adjustContinuous(agent, 'stress', 15);
        adjustContinuous(agent, 'loyalty_to_player', -10);
        syncLoyaltyTier(agent);
      } else {
        engine.chronicleSystem.add(year, day,
          `Treasurer ${charName} 'corrected' the royal accounts. Official figures now show a healthy balance.`, 'FLAVOR');
      }
      break;
    }

    case 'CALL_IN_OUTSTANDING_DEBTS': {
      const recovered2 = 120 + Math.floor(engine.rng.next() * 200);
      engine.treasury.goldBalance += recovered2;
      prov.stability = clamp(prov.stability - 2, 0, 100); // debtor anger
      adjustContinuous(agent, 'treasurer_debt_aversion', -3);
      adjustContinuous(agent, 'loyalty_to_player', 2);
      engine.chronicleSystem.add(year, day,
        `Treasurer ${charName} called in ${recovered2} gold in outstanding debts owed to the crown.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PROPOSE_DEBASEMENT': {
      // Short-term coin gain; long-term inflation crisis
      const debased = 400 + Math.floor(engine.rng.next() * 300);
      engine.treasury.goldBalance += debased;
      engine.treasury.inflationRate = (engine.treasury.inflationRate ?? 1.0) + 0.15;
      prov.stability = clamp(prov.stability - 12, 0, 100);
      adjustContinuous(agent, 'treasurer_inflation_anxiety', 20);
      adjustContinuous(agent, 'treasurer_fiscal_conservatism', -10);
      engine.alertSystem.queueAlert(
        `ECONOMIC WARNING: Treasurer ${charName} debased the currency — ${debased} gold injected but inflation surges!`, 'URGENT');
      engine.chronicleSystem.add(year, day,
        `Currency debasement ordered by ${charName} — silver content of coins reduced by 20%. Prices will rise.`, 'URGENT');
      // Massive ripple to all merchants
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'MASTER_MERCHANT') {
          if (c.stateVector.continuous['market_confidence'])
            c.stateVector.continuous['market_confidence'].value = clamp(
              c.stateVector.continuous['market_confidence'].value - 20);
          if (c.stateVector.continuous['hoarding_drive'])
            c.stateVector.continuous['hoarding_drive'].value = clamp(
              c.stateVector.continuous['hoarding_drive'].value + 15);
        }
        // Peasant cohorts: hunger rises
        if (c.isAlive && c.stateVector?.characterType === 'PEASANT_COHORT') {
          if (c.stateVector.continuous['hunger'])
            c.stateVector.continuous['hunger'].value = clamp(
              c.stateVector.continuous['hunger'].value + 5);
          if (c.stateVector.continuous['unrest'])
            c.stateVector.continuous['unrest'].value = clamp(
              c.stateVector.continuous['unrest'].value + 3);
        }
      });
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // COURT PRIEST ACTIONS (spec §4.8)
    // ════════════════════════════════════════════════════════════════════════

    case 'PREACH_IN_PROVINCE': {
      // Raise piety, lower unrest (spec: raise piety, lower unrest)
      prov.stability = clamp(prov.stability + 3, 0, 100);
      prov.loyalty = clamp(prov.loyalty + 2, 0, 100);
      // Boost piety in nearby peasant cohorts
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'PEASANT_COHORT' &&
            c.stateVector.provinceId === agent.provinceId) {
          if (c.stateVector.continuous['piety'])
            c.stateVector.continuous['piety'].value = clamp(
              c.stateVector.continuous['piety'].value + 15);
          if (c.stateVector.continuous['unrest'])
            c.stateVector.continuous['unrest'].value = clamp(
              c.stateVector.continuous['unrest'].value - 10);
          if (c.stateVector.continuous['hope'])
            c.stateVector.continuous['hope'].value = clamp(
              c.stateVector.continuous['hope'].value + 5);
        }
      });
      adjustContinuous(agent, 'courtpriest_zealotry', 1);
      adjustContinuous(agent, 'loyalty_to_player', 1);
      engine.chronicleSystem.add(year, day,
        `Court Priest ${charName} preached among the people of ${prov.name}, raising piety and calming unrest.`, 'FLAVOR');
      syncLoyaltyTier(agent);
      break;
    }

    case 'WARN_OF_EXCOMMUNICATION': {
      // Public warning that shakes vassal loyalty and peasant piety
      engine.alertSystem.queueAlert(
        `Court Priest ${charName} has publicly warned that the crown risks excommunication if current behaviour continues!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `${charName} issued a formal ecclesiastical warning — the threat of excommunication now hangs over the realm.`, 'CRITICAL');
      // Vassal lords get loyalty hit as they fear for their souls
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'VASSAL_LORD') {
          if (c.stateVector.continuous['loyalty_to_liege'])
            c.stateVector.continuous['loyalty_to_liege'].value = clamp(
              c.stateVector.continuous['loyalty_to_liege'].value - 8);
          if (c.stateVector.continuous['suspicion_of_liege'])
            c.stateVector.continuous['suspicion_of_liege'].value = clamp(
              c.stateVector.continuous['suspicion_of_liege'].value + 10);
        }
        // Peasant cohorts: piety rises
        if (c.isAlive && c.stateVector?.characterType === 'PEASANT_COHORT') {
          if (c.stateVector.continuous['piety'])
            c.stateVector.continuous['piety'].value = clamp(
              c.stateVector.continuous['piety'].value + 8);
          if (c.stateVector.continuous['unrest'])
            c.stateVector.continuous['unrest'].value = clamp(
              c.stateVector.continuous['unrest'].value + 5);
        }
      });
      adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 5);
      adjustContinuous(agent, 'courtpriest_political_ambition', 3);
      break;
    }

    case 'NEGOTIATE_WITH_HIGH_PRIEST': {
      const outcome = engine.rng.next();
      if (outcome < 0.4 && getContinuous(agent, 'loyalty_to_player') > 50) {
        // Favourable outcome for player
        prov.stability = clamp(prov.stability + 5, 0, 100);
        adjustContinuous(agent, 'loyalty_to_player', 3);
        engine.chronicleSystem.add(year, day,
          `${charName}'s negotiations with the High Priest produced a favourable compact for the crown.`, 'NORMAL');
      } else if (outcome < 0.7) {
        // Neutral
        engine.chronicleSystem.add(year, day,
          `${charName} met with the High Priest — talks are ongoing with no firm resolution.`, 'FLAVOR');
      } else {
        // Church wins concession
        engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 100);
        adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 5);
        engine.alertSystem.queueAlert(
          `${charName}'s negotiations with the High Priest resulted in a concession — 100 gold diverted to the church.`, 'URGENT');
      }
      syncLoyaltyTier(agent);
      break;
    }

    case 'DEMAND_CHURCH_TAX_EXEMPTION': {
      engine.pendingEvents.push({
        id: `event_church_tax_${nanoid()}`,
        type: 'COURT_PETITION',
        title: 'Church Demands Tax Exemption',
        description: `Court Priest ${charName} formally demands that church lands be exempted from all taxation. Granting this will reduce annual revenue by an estimated ${Math.floor(150 + engine.rng.next() * 200)} gold, but will improve relations with the clergy and raise piety throughout the realm.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant full exemption', action: 'GRANT_TAX_EXEMPTION', effect: '-150 gold/year, +Piety, +Priest loyalty' },
          { label: 'Grant partial exemption', action: 'PARTIAL_EXEMPTION', effect: '-75 gold/year, moderate piety gain' },
          { label: 'Refuse outright', action: 'IGNORE', effect: '+Priest church_loyalty, -Priest player_loyalty, public tension' },
        ],
      });
      adjustContinuous(agent, 'courtpriest_political_ambition', 3);
      adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 3);
      break;
    }

    case 'CALL_FOR_CRUSADE_PARTICIPATION': {
      engine.pendingEvents.push({
        id: `event_crusade_${nanoid()}`,
        type: 'COURT_PETITION',
        title: 'Court Priest Calls for Crusade',
        description: `${charName} is urging the realm to join an active crusade. Participation would commit troops and treasury resources but would gain enormous prestige and church goodwill. Non-participation risks the label of faithless ruler.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Join the crusade fully', action: 'JOIN_CRUSADE', effect: '-500 gold, -500 manpower, +Prestige, +Piety' },
          { label: 'Send a token force', action: 'TOKEN_CRUSADE', effect: '-100 gold, -100 manpower, moderate prestige' },
          { label: 'Decline to participate', action: 'IGNORE', effect: '-Piety, -Priest loyalty, potential excommunication risk' },
        ],
      });
      adjustContinuous(agent, 'courtpriest_crusade_enthusiasm', -5); // partially satisfied
      adjustContinuous(agent, 'courtpriest_zealotry', 2);
      break;
    }

    case 'CONDUCT_INQUISITION': {
      // Expose heretics — may produce false positives if inquisition_drive is extreme
      const inquisitionDrive = getContinuous(agent, 'courtpriest_inquisition_drive');
      const falsePositiveChance = Math.max(0, (inquisitionDrive - 60) / 100);
      const foundHeretic = engine.rng.next() < 0.4;
      const falsePositive = !foundHeretic && engine.rng.next() < falsePositiveChance;

      if (foundHeretic) {
        prov.stability = clamp(prov.stability + 3, 0, 100);
        adjustContinuous(agent, 'courtpriest_inquisition_drive', 2);
        adjustContinuous(agent, 'courtpriest_heresy_sensitivity', 2);
        adjustContinuous(agent, 'loyalty_to_player', 1);
        engine.chronicleSystem.add(year, day,
          `Court Priest ${charName} conducted an inquisition in ${prov.name} and exposed genuine heretics.`, 'URGENT');
        engine.alertSystem.queueAlert(
          `Inquisition in ${prov.name}: heretics exposed and brought before the court.`, 'URGENT');
      } else if (falsePositive) {
        prov.stability = clamp(prov.stability - 8, 0, 100);
        prov.loyalty = clamp(prov.loyalty - 6, 0, 100);
        adjustContinuous(agent, 'courtpriest_inquisition_drive', 3); // zealotry feeds on itself
        engine.alertSystem.queueAlert(
          `The inquisition in ${prov.name} produced FALSE accusations — an innocent person was condemned! Stability drops sharply.`, 'CRITICAL');
        engine.chronicleSystem.add(year, day,
          `${charName}'s inquisition in ${prov.name} went too far — false accusations sparked outrage among the population.`, 'CRITICAL');
      } else {
        engine.chronicleSystem.add(year, day,
          `The inquisition in ${prov.name} found no evidence of heresy — the province is declared orthodox.`, 'FLAVOR');
        prov.stability = clamp(prov.stability + 1, 0, 100);
      }
      syncLoyaltyTier(agent);
      break;
    }

    case 'GRANT_ABSOLUTION': {
      // Reduce piety penalty from player sinful actions
      prov.stability = clamp(prov.stability + 4, 0, 100);
      adjustContinuous(agent, 'loyalty_to_player', 3);
      adjustContinuous(agent, 'compassion', 2);
      adjustContinuous(agent, 'courtpriest_zealotry', -2); // mercy softens zealotry
      engine.chronicleSystem.add(year, day,
        `Court Priest ${charName} granted absolution, lifting spiritual penalties and calming the faithful.`, 'NORMAL');
      engine.alertSystem.queueAlert(
        `${charName} granted royal absolution — piety penalties reduced, stability improved.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'PERFORM_WEDDING': {
      // Diplomatic marriage ceremony — raises prestige
      const prestigeGain2 = 15 + Math.floor(getContinuous(agent, 'political_savvy') * 0.3);
      prov.stability = clamp(prov.stability + 3, 0, 100);
      engine.treasury.goldBalance -= 30; // ceremony costs
      adjustContinuous(agent, 'loyalty_to_player', 2);
      adjustContinuous(agent, 'compassion', 1);
      engine.chronicleSystem.add(year, day,
        `Court Priest ${charName} officiated a royal wedding ceremony, raising the realm's prestige by ${prestigeGain2}.`, 'NORMAL');
      syncLoyaltyTier(agent);
      break;
    }

    case 'THREATEN_INTERDICT': {
      // Province-level religious sanction — extreme action
      prov.stability = clamp(prov.stability - 15, 0, 100);
      prov.loyalty = clamp(prov.loyalty - 10, 0, 100);
      adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 10);
      adjustContinuous(agent, 'courtpriest_political_ambition', 5);
      adjustContinuous(agent, 'loyalty_to_player', -10);
      engine.alertSystem.queueAlert(
        `CRISIS: Court Priest ${charName} threatened to place ${prov.name} under Interdict! Church-state relations have collapsed.`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `${charName} invoked the threat of Interdict over ${prov.name} — all religious services suspended pending royal compliance.`, 'CRITICAL');
      // Ripple: all vassal lords get loyalty hit (fear of ecclesiastical consequences)
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'VASSAL_LORD') {
          if (c.stateVector.continuous['loyalty_to_liege'])
            c.stateVector.continuous['loyalty_to_liege'].value = clamp(
              c.stateVector.continuous['loyalty_to_liege'].value - 12);
          if (c.stateVector.continuous['religious_fervor'])
            c.stateVector.continuous['religious_fervor'].value = clamp(
              c.stateVector.continuous['religious_fervor'].value + 10);
        }
      });
      recordMemory(sv, 'GENERAL', 'player', currentTick, 85, 'NEGATIVE',
        `${charName} threatened Interdict over the realm`, false);
      syncLoyaltyTier(agent);
      break;
    }

    case 'COVERTLY_REPORT_TO_HIGH_PRIEST': {
      // Secret report — reduces intel, raises church_loyalty
      engine.resources.goods['intel'] = Math.max(0,
        (engine.resources.goods['intel'] || 0) - 5);
      adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 4);
      adjustContinuous(agent, 'discretion', 1);
      adjustContinuous(agent, 'loyalty_to_player', -2);
      // 8% chance player's spymaster detects it
      if (engine.rng.next() < 0.08) {
        engine.alertSystem.queueAlert(
          `Intelligence: Court Priest ${charName} appears to be sending private reports to the High Priest.`, 'URGENT');
      }
      syncLoyaltyTier(agent);
      break;
    }

    case 'RADICALIZE_CLERGY': {
      // Amplifies religious tension across the realm — triggered by high zealotry
      prov.stability = clamp(prov.stability - 18, 0, 100);
      // Ripple through ALL provinces: unrest rises, piety rises
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === prov.realmId) {
          p.stability = clamp(p.stability - 5, 0, 100);
          p.loyalty = clamp(p.loyalty - 3, 0, 100);
        }
      });
      adjustContinuous(agent, 'courtpriest_zealotry', 5);
      adjustContinuous(agent, 'courtpriest_political_ambition', 5);
      adjustContinuous(agent, 'courtpriest_church_loyalty_vs_player', 8);
      adjustContinuous(agent, 'loyalty_to_player', -15);
      engine.alertSystem.queueAlert(
        `CRISIS: Court Priest ${charName} is radicalizing the clergy against secular authority! Religious tension surges across the realm.`, 'CRITICAL');
      engine.chronicleSystem.add(year, day,
        `${charName}'s inflammatory preaching has radicalized the clergy — a religious crisis grips the realm.`, 'CRITICAL');
      // Peasant cohorts everywhere become more pious and more unruly
      Object.values(engine.characters).forEach((c: any) => {
        if (c.isAlive && c.stateVector?.characterType === 'PEASANT_COHORT') {
          if (c.stateVector.continuous['piety'])
            c.stateVector.continuous['piety'].value = clamp(
              c.stateVector.continuous['piety'].value + 12);
          if (c.stateVector.continuous['unrest'])
            c.stateVector.continuous['unrest'].value = clamp(
              c.stateVector.continuous['unrest'].value + 8);
        }
      });
      recordMemory(sv, 'GENERAL', 'player', currentTick, 90, 'NEGATIVE',
        `${charName} radicalized the clergy against the crown`, true);
      syncLoyaltyTier(agent);
      break;
    }
  }
}
