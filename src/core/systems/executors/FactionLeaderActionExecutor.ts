/**
 * FactionLeaderActionExecutor.ts
 *
 * Concrete world effects for every Survivor Faction Leader (Tier 3) action.
 * Spawned when FORM_SECRET_FACTION fires. Drives the political opposition arc,
 * the Hunger-Revolt loop (§6.1), and Economic Class Polarization (§9.2).
 * Covers all 20 actions defined in factionLeaderActions.ts.
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

export function executeFactionLeaderAction(
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

  const charName = char ? `${char.firstName} ${char.lastName}` : 'The Faction Leader';
  const provName = prov?.name ?? 'the province';

  switch (actionId) {

    // ── FACTION BUILDING ──────────────────────────────────────────────────

    case 'FL_RECRUIT_MEMBER':
      adjustContinuous(agent, 'faction_strength', 5);
      if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 2, 0, 100);
      engine.chronicleSystem.add(year, day,
        `${charName} recruited new members into their secret faction in ${provName}.`,
        'FLAVOR'
      );
      break;

    case 'FL_FUND_FACTION':
      adjustInteger(agent, 'gold', -100);
      adjustContinuous(agent, 'faction_strength', 8);
      engine.chronicleSystem.add(year, day,
        `${charName} poured gold into the faction's coffers, expanding their reach.`,
        'NORMAL'
      );
      break;

    case 'FL_FORM_ALLIANCE_WITH_VASSAL':
      adjustContinuous(agent, 'faction_strength', 15);
      adjustContinuous(agent, 'cunning', 5);
      engine.alertSystem.queueAlert(
        `Spies suspect ${charName}'s secret faction has made an alliance with a disgruntled vassal lord!`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `The secret faction in ${provName} secured the backing of a minor noble. Their power grows.`,
        'URGENT'
      );
      break;

    case 'FL_SPREAD_PROPAGANDA':
      adjustContinuous(agent, 'faction_strength', 8);
      if (prov) {
        prov.loyalty = clamp((prov.loyalty ?? 50) - 5, 0, 100);
        prov.stability = clamp((prov.stability ?? 50) - 3, 0, 100);
      }
      engine.alertSystem.queueAlert(
        `Seditious pamphlets are circulating in ${provName}, bearing the seal of ${charName}'s faction.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `Propaganda from ${charName}'s faction spreads through ${provName}, turning hearts against the Crown.`,
        'URGENT'
      );
      break;

    case 'FL_HOLD_SECRET_MEETING':
      adjustContinuous(agent, 'faction_strength', 10);
      adjustContinuous(agent, 'idealism', 3);
      engine.chronicleSystem.add(year, day,
        `${charName} held a secret council of faction leaders in the dead of night.`,
        'FLAVOR'
      );
      break;

    case 'FL_PURGE_WEAK_MEMBERS':
      adjustContinuous(agent, 'faction_strength', -5); // Lost numbers...
      adjustContinuous(agent, 'aggression', 5);       // ...but gained edge
      adjustContinuous(agent, 'paranoia', -10);       // Relieved stress
      engine.chronicleSystem.add(year, day,
        `${charName} ruthlessly purged wavering members from the faction. It is smaller now, but harder.`,
        'NORMAL'
      );
      break;

    // ── CONFRONTATION ──────────────────────────────────────────────────────

    case 'FL_DECLARE_FACTION_DEMANDS':
      engine.pendingEvents.push({
        id: 'event_fl_demands_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Faction Demands from ${charName}`,
        description: `The shadow faction led by ${charName} has made its demands public. They demand sweeping changes to taxation and vassal rights.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant concessions', action: 'CONCEDE', effect: 'Faction loses momentum, Crown looks weak (-10 prestige)' },
          { label: 'Refuse absolutely', action: 'REFUSE', effect: 'Faction anger spikes, revolt risk increases' },
        ],
      });
      adjustContinuous(agent, 'aggression', 5);
      break;

    case 'FL_SEEK_FOREIGN_BACKER':
      adjustContinuous(agent, 'faction_strength', 10);
      engine.alertSystem.queueAlert(
        `Intelligence warns that ${charName}'s faction is seeking gold and weapons from a foreign power!`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `Agents of the faction were seen crossing the border. Foreign interference is likely.`,
        'URGENT'
      );
      break;

    case 'FL_ASSASSINATE_LOYALIST':
      adjustInteger(agent, 'gold', -200);
      adjustContinuous(agent, 'fear', 15);
      if (prov) prov.stability = clamp((prov.stability ?? 50) - 10, 0, 100);
      engine.alertSystem.queueAlert(
        `ASSASSINATION! A loyalist official in ${provName} was found dead — the work of ${charName}'s faction!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `The shadow war turned bloody. The faction assassinated a Crown loyalist in ${provName}.`,
        'CRITICAL'
      );
      break;

    case 'FL_SABOTAGE_INFRASTRUCTURE':
      if (prov) {
        prov.roadQuality = clamp((prov.roadQuality ?? 50) - 15, 0, 100);
        prov.stability = clamp((prov.stability ?? 50) - 8, 0, 100);
      }
      engine.alertSystem.queueAlert(
        `SABOTAGE! Bridges and granaries in ${provName} were burned by the rebel faction!`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName}'s faction engaged in systematic sabotage across ${provName}.`,
        'URGENT'
      );
      break;

    case 'FL_RAID_SUPPLY_LINES':
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 50);
      // Deplete supply from nearby armies
      Object.values(engine.armies).forEach((a: any) => {
        if (a.realmId === 'realm_1' && a.location.q === prov?.coords.q && a.location.r === prov?.coords.r) {
          a.supplyLevel = clamp((a.supplyLevel ?? 100) - 20, 0, 100);
        }
      });
      engine.alertSystem.queueAlert(
        `Royal supply lines in ${provName} were raided by faction militants! Army supplies are dwindling.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `Militants loyal to ${charName} struck Crown supply trains in ${provName}.`,
        'URGENT'
      );
      break;

    case 'FL_SEIZE_PROVINCE':
      if (prov) {
        prov.loyalty = 0;
        prov.realmId = `faction_${agent.id}`; // Technically a breakaway realm now
      }
      adjustContinuous(agent, 'faction_strength', 20);
      engine.alertSystem.queueAlert(
        `REBELLION! ${charName}'s faction has seized control of ${provName}! The royal garrison has fallen!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `Open revolt! The faction seized ${provName}, pulling down the royal banners.`,
        'CRITICAL'
      );
      break;

    // ── ESCALATION / RESOLUTION ────────────────────────────────────────────

    case 'FL_DECLARE_REBELLION':
      if (prov) prov.realmId = `faction_${agent.id}`;
      sv.categorical['legal_status'] = 'REBEL_LEADER';
      engine.alertSystem.queueAlert(
        `CIVIL WAR! ${charName} has formally declared open rebellion against the Crown!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} declared open war on the Crown. The shadow faction is now a rebel army.`,
        'CRITICAL'
      );
      {
        const rebId = `army_rebel_${nanoid(8)}`;
        engine.armies[rebId] = {
          id: rebId,
          name: `Rebel Army of ${charName}`,
          realmId: `faction_${agent.id}`,
          commanderId: agent.id,
          location: prov?.coords ?? { q: 0, r: 0, s: 0 },
          destination: null,
          stance: 'DEFEND',
          units: [], morale: 100,
          officerIds: [], path: [],
          movementPoints: 40, supplyLevel: 80, supplyConvoyId: null,
          discipline: 60, experience: 30, orders: [], pendingOrders: [],
          isExhausted: false, frostbiteRisk: 0, diseases: [], deserterRate: 0,
          loot: 0, attritionDays: 0,
        };
      }
      break;

    case 'FL_DECLARE_COUNTER_GOVERNMENT':
      adjustContinuous(agent, 'idealism', 15);
      engine.alertSystem.queueAlert(
        `${charName} has formed a counter-government in the rebel territories, claiming legitimate rule!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `The rebels established a shadow court. ${charName} now styles themselves as a legitimate sovereign.`,
        'CRITICAL'
      );
      break;

    case 'FL_NEGOTIATE_PEACE_WITH_PLAYER':
      engine.pendingEvents.push({
        id: 'event_fl_peace_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Peace Offer from ${charName}`,
        description: `Exhausted by conflict, ${charName} offers to disband the faction and lay down arms in exchange for a full royal pardon and policy concessions.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Accept the peace — issue pardons', action: 'ACCEPT', effect: 'Rebellion ends, faction dissolves' },
          { label: 'Demand unconditional surrender', action: 'DEMAND', effect: 'Faction fights to the death' },
        ],
      });
      break;

    case 'FL_ACCEPT_PARDON_FOR_FACTION':
      sv.categorical['legal_status'] = 'PARDONED';
      adjustContinuous(agent, 'faction_strength', -50);
      engine.chronicleSystem.add(year, day,
        `${charName} accepted the royal pardon. The faction laid down their arms and dispersed.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(
        `The rebel faction in ${provName} has accepted your pardon and disbanded.`,
        'NORMAL'
      );
      break;

    case 'FL_DISSOLVE_FACTION':
      sv.categorical['legal_status'] = 'RETIRED';
      adjustContinuous(agent, 'faction_strength', -100);
      engine.chronicleSystem.add(year, day,
        `Having lost momentum and hope, ${charName} formally dissolved the secret faction. The movement is dead.`,
        'NORMAL'
      );
      break;

    // ── INTERNAL POLITICS ──────────────────────────────────────────────────

    case 'FL_ELECT_NEW_LEADER':
      adjustContinuous(agent, 'fatigue', -20);
      adjustContinuous(agent, 'faction_strength', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} stepped down, and the faction elected a new leader to carry on the struggle.`,
        'NORMAL'
      );
      break;

    case 'FL_MARTYRDOM_OF_MEMBER':
      adjustContinuous(agent, 'idealism', 15);
      adjustContinuous(agent, 'desperation', 10);
      adjustContinuous(agent, 'faction_strength', 10); // Martyrdom brings recruits
      engine.chronicleSystem.add(year, day,
        `A key faction member was executed by the Crown. Their death galvanized the remaining rebels.`,
        'URGENT'
      );
      break;

    case 'FL_DEMAND_CONCESSIONS':
      engine.pendingEvents.push({
        id: 'event_fl_concessions_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Faction Demands Concessions`,
        description: `The faction sends an ultimatum: lower the province tithe or face a general strike.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Lower tithe (lose income)', action: 'LOWER', effect: 'Faction appeased temporarily' },
          { label: 'Refuse', action: 'REFUSE', effect: 'Faction strength grows, strike likely' },
        ],
      });
      break;

    default:
      engine.chronicleSystem.add(year, day,
        `[DEBUG] Unknown Faction Leader action: ${actionId}`,
        'FLAVOR'
      );
      break;
  }
}
