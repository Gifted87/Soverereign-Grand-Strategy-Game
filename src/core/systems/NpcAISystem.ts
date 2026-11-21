import type { GameLoop } from '../engine/GameLoop';
import { computeActionWeights, sampleAction } from './ActionWeightEngine';
import { executeNpcAction } from './NpcActionExecutor';
import { decayMemories } from './NpcMemorySystem';
import { applyStateDrift, buildEnvironmentalContext } from './StateDriftSystem';
import { applyEnvironmentalModifiers, propagateActionInfluence } from './InterAgentInfluenceSystem';

// Tier 1 & 2 Catalogs
import { PEASANT_COHORT_ACTIONS } from '../data/npcActions/peasantCohortActions';
import { WANDERING_KNIGHT_ACTIONS } from '../data/npcActions/wanderingKnightActions';
import { MONK_ACTIONS } from '../data/npcActions/monkActions';
import { BANDIT_CHIEF_ACTIONS } from '../data/npcActions/banditChiefActions';
import { MASTER_MERCHANT_ACTIONS } from '../data/npcActions/masterMerchantActions';
import { MERCENARY_CAPTAIN_ACTIONS } from '../data/npcActions/mercenaryCaptainActions';

// Tier 3 Catalogs
import { VASSAL_LORD_ACTIONS } from '../data/npcActions/vassalLordActions';
import { CHANCELLOR_ACTIONS } from '../data/npcActions/chancellorActions';
import { MARSHAL_ACTIONS } from '../data/npcActions/marshalActions';
import { SPYMASTER_ACTIONS } from '../data/npcActions/spymasterActions';
import { TREASURER_ACTIONS } from '../data/npcActions/treasurerActions';
import { COURT_PRIEST_ACTIONS } from '../data/npcActions/courtPriestActions';

// Tier 4 Catalog
import { FOREIGN_RULER_ACTIONS } from '../data/npcActions/foreignRulerActions';
import { HIGH_PRIEST_ACTIONS } from '../data/npcActions/highPriestActions';
import { FOLK_HERO_ACTIONS } from '../data/npcActions/folkHeroActions';
import { FACTION_LEADER_ACTIONS } from '../data/npcActions/factionLeaderActions';
import { HEIR_APPARENT_ACTIONS } from '../data/npcActions/heirApparentActions';

/**
 * NpcAISystem
 *
 * Probabilistic Decision Machine. No legacy FSMs.
 * Runs on a Priority Tick Scheduler (Section 10).
 */
export class NpcAISystem {
  constructor(private engine: GameLoop) {}

  bootstrap() {
    // Initialization handled elsewhere
  }

  /**
   * The Priority Tick Scheduler.
   * Runs inside the main GameLoop tick.
   */
  tick() {
    const day = this.engine.clock.currentDay;

    // Build the list of active agents for influence propagation
    const allAgents = Object.values(this.engine.characters)
      .filter((char: any) => char.isAlive && char.stateVector)
      .map((char: any) => ({
        id: char.id,
        provinceId: char.stateVector.provinceId,
        stateVector: char.stateVector
      }));

    // Identify active military commanders
    const activeCommanders = new Set<string>();
    for (const armyId in this.engine.armies) {
       const army = this.engine.armies[armyId];
       if (army.commanderId) activeCommanders.add(army.commanderId);
    }

    const tier1BatchMap = new Map<string, any[]>();

    // Process each character
    for (const charId in this.engine.characters) {
      const char = this.engine.characters[charId];
      if (!char || !char.isAlive || !char.stateVector) continue;

      const sv = char.stateVector;

      // 1. Check Crisis Escalation & Military (Forces Daily Tick)
      let forceDaily = false;
      if (sv.tier === 4 || activeCommanders.has(char.id) || this.isAgentInCrisis(sv, sv.provinceId)) {
         forceDaily = true;
      }

      // 2. Modulo Tick Priorities (Section 10.1)
      let shouldTick = false;
      if (forceDaily) {
        shouldTick = true;
      } else if (sv.tier === 3 && day % 3 === 0) {
        shouldTick = true;
      } else if (sv.tier === 2 && day % 7 === 0) {
        shouldTick = true;
      } else if (sv.tier === 1 && day % 15 === 0) {
        shouldTick = true;
      }

      if (!shouldTick) continue;

      // 3. Queue Tier 1 for Batching, directly process higher tiers
      if (sv.tier === 1) {
         const batchKey = `${sv.provinceId}_${sv.characterType}`;
         if (!tier1BatchMap.has(batchKey)) tier1BatchMap.set(batchKey, []);
         tier1BatchMap.get(batchKey)!.push(char);
      } else {
         this.runProbabilisticAi(char, day, allAgents, null);
      }
    }

    // Process Tier 1 Batches (Section 10.3)
    for (const [batchKey, batchChars] of tier1BatchMap.entries()) {
       if (batchChars.length === 0) continue;
       this.runProbabilisticAi(batchChars[0], day, allAgents, batchChars);
    }
  }

