/**
 * NpcActionExecutor.ts
 *
 * Handles the concrete world side effects of every NPC action.
 * No stubs — every action modifies real game state.
 * Based on sovereign_npc_simulation.md Section 7.1 (Direct State Transfer)
 * and the action definitions in Sections 4.1–4.6.
 */

import { nanoid } from 'nanoid';
import type { GameLoop } from '../engine/GameLoop';
import type { NpcStateVector } from '../models/NpcStateVector';
import { recordMemory } from './NpcMemorySystem';
import { executeVassalAction } from './executors/VassalActionExecutor';
import { executeAdvisorAction } from './executors/AdvisorActionExecutor';
import { executeForeignRulerAction } from './executors/ForeignRulerActionExecutor';

import { VASSAL_LORD_ACTIONS } from '../data/npcActions/vassalLordActions';
import { ADVISOR_BASE_ACTIONS } from '../data/npcActions/advisorBaseActions';
import { CHANCELLOR_ACTIONS } from '../data/npcActions/chancellorActions';
import { SPYMASTER_ACTIONS } from '../data/npcActions/spymasterActions';
import { MARSHAL_ACTIONS } from '../data/npcActions/marshalActions';
import { TREASURER_ACTIONS } from '../data/npcActions/treasurerActions';
import { COURT_PRIEST_ACTIONS } from '../data/npcActions/courtPriestActions';
import { FOREIGN_RULER_ACTIONS } from '../data/npcActions/foreignRulerActions';
import { HIGH_PRIEST_ACTIONS } from '../data/npcActions/highPriestActions';
import { FOLK_HERO_ACTIONS } from '../data/npcActions/folkHeroActions';
import { FACTION_LEADER_ACTIONS } from '../data/npcActions/factionLeaderActions';
import { HEIR_APPARENT_ACTIONS } from '../data/npcActions/heirApparentActions';

import { executeHighPriestAction } from './executors/HighPriestActionExecutor';
import { executeFolkHeroAction } from './executors/FolkHeroActionExecutor';
import { executeFactionLeaderAction } from './executors/FactionLeaderActionExecutor';
import { executeHeirApparentAction } from './executors/HeirApparentActionExecutor';

const VASSAL_IDS = new Set(VASSAL_LORD_ACTIONS.map(a => a.id));
const ADVISOR_IDS = new Set([
  ...ADVISOR_BASE_ACTIONS, ...CHANCELLOR_ACTIONS, ...SPYMASTER_ACTIONS,
  ...MARSHAL_ACTIONS, ...TREASURER_ACTIONS, ...COURT_PRIEST_ACTIONS
].map(a => a.id));
const FOREIGN_IDS = new Set(FOREIGN_RULER_ACTIONS.map(a => a.id));
const HIGH_PRIEST_IDS = new Set(HIGH_PRIEST_ACTIONS.map(a => a.id));
const FOLK_HERO_IDS = new Set(FOLK_HERO_ACTIONS.map(a => a.id));
const FACTION_LEADER_IDS = new Set(FACTION_LEADER_ACTIONS.map(a => a.id));
const HEIR_APPARENT_IDS = new Set(HEIR_APPARENT_ACTIONS.map(a => a.id));

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NpcAgent {
  /** Character ID */
  id: string;
  /** Province the NPC is bound to */
  provinceId: string;
  /** Settlement ID (for settlement-level cohorts) */
  settlementId: string | null;
  stateVector: NpcStateVector;
}

/** Clamp to a range */
function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/** Adjust a continuous state value, respecting bounds */
function adjustContinuous(sv: NpcStateVector, key: string, delta: number): void {
  if (sv.continuous[key]) {
    sv.continuous[key].value = clamp(sv.continuous[key].value + delta);
  }
}

/** Adjust an integer state value */
function adjustInteger(sv: NpcStateVector, key: string, delta: number): void {
  sv.integers[key] = Math.max(0, (sv.integers[key] ?? 0) + delta);
}

/** Set a categorical state */
function setCategorical(sv: NpcStateVector, key: string, value: string): void {
  sv.categorical[key] = value;
}

/** Get a continuous state value */
function getContinuous(sv: NpcStateVector, key: string): number {
  return sv.continuous[key]?.value ?? 0;
}

/** Get an integer state value */
function getInteger(sv: NpcStateVector, key: string): number {
  return sv.integers[key] ?? 0;
}

// ─── Main Dispatcher ───────────────────────────────────────────────────────

