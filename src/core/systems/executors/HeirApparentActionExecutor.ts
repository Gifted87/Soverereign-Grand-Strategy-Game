/**
 * HeirApparentActionExecutor.ts
 *
 * Concrete world effects for every Heir Apparent (Tier 4) action.
 * The Heir Apparent drives the Succession Arc, court intrigue, and potential civil wars.
 * Covers all 18 actions defined in heirApparentActions.ts.
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

export function executeHeirApparentAction(
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

  const charName = char ? `${char.firstName} ${char.lastName}` : 'The Heir Apparent';

  switch (actionId) {

    // ── SUCCESSION PREPARATION ─────────────────────────────────────────────

    case 'HA_BUILD_POWER_BASE':
      adjustContinuous(agent, 'ambition', 5);
      adjustContinuous(agent, 'competence', 3);
      engine.chronicleSystem.add(year, day,
        `${charName} is actively building a power base in court, quietly assuring lords of future favors.`,
        'NORMAL'
      );
      break;

    case 'HA_COURT_VASSAL_LOYALTY':
      // They syphon loyalty from the ruler to themselves
      adjustContinuous(agent, 'loyalty_to_ruler', -5);
      adjustContinuous(agent, 'ambition', 3);
      engine.chronicleSystem.add(year, day,
        `${charName} hosted a private feast for several key vassals, securing their personal loyalty over the Crown's.`,
        'URGENT'
      );
      break;

    case 'HA_UNDERMINE_SIBLING_RIVAL':
      adjustContinuous(agent, 'paranoia', 5);
      adjustContinuous(agent, 'ruthlessness', 3);
      engine.alertSystem.queueAlert(
        `Court rumors say ${charName} planted false evidence to disgrace a royal sibling. The rivalry turns vicious.`,
        'NORMAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} orchestrated the disgrace of a sibling rival at court.`,
        'NORMAL'
      );
      break;

    case 'HA_REQUEST_MORE_RESPONSIBILITY':
      engine.pendingEvents.push({
        id: 'event_ha_resp_' + nanoid(),
        type: 'COURT_PETITION',
        title: `The Heir Demands Responsibility`,
        description: `${charName} formally requests a seat on the Privy Council and command of the Royal Guard to "prepare for the burden of rule."`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant the requests', action: 'GRANT', effect: 'Heir gains massive influence, +20 loyalty to you' },
          { label: 'Grant a minor title only', action: 'PARTIAL', effect: 'Heir is placated but insulted (-10 loyalty)' },
          { label: 'Refuse — they are not ready', action: 'REFUSE', effect: 'Heir feels humiliated, massive loss of loyalty' },
        ],
      });
      break;

    case 'HA_STUDY_STATECRAFT':
      adjustContinuous(agent, 'competence', 8);
      adjustContinuous(agent, 'openness', 3);
      engine.chronicleSystem.add(year, day,
        `${charName} spent months sequestered with the realm's best scholars and diplomats, mastering statecraft.`,
        'FLAVOR'
      );
      break;

    case 'HA_TRAIN_WITH_MILITARY':
      adjustContinuous(agent, 'martial_inclination', 10);
      adjustContinuous(agent, 'competence', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} rode on patrol with the border cavalry, earning the respect of the officer corps.`,
        'NORMAL'
      );
      break;

    // ── REBELLION / USURPATION ─────────────────────────────────────────────

    case 'HA_PLOT_USURPATION':
      adjustContinuous(agent, 'paranoia', 10);
      adjustContinuous(agent, 'ruthlessness', 10);
      sv.categorical['legal_status'] = 'TRAITOR'; // hidden state
      engine.alertSystem.queueAlert(
        `CRITICAL INTELLIGENCE: Your spymaster has intercepted letters. ${charName} is actively plotting to usurp the throne!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} began laying the groundwork for a coup d'état against their own parent.`,
        'CRITICAL'
      );
      break;

    case 'HA_FLEE_COURT_TO_REBEL':
      adjustContinuous(agent, 'fear_of_ruler', -20); // fear turns to action
      engine.alertSystem.queueAlert(
        `THE HEIR HAS FLED! ${charName} slipped out of the capital in the night and is riding to rally rebellious lords!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} fled the royal court to raise the banner of rebellion in the provinces.`,
        'CRITICAL'
      );
      break;

    case 'HA_ASSASSINATE_RULER':
      engine.pendingEvents.push({
        id: 'event_ha_assassin_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Poison in the Cup!`,
        description: `Your food taster drops dead. The guards drag the trembling cook before you, who confesses: ${charName} paid them to poison your wine!`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Execute the Heir Apparent', action: 'EXECUTE', effect: 'Crisis averted, massive succession instability' },
          { label: 'Imprison the Heir in the tower', action: 'IMPRISON', effect: 'Heir removed from play, but lives' },
          { label: 'Cover it up and forgive them privately', action: 'FORGIVE', effect: 'High risk, +50 heir loyalty (maybe)' },
        ],
      });
      adjustContinuous(agent, 'ruthlessness', 20);
      engine.chronicleSystem.add(year, day,
        `${charName} attempted the ultimate treason — patricide. The realm shudders at the ruthlessness.`,
        'CRITICAL'
      );
      break;

    case 'HA_GATHER_REBEL_ARMY':
      engine.alertSystem.queueAlert(
        `CIVIL WAR! The Heir Apparent ${charName} has gathered a rebel army and claims the throne by force of arms!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} raised a rebel host. A war of succession has begun before the throne is even empty.`,
        'CRITICAL'
      );
      {
        const rebId = `army_heir_${nanoid(8)}`;
        engine.armies[rebId] = {
          id: rebId,
          name: `The Usurper's Host (${charName})`,
          realmId: `heir_rebel_${agent.id}`,
          commanderId: agent.id,
          location: prov?.coords ?? { q: 0, r: 0, s: 0 },
          destination: null,
          stance: 'MARCH',
          units: [], morale: 100,
          officerIds: [], path: [],
          movementPoints: 45, supplyLevel: 90, supplyConvoyId: null,
          discipline: 80, experience: 40, orders: [], pendingOrders: [],
          isExhausted: false, frostbiteRisk: 0, diseases: [], deserterRate: 0,
          loot: 0, attritionDays: 0,
        };
      }
      break;

    // ── SCANDAL & VICE ─────────────────────────────────────────────────────

    case 'HA_ENGAGE_IN_SCANDAL':
      adjustContinuous(agent, 'hedonism', 10);
      adjustContinuous(agent, 'competence', -5);
      engine.alertSystem.queueAlert(
        `Scandal! ${charName} was caught in a highly public, humiliating indiscretion. The prestige of the royal family suffers.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} embarrassed the Crown with a sordid public scandal.`,
        'URGENT'
      );
      break;

    case 'HA_SQUANDER_ROYAL_FUNDS':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 300);
      adjustContinuous(agent, 'hedonism', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} accumulated massive gambling debts, forcing the Crown treasury to quietly pay them off.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(`The Heir has squandered 300 gold from the treasury on frivolous pursuits!`, 'NORMAL');
      break;

    case 'HA_INSULT_POWERFUL_VASSAL':
      adjustContinuous(agent, 'arrogance', 10);
      engine.alertSystem.queueAlert(
        `${charName} publicly insulted a powerful vassal lord at a feast! That lord's loyalty has plummeted.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `The arrogance of ${charName} caused a severe diplomatic incident at court, alienating a key lord.`,
        'URGENT'
      );
      Object.values(engine.characters).forEach(c => {
        if ((c as any).role === 'VASSAL_LORD' && (c as any).realmId === sv.categorical['realm_id']) {
          const vSv = (c as any).stateVector;
          if (vSv?.continuous?.loyalty_to_liege) {
             vSv.continuous.loyalty_to_liege.value = clamp(vSv.continuous.loyalty_to_liege.value - 15);
          }
        }
      });
      break;

    case 'HA_MARRY_IN_SECRET':
      adjustContinuous(agent, 'romanticism', 15);
      adjustContinuous(agent, 'loyalty_to_ruler', -20);
      engine.alertSystem.queueAlert(
        `DISASTER! ${charName} has married a commoner in secret, destroying years of diplomatic marriage planning!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} secretly eloped, discarding their royal duty for love. The court is in uproar.`,
        'CRITICAL'
      );
      break;

    case 'HA_EMBRACE_FOREIGN_CULTURE':
      adjustContinuous(agent, 'traditionalism', -15);
      adjustContinuous(agent, 'openness', 10);
      engine.chronicleSystem.add(year, day,
        `${charName} began wearing foreign fashions and keeping foreign advisors, alarming traditionalists at court.`,
        'NORMAL'
      );
      break;

    // ── RELATIONSHIP WITH RULER ────────────────────────────────────────────

    case 'HA_SEEK_RULERS_APPROVAL':
      adjustContinuous(agent, 'desire_for_approval', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} went to great lengths to execute a royal command perfectly, desperately seeking the Crown's approval.`,
        'FLAVOR'
      );
      break;

    case 'HA_PUBLICLY_DISAGREE_WITH_RULER':
      adjustContinuous(agent, 'arrogance', 5);
      adjustContinuous(agent, 'loyalty_to_ruler', -10);
      engine.alertSystem.queueAlert(
        `${charName} openly contradicted your commands in the middle of a council meeting! The court is murmuring.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} publicly challenged the sovereign's ruling, exposing a rift in the royal family.`,
        'URGENT'
      );
      break;

    case 'HA_RECONCILE_WITH_RULER':
      adjustContinuous(agent, 'loyalty_to_ruler', 25);
      adjustContinuous(agent, 'fear_of_ruler', -10);
      engine.chronicleSystem.add(year, day,
        `${charName} and the sovereign had a private, emotional reconciliation. The royal family stands united again.`,
        'NORMAL'
      );
      break;

    default:
      engine.chronicleSystem.add(year, day,
        `[DEBUG] Unknown Heir Apparent action: ${actionId}`,
        'FLAVOR'
      );
      break;
  }
}
