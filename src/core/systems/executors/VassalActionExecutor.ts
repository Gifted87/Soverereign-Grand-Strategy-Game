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

export function executeVassalAction(
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

  switch (actionId) {
    // ─── LOYAL ACTIONS ───
    case 'ANSWER_LEVY_CALL':
      engine.resources.manpower += 200;
      adjustContinuous(agent, 'fatigue', 10);
      engine.chronicleSystem.add(year, day, `${charName} answered the levy call, sending 200 fresh troops to the royal army.`, 'NORMAL');
      break;

    case 'PAY_TAXES_IN_FULL':
      engine.treasury.goldBalance += 150;
      adjustInteger(agent, 'gold', -150);
      engine.chronicleSystem.add(year, day, `${charName} paid their seasonal taxes in full to the crown.`, 'FLAVOR');
      break;

    case 'SHARE_INTELLIGENCE':
      engine.resources.goods['intel'] = (engine.resources.goods['intel'] || 0) + 10;
      engine.alertSystem.queueAlert(`Lord ${char.firstName} shared valuable court intelligence with your Spymaster.`, 'FLAVOR');
      break;

    case 'SUPPORT_PLAYER_LAW':
      engine.provinces['prov_1'].stability = clamp(engine.provinces['prov_1'].stability + 2);
      adjustContinuous(agent, 'loyalty_to_liege', 2);
      break;

    case 'OFFER_PERSONAL_LOAN':
      engine.treasury.goldBalance += 500;
      adjustInteger(agent, 'gold', -500);
      engine.alertSystem.queueAlert(`${charName} has offered a 500 gold loan to stabilize the realm treasury!`, 'URGENT');
      engine.chronicleSystem.add(year, day, `${charName} stepped in to bail out the royal treasury with a personal loan.`, 'NORMAL');
      break;

    case 'ATTEND_COURT':
      adjustContinuous(agent, 'fatigue', 5);
      adjustContinuous(agent, 'loyalty_to_liege', 1);
      engine.chronicleSystem.add(year, day, `${charName} arrived at the capital to attend court.`, 'FLAVOR');
      break;

    case 'ARRANGE_MARRIAGE_FOR_ALLIANCE':
      adjustContinuous(agent, 'political_savvy', 5);
      engine.chronicleSystem.add(year, day, `${charName} arranged a strategic marriage, strengthening realm ties.`, 'NORMAL');
      break;

    case 'LEAD_CAMPAIGN_IN_PLAYER_NAME':
      adjustContinuous(agent, 'martial_confidence', 5);
      engine.chronicleSystem.add(year, day, `${charName} led a minor border skirmish in the name of the Crown, returning victorious.`, 'NORMAL');
      break;

    case 'VOLUNTEER_COUNSEL':
      engine.provinces['prov_1'].stability = clamp(engine.provinces['prov_1'].stability + 1);
      break;

    // ─── SELF-INTEREST ACTIONS ───
    case 'IMPROVE_PROVINCE':
      adjustInteger(agent, 'gold', -100);
      prov.roadQuality = clamp(prov.roadQuality + 5);
      prov.fortificationLevel = clamp(prov.fortificationLevel + 0.1, 0, 5);
      engine.chronicleSystem.add(year, day, `${charName} invested heavily in the infrastructure of ${prov.name}.`, 'FLAVOR');
      break;

    case 'RECRUIT_PERSONAL_ARMY':
      adjustInteger(agent, 'gold', -150);
      adjustInteger(agent, 'personal_army_size', 300);
      engine.alertSystem.queueAlert(`Intelligence reports that ${charName} is privately mustering troops.`, 'NORMAL');
      break;

    case 'ARRANGE_PRIVATE_MARRIAGE':
      adjustContinuous(agent, 'ambition', 5);
      engine.chronicleSystem.add(year, day, `${charName} arranged a private marriage without consulting the crown.`, 'FLAVOR');
      break;

    case 'BRIBE_PLAYER_ADVISOR':
      adjustInteger(agent, 'gold', -200);
      engine.alertSystem.queueAlert(`Suspicious gold transfers suggest ${charName} is attempting to bribe court officials.`, 'URGENT');
      break;

    case 'INVESTIGATE_NEIGHBOR_VASSAL':
      adjustContinuous(agent, 'paranoia', -5);
      break;

    case 'PETITION_LIEGE':
      engine.pendingEvents.push({
        id: 'event_petition_liege_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Vassal Petition: ${charName}`,
        description: `Lord ${char.firstName} requests lower taxes and a minor court title.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant request', action: 'GRANT', effect: '+15 loyalty, -100 gold' },
          { label: 'Deny request', action: 'DENY', effect: '-20 loyalty, +5 discontent' }
        ]
      });
      break;

    case 'ENGAGE_IN_TRADE':
      adjustInteger(agent, 'gold', 50);
      adjustContinuous(agent, 'greed', 2);
      break;

    case 'SPREAD_RUMOR':
      adjustContinuous(agent, 'cunning', 2);
      break;

    case 'STOCKPILE_FOOD':
      adjustInteger(agent, 'gold', -50);
      if (prov.stockpiles) prov.stockpiles.food = (prov.stockpiles.food || 0) + 100;
      break;

    case 'BUILD_PRIVATE_ALLIANCE':
      adjustContinuous(agent, 'independence_drive', 5);
      engine.chronicleSystem.add(year, day, `${charName} signed a private defense pact with neighboring lords.`, 'URGENT');
      break;

    case 'MANAGE_OWN_COURT':
      adjustContinuous(agent, 'popularity', 2);
      break;

    // ─── DISCONTENTED ACTIONS ───
    case 'DELAY_TAX_PAYMENT':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 50); // Represents expected tax not arriving
      adjustInteger(agent, 'gold', 50);
      adjustContinuous(agent, 'cunning', 2);
      engine.alertSystem.queueAlert(`${charName} has delayed sending their seasonal taxes to the capital!`, 'URGENT');
      break;

    case 'DRAG_FEET_ON_LEVY':
      engine.resources.manpower = Math.max(0, engine.resources.manpower - 100);
      engine.alertSystem.queueAlert(`${charName} is dragging their feet on supplying levies.`, 'URGENT');
      break;

    case 'REFUSE_CAMPAIGN':
      engine.chronicleSystem.add(year, day, `${charName} outright refused the royal summons to join the campaign.`, 'CRITICAL');
      engine.alertSystem.queueAlert(`${charName} REFUSED to march with the royal army!`, 'CRITICAL');
      adjustContinuous(agent, 'loyalty_to_liege', -10);
      break;

    case 'RECRUIT_FACTION':
      adjustContinuous(agent, 'faction_pull', 15);
      engine.alertSystem.queueAlert(`Spymaster warns: ${charName} is actively courting other nobles to form an independence faction.`, 'URGENT');
      break;

    case 'FUND_OPPOSITION':
      adjustInteger(agent, 'gold', -300);
      engine.alertSystem.queueAlert(`Rebel elements in your realm appear to be receiving dark money from ${prov.name}.`, 'URGENT');
      break;

    case 'SEEK_FOREIGN_BACKING':
      engine.chronicleSystem.add(year, day, `Spies intercepted letters from ${charName} to foreign rulers, seeking support for a rebellion.`, 'CRITICAL');
      break;

    case 'DEMAND_CONCESSIONS':
      engine.pendingEvents.push({
        id: 'event_demand_' + nanoid(),
        type: 'COURT_PETITION',
        title: `VASSAL DEMAND: ${charName}`,
        description: `Lord ${char.firstName} issues an ultimatum: lower Crown Authority or face consequences.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Yield to the demand', action: 'LOWER_AUTHORITY', effect: 'Authority drops, avoids war' },
          { label: 'Refuse', action: 'REFUSE', effect: 'Massive loyalty hit, possible civil war' }
        ]
      });
      break;

    case 'FORGE_CLAIM':
      adjustContinuous(agent, 'ambition', 5);
      engine.chronicleSystem.add(year, day, `${charName} fabricated a historical claim on the capital province!`, 'URGENT');
      break;

    // ─── HOSTILE ACTIONS ───
    case 'DECLARE_INDEPENDENCE':
      sv.categorical['political_stance'] = 'IN_REVOLT';
      engine.alertSystem.queueAlert(`TREASON! ${charName} has raised their banners in open rebellion and declared independence!`, 'CRITICAL');
      engine.chronicleSystem.add(year, day, `The War of Independence begins as ${charName} declares themselves sovereign!`, 'CRITICAL');
      prov.ownerId = agent.id;
      prov.realmId = `realm_${agent.id}`;
      // Spawn rebel army
      const armyId = `army_rebel_${nanoid(8)}`;
      engine.armies[armyId] = {
        id: armyId,
        name: `Rebel Host of ${prov.name}`,
        realmId: prov.realmId,
        commanderId: agent.id,
        location: prov.coords,
        stance: 'BESIEGE',
        units: [], morale: 100,
        officerIds: [], path: [],
        movementPoints: 50, supplyLevel: 100, supplyConvoyId: null,
        discipline: 80, experience: 30, orders: [], pendingOrders: [],
        isExhausted: false, frostbiteRisk: 0, diseases: [], deserterRate: 0,
        loot: 0, attritionDays: 0, destination: null
      };
      break;

    case 'SEIZE_PROVINCE':
      engine.alertSystem.queueAlert(`${charName}'s private forces have unlawfully seized border territories!`, 'CRITICAL');
      break;

    case 'ASSASSINATE_PLAYER_ADVISOR':
      engine.alertSystem.queueAlert(`An assassination attempt on a royal advisor was narrowly thwarted! The trail leads to ${charName}.`, 'CRITICAL');
      break;

    case 'INVITE_FOREIGN_INVASION':
      engine.chronicleSystem.add(year, day, `TRAITORS! ${charName} has unlocked border forts to allow foreign forces to march on the capital!`, 'CRITICAL');
      break;

    case 'BETRAY_MILITARY_ORDERS':
      engine.alertSystem.queueAlert(`${charName}'s flank abandoned the battlefield during combat maneuvers!`, 'CRITICAL');
      break;

    case 'POISON_PLAYER':
      engine.alertSystem.queueAlert(`Your food taster collapsed! Someone attempted to poison you. Suspect: ${charName}.`, 'CRITICAL');
      break;

    // ─── REDEMPTION ACTIONS ───
    case 'ACCEPT_PARDON':
      sv.categorical['political_stance'] = 'LOYAL';
      adjustContinuous(agent, 'loyalty_to_liege', 40);
      adjustContinuous(agent, 'grudge_weight', -20);
      engine.chronicleSystem.add(year, day, `${charName} accepted the royal pardon and renewed their vows of fealty.`, 'NORMAL');
      break;

    case 'SUBMIT_UNDER_TERMS':
      sv.categorical['political_stance'] = 'LOYAL';
      adjustContinuous(agent, 'loyalty_to_liege', 20);
      engine.chronicleSystem.add(year, day, `${charName} surrendered their rebellion under negotiated terms.`, 'NORMAL');
      break;
  }
}
