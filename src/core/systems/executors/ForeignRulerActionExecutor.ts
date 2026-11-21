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

export function executeForeignRulerAction(
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
  const realmName = prov.name; // For foreign rulers, their province is their realm's capital

  switch (actionId) {
    // ── DIPLOMATIC ──
    case 'PROPOSE_ALLIANCE':
      engine.pendingEvents.push({
        id: 'event_fr_alliance_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Alliance Proposal: ${realmName}`,
        description: `Ruler ${charName} of ${realmName} has proposed a formal military and economic alliance.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Accept the Alliance', action: 'ACCEPT', effect: 'Forges formal pact, +30 respect' },
          { label: 'Decline respectfully', action: 'DECLINE', effect: '-10 respect' }
        ]
      });
      break;
    case 'BREAK_ALLIANCE':
      engine.chronicleSystem.add(year, day, `King ${charName} of ${realmName} has officially broken their alliance with us!`, 'URGENT');
      engine.alertSystem.queueAlert(`Alliance with ${realmName} broken!`, 'URGENT');
      break;
    case 'FORM_COALITION_AGAINST_PLAYER':
      engine.alertSystem.queueAlert(`Spies report that ${realmName} is forming a grand coalition against you!`, 'CRITICAL');
      break;
    case 'OFFER_ROYAL_MARRIAGE':
      engine.chronicleSystem.add(year, day, `${realmName} offered a royal marriage to solidify relations.`, 'NORMAL');
      break;
    case 'SEND_INSULT':
      engine.alertSystem.queueAlert(`An envoy from ${realmName} delivered a public and humiliating insult to your court!`, 'URGENT');
      break;
    case 'DEMAND_TRIBUTE':
      engine.pendingEvents.push({
        id: 'event_fr_tribute_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Demand for Tribute: ${realmName}`,
        description: `The aggressive forces of ${realmName} demand tribute of 500 gold, or face war!`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Pay the Tribute (500 gold)', action: 'SPEND_GOLD', amount: 500, effect: 'Avoids war, lose gold' },
          { label: 'Refuse!', action: 'REFUSE', effect: 'War imminent' }
        ]
      });
      break;

    // ── MILITARY ──
    case 'DECLARE_WAR':
      engine.alertSystem.queueAlert(`WAR DECLARED! ${realmName} has formally declared war on your realm!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day, `The armies of ${realmName} march! War has been declared by ${charName}.`, 'CRITICAL');
      const armyId = `army_invasion_${nanoid(8)}`;
      engine.armies[armyId] = {
        id: armyId,
        name: `Grand Host of ${realmName}`,
        realmId: prov.realmId,
        commanderId: agent.id,
        location: prov.coords,
        destination: null,
        stance: 'MARCH',
        units: [], morale: 100,
        officerIds: [], path: [],
        movementPoints: 50, supplyLevel: 100, supplyConvoyId: null,
        discipline: 90, experience: 50, orders: [], pendingOrders: [],
        isExhausted: false, frostbiteRisk: 0, diseases: [], deserterRate: 0,
        loot: 0, attritionDays: 0
      };
      break;
    case 'LAUNCH_RAID':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 100);
      adjustInteger(agent, 'gold', 100);
      engine.alertSystem.queueAlert(`Border raids by forces from ${realmName} have damaged settlements and stolen gold!`, 'URGENT');
      break;
    case 'FUND_REBELS_IN_PLAYER_REALM':
      adjustInteger(agent, 'gold', -200);
      const faction = Object.values(engine.factions).find(f => f.realmId === 'realm_1');
      if (faction) {
        faction.strength = clamp(faction.strength + 10);
        faction.treasuryFunding += 200;
        engine.alertSystem.queueAlert(`Foreign gold from ${realmName} is pouring into the coffers of domestic rebels!`, 'URGENT');
      }
      break;
    case 'OFFER_MILITARY_AID_TO_PLAYER_ENEMY':
      adjustInteger(agent, 'gold', -500);
      engine.chronicleSystem.add(year, day, `${realmName} has sent heavy military aid to your enemies.`, 'URGENT');
      break;

    // ── ECONOMIC ──
    case 'IMPOSE_TRADE_EMBARGO':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 50);
      engine.chronicleSystem.add(year, day, `${realmName} has enacted a strict trade embargo against our merchants.`, 'URGENT');
      break;
    case 'DEBASE_OWN_CURRENCY':
      adjustInteger(agent, 'gold', 500);
      engine.chronicleSystem.add(year, day, `${realmName} debased its currency, flooding their own treasury with cheap coin.`, 'FLAVOR');
      break;
    case 'FLOOD_MARKET':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 100); // Price crash affects player income
      engine.chronicleSystem.add(year, day, `${realmName} flooded the market with cheap goods, hurting our merchants.`, 'NORMAL');
      break;

    // ── INTELLIGENCE ──
    case 'PLANT_SPY_IN_PLAYER_COURT':
      engine.resources.goods['intel'] = Math.max(0, (engine.resources.goods['intel'] || 0) - 10);
      engine.alertSystem.queueAlert(`Spymaster warns: We have a mole feeding information to ${realmName}!`, 'URGENT');
      break;
    case 'EXPOSE_OWN_DOUBLE_AGENT':
      adjustContinuous(agent, 'paranoia', 10);
      engine.chronicleSystem.add(year, day, `A bloody purge of spies occurred in ${realmName}.`, 'NORMAL');
      break;

    // ── INTERNAL ──
    case 'PLAN_INVASION':
      adjustInteger(agent, 'gold', -500);
      engine.alertSystem.queueAlert(`Spies report that ${realmName} is moving troops to the border and gathering supplies. An invasion is imminent!`, 'CRITICAL');
      break;
    case 'PURGE_DISLOYAL_VASSAL':
      adjustContinuous(agent, 'cruelty', 5);
      engine.chronicleSystem.add(year, day, `King ${charName} of ${realmName} brutally purged a disloyal vassal.`, 'FLAVOR');
      break;

    // ── REACTIVE ──
    case 'RESPOND_TO_EXCOMMUNICATION':
      engine.chronicleSystem.add(year, day, `${realmName} responded furiously to their excommunication by the Holy See.`, 'URGENT');
      break;
    case 'RESPOND_TO_PLAGUE':
      engine.chronicleSystem.add(year, day, `${realmName} locked down its borders in response to the spreading plague.`, 'NORMAL');
      break;
  }
}