  private isAgentInCrisis(sv: any, provinceId: string): boolean {
    if (sv.continuous['fear']?.value > 90) return true;
    if (sv.continuous['loyalty_to_liege']?.value < 10) return true;
    if (sv.continuous['loyalty_to_player']?.value < 10) return true;
    if (sv.continuous['war_weariness']?.value > 90) return true;
    if (sv.continuous['desperation']?.value > 90) return true;
    
    const prov = this.engine.provinces[provinceId];
    if (prov) {
       const envCtx = buildEnvironmentalContext(this.engine, provinceId);
       if (envCtx.provinceBesieged || envCtx.provinceDisease) return true;
    }
    return false;
  }

  private runProbabilisticAi(leadChar: any, currentTick: number, allAgents: any[], batchChars: any[] | null) {
    const sv = leadChar.stateVector;
    
    // Check global cooldown on the lead character
    if (sv.cooldowns['__GLOBAL'] && currentTick < sv.cooldowns['__GLOBAL']) {
      return;
    }

    const targets = batchChars ? batchChars : [leadChar];
    const envCtx = buildEnvironmentalContext(this.engine, sv.provinceId);

    // Process systemic drift, memory decay, and environmental influence
    for (const targetChar of targets) {
      const tSv = targetChar.stateVector;
      decayMemories(tSv);
      applyStateDrift(tSv, envCtx as any);
      applyEnvironmentalModifiers({ id: targetChar.id, provinceId: tSv.provinceId, stateVector: tSv }, envCtx as any);
    }

    // 4. Select action catalog
    const catalog = this.getCatalogForCharacter(sv.characterType, sv);
    if (!catalog || catalog.length === 0) return;

    // Filter out actions currently on specific cooldown
    const availableActions = catalog.filter(action => {
      const cd = sv.cooldowns[action.id];
      return !cd || currentTick >= cd;
    });

    if (availableActions.length === 0) return;

    // 5. Compute weights and sample ONCE for the batch
    const weights = computeActionWeights(
      sv,
      availableActions,
      currentTick,
      envCtx as any,
      () => this.engine.rng.next(),
      leadChar.traits || []
    );

    const chosenActionId = sampleAction(weights, () => this.engine.rng.next());

    if (chosenActionId) {
      const actionDef = catalog.find(a => a.id === chosenActionId)!;
      
      // 6. Execute Side Effects for EVERY member of the batch
      for (const targetChar of targets) {
         const tSv = targetChar.stateVector;
         const agentObj = {
           id: targetChar.id,
           provinceId: tSv.provinceId,
           settlementId: tSv.settlementId,
           stateVector: tSv
         };

         executeNpcAction(chosenActionId, agentObj, this.engine, currentTick);

         if (this.engine.npcFeedbackLoopSystem) {
           this.engine.npcFeedbackLoopSystem.applyAction({
             action: chosenActionId as any,
             actorId: agentObj.id,
             provinceId: agentObj.provinceId
           });
         }

         propagateActionInfluence(
           agentObj,
           actionDef,
           allAgents,
           (provA, provB) => {
              const pA = this.engine.provinces[provA];
              const pB = this.engine.provinces[provB];
              if (pA && pB) return pA.realmId === pB.realmId;
              return false;
           },
           currentTick
         );

         // 8. Set Cooldowns
         tSv.cooldowns[chosenActionId] = currentTick + actionDef.cooldownTicks;
         
         // Global tier-based cooldown to prevent machine-gunning actions
         let globalCdTicks = 0;
         switch (tSv.tier) {
           case 4: globalCdTicks = 14; break;
           case 3: globalCdTicks = 7; break;
           case 2: globalCdTicks = 3; break;
           case 1: globalCdTicks = 1; break;
         }
         tSv.cooldowns['__GLOBAL'] = currentTick + globalCdTicks;
      }
    }
  }

  private getCatalogForCharacter(type: string, sv?: import('../models/NpcStateVector').NpcStateVector) {
    switch (type) {
      case 'PEASANT_COHORT':    return PEASANT_COHORT_ACTIONS;
      case 'WANDERING_KNIGHT':  return WANDERING_KNIGHT_ACTIONS;
      case 'MONK':              return MONK_ACTIONS;
      case 'BANDIT_CHIEF':      return BANDIT_CHIEF_ACTIONS;
      case 'MASTER_MERCHANT':   return MASTER_MERCHANT_ACTIONS;
      case 'MERCENARY_CAPTAIN': return MERCENARY_CAPTAIN_ACTIONS;
      case 'VASSAL_LORD':       return VASSAL_LORD_ACTIONS;

      case 'COURT_ADVISOR': {
        const role = sv?.categorical?.['role'] ?? '';
        switch (role) {
          case 'CHANCELLOR':   return CHANCELLOR_ACTIONS;
          case 'MARSHAL':      return MARSHAL_ACTIONS;
          case 'SPYMASTER':    return SPYMASTER_ACTIONS;
          case 'TREASURER':    return TREASURER_ACTIONS;
          case 'COURT_PRIEST': return COURT_PRIEST_ACTIONS;
          default:             return CHANCELLOR_ACTIONS;
        }
      }

      case 'FOREIGN_RULER':   return FOREIGN_RULER_ACTIONS;
      case 'HIGH_PRIEST':     return HIGH_PRIEST_ACTIONS;
      case 'FOLK_HERO':       return FOLK_HERO_ACTIONS;
      case 'FACTION_LEADER':  return FACTION_LEADER_ACTIONS;
      case 'HEIR_APPARENT':   return HEIR_APPARENT_ACTIONS;
      default: return [];
    }
  }
}
