/**
 * FolkHeroActionExecutor.ts
 *
 * Concrete world effects for every Folk Hero (Tier 3) action.
 * The Folk Hero is spawned by EMERGE_NOTABLE from a peasant cohort under crisis conditions.
 * Their actions drive the Loyalty Gradient (§9.1) and Refugee Dynamic (§9.6).
 * Covers all 20 actions defined in folkHeroActions.ts.
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

export function executeFolkHeroAction(
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

  const charName = char ? `${char.firstName} ${char.lastName}` : 'The Folk Hero';
  const provName = prov?.name ?? 'the province';

  switch (actionId) {

    // ── POPULAR LEADERSHIP ─────────────────────────────────────────────────

    case 'FH_RALLY_PEASANTS':
      // Raise solidarity among peasant cohorts in this province
      if (prov) {
        prov.stability = clamp((prov.stability ?? 50) + 3, 0, 100);
        if (prov.stockpiles) {
          // Minor stability from collective action
        }
      }
      adjustContinuous(agent, 'fame', 3);
      adjustContinuous(agent, 'follower_count', 5);
      engine.chronicleSystem.add(year, day,
        `${charName} rallied the peasants of ${provName} to their cause. Voices grow louder.`,
        'NORMAL'
      );
      break;

    case 'FH_GIVE_SPEECH':
      adjustContinuous(agent, 'fame', 5);
      adjustContinuous(agent, 'follower_count', 8);
      if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 5, 0, 100); // loyalty to Crown weakens
      engine.chronicleSystem.add(year, day,
        `${charName} gave a rousing speech in the market square of ${provName}. The crowd wept and cheered.`,
        'NORMAL'
      );
      break;

    case 'FH_DISTRIBUTE_FOOD':
      adjustContinuous(agent, 'fame', 8);
      adjustContinuous(agent, 'follower_count', 10);
      if (prov?.stockpiles) {
        prov.stockpiles.food = Math.max(0, (prov.stockpiles.food ?? 0) - 50); // they use their own stores
      }
      engine.chronicleSystem.add(year, day,
        `${charName} distributed bread to the starving in ${provName}. The people love them for it.`,
        'NORMAL'
      );
      break;

    case 'FH_SPREAD_LEGEND':
      adjustContinuous(agent, 'fame', 10);
      // Affect adjacent provinces
      Object.values(engine.provinces).forEach((p: any) => {
        if (p.realmId === 'realm_1' && p.id !== agent.provinceId) {
          p.loyalty = clamp((p.loyalty ?? 50) - 2, 0, 100);
        }
      });
      engine.chronicleSystem.add(year, day,
        `Bards carry the story of ${charName} to distant provinces. Their legend grows beyond ${provName}.`,
        'FLAVOR'
      );
      break;

    case 'FH_RECRUIT_FOLLOWERS':
      adjustContinuous(agent, 'follower_count', 12);
      adjustContinuous(agent, 'fame', 3);
      engine.chronicleSystem.add(year, day,
        `${charName} recruited new followers from the villages around ${provName}.`,
        'FLAVOR'
      );
      break;

    case 'FH_PROTECT_REFUGEES':
      adjustContinuous(agent, 'fame', 6);
      adjustContinuous(agent, 'compassion', 5);
      adjustContinuous(agent, 'follower_count', 8);
      // Hero absorbs refugees
      engine.chronicleSystem.add(year, day,
        `${charName} sheltered and fed refugees streaming into ${provName}, winning their undying devotion.`,
        'NORMAL'
      );
      break;

    case 'FH_PETITION_ON_BEHALF_OF_PEASANTS':
      engine.pendingEvents.push({
        id: 'event_fh_petition_' + nanoid(),
        type: 'COURT_PETITION',
        title: `Folk Hero Petition: ${charName}`,
        description: `${charName} of ${provName} has traveled to your court carrying a list of grievances from the province's people. The crowd outside the gates grows daily.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant the petition — lower taxes in the province', action: 'LOWER_TAX', effect: '+20 province loyalty, folk hero becomes ally' },
          { label: 'Acknowledge partially — token gesture', action: 'PARTIAL', effect: '+8 province loyalty, hero remains neutral' },
          { label: 'Have them arrested', action: 'ARREST', effect: 'Hero becomes martyr — massive loyalty collapse' },
        ],
      });
      adjustContinuous(agent, 'fame', 5);
      break;

    // ── CONFRONTATION ──────────────────────────────────────────────────────

    case 'FH_DEFEND_VILLAGE':
      {
        adjustContinuous(agent, 'fame', 12);
        adjustContinuous(agent, 'martial_confidence', 5);
        adjustContinuous(agent, 'follower_count', 10);
        if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 5, 0, 100); // Loyalty to Crown drops
        engine.alertSystem.queueAlert(
          `${charName} personally led the defense of a village in ${provName} against raiders, becoming a local legend overnight.`,
          'NORMAL'
        );
        engine.chronicleSystem.add(year, day,
          `${charName} and their followers defended ${provName} from attack. Survivors swear fealty to the Folk Hero.`,
          'NORMAL'
        );
      }
      break;

    case 'FH_CHALLENGE_NOBLE_AUTHORITY':
      if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 10, 0, 100);
      if (prov) prov.stability = clamp((prov.stability ?? 50) - 5, 0, 100);
      adjustContinuous(agent, 'fame', 8);
      engine.alertSystem.queueAlert(
        `${charName} publicly challenged the Crown's authority in ${provName}. The local lord was humiliated before their own people.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} confronted the local lord of ${provName} before the assembled people, challenging the right to rule.`,
        'URGENT'
      );
      break;

    case 'FH_FORM_MILITIA':
      adjustContinuous(agent, 'follower_count', 15);
      adjustInteger(agent, 'militia_size', 200);
      if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 8, 0, 100);
      engine.alertSystem.queueAlert(
        `${charName} formed an armed militia in ${provName}. A private fighting force now operates outside royal authority!`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} armed their followers. The Folk Militia of ${provName} drills openly in the fields.`,
        'URGENT'
      );
      break;

    case 'FH_INSPIRE_REVOLT':
      if (prov) {
        prov.loyalty = clamp((prov.loyalty ?? 50) - 20, 0, 100);
        prov.stability = clamp((prov.stability ?? 50) - 15, 0, 100);
      }
      adjustContinuous(agent, 'fame', 15);
      engine.alertSystem.queueAlert(
        `${charName} ignited a popular uprising! ${provName} is in revolt — mobs fill the streets!`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} called for open revolt. The people of ${provName} answered. This is more than a riot — it is revolution.`,
        'CRITICAL'
      );
      break;

    case 'FH_LEAD_MARCH_ON_CAPITAL':
      {
        const marchId = `army_march_${nanoid(8)}`;
        const capitalProv = Object.values(engine.provinces).find(
          (p: any) => p.realmId === 'realm_1' && p.isCapital
        ) ?? Object.values(engine.provinces).find((p: any) => p.realmId === 'realm_1');
        engine.armies[marchId] = {
          id: marchId,
          name: `The March of ${charName}`,
          realmId: 'folk_hero_' + agent.id,
          commanderId: agent.id,
          location: prov?.coords ?? { q: 0, r: 0, s: 0 },
          destination: capitalProv?.coords ?? null,
          stance: 'DEFEND',
          units: [], morale: 95,
          officerIds: [], path: [],
          movementPoints: 30, supplyLevel: 60, supplyConvoyId: null,
          discipline: 50, experience: 20, orders: [], pendingOrders: [],
          isExhausted: false, frostbiteRisk: 0, diseases: [], deserterRate: 0,
          loot: 0, attritionDays: 0,
        };
        engine.alertSystem.queueAlert(
          `MARCH ON THE CAPITAL! ${charName} leads a vast crowd toward your throne! This is an existential crisis!`,
          'CRITICAL'
        );
        engine.chronicleSystem.add(year, day,
          `${charName} marched on the capital at the head of thousands. History holds its breath.`,
          'CRITICAL'
        );
      }
      break;

    // ── OUTLAW PATH ────────────────────────────────────────────────────────

    case 'FH_BECOME_OUTLAW':
      sv.categorical['legal_status'] = 'OUTLAW';
      // Bounty on hero
      adjustContinuous(agent, 'fear', 20);
      adjustContinuous(agent, 'fame', 5); // Outlaws become legends
      engine.chronicleSystem.add(year, day,
        `${charName} was declared outlaw by royal decree. They fled to the hills with their followers.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `${charName} has been outlawed — but this may only increase their popular appeal.`,
        'URGENT'
      );
      break;

    case 'FH_BECOME_BANDIT_KING':
      sv.categorical['legal_status'] = 'BANDIT_KING';
      adjustContinuous(agent, 'aggression', 10);
      adjustContinuous(agent, 'fame', 10);
      adjustInteger(agent, 'militia_size', 500);
      engine.alertSystem.queueAlert(
        `${charName} has formally declared themselves Bandit King of ${provName}. Raiders answer to them now.`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} abandoned peaceful resistance. A criminal kingdom takes shape in ${provName}'s hills.`,
        'CRITICAL'
      );
      break;

    case 'FH_ORGANIZE_LABOR_STRIKE':
      if (prov?.stockpiles) {
        prov.stockpiles.food = Math.max(0, (prov.stockpiles.food ?? 0) - 150); // Lost production
      }
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 100); // Lost tax revenue
      if (prov) prov.loyalty = clamp((prov.loyalty ?? 50) - 8, 0, 100);
      adjustContinuous(agent, 'fame', 6);
      engine.alertSystem.queueAlert(
        `Organized by ${charName}, workers in ${provName} have gone on strike. Production halted.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} organized a complete labor stoppage in ${provName}. The mills stand empty.`,
        'URGENT'
      );
      break;

    case 'FH_FORGE_ALLIANCE_WITH_CLERGY':
      adjustContinuous(agent, 'fame', 8);
      adjustContinuous(agent, 'piety', 5);
      if (prov) prov.stability = clamp((prov.stability ?? 50) + 2, 0, 100);
      engine.chronicleSystem.add(year, day,
        `${charName} forged an alliance with local clergy, giving their movement a religious dimension.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `The Folk Hero's cause now has Church backing in ${provName}. This is political dynamite.`,
        'URGENT'
      );
      break;

    // ── RESOLUTION ─────────────────────────────────────────────────────────

    case 'FH_SEEK_ROYAL_RECOGNITION':
      engine.pendingEvents.push({
        id: 'event_fh_recognition_' + nanoid(),
        type: 'COURT_PETITION',
        title: `${charName} Seeks Recognition`,
        description: `${charName} sends a letter requesting royal recognition — a title, land, or official status. In exchange they pledge to work within the system.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant minor noble title', action: 'GRANT', effect: 'Hero demobilizes, +25 province loyalty, loses radical edge' },
          { label: 'Ignore the request', action: 'IGNORE', effect: 'Hero grows more radical over time' },
          { label: 'Declare them outlaw', action: 'OUTLAW', effect: 'Hero radicalizes fully — revolt becomes likely' },
        ],
      });
      adjustContinuous(agent, 'idealism', -5);
      break;

    case 'FH_NEGOTIATE_WITH_LORD':
      engine.pendingEvents.push({
        id: 'event_fh_negotiate_' + nanoid(),
        type: 'COURT_PETITION',
        title: `${charName} Negotiates`,
        description: `${charName} sought a private meeting with the provincial lord. The Folk Hero has specific demands: lower grain tax and release of imprisoned laborers.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Instruct the lord to concede', action: 'CONCEDE', effect: '+15 province loyalty, hero stands down temporarily' },
          { label: 'Let the lord handle it', action: 'IGNORE', effect: 'Outcome depends on the lord\'s personality' },
        ],
      });
      adjustContinuous(agent, 'honor', 3);
      break;

    case 'FH_MARTYRDOM':
      // The hero's death creates generational memory and spikes solidarity
      adjustContinuous(agent, 'fame', 50); // Their legend becomes permanent
      if (prov) {
        prov.loyalty = clamp((prov.loyalty ?? 50) - 30, 0, 100);
        prov.stability = clamp((prov.stability ?? 50) - 20, 0, 100);
      }
      // Trigger generational memory across the province
      engine.alertSystem.queueAlert(
        `${charName} is dead — killed by the Crown's agents. Their death will fuel rage for a generation.`,
        'CRITICAL'
      );
      engine.chronicleSystem.add(year, day,
        `${charName} died for the cause. In death they became greater than they ever were in life. The province weeps and seethes.`,
        'CRITICAL'
      );
      // Mark as dead — the engine should handle NPC death
      sv.categorical['life_status'] = 'MARTYR';
      break;

    case 'FH_FADE_INTO_OBSCURITY':
      adjustContinuous(agent, 'fame', -20);
      adjustContinuous(agent, 'follower_count', -30);
      adjustContinuous(agent, 'fatigue', -30);
      sv.categorical['life_status'] = 'RETIRED';
      engine.chronicleSystem.add(year, day,
        `${charName} faded from public life, exhausted by the struggle. The movement loses its heart.`,
        'NORMAL'
      );
      break;

    default:
      engine.chronicleSystem.add(year, day,
        `[DEBUG] Unknown Folk Hero action: ${actionId}`,
        'FLAVOR'
      );
      break;
  }
}
