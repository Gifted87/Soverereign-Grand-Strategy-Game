/**
 * HighPriestActionExecutor.ts
 *
 * Concrete world effects for every High Priest (Tier 3) action.
 * The High Priest is the most powerful religious agent in the simulation.
 * Covers all 25 actions defined in highPriestActions.ts.
 *
 * Key loops driven by this executor:
 *   §6.4 The Church Power Loop
 *   §9.5 Religion as a Political Tool
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { NpcAgent } from '../NpcActionExecutor';
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

export function executeHighPriestAction(
  actionId: string,
  agent: NpcAgent,
  engine: GameLoop,
  currentTick: number
): void {
  const sv = agent.stateVector;
  const prov = engine.provinces[agent.provinceId] ?? Object.values(engine.provinces)[0];
  const char = engine.characters[agent.id];
  const year = engine.clock.currentYear;
  const day = engine.clock.currentDay;

  const charName = char ? `${char.firstName} ${char.lastName}` : 'The High Priest';
  const titleName = 'High Priest';

  // Helper: apply piety rise across all provinces
  const raiseProvincePiety = (amount: number) => {
    Object.values(engine.provinces).forEach((p: any) => {
      if (p.realmId === 'realm_1') {
        p.piety = clamp((p.piety ?? 50) + amount);
      }
    });
  };

  switch (actionId) {

    // ── DOCTRINAL / AUTHORITY ──────────────────────────────────────────────

    case 'HP_EXCOMMUNICATE_RULER':
      sv.categorical['ruler_excommunicated'] = 'true';
      // Propagate to world state flags
      // if (engine.worldFlags) engine.worldFlags['ruler_excommunicated'] = 'true';
      // All vassal lords suffer loyalty hit — their souls are at risk
      Object.values(engine.characters).forEach((c: any) => {
        if (c.role === 'VASSAL_LORD' && c.realmId === 'realm_1') {
          const agentSv = (c as any).stateVector;
          if (agentSv?.continuous?.loyalty_to_liege) {
            agentSv.continuous.loyalty_to_liege.value = clamp(
              agentSv.continuous.loyalty_to_liege.value - 20
            );
          }
        }
      });
      raiseProvincePiety(10);
      engine.alertSystem.queueAlert(
        `EXCOMMUNICATION! The ${titleName} has cast you out of the Holy Church! Vassal loyalty is collapsing!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `The ${titleName} ${charName} formally excommunicated the Crown. The realm holds its breath.`,
        'CRITICAL'
      );
      break;

    case 'HP_LIFT_EXCOMMUNICATION':
      sv.categorical['ruler_excommunicated'] = 'false';
      // if (engine.worldFlags) engine.worldFlags['ruler_excommunicated'] = 'false';
      adjustContinuous(agent, 'respect_for_player', 15);
      engine.alertSystem.queueAlert(
        `The ${titleName} has lifted the Excommunication. The Church and Crown are reconciled.`,
        'NORMAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} lifted the excommunication, restoring the Crown to full communion with the Church.`,
        'NORMAL'
      );
      break;

    case 'HP_CALL_CRUSADE':
      // if (engine.worldFlags) engine.worldFlags['crusade_active'] = 'true';
      raiseProvincePiety(20);
      adjustContinuous(agent, 'political_ambition', 10);
      engine.alertSystem.queueAlert(
        `CRUSADE CALLED! The ${titleName} has proclaimed a Holy Crusade. Lords across the realm are called to take the cross!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} issued the call to Crusade. The faithful rally under the banner of the Church.`,
        'CRITICAL'
      );
      break;

    case 'HP_ISSUE_PAPAL_BULL':
      raiseProvincePiety(5);
      adjustContinuous(agent, 'political_ambition', 5);
      engine.chronicleSystem.add(year, day,
        `The ${titleName} ${charName} issued a Papal Bull — a formal decree carrying the full weight of Church authority.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(`A Papal Bull has been issued. The Church's will is made law.`, 'NORMAL');
      break;

    case 'HP_PLACE_INTERDICT':
      // if (engine.worldFlags) engine.worldFlags['interdict_active'] = 'true';
      // No sacraments means no piety recovery
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === 'realm_1') {
          p.stability = clamp((p.stability ?? 50) - 10, 0, 100);
          p.loyalty = clamp((p.loyalty ?? 50) - 8, 0, 100);
        }
      });
      engine.alertSystem.queueAlert(
        `INTERDICT! The ${titleName} has placed your entire realm under Interdict! Sacraments are forbidden, stability collapses!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} imposed an Interdict. No mass, no baptism, no burial rites — the realm is spiritually suffocating.`,
        'CRITICAL'
      );
      break;

    case 'HP_LIFT_INTERDICT':
      // if (engine.worldFlags) engine.worldFlags['interdict_active'] = 'false';
      raiseProvincePiety(8);
      engine.alertSystem.queueAlert(
        `The Interdict has been lifted! Sacraments resume and the people rejoice.`,
        'NORMAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} lifted the Interdict, restoring Church services to the suffering realm.`,
        'NORMAL'
      );
      break;

    case 'HP_DECLARE_HERESY':
      adjustContinuous(agent, 'zealotry', 5);
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === 'realm_1') {
          p.stability = clamp((p.stability ?? 50) - 5, 0, 100);
        }
      });
      engine.alertSystem.queueAlert(
        `The ${titleName} declared a specific doctrine heresy! Religious tension rises across the realm.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} formally declared a local doctrine heresy. Witch-finders and preachers fan out across the provinces.`,
        'URGENT'
      );
      break;

    case 'HP_CANONIZE_SAINT':
      raiseProvincePiety(15);
      adjustContinuous(agent, 'prestige_sensitivity', -5); // satisfied their prestige drive
      engine.chronicleSystem.add(year, day,
        `${charName} canonized a new saint. Pilgrims flood the roads and piety surges across the realm.`,
        'NORMAL'
      );
      break;

    // ── POLITICAL ─────────────────────────────────────────────────────────

    case 'HP_DEMAND_CHURCH_LAND':
      engine.pendingEvents.push({
        id: 'event_hp_land_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Church Demands Land: ${charName}`,
        description: `The ${titleName} formally demands the Crown cede three border manors to Church ownership in perpetuity.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant the Church its land', action: 'GRANT', effect: '+30 High Priest relations, -3 provinces, +10 piety' },
          { label: 'Refuse — Crown holds its lands', action: 'REFUSE', effect: '-25 High Priest relations, risk of Interdict' },
        ],
      });
      adjustContinuous(agent, 'political_ambition', 3);
      break;

    case 'HP_APPOINT_BISHOP':
      adjustContinuous(agent, 'network_investment', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} appointed a Church loyalist as Bishop, bypassing Crown nominations.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `The ${titleName} appointed a new Bishop without consulting the Crown. Church authority expands.`,
        'NORMAL'
      );
      break;

    case 'HP_SUPPORT_SUCCESSION_CLAIMANT':
      adjustContinuous(agent, 'political_ambition', 8);
      engine.alertSystem.queueAlert(
        `The ${titleName} has publicly endorsed a rival claimant to the throne — the Church backs your enemies!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} endorsed a succession claimant, fracturing the realm's unity around the Crown.`,
        'CRITICAL'
      );
      break;

    case 'HP_ALLY_WITH_FOREIGN_RULER':
      adjustContinuous(agent, 'political_ambition', 5);
      adjustContinuous(agent, 'network_investment', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} formed a secret alliance with a foreign ruler, giving the Church a secular military patron.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `Spies report the ${titleName} is meeting with foreign envoys behind closed doors.`,
        'URGENT'
      );
      break;

    case 'HP_SEND_LEGATE':
      adjustContinuous(agent, 'network_investment', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} dispatched a papal legate to a distant province, extending Church oversight.`,
        'NORMAL'
      );
      break;

    case 'HP_COMMUNICATE_CLERGY_NETWORK':
      adjustContinuous(agent, 'network_investment', 3);
      raiseProvincePiety(3);
      engine.chronicleSystem.add(year, day,
        `${charName} communicated orders through the clergy network. Sermons change across the realm.`,
        'FLAVOR'
      );
      break;

    case 'HP_NEGOTIATE_CONCORDAT':
      engine.pendingEvents.push({
        id: 'event_hp_concordat_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Concordat Proposed: ${charName}`,
        description: `The ${titleName} proposes a formal Concordat — a legal settlement defining the boundary between Church and Crown authority.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Sign the Concordat (favor Church)', action: 'ACCEPT', effect: 'Peace with Church, Crown gives up some bishop appointments' },
          { label: 'Counter-propose (favor Crown)', action: 'COUNTER', effect: 'Negotiations continue, tension maintained' },
          { label: 'Refuse all compromise', action: 'REFUSE', effect: 'Conflict with Church escalates' },
        ],
      });
      break;

    // ── INQUISITION ────────────────────────────────────────────────────────

    case 'HP_SUMMON_INQUISITION':
      adjustContinuous(agent, 'zealotry', 10);
      adjustContinuous(agent, 'inquisition_drive', 5);
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === 'realm_1') {
          p.stability = clamp((p.stability ?? 50) - 8, 0, 100);
          p.piety = clamp((p.piety ?? 50) + 10);
        }
      });
      engine.alertSystem.queueAlert(
        `INQUISITION SUMMONED! The ${titleName} unleashed Inquisitors across the realm. Fear and piety both rise.`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} summoned the Inquisition. Inquisitors in black robes now walk every market square.`,
        'CRITICAL'
      );
      break;

    case 'HP_RADICALIZE_REGIONAL_CHURCH':
      adjustContinuous(agent, 'zealotry', 8);
      {
        const targetProv = Object.values(engine.provinces).find((p: any) => p.realmId === 'realm_1');
        if (targetProv) {
          (targetProv as any).stability = clamp(((targetProv as any).stability ?? 50) - 12, 0, 100);
          (targetProv as any).piety = clamp(((targetProv as any).piety ?? 50) + 15);
        }
      }
      engine.alertSystem.queueAlert(
        `Regional clergy have been radicalized by the ${titleName}. Fanatical preaching destabilizes the province.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} pushed radical theology into the regional clergy. Stability suffers but religious fervor soars.`,
        'URGENT'
      );
      break;

    case 'HP_DEMAND_CRUSADE_CONTRIBUTION':
      engine.pendingEvents.push({
        id: 'event_hp_crusade_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Crusade Contribution Demanded`,
        description: `The ${titleName} demands the Crown contribute 400 gold and 500 levies to the Holy Crusade.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Contribute fully (400 gold, 500 troops)', action: 'SPEND_GOLD', amount: 400, effect: '+30 Church relations, +15 piety' },
          { label: 'Contribute partially (200 gold)', action: 'SPEND_GOLD', amount: 200, effect: '+10 Church relations, -5 Church displeasure' },
          { label: 'Refuse', action: 'REFUSE', effect: '-25 Church relations, risk of Interdict' },
        ],
      });
      break;

    // ── PASTORAL ──────────────────────────────────────────────────────────

    case 'HP_BLESS_ARMY':
      engine.chronicleSystem.add(year, day,
        `${charName} personally blessed the royal army before their march. Morale among the troops rises.`,
        'NORMAL'
      );
      // Boost morale on active armies
      Object.values(engine.armies).forEach((a: any) => {
        if (a.realmId === 'realm_1') {
          a.morale = clamp((a.morale ?? 80) + 10, 0, 100);
        }
      });
      break;

    case 'HP_GRANT_ABSOLUTION_TO_RULER':
      adjustContinuous(agent, 'respect_for_player', 10);
      raiseProvincePiety(5);
      engine.chronicleSystem.add(year, day,
        `${charName} granted formal absolution to the Crown for past sins. The weight of guilt is lifted.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(`The ${titleName} granted royal absolution. Church-Crown relations warm.`, 'NORMAL');
      break;

    case 'HP_OFFER_ECCLESIASTICAL_SUPPORT':
      raiseProvincePiety(8);
      adjustContinuous(agent, 'respect_for_player', 8);
      engine.chronicleSystem.add(year, day,
        `${charName} pledged Church support for the Crown's current policies. Clergy across the realm preach loyalty.`,
        'NORMAL'
      );
      break;

    case 'HP_CONDEMN_RULER':
      adjustContinuous(agent, 'respect_for_player', -20);
      adjustContinuous(agent, 'political_ambition', 5);
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === 'realm_1') {
          p.loyalty = clamp((p.loyalty ?? 50) - 10, 0, 100);
        }
      });
      engine.alertSystem.queueAlert(
        `The ${titleName} publicly condemned the Crown's actions from every pulpit in the realm!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} issued a public condemnation of the Crown. Loyalty wavers as the Church speaks against the king.`,
        'CRITICAL'
      );
      break;

    // ── WITHDRAWAL ─────────────────────────────────────────────────────────

    case 'HP_THREATEN_SCHISM':
      adjustContinuous(agent, 'political_ambition', 10);
      engine.alertSystem.queueAlert(
        `CRISIS: The ${titleName} threatened a formal schism — a split of the Church itself if the Crown does not submit!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} threatened to split the Church if the Crown did not yield. The realm stands at the edge of spiritual catastrophe.`,
        'CRITICAL'
      );
      break;

    case 'HP_WITHDRAW_FROM_POLITICS':
      adjustContinuous(agent, 'political_ambition', -20);
      adjustContinuous(agent, 'empathy_for_poor', 10);
      engine.chronicleSystem.add(year, day,
        `${charName} withdrew from political maneuvering, retreating to pure pastoral duties.`,
        'NORMAL'
      );
      break;

    default:
      engine.chronicleSystem.add(year, day,
        `[DEBUG] Unknown High Priest action: ${actionId}`,
        'FLAVOR'
      );
      break;
  }
}