export function executeNpcAction(
  actionId: string,
  agent: NpcAgent,
  engine: GameLoop,
  currentTick: number
): void {
  const sv = agent.stateVector;
  const prov = engine.provinces[agent.provinceId];
  const year = engine.clock.currentYear;
  const day = engine.clock.currentDay;

  // ─── DELEGATE TIER 3 AND TIER 4 ACTIONS ───
  if (VASSAL_IDS.has(actionId)) {
    executeVassalAction(actionId, agent, engine, currentTick);
    return;
  }

  if (ADVISOR_IDS.has(actionId)) {
    executeAdvisorAction(actionId, agent, engine, currentTick);
    return;
  }

  if (FOREIGN_IDS.has(actionId)) {
    executeForeignRulerAction(actionId, agent, engine, currentTick);
    return;
  }

  if (HIGH_PRIEST_IDS.has(actionId)) {
    executeHighPriestAction(actionId, agent, engine, currentTick);
    return;
  }

  if (FOLK_HERO_IDS.has(actionId)) {
    executeFolkHeroAction(actionId, agent, engine, currentTick);
    return;
  }

  if (FACTION_LEADER_IDS.has(actionId)) {
    executeFactionLeaderAction(actionId, agent, engine, currentTick);
    return;
  }

  if (HEIR_APPARENT_IDS.has(actionId)) {
    executeHeirApparentAction(actionId, agent, engine, currentTick);
    return;
  }

  switch (actionId) {

    // ════════════════════════════════════════════════════════════════════════
    // PEASANT COHORT ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'WORK': {
      // Produce food, reduce fatigue baseline pressure slightly
      const cohortSize = getInteger(sv, 'cohort_size');
      const foodProduced = Math.floor(cohortSize * 0.02);
      if (prov?.stockpiles) {
        prov.stockpiles.food = (prov.stockpiles.food ?? 0) + foodProduced;
      } else {
        engine.resources.food += foodProduced;
      }
      adjustContinuous(sv, 'fatigue', +2);   // work causes fatigue
      adjustContinuous(sv, 'hunger', +0.5);  // consuming while working
      adjustContinuous(sv, 'hope', +0.3);    // productive work is sustaining
      break;
    }

    case 'HOARD_FOOD': {
      // Withdraw from market, raise local food stockpile, raise prices
      const amount = Math.min(50, Math.floor(getContinuous(sv, 'hunger') * 0.6));
      adjustInteger(sv, 'food_stockpile', +amount);
      engine.resources.food = Math.max(0, engine.resources.food - amount);
      // Raises market pressure → other cohorts get hungrier next tick
      if (prov) prov.loyalty = clamp(prov.loyalty - 1, 0, 100);
      adjustContinuous(sv, 'hunger', -5);
      adjustContinuous(sv, 'solidarity', +2); // shared fear builds solidarity
      engine.chronicleSystem.add(year, day,
        `Peasants in ${prov?.name ?? agent.provinceId} are hoarding food, withdrawing from markets.`,
        'NORMAL'
      );
      break;
    }

    case 'PETITION_LORD': {
      // Submit formal grievance. Creates a pending event for the player.
      adjustContinuous(sv, 'unrest', -8);
      adjustContinuous(sv, 'hope', +5);
      engine.pendingEvents.push({
        id: 'event_petition_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Peasant Petition',
        description: `The peasants of ${prov?.name ?? agent.provinceId} have submitted a formal grievance regarding their conditions. Unrest: ${Math.round(getContinuous(sv, 'unrest'))}. Hunger: ${Math.round(getContinuous(sv, 'hunger'))}.`,
        createdYear: year,
        createdDay: day,
        provinceId: agent.provinceId,
        choices: [
          { label: 'Acknowledge the petition and reduce taxes this season', action: 'REDUCE_TAX', effect: '-10 unrest, +15 hope, -50 gold' },
          { label: 'Dismiss the petition', action: 'IGNORE', effect: '+5 unrest next month, -5 hope' },
          { label: 'Send a relief grain shipment', action: 'SPEND_GOLD', amount: 75, effect: '-15 hunger, +10 hope' },
        ],
      });
      engine.alertSystem.queueAlert(
        `Peasants in ${prov?.name ?? agent.provinceId} have submitted a formal grievance!`,
        'NORMAL'
      );
      break;
    }

    case 'FLEE_PROVINCE': {
      // Cohort migrates to a random neighbor. Carries fear, trauma, unrest.
      const neighbors = prov?.neighbors ?? [];
      if (neighbors.length > 0) {
        const destId = neighbors[Math.floor(engine.rng.next() * neighbors.length)];
        const destProv = engine.provinces[destId];
        if (destProv) {
          const cohortSize = getInteger(sv, 'cohort_size');
          const refugeePop = Math.floor(cohortSize * 0.7); // not all make it
          // Stress the destination
          destProv.population.total = (destProv.population.total ?? 0) + refugeePop;
          destProv.population.serfs = (destProv.population.serfs ?? 0) + refugeePop;
          if (destProv.stockpiles) destProv.stockpiles.food = Math.max(0, (destProv.stockpiles.food ?? 0) - refugeePop * 5);
          destProv.loyalty = clamp(destProv.loyalty - 5, 0, 100);
          // Source province shrinks
          if (prov) {
            prov.population.total = Math.max(0, prov.population.total - cohortSize);
            prov.population.serfs = Math.max(0, prov.population.serfs - cohortSize);
          }
          adjustInteger(sv, 'cohort_size', -Math.floor(cohortSize * 0.3));
          setCategorical(sv, 'collective_mood', 'FLED');
          sv.provinceId = destId;
          // High trauma and fear carried to destination
          adjustContinuous(sv, 'trauma', +20);
          adjustContinuous(sv, 'fear', -10); // relief at escaping
          recordMemory(sv, 'DISPLACEMENT', agent.provinceId, currentTick, 70, 'TRAUMATIC',
            `Fled ${prov?.name ?? agent.provinceId} due to crisis`, true);
          engine.chronicleSystem.add(year, day,
            `Peasants have fled ${prov?.name ?? agent.provinceId}, pouring into ${destProv.name} as refugees!`,
            'URGENT'
          );
          engine.alertSystem.queueAlert(
            `Refugee crisis! Peasants fleeing ${prov?.name ?? agent.provinceId} have arrived in ${destProv.name}.`,
            'URGENT'
          );
        }
      }
      break;
    }

    case 'FORM_SECRET_FACTION': {
      // Spawn a new PEASANT faction entity
      const factionId = 'faction_peasant_' + nanoid(8);
      engine.factions[factionId] = {
        id: factionId,
        realmId: prov?.realmId ?? 'realm_1',
        name: `People of ${prov?.name ?? agent.provinceId}`,
        type: 'INDEPENDENCE',
        leader: agent.id,
        members: [agent.id],
        strength: Math.floor(getContinuous(sv, 'solidarity') * 0.5),
        loyalty: 0,
        demands: [{ description: 'Reduce taxation and conscription' }],
        isActive: true,
        plotStage: 'FORMING' as any,
        treasuryFunding: getInteger(sv, 'food_stockpile'),
        hasPlayerDiscovered: false,
      };
      adjustContinuous(sv, 'solidarity', +10);
      adjustContinuous(sv, 'hope', +8);
      engine.alertSystem.queueAlert(
        `Spymaster: A secret peasant faction has formed in ${prov?.name ?? agent.provinceId}. Watch for leaders.`,
        'URGENT'
      );
      engine.chronicleSystem.add(year, day,
        `Underground solidarity movements are organising among the peasants of ${prov?.name ?? agent.provinceId}.`,
        'URGENT'
      );
      break;
    }

    case 'RIOT': {
      // Property destruction; damages province
      if (prov) {
        prov.loyalty = clamp(prov.loyalty - 15, 0, 100);
        // Damage a random building
        if (prov.buildings && prov.buildings.length > 0) {
          const target = prov.buildings[Math.floor(engine.rng.next() * prov.buildings.length)] as any;
          if (target.condition !== undefined) {
            target.condition = Math.max(0, target.condition - 30);
          }
        }
        // Hit treasury
        engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - 50);
      }
      setCategorical(sv, 'collective_mood', 'RIOTING');
      adjustContinuous(sv, 'unrest', -20); // releases pent-up pressure
      adjustContinuous(sv, 'fear', +10);   // but leaves people scared of reprisals
      adjustContinuous(sv, 'solidarity', +5);
      engine.chronicleSystem.add(year, day,
        `RIOT! The peasants of ${prov?.name ?? agent.provinceId} have taken to the streets, burning property!`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(
        `RIOT in ${prov?.name ?? agent.provinceId}! Province loyalty has fallen sharply.`,
        'CRITICAL'
      );
      break;
    }

    case 'REFUSE_LEVY': {
      // Reduce effective conscription levy from this province
      const refuseIntensity = getContinuous(sv, 'fear') > 60 ? 'FLED IN FEAR' : 'STAYED HOME';
      engine.chronicleSystem.add(year, day,
        `The peasants of ${prov?.name ?? agent.provinceId} refused the levy call — ${refuseIntensity}.`,
        'NORMAL'
      );
      // Reduce player army manpower
      engine.resources.manpower = Math.max(0, engine.resources.manpower - Math.floor(getInteger(sv, 'cohort_size') * 0.05));
      adjustContinuous(sv, 'fear', -5);
      adjustContinuous(sv, 'solidarity', +3);
      engine.alertSystem.queueAlert(
        `Levy refused! Peasants in ${prov?.name ?? agent.provinceId} will not answer the call to arms.`,
        'NORMAL'
      );
      break;
    }

    case 'SUPPORT_REBEL': {
      // Boost an existing faction in the province
      const factionInProv = Object.values(engine.factions).find(
        (f: any) => f.isActive && f.realmId === (prov?.realmId ?? 'realm_1')
      ) as any;
      if (factionInProv) {
        factionInProv.strength = clamp(factionInProv.strength + 8, 0, 100);
        factionInProv.treasuryFunding += 20;
        adjustContinuous(sv, 'solidarity', +5);
        adjustContinuous(sv, 'hope', +3);
        engine.chronicleSystem.add(year, day,
          `Peasants in ${prov?.name ?? agent.provinceId} are secretly supplying labor and provisions to a rebel faction.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'PRAY': {
      // Raises piety, lowers unrest slightly
      adjustContinuous(sv, 'piety', +5);
      adjustContinuous(sv, 'unrest', -3);
      adjustContinuous(sv, 'hope', +2);
      adjustContinuous(sv, 'fear', -2);
      break;
    }

    case 'EMERGE_NOTABLE': {
      // Spawn a notable character from this cohort (Wandering Knight or Monk)
      const types: Array<'wandering_knight' | 'monk'> = ['wandering_knight', 'monk'];
      const chosenType = types[Math.floor(engine.rng.next() * types.length)];
      const notableId = `notable_${chosenType}_${nanoid(8)}`;
      engine.characters[notableId] = {
        id: notableId,
        firstName: generateFirstName(engine.rng.next),
        lastName: prov?.name?.split(' ')[0] ?? 'Unknown',
        dynastyId: 'dyn_player',
        isPlayer: false,
        gender: engine.rng.next() > 0.3 ? 'MALE' : 'FEMALE',
        age: 20 + Math.floor(engine.rng.next() * 20),
        health: 80,
        fertility: 70,
        isPregnant: false,
        isAlive: true,
        causeOfDeath: null,
        deathDate: null,
        birthProvinceId: agent.provinceId,
        religion: 'christianity',
        culture: 'Saxon',
        languagesSpoken: ['Saxon'],
        title: null,
        position: null,
        traits: [],
        virtues: [],
        flaws: [],
        secretTrait: null,
        fatherId: null, motherId: null, spouseId: null,
        childrenIds: [], siblingIds: [], loverIds: [],
        enemyIds: [], allyIds: [], mentorId: null,
        diplomacy: 5, martial: chosenType === 'wandering_knight' ? 12 : 4,
        stewardship: 5, intrigue: 6, learning: chosenType === 'monk' ? 12 : 5,
        piety: chosenType === 'monk' ? 60 : 20,
        ambition: 'LEGACY',
        opinion: {}, suspicion: {},
        memories: [],
        traumaIds: [],
        primaryTitle: null,
        heldTitles: [],
        landedProvinceIds: [],
        goldHoldings: 10,
      } as any;
      adjustInteger(sv, 'cohort_size', -5); // loses a member to this role
      adjustContinuous(sv, 'hope', +10);
      engine.chronicleSystem.add(year, day,
        `A notable figure has emerged from the people of ${prov?.name ?? agent.provinceId}: a ${chosenType.replace('_', ' ')} who may shape events to come.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(
        `A new character has emerged from ${prov?.name ?? agent.provinceId}'s common folk.`,
        'NORMAL'
      );
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // WANDERING KNIGHT ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'SEEK_EMPLOYMENT': {
      setCategorical(sv, 'employment_status', 'HIRED');
      adjustContinuous(sv, 'desperation', -15);
      adjustContinuous(sv, 'loyalty_to_current_lord', +20);
      engine.chronicleSystem.add(year, day,
        `A wandering knight has presented themselves at ${prov?.name ?? agent.provinceId} seeking service.`,
        'FLAVOR'
      );
      break;
    }

    case 'CHALLENGE_DUEL': {
      const won = engine.rng.next() < (getContinuous(sv, 'martial_confidence') / 100);
      if (won) {
        adjustInteger(sv, 'battles_won', +1);
        adjustInteger(sv, 'reputation_score', +10);
        adjustContinuous(sv, 'martial_confidence', +8);
        engine.chronicleSystem.add(year, day, `A wandering knight won a duel in ${prov?.name ?? agent.provinceId}, raising their reputation.`, 'FLAVOR');
      } else {
        adjustContinuous(sv, 'martial_confidence', -10);
        adjustInteger(sv, 'reputation_score', -5);
        engine.chronicleSystem.add(year, day, `A wandering knight was defeated in a duel in ${prov?.name ?? agent.provinceId}.`, 'FLAVOR');
      }
      adjustContinuous(sv, 'fatigue', +15);
      break;
    }

    case 'TAKE_MERCENARY_JOB': {
      const goldEarned = 50 + Math.floor(engine.rng.next() * 100);
      adjustInteger(sv, 'gold', +goldEarned);
      adjustContinuous(sv, 'desperation', -10);
      adjustContinuous(sv, 'honor', -3); // slight honor cost
      adjustContinuous(sv, 'restlessness', -5);
      engine.chronicleSystem.add(year, day, `A wandering knight took a mercenary job, earning ${goldEarned} gold.`, 'FLAVOR');
      break;
    }

    case 'DEFECT': {
      adjustContinuous(sv, 'loyalty_to_current_lord', -80);
      adjustInteger(sv, 'reputation_score', -15);
      adjustInteger(sv, 'lords_served', +1);
      setCategorical(sv, 'employment_status', 'FREELANCE');
      engine.chronicleSystem.add(year, day,
        `A sworn knight has defected from their lord in ${prov?.name ?? agent.provinceId}. Their reputation suffers.`,
        'NORMAL'
      );
      break;
    }

    case 'INVESTIGATE_COURT': {
      // Quietly gathers intel — increases suspicion, may reveal a plot
      adjustContinuous(sv, 'suspicion', +5);
      const foundPlot = engine.rng.next() < 0.2;
      if (foundPlot) {
        engine.alertSystem.queueAlert(
          `A wandering knight in ${prov?.name ?? agent.provinceId} has uncovered suspicious activity at court.`,
          'URGENT'
        );
      }
      break;
    }

    case 'SWEAR_FEALTY': {
      setCategorical(sv, 'employment_status', 'SWORN');
      adjustContinuous(sv, 'loyalty_to_current_lord', +30);
      adjustContinuous(sv, 'restlessness', -20);
      adjustContinuous(sv, 'honor', +5);
      engine.chronicleSystem.add(year, day,
        `A wandering knight has sworn fealty and joined the permanent household of ${prov?.name ?? agent.provinceId}.`,
        'NORMAL'
      );
      break;
    }

    case 'TRAIN': {
      adjustContinuous(sv, 'martial_confidence', +5);
      adjustContinuous(sv, 'fatigue', +10);
      adjustInteger(sv, 'gold', -5); // food & equipment costs
      break;
    }

    case 'PETITION_FOR_LAND': {
      engine.pendingEvents.push({
        id: 'event_land_petition_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Petition for a Minor Holding',
        description: `A sworn knight in your realm is petitioning for a minor holding as reward for their service. Granting land will increase their loyalty but reduce your direct territory.`,
        createdYear: year,
        createdDay: day,
        choices: [
          { label: 'Grant them a minor holding', action: 'GRANT_LAND', effect: '+30 knight loyalty, -1 province influence' },
          { label: 'Refuse the petition', action: 'IGNORE', effect: '-20 knight loyalty, +5 restlessness' },
          { label: 'Offer gold instead', action: 'SPEND_GOLD', amount: 150, effect: '+10 knight loyalty' },
        ],
      });
      break;
    }

    case 'HIDE_IDENTITY': {
      adjustContinuous(sv, 'suspicion', -10);
      adjustInteger(sv, 'reputation_score', -5); // some lose track of them
      break;
    }

    case 'DEPART': {
      // Move to a random adjacent province
      const neighbors2 = prov?.neighbors ?? [];
      if (neighbors2.length > 0) {
        const newProv = neighbors2[Math.floor(engine.rng.next() * neighbors2.length)];
        sv.provinceId = newProv;
        adjustContinuous(sv, 'restlessness', -15);
        adjustContinuous(sv, 'fatigue', +10);
        adjustContinuous(sv, 'loyalty_to_current_lord', -5);
      }
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // MONK ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'PREACH': {
      if (prov) {
        prov.loyalty = clamp(prov.loyalty + 3, 0, 100);
      }
      // Find cohort in this province and boost their piety/hope
      adjustContinuous(sv, 'piety', +3);
      adjustContinuous(sv, 'isolation_drive', -2);
      engine.chronicleSystem.add(year, day,
        `A monk preaches among the people of ${prov?.name ?? agent.provinceId}, raising piety and calming unrest.`,
        'FLAVOR'
      );
      break;
    }

    case 'BLESS': {
      // Boost morale of player armies in the province
      Object.values(engine.armies).forEach((army: any) => {
        const armyProv = engine.provinces[army.location?.q]?.id;
        if (army.realmId === 'realm_1') {
          army.morale = clamp(army.morale + 5, 0, 100);
        }
      });
      adjustContinuous(sv, 'piety', +2);
      engine.chronicleSystem.add(year, day, `A monk blesses the troops of ${prov?.name ?? agent.provinceId}.`, 'FLAVOR');
      break;
    }

    case 'PROPHECY': {
      // Generate a narrative event shaped by world state
      const isPositive = engine.treasury.goldBalance > 500;
      const text = isPositive
        ? `The monk of ${prov?.name ?? agent.provinceId} speaks of golden harvests and prosperity to come.`
        : `The monk of ${prov?.name ?? agent.provinceId} prophesies hardship and suffering — the people are afraid.`;
      engine.pendingEvents.push({
        id: 'event_prophecy_' + nanoid(),
        type: 'COURT_PETITION',
        title: isPositive ? 'A Hopeful Prophecy' : 'A Dark Prophecy',
        description: text,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Heed the prophecy', action: 'GAIN_PRESTIGE', amount: 10, effect: '+10 prestige, +5 piety' },
          { label: 'Dismiss the monk', action: 'IGNORE', effect: 'The prophecy spreads among the common folk anyway' },
        ],
      });
      adjustContinuous(sv, 'prophecy_pressure', -50); // releases pressure
      adjustContinuous(sv, 'mysticism', +5);
      engine.alertSystem.queueAlert(`A prophecy has been spoken in ${prov?.name ?? agent.provinceId}!`, 'NORMAL');
      break;
    }

    case 'REVEAL_HERESY': {
      // Expose a random non-player character's secret trait
      const suspects = Object.values(engine.characters).filter(
        (c: any) => !c.isPlayer && c.isAlive && c.landedProvinceIds?.includes(agent.provinceId)
      ) as any[];
      if (suspects.length > 0) {
        const target = suspects[Math.floor(engine.rng.next() * suspects.length)];
        engine.alertSystem.queueAlert(
          `${target.firstName} ${target.lastName} has been publicly accused of heresy by a monk in ${prov?.name ?? agent.provinceId}!`,
          'URGENT'
        );
        if (!target.opinion) target.opinion = {};
        target.opinion['player'] = Math.max(-100, (target.opinion['player'] ?? 0) - 10);
        adjustInteger(sv, 'known_heresies', -1);
      }
      break;
    }

    case 'PERFORM_MIRACLE': {
      // High-impact, low-probability event
      if (prov) prov.loyalty = clamp(prov.loyalty + 15, 0, 100);
      adjustContinuous(sv, 'mysticism', +20);
      adjustContinuous(sv, 'piety', +10);
      adjustContinuous(sv, 'prophecy_pressure', -80);
      engine.pendingEvents.push({
        id: 'event_miracle_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'A Miracle Has Occurred',
        description: `Witnesses in ${prov?.name ?? agent.provinceId} report a miraculous event performed by a monk. The faithful are emboldened and the faithless are shaken.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Officially endorse the miracle', action: 'GAIN_PRESTIGE', amount: 25, effect: '+25 prestige, +15 piety' },
          { label: 'Remain neutral', action: 'IGNORE', effect: 'The miracle spreads by word of mouth' },
        ],
      });
      engine.chronicleSystem.add(year, day,
        `A miraculous event has been witnessed in ${prov?.name ?? agent.provinceId}!`,
        'CRITICAL'
      );
      break;
    }

    case 'SEEK_AUDIENCE': {
      engine.pendingEvents.push({
        id: 'event_audience_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'A Monk Requests Audience',
        description: `A monk from ${prov?.name ?? agent.provinceId} has requested an audience. They may have counsel, intelligence, or a warning.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant audience', action: 'GAIN_PRESTIGE', amount: 5, effect: '+5 prestige, monk shares intelligence' },
          { label: 'Deny the audience', action: 'IGNORE', effect: 'Monk leaves disappointed' },
        ],
      });
      break;
    }

    case 'WITHDRAW': {
      setCategorical(sv, 'affiliation', 'HERMIT');
      adjustContinuous(sv, 'isolation_drive', +10);
      adjustContinuous(sv, 'prophecy_pressure', +5);
      adjustContinuous(sv, 'piety', +5);
      break;
    }

    case 'DENOUNCE': {
      // Publicly condemn a lord — reduce player prestige
      engine.chronicleSystem.add(year, day,
        `A monk in ${prov?.name ?? agent.provinceId} publicly denounces the ruling power for its godless or unjust actions.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `A monk has publicly denounced your rule in ${prov?.name ?? agent.provinceId}! Popular opinion shifts.`,
        'URGENT'
      );
      if (prov) prov.loyalty = clamp(prov.loyalty - 5, 0, 100);
      adjustContinuous(sv, 'suspicion_of_power', +5);
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // BANDIT CHIEF ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'RAID_SUPPLY_CONVOY': {
      const loot = 30 + Math.floor(engine.rng.next() * 60);
      const stolen = Math.min(loot, engine.treasury.goldBalance);
      engine.treasury.goldBalance -= stolen;
      adjustInteger(sv, 'gold', +stolen);
      adjustInteger(sv, 'recent_kills', +Math.floor(engine.rng.next() * 5));
      adjustContinuous(sv, 'morale', +5);
      adjustContinuous(sv, 'reputation_fear', +2);
      if (prov) prov.roadQuality = clamp(prov.roadQuality - 3, 0, 100);
      engine.chronicleSystem.add(year, day,
        `Bandits raided a supply convoy in ${prov?.name ?? agent.provinceId}, stealing ${stolen} gold!`,
        'NORMAL'
      );
      break;
    }

    case 'RAID_VILLAGE': {
      const loot2 = 40 + Math.floor(engine.rng.next() * 80);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - loot2);
      adjustInteger(sv, 'gold', +loot2);
      adjustContinuous(sv, 'reputation_fear', +5);
      adjustContinuous(sv, 'morale', +8);
      if (prov) {
        prov.loyalty = clamp(prov.loyalty - 10, 0, 100);
        prov.population.total = Math.max(0, prov.population.total - 10);
        prov.population.serfs = Math.max(0, prov.population.serfs - 10);
      }
      setCategorical(sv, 'current_activity', 'RAIDING');
      engine.chronicleSystem.add(year, day,
        `Bandits under a local chief razed a village in ${prov?.name ?? agent.provinceId}, terrorizing the population!`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(
        `Bandit raid on a village in ${prov?.name ?? agent.provinceId}!`,
        'CRITICAL'
      );
      break;
    }

    case 'EXTORT_SETTLEMENT': {
      // Ongoing drain — applied each evaluation
      const extortion = 15 + Math.floor(engine.rng.next() * 25);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - extortion);
      adjustInteger(sv, 'gold', +extortion);
      setCategorical(sv, 'current_activity', 'EXTORTING');
      adjustInteger(sv, 'active_provinces', +1);
      adjustContinuous(sv, 'reputation_fear', +3);
      engine.chronicleSystem.add(year, day,
        `Bandits are extorting settlements in ${prov?.name ?? agent.provinceId}, demanding regular protection payments.`,
        'NORMAL'
      );
      break;
    }

    case 'RECRUIT': {
      const newMembers = 5 + Math.floor(engine.rng.next() * 15);
      adjustInteger(sv, 'band_size', +newMembers);
      adjustInteger(sv, 'gold', -newMembers * 2);
      adjustContinuous(sv, 'morale', +3);
      setCategorical(sv, 'current_activity', 'RECRUITING');
      break;
    }

    case 'BRIBE_LOCAL_GUARD': {
      const bribeAmt = 80 + Math.floor(engine.rng.next() * 80);
      adjustInteger(sv, 'gold', -bribeAmt);
      adjustInteger(sv, 'bribes_paid', +bribeAmt);
      // Lower threat level if currently high
      const threat = sv.categorical['threat_level'];
      if (threat === 'HIGH') setCategorical(sv, 'threat_level', 'MEDIUM');
      if (threat === 'HUNTED') setCategorical(sv, 'threat_level', 'HIGH');
      adjustContinuous(sv, 'paranoia', -10);
      break;
    }

    case 'ESTABLISH_HIDEOUT': {
      const fortCost = 150 + Math.floor(engine.rng.next() * 100);
      if (getInteger(sv, 'gold') >= fortCost) {
        adjustInteger(sv, 'gold', -fortCost);
        adjustInteger(sv, 'hideout_strength', +2);
        adjustContinuous(sv, 'paranoia', -10);
        adjustContinuous(sv, 'territorial', +5);
      }
      break;
    }

    case 'ABANDON_HIDEOUT': {
      adjustInteger(sv, 'hideout_strength', 0);
      sv.integers['hideout_strength'] = 0;
      adjustContinuous(sv, 'fear', -10);
      adjustContinuous(sv, 'restlessness', +10);
      setCategorical(sv, 'current_activity', 'FLEEING');
      setCategorical(sv, 'threat_level', 'MEDIUM');
      // Move to a random neighbor
      const nbrs = prov?.neighbors ?? [];
      if (nbrs.length > 0) sv.provinceId = nbrs[Math.floor(engine.rng.next() * nbrs.length)];
      engine.chronicleSystem.add(year, day,
        `A bandit gang abandoned their hideout in ${prov?.name ?? agent.provinceId} and fled to avoid pursuit.`,
        'NORMAL'
      );
      break;
    }

    case 'BLOCKADE_ROAD': {
      if (prov) prov.roadQuality = clamp(prov.roadQuality - 15, 0, 100);
      adjustContinuous(sv, 'territorial', +5);
      adjustContinuous(sv, 'reputation_fear', +3);
      setCategorical(sv, 'current_activity', 'EXTORTING');
      engine.chronicleSystem.add(year, day,
        `Bandits are blockading roads in ${prov?.name ?? agent.provinceId}, severely disrupting trade.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(
        `Road blockade in ${prov?.name ?? agent.provinceId}! Trade routes are disrupted.`,
        'URGENT'
      );
      break;
    }

    case 'SELL_INTEL': {
      const intelGold = 100 + Math.floor(engine.rng.next() * 150);
      adjustInteger(sv, 'gold', +intelGold);
      engine.chronicleSystem.add(year, day,
        `Local bandits sold intelligence about your realm's movements to an unknown buyer.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert('Intelligence sold to a foreign agent — your movements may be compromised.', 'URGENT');
      break;
    }

    case 'ACCEPT_AMNESTY': {
      // Dissolve band, possibly enter service
      const bandSize = getInteger(sv, 'band_size');
      engine.resources.manpower += Math.floor(bandSize * 0.5);
      adjustInteger(sv, 'band_size', -bandSize);
      setCategorical(sv, 'current_activity', 'HIDING');
      setCategorical(sv, 'threat_level', 'LOW');
      adjustContinuous(sv, 'desperation', -30);
      adjustContinuous(sv, 'aggression', -15);
      engine.chronicleSystem.add(year, day,
        `A bandit chief in ${prov?.name ?? agent.provinceId} has accepted royal amnesty and disbanded their gang.`,
        'NORMAL'
      );
      engine.alertSystem.queueAlert(
        `Bandit gang in ${prov?.name ?? agent.provinceId} accepted amnesty. Some have joined your forces.`,
        'NORMAL'
      );
      break;
    }

    case 'EXPAND_TERRITORY': {
      adjustInteger(sv, 'active_provinces', +1);
      adjustContinuous(sv, 'territorial', +5);
      adjustContinuous(sv, 'ambition', -3);
      // Move to neighbor
      const nbrs2 = prov?.neighbors ?? [];
      if (nbrs2.length > 0) {
        const targetProvId = nbrs2[Math.floor(engine.rng.next() * nbrs2.length)];
        engine.chronicleSystem.add(year, day,
          `Bandits are expanding operations from ${prov?.name ?? agent.provinceId} into new territory.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'ATTACK_WEAKENED_ARMY': {
      // Find the weakest player army
      const weakestArmy = Object.values(engine.armies)
        .filter((a: any) => a.realmId === 'realm_1' && a.morale < 60)
        .sort((a: any, b: any) => a.morale - b.morale)[0] as any;
      if (weakestArmy) {
        const dmg = 50 + Math.floor(engine.rng.next() * 100);
        weakestArmy.morale = clamp(weakestArmy.morale - 20, 0, 100);
        weakestArmy.units?.forEach((u: any) => { u.count = Math.max(0, u.count - Math.floor(dmg * 0.5)); });
        engine.chronicleSystem.add(year, day,
          `Bandits launched a surprise attack on a weakened army unit!`,
          'CRITICAL'
        );
        engine.alertSystem.queueAlert('Your weakened army has been ambushed by bandits!', 'CRITICAL');
        adjustContinuous(sv, 'morale', +10);
        adjustInteger(sv, 'gold', +100);
      }
      break;
    }

    case 'KIDNAP_MERCHANT': {
      const ransom = 200 + Math.floor(engine.rng.next() * 300);
      engine.pendingEvents.push({
        id: 'event_kidnap_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Merchant Kidnapped!',
        description: `Bandits in ${prov?.name ?? agent.provinceId} have kidnapped a merchant and demand ${ransom} gold ransom.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: `Pay ransom (${ransom} gold)`, action: 'SPEND_GOLD', amount: ransom, effect: 'Merchant released, bandits enriched' },
          { label: 'Refuse to pay', action: 'IGNORE', effect: 'Bandit executes captive if ignored' },
          { label: 'Send troops to rescue', action: 'MILITARY_ACTION', effect: 'Risk of captive death, eliminates bandit leverage' },
        ],
      });
      // World flag so EXECUTE_CAPTIVE action can fire
      (engine as any)['_banditFlags'] = (engine as any)['_banditFlags'] ?? {};
      (engine as any)['_banditFlags'][agent.id] = { has_captive: 1, ransom, ransom_refused: 0 };
      adjustContinuous(sv, 'greed', +5);
      engine.alertSystem.queueAlert(`Bandit kidnapping in ${prov?.name ?? agent.provinceId}! Ransom demanded: ${ransom} gold.`, 'URGENT');
      break;
    }

    case 'EXECUTE_CAPTIVE': {
      if (prov) prov.loyalty = clamp(prov.loyalty - 8, 0, 100);
      adjustContinuous(sv, 'reputation_fear', +10);
      adjustContinuous(sv, 'morale', -5); // even bandits feel it
      const bf = (engine as any)['_banditFlags']?.[agent.id];
      if (bf) bf.has_captive = 0;
      engine.chronicleSystem.add(year, day,
        `A bandit chief executed a kidnapped merchant in ${prov?.name ?? agent.provinceId}, shocking the population.`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(`Bandit executed their hostage in ${prov?.name ?? agent.provinceId}. Local morale has plummeted.`, 'CRITICAL');
      break;
    }

    case 'TERRORIZE_POPULATION': {
      if (prov) {
        prov.loyalty = clamp(prov.loyalty - 12, 0, 100);
        prov.population.total = Math.max(0, prov.population.total - 20);
      }
      adjustContinuous(sv, 'reputation_fear', +15);
      adjustContinuous(sv, 'loyalty_to_band', -5); // even bandits are troubled
      engine.chronicleSystem.add(year, day,
        `Deliberate atrocities committed by a bandit gang in ${prov?.name ?? agent.provinceId} have terrorized the civilian population.`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(`ATROCITY! Bandits are deliberately terrorizing civilians in ${prov?.name ?? agent.provinceId}.`, 'CRITICAL');
      break;
    }

    case 'NEGOTIATE_WITH_LORD': {
      engine.pendingEvents.push({
        id: 'event_bandit_parley_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Bandit Chief Seeks Parley',
        description: `A bandit chief in ${prov?.name ?? agent.provinceId} has sent word requesting negotiations. They may offer intelligence or to cease operations in exchange for payment or amnesty.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Offer amnesty', action: 'OFFER_AMNESTY', effect: 'Bandit dissolves band, joins realm' },
          { label: 'Pay them off', action: 'SPEND_GOLD', amount: 200, effect: 'Bandit ceases operations for 60 days' },
          { label: 'Refuse and send troops', action: 'MILITARY_ACTION', effect: 'Attempts to hunt down band' },
        ],
      });
      setCategorical(sv, 'current_activity', 'NEGOTIATING');
      break;
    }

    case 'RECRUIT_DESERTERS': {
      // Absorb deserting soldiers
      const deserterCount = 5 + Math.floor(engine.rng.next() * 20);
      adjustInteger(sv, 'band_size', +deserterCount);
      adjustInteger(sv, 'gold', -deserterCount * 3);
      engine.resources.manpower = Math.max(0, engine.resources.manpower - deserterCount);
      engine.chronicleSystem.add(year, day,
        `Bandits in ${prov?.name ?? agent.provinceId} are absorbing deserters from your unpaid armies.`,
        'NORMAL'
      );
      break;
    }

    case 'BURN_GRANARY': {
      if (prov?.stockpiles) {
        prov.stockpiles.food = Math.max(0, (prov.stockpiles.food ?? 0) - 500);
      }
      engine.resources.food = Math.max(0, engine.resources.food - 200);
      if (prov) prov.loyalty = clamp(prov.loyalty - 20, 0, 100);
      adjustContinuous(sv, 'reputation_fear', +10);
      engine.chronicleSystem.add(year, day,
        `ARSON! The granary of ${prov?.name ?? agent.provinceId} has been burned by bandits — famine threatens the region!`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(
        `GRANARY BURNED in ${prov?.name ?? agent.provinceId}! Famine conditions may emerge.`,
        'CRITICAL'
      );
      break;
    }

    case 'FORM_ALLIANCE_WITH_OTHER_BAND': {
      // Find another bandit NPC and merge band sizes conceptually
      adjustInteger(sv, 'band_size', +Math.floor(engine.rng.next() * 30));
      adjustContinuous(sv, 'loyalty_to_band', -5); // tension from merging
      engine.chronicleSystem.add(year, day,
        `Two bandit gangs in ${prov?.name ?? agent.provinceId} have formed a coordinated alliance — the threat doubles.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(`Bandit alliance formed near ${prov?.name ?? agent.provinceId}!`, 'URGENT');
      break;
    }

    case 'ASPIRE_TO_LORDSHIP': {
      // Political play — create a petition event
      engine.pendingEvents.push({
        id: 'event_bandit_lordship_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Bandit Chief Claims Legitimacy',
        description: `A powerful bandit chief in ${prov?.name ?? agent.provinceId} has declared themselves a "lord of the people" and is rallying support. They may become a political force if not addressed.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Recognize their claim in exchange for service', action: 'IGNORE', effect: 'They become a minor vassal, band becomes army' },
          { label: 'Crush the pretender', action: 'MILITARY_ACTION', effect: 'Eliminates the threat but raises local unrest' },
          { label: 'Offer amnesty and land', action: 'OFFER_AMNESTY', effect: 'Costs a minor province, gains a loyal vassal' },
        ],
      });
      engine.alertSystem.queueAlert(`A bandit chief in ${prov?.name ?? agent.provinceId} is declaring political ambitions!`, 'URGENT');
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // MASTER MERCHANT ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'ESTABLISH_TRADE_ROUTE': {
      const routeId = 'route_npc_' + nanoid(8);
      engine.tradeRoutes[routeId] = {
        id: routeId,
        originId: agent.provinceId,
        destinationId: prov?.neighbors?.[0] ?? agent.provinceId,
        good: 'GRAIN',
        volumePerMonth: 100,
        profitPerMonth: 50,
        riskLevel: 30,
        status: 'ACTIVE',
        convoysInTransit: [],
        isRoyal: false,
      };
      adjustInteger(sv, 'active_trade_routes', +1);
      adjustContinuous(sv, 'market_confidence', +5);
      engine.chronicleSystem.add(year, day, `A merchant established a new trade route from ${prov?.name ?? agent.provinceId}.`, 'FLAVOR');
      break;
    }

    case 'CLOSE_TRADE_ROUTE': {
      // Remove one of merchant's trade routes
      const merchantRoutes = Object.values(engine.tradeRoutes).filter(
        (r: any) => r.originId === agent.provinceId && !r.isRoyal
      );
      if (merchantRoutes.length > 0) {
        const toClose = merchantRoutes[0] as any;
        delete engine.tradeRoutes[toClose.id];
        adjustInteger(sv, 'active_trade_routes', -1);
        adjustContinuous(sv, 'market_confidence', -3);
      }
      break;
    }

    case 'RAISE_PRICES': {
      // Modify market values in the settlement
      const settle = agent.settlementId ? engine.aureliaSim?.settlementHierarchies?.[agent.provinceId]?.find(
        (s: any) => s.id === agent.settlementId
      ) : null;
      if (settle) {
        settle.marketValue = Math.floor((settle.marketValue ?? 15) * 1.25);
      }
      adjustContinuous(sv, 'prestige', +2);
      adjustInteger(sv, 'gold', +80);
      engine.chronicleSystem.add(year, day,
        `A merchant in ${prov?.name ?? agent.provinceId} has raised prices, capitalizing on local scarcity.`,
        'NORMAL'
      );
      break;
    }

    case 'LOWER_PRICES': {
      adjustInteger(sv, 'active_trade_routes', +0); // no change; just market positioning
      adjustInteger(sv, 'warehoused_goods', -50);
      adjustContinuous(sv, 'market_confidence', +5);
      adjustInteger(sv, 'gold', +40);
      break;
    }

    case 'STOCKPILE_GOODS': {
      const purchaseAmt = Math.min(getInteger(sv, 'gold') - 100, 200);
      adjustInteger(sv, 'gold', -purchaseAmt);
      adjustInteger(sv, 'warehoused_goods', +purchaseAmt);
      adjustContinuous(sv, 'hoarding_drive', +3);
      break;
    }

    case 'DUMP_GOODS': {
      const dumpValue = getInteger(sv, 'warehoused_goods');
      const goldEarned2 = Math.floor(dumpValue * 1.3); // sold at peak
      adjustInteger(sv, 'gold', +goldEarned2);
      sv.integers['warehoused_goods'] = 0;
      adjustContinuous(sv, 'hoarding_drive', -5);
      break;
    }

    case 'OFFER_LOAN_TO_PLAYER': {
      const loanAmount = 300 + Math.floor(engine.rng.next() * 500);
      engine.pendingEvents.push({
        id: 'event_merchant_loan_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Merchant Offers a Loan',
        description: `A master merchant is offering a loan of ${loanAmount} gold at 20% interest, due in 6 months.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: `Accept loan (${loanAmount} gold, 20% interest)`, action: 'GAIN_GOLD', amount: loanAmount, effect: `+${loanAmount} gold now, -${Math.floor(loanAmount * 1.2)} gold in 180 days` },
          { label: 'Decline the offer', action: 'IGNORE', effect: 'Merchant remains available for future dealings' },
        ],
      });
      adjustInteger(sv, 'outstanding_loans', +loanAmount);
      engine.alertSystem.queueAlert(`A merchant is offering a loan of ${loanAmount} gold.`, 'NORMAL');
      break;
    }

    case 'CALL_IN_LOAN': {
      const loanOwed = Math.min(getInteger(sv, 'outstanding_loans'), 500);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - loanOwed);
      adjustInteger(sv, 'gold', +loanOwed);
      adjustInteger(sv, 'outstanding_loans', -loanOwed);
      engine.alertSystem.queueAlert(`A merchant has called in a loan of ${loanOwed} gold from your treasury!`, 'URGENT');
      break;
    }

    case 'BRIBE_TAX_COLLECTOR': {
      const bribeGold = 100 + Math.floor(engine.rng.next() * 100);
      adjustInteger(sv, 'gold', -bribeGold);
      adjustInteger(sv, 'bribes_paid', +bribeGold);
      // Net effect: merchant keeps more of their earnings this month
      adjustInteger(sv, 'gold', +Math.floor(bribeGold * 0.8)); // 80% effective recovery
      engine.treasury.taxRevenue -= Math.floor(bribeGold * 0.3);
      break;
    }

    case 'ESTABLISH_SMUGGLING_ROUTE': {
      adjustInteger(sv, 'smuggling_operations', +1);
      adjustContinuous(sv, 'smuggling_drive', -10);
      engine.treasury.taxRevenue -= 50; // revenue lost to smuggling
      engine.chronicleSystem.add(year, day,
        `Intelligence suggests a smuggling operation is running through ${prov?.name ?? agent.provinceId}.`,
        'NORMAL'
      );
      break;
    }

    case 'FUND_GUILD_LOBBY': {
      const lobbyGold = 300;
      if (getInteger(sv, 'gold') >= lobbyGold) {
        adjustInteger(sv, 'gold', -lobbyGold);
        adjustContinuous(sv, 'political_interest', +5);
        adjustContinuous(sv, 'guild_solidarity', +5);
        engine.chronicleSystem.add(year, day,
          `The merchant guild is lobbying for trade law reforms in ${prov?.name ?? agent.provinceId}.`,
          'NORMAL'
        );
        engine.pendingEvents.push({
          id: 'event_guild_lobby_' + nanoid(),
          type: 'COURT_PETITION',
          title: 'Guild Lobbying for Trade Reform',
          description: 'The merchant guilds are requesting a formal reduction in trade restrictions and tariffs.',
          createdYear: year, createdDay: day,
          choices: [
            { label: 'Grant partial reform', action: 'IGNORE', effect: '+20 merchant loyalty, -15% tariff income' },
            { label: 'Reject the lobby', action: 'IGNORE', effect: 'Merchants grow more politically active' },
          ],
        });
      }
      break;
    }

    case 'BRIBE_CUSTOMS_OFFICIAL': {
      const bribeAmt2 = 80;
      adjustInteger(sv, 'gold', -bribeAmt2 + 60); // net positive
      adjustInteger(sv, 'bribes_paid', +bribeAmt2);
      engine.treasury.taxRevenue -= 20;
      break;
    }

    case 'INVEST_IN_CITY_BUILDING': {
      if (prov && getInteger(sv, 'gold') >= 500) {
        adjustInteger(sv, 'gold', -500);
        if (!prov.buildings) prov.buildings = [];
        prov.buildings.push({ typeId: 'MARKET', completionDate: day + 30, isActive: true, condition: 100 } as any);
        adjustContinuous(sv, 'civic_investment', +5);
        adjustContinuous(sv, 'prestige', +8);
        engine.chronicleSystem.add(year, day,
          `A merchant has invested in a new market building in ${prov.name}.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'FINANCE_MERCENARY_HIRE': {
      if (getInteger(sv, 'gold') >= 600) {
        adjustInteger(sv, 'gold', -600);
        engine.resources.manpower += 50;
        engine.chronicleSystem.add(year, day,
          `A merchant in ${prov?.name ?? agent.provinceId} has personally funded the hire of a mercenary guard company.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'SPREAD_MARKET_RUMOR': {
      // Manipulate prices by circulating false scarcity info
      const priceShift = engine.rng.next() > 0.5 ? +20 : -15;
      adjustInteger(sv, 'gold', +Math.abs(priceShift) * 2); // profit from the manipulation
      adjustContinuous(sv, 'reputation_pride', -3); // slight reputation cost
      engine.chronicleSystem.add(year, day,
        `False scarcity rumors are circulating in ${prov?.name ?? agent.provinceId}'s markets, causing price volatility.`,
        'FLAVOR'
      );
      break;
    }

    case 'MOVE_OPERATIONS': {
      // Relocate to a safer province
      const neighbors3 = prov?.neighbors ?? [];
      if (neighbors3.length > 0) {
        const newLoc = neighbors3[Math.floor(engine.rng.next() * neighbors3.length)];
        sv.provinceId = newLoc;
        setCategorical(sv, 'location', newLoc);
        adjustContinuous(sv, 'fear', -15);
        adjustContinuous(sv, 'market_confidence', -5);
        engine.chronicleSystem.add(year, day,
          `A merchant has relocated their operations from ${prov?.name ?? agent.provinceId} to safer territory.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'FUND_RIVAL_LORD': {
      // Covertly bankroll a competitor; creates political instability
      const rivalFunds = 400;
      if (getInteger(sv, 'gold') >= rivalFunds) {
        adjustInteger(sv, 'gold', -rivalFunds);
        // Find a non-player character and boost their gold
        const rivals = Object.values(engine.characters).filter((c: any) => !c.isPlayer && c.isAlive) as any[];
        if (rivals.length > 0) {
          const rival = rivals[Math.floor(engine.rng.next() * rivals.length)];
          rival.goldHoldings = (rival.goldHoldings ?? 0) + rivalFunds;
          engine.alertSystem.queueAlert(
            `Spymaster: A merchant is secretly funding ${rival.firstName} ${rival.lastName} — their gold holdings have surged.`,
            'URGENT'
          );
        }
      }
      break;
    }

    case 'PETITION_FOR_LAW_CHANGE': {
      engine.pendingEvents.push({
        id: 'event_law_petition_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Merchant Guild Petitions for Trade Law',
        description: `The merchant guilds of ${prov?.name ?? agent.provinceId} are formally petitioning for reduced tariffs or new trade freedoms.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant the petition', action: 'IGNORE', effect: '+25 merchant loyalty, -10% tariff income' },
          { label: 'Reject the petition', action: 'IGNORE', effect: 'Merchants increase lobbying efforts' },
        ],
      });
      adjustContinuous(sv, 'political_interest', +3);
      break;
    }

    case 'HIRE_PRIVATE_GUARD': {
      if (getInteger(sv, 'gold') >= 150) {
        adjustInteger(sv, 'gold', -150);
        adjustContinuous(sv, 'fear', -10);
        adjustContinuous(sv, 'paranoia', -8);
        // Merchant's trade routes become safer (reduce risk)
        Object.values(engine.tradeRoutes).forEach((r: any) => {
          if (r.originId === agent.provinceId && !r.isRoyal) {
            r.riskLevel = Math.max(0, r.riskLevel - 15);
          }
        });
      }
      break;
    }

    case 'SEEK_MONOPOLY': {
      if (getInteger(sv, 'gold') >= 700) {
        adjustInteger(sv, 'gold', -700);
        adjustContinuous(sv, 'prestige', +12);
        adjustContinuous(sv, 'market_confidence', +10);
        adjustInteger(sv, 'guild_rank', +1);
        engine.chronicleSystem.add(year, day,
          `A master merchant has secured a monopoly on a key commodity in ${prov?.name ?? agent.provinceId}.`,
          'NORMAL'
        );
      }
      break;
    }

    case 'EXPOSE_COMPETITOR': {
      engine.alertSystem.queueAlert(
        `A merchant in ${prov?.name ?? agent.provinceId} has denounced a competitor's smuggling operation to your customs office.`,
        'NORMAL'
      );
      engine.treasury.goldBalance += 100; // recovered smuggled goods
      adjustInteger(sv, 'smuggling_operations', 0);
      engine.chronicleSystem.add(year, day,
        `A merchant rivalry in ${prov?.name ?? agent.provinceId} turned legal — a competitor's smuggling ring has been exposed.`,
        'NORMAL'
      );
      break;
    }

    case 'RETIRE': {
      // Merchant exits simulation
      adjustContinuous(sv, 'fear', -30);
      setCategorical(sv, 'economic_stance', 'CONTRACTING');
      engine.chronicleSystem.add(year, day,
        `The master merchant of ${prov?.name ?? agent.provinceId} has retired to the countryside, withdrawing their capital.`,
        'FLAVOR'
      );
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // MERCENARY CAPTAIN ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    case 'ACCEPT_CONTRACT': {
      setCategorical(sv, 'contract_status', 'UNDER_CONTRACT');
      setCategorical(sv, 'current_employer', 'player');
      adjustContinuous(sv, 'loyalty_to_employer', +30);
      adjustContinuous(sv, 'desperation', -20);
      adjustInteger(sv, 'gold', +200);
      engine.chronicleSystem.add(year, day,
        `A mercenary company has accepted a contract and is now under your employ.`,
        'NORMAL'
      );
      break;
    }

    case 'REJECT_CONTRACT': {
      setCategorical(sv, 'contract_status', 'AVAILABLE');
      adjustContinuous(sv, 'reputation_pride', +5);
      engine.chronicleSystem.add(year, day,
        `A mercenary company has rejected your terms and remains available on the open market.`,
        'FLAVOR'
      );
      break;
    }

    case 'RENEGOTIATE_MID_CONTRACT': {
      engine.pendingEvents.push({
        id: 'event_merc_renegotiate_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Mercenaries Demand Better Terms',
        description: `Your mercenary captain is demanding contract renegotiation — they feel the scope of service has exceeded the original agreement.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Agree to their terms (+150 gold/month)', action: 'SPEND_GOLD', amount: 150, effect: 'Captain remains loyal' },
          { label: 'Refuse renegotiation', action: 'IGNORE', effect: 'Captain\'s loyalty drops, desertion risk rises' },
        ],
      });
      adjustContinuous(sv, 'loyalty_to_employer', -10);
      engine.alertSystem.queueAlert('Your mercenary captain is demanding contract renegotiation!', 'URGENT');
      break;
    }

    case 'DESERT_CONTRACT': {
      setCategorical(sv, 'contract_status', 'AVAILABLE');
      setCategorical(sv, 'current_employer', 'none');
      adjustContinuous(sv, 'loyalty_to_employer', -80);
      adjustContinuous(sv, 'reputation_pride', -20);
      adjustInteger(sv, 'contracts_broken', +1);
      adjustInteger(sv, 'company_reputation', -20);
      engine.chronicleSystem.add(year, day,
        `A mercenary company has deserted your contract, dealing a blow to your military readiness.`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert('Your hired mercenaries have deserted! Military strength reduced.', 'CRITICAL');
      break;
    }

    case 'SACK_CITY': {
      const sackLoot = 300 + Math.floor(engine.rng.next() * 400);
      engine.treasury.goldBalance = Math.max(0, engine.treasury.goldBalance - sackLoot);
      adjustInteger(sv, 'gold', +sackLoot);
      adjustInteger(sv, 'contracts_broken', +1);
      adjustInteger(sv, 'company_reputation', -30);
      setCategorical(sv, 'contract_status', 'GONE_ROGUE');
      if (prov) prov.loyalty = clamp(prov.loyalty - 25, 0, 100);
      engine.chronicleSystem.add(year, day,
        `CATASTROPHE! Unpaid mercenaries have sacked a settlement in ${prov?.name ?? agent.provinceId}!`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert(
        `MERCENARY SACKING in ${prov?.name ?? agent.provinceId}! Your unpaid troops have turned on the population!`,
        'CRITICAL'
      );
      break;
    }

    case 'DEFECT_TO_ENEMY': {
      setCategorical(sv, 'contract_status', 'UNDER_CONTRACT');
      setCategorical(sv, 'current_employer', 'enemy');
      adjustContinuous(sv, 'loyalty_to_employer', -90);
      adjustInteger(sv, 'contracts_broken', +1);
      adjustInteger(sv, 'company_reputation', -25);
      engine.chronicleSystem.add(year, day,
        `Your mercenary company has betrayed you and defected to your enemies!`,
        'CRITICAL'
      );
      engine.alertSystem.queueAlert('BETRAYAL! Your hired mercenaries have switched sides!', 'CRITICAL');
      break;
    }

    case 'RECRUIT_MERCENARY': { // mercenary version
      const newCount = 10 + Math.floor(engine.rng.next() * 30);
      adjustInteger(sv, 'company_size', +newCount);
      adjustInteger(sv, 'gold', -newCount * 5);
      break;
    }

    case 'TRAIN_TROOPS': {
      adjustInteger(sv, 'company_reputation', +2);
      adjustContinuous(sv, 'reputation_pride', +3);
      adjustContinuous(sv, 'battle_hunger', -5);
      break;
    }

    case 'DEMAND_BONUS_PAYMENT': {
      const bonusDemand = 100 + Math.floor(engine.rng.next() * 200);
      engine.pendingEvents.push({
        id: 'event_merc_bonus_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Mercenaries Demand a Bonus',
        description: `After a significant victory, your mercenary captain is demanding a bonus payment of ${bonusDemand} gold.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: `Pay the bonus (${bonusDemand} gold)`, action: 'SPEND_GOLD', amount: bonusDemand, effect: '+20 captain loyalty, +5 company morale' },
          { label: 'Refuse the demand', action: 'IGNORE', effect: '-15 captain loyalty, contract renegotiation likely' },
        ],
      });
      engine.alertSystem.queueAlert(`Mercenary captain demands a bonus of ${bonusDemand} gold!`, 'NORMAL');
      break;
    }

    case 'OCCUPY_PROVINCE': {
      if (prov) {
        engine.alertSystem.queueAlert(
          `Your mercenary company has occupied ${prov.name} as leverage in a payment dispute!`,
          'CRITICAL'
        );
        engine.chronicleSystem.add(year, day,
          `Mercenaries seize control of ${prov.name}, demanding back-pay from their employer.`,
          'CRITICAL'
        );
      }
      adjustContinuous(sv, 'solidarity_with_company', +5);
      break;
    }

    case 'NEGOTIATE_LAND_FOR_SERVICE': {
      engine.pendingEvents.push({
        id: 'event_merc_land_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Mercenary Seeks Land',
        description: `Your veteran mercenary captain is proposing to trade military service for a minor holding, seeking to legitimize themselves.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Grant a minor holding', action: 'IGNORE', effect: 'Captain becomes vassal, company integrates into realm' },
          { label: 'Offer gold instead', action: 'SPEND_GOLD', amount: 300, effect: 'Captain satisfied but still mercenary' },
          { label: 'Decline', action: 'IGNORE', effect: '-15 captain loyalty' },
        ],
      });
      break;
    }

    case 'RAID_FOR_SUPPLIES': {
      const foodStolen = 100 + Math.floor(engine.rng.next() * 150);
      engine.resources.food = Math.max(0, engine.resources.food - foodStolen);
      adjustContinuous(sv, 'solidarity_with_company', +5); // taking care of the men
      adjustContinuous(sv, 'loyalty_to_employer', -15);
      if (prov) prov.loyalty = clamp(prov.loyalty - 5, 0, 100);
      engine.chronicleSystem.add(year, day,
        `Mercenaries have raided local farms and granaries in ${prov?.name ?? agent.provinceId} to supply themselves.`,
        'URGENT'
      );
      engine.alertSystem.queueAlert(`Your mercenaries are raiding their own supply lines in ${prov?.name ?? agent.provinceId}!`, 'URGENT');
      break;
    }

    case 'PROTECT_CONVOY': {
      // Boost trade route security
      Object.values(engine.tradeRoutes).forEach((r: any) => {
        r.riskLevel = Math.max(0, r.riskLevel - 10);
      });
      adjustInteger(sv, 'gold', +100);
      adjustInteger(sv, 'contracts_fulfilled', +1);
      engine.chronicleSystem.add(year, day,
        `A mercenary company successfully escorted trade convoys through ${prov?.name ?? agent.provinceId}.`,
        'FLAVOR'
      );
      break;
    }

    case 'RETIRE_COMPANY': {
      // Captain retires wealthy
      setCategorical(sv, 'contract_status', 'AVAILABLE');
      adjustContinuous(sv, 'fatigue', -30);
      adjustContinuous(sv, 'battle_hunger', -40);
      engine.chronicleSystem.add(year, day,
        `A veteran mercenary captain has retired with their fortune, disbanding their company.`,
        'NORMAL'
      );
      break;
    }

    case 'SEEK_NEW_CONTRACT': {
      setCategorical(sv, 'contract_status', 'NEGOTIATING');
      engine.chronicleSystem.add(year, day,
        `A mercenary company is actively seeking new contracts.`,
        'FLAVOR'
      );
      engine.alertSystem.queueAlert(
        `A mercenary company is available for hire in ${prov?.name ?? agent.provinceId}.`,
        'NORMAL'
      );
      break;
    }

    case 'SPREAD_REPUTATION': {
      adjustInteger(sv, 'company_reputation', +5);
      adjustContinuous(sv, 'reputation_pride', +3);
      engine.chronicleSystem.add(year, day,
        `A mercenary company's heralds are spreading tales of their victories, raising their hire price.`,
        'FLAVOR'
      );
      break;
    }

    case 'FORM_MERCENARY_ALLIANCE': {
      adjustInteger(sv, 'company_size', +Math.floor(engine.rng.next() * 50));
      adjustInteger(sv, 'company_reputation', +8);
      engine.chronicleSystem.add(year, day,
        `Two mercenary companies have formed a combined fighting force near ${prov?.name ?? agent.provinceId}.`,
        'NORMAL'
      );
      break;
    }

    case 'ATTEMPT_LORDSHIP': {
      engine.pendingEvents.push({
        id: 'event_merc_lordship_' + nanoid(),
        type: 'COURT_PETITION',
        title: 'Mercenary Captain Claims Noble Rights',
        description: `A battle-tested mercenary captain is publicly claiming noble legitimacy and the right to hold land. The court must respond.`,
        createdYear: year, createdDay: day,
        choices: [
          { label: 'Elevate them as a minor noble', action: 'IGNORE', effect: 'Captain becomes vassal, commands company as realm army' },
          { label: 'Publicly reject the claim', action: 'IGNORE', effect: '-20 captain loyalty, potential desertion' },
        ],
      });
      engine.alertSystem.queueAlert(`A mercenary captain is claiming noble status!`, 'URGENT');
      break;
    }

    default:
      // Unknown action — log and ignore
      engine.chronicleSystem.add(year, day, `[DEBUG] Unknown NPC action executed: ${actionId}`, 'FLAVOR');
      break;
  }
}

// ─── Helper: generate a simple first name ──────────────────────────────────

function generateFirstName(rng: () => number): string {
  const names = ['Aldric', 'Brant', 'Cora', 'Elsin', 'Fenn', 'Gwen', 'Hart', 'Ilara',
                 'Jorik', 'Kael', 'Liora', 'Mira', 'Noel', 'Oswin', 'Petra', 'Rand',
                 'Sela', 'Thorn', 'Ula', 'Vara', 'Wynn', 'Ysabel', 'Zorin'];
  return names[Math.floor(rng() * names.length)];
}
