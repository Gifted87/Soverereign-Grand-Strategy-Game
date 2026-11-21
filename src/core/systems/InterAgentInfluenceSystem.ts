/**
 * InterAgentInfluenceSystem.ts
 *
 * Implements sovereign_npc_simulation.md Section 7.2 & 7.3
 * Handles how actions performed by one agent ripple out to affect the
 * state vectors and opinions of other agents, scoped by VisibilityRadius.
 * Also processes global and provincial environmental modifiers.
 */

import type { NpcStateVector } from '../models/NpcStateVector';
import type { ActionDefinition, VisibilityRadius } from './ActionWeightEngine';
import { recordMemory } from './NpcMemorySystem';

export interface WorldContext {
  flags: Record<string, boolean | number | string>;
  active_alliances: number;
  player_armies_nearby: number;
  
  // Explicitly defined simulation variables (per Section 7.2)
  province_states?: Record<string, {
    active_siege?: boolean;
    disease_active?: boolean;
  }>;
  inflation_rate?: number;
  treasury_balance?: number;
  holy_war_active?: boolean;
}

export interface NpcAgent {
  id: string;
  provinceId: string;
  stateVector: NpcStateVector;
  isPlayer?: boolean; // Sometimes populated if the agent is the player
}

const RADIUS_SCORE: Record<VisibilityRadius, number> = {
  COURT: 1,
  PROVINCE: 2,
  REALM: 3,
  WORLD: 4,
};

function adjustContinuous(sv: NpcStateVector, key: string, delta: number) {
  if (sv.continuous[key]) {
    sv.continuous[key].value = Math.max(0, Math.min(100, sv.continuous[key].value + delta));
  }
}

function adjustInteger(sv: NpcStateVector, key: string, delta: number) {
  if (sv.integers[key] !== undefined) {
    sv.integers[key] = Math.max(0, sv.integers[key] + delta);
  }
}

/**
 * Applies environmental modifiers to an agent's state vector (§7.2).
 */
export function applyEnvironmentalModifiers(agent: NpcAgent, world: WorldContext) {
  const sv = agent.stateVector;
  const provState = world.province_states?.[agent.provinceId] || {};

  // 1. Province: Active Siege
  if (provState.active_siege) {
    adjustContinuous(sv, 'fear', 3.0);
    if (sv.characterType === 'PEASANT_COHORT') {
      adjustContinuous(sv, 'desperation', 2.0);
      adjustContinuous(sv, 'hunger', 1.0);
    }
    if (sv.characterType === 'VASSAL_LORD') {
      adjustContinuous(sv, 'stress', 5.0);
    }
    // (Assuming generic soldiers use fatigue)
    adjustContinuous(sv, 'fatigue', 2.0);
  }

  // 2. Province: Active Disease
  if (provState.disease_active) {
    adjustContinuous(sv, 'fear', 2.0);
    if (sv.characterType === 'MASTER_MERCHANT') {
      adjustContinuous(sv, 'market_confidence', -5.0);
    }
    // Clergy piety actions weight * 2 is handled in WeightEngine, but we can raise baseline piety:
    if (['MONK', 'COURT_PRIEST', 'HIGH_PRIEST'].includes(sv.characterType)) {
      adjustContinuous(sv, 'piety', 2.0);
    }
  }

  // 3. Realm: Inflation
  const inflation = world.inflation_rate ?? 1.0;
  if (inflation > 1.5) {
    if (sv.characterType === 'MASTER_MERCHANT') {
      adjustContinuous(sv, 'hoarding_drive', 2.0);
    }
    if (sv.characterType === 'PEASANT_COHORT') {
      adjustContinuous(sv, 'hunger', 1.0);
    }
    if (sv.characterType === 'FOREIGN_RULER') {
      adjustContinuous(sv, 'mercantile_interest', -2.0);
    }
    // (Military gold upkeep dropping faster is handled in economic simulation loop)
  }

  // 4. Realm: Treasury Deficit
  const treasury = world.treasury_balance ?? 0;
  if (treasury < 0) {
    if (sv.characterType === 'COURT_ADVISOR') {
      adjustContinuous(sv, 'stress', 5.0);
    }
    if (sv.characterType === 'MERCENARY_CAPTAIN') {
      adjustInteger(sv, 'days_unpaid', 1);
    }
    // (Treasurer and Marshal handled in StateDriftSystem)
  }

  // 5. World: Holy War
  if (world.holy_war_active) {
    if (['COURT_PRIEST', 'HIGH_PRIEST', 'MONK'].includes(sv.characterType)) {
      adjustContinuous(sv, 'crusade_enthusiasm', 10.0); // Spikes
    }
    if (sv.characterType === 'FOREIGN_RULER') {
      // Simplistic check: if high base piety, they are religious
      if (sv.continuous['piety']?.value > 50) {
        adjustContinuous(sv, 'piety', 5.0);
        adjustContinuous(sv, 'ideological_drive', 3.0);
      } else {
        adjustContinuous(sv, 'isolation_drive', 3.0);
      }
    }
  }
}

/**
 * Propagates the influence of an action across the world (§7.3).
 */
export function propagateActionInfluence(
  source: NpcAgent,
  action: ActionDefinition,
  allAgents: NpcAgent[],
  isSameRealm: (provA: string, provB: string) => boolean,
  currentTick: number
) {
  const targetScore = RADIUS_SCORE[action.visibilityRadius];

  for (const observer of allAgents) {
    if (observer.id === source.id) continue;

    let observerScore = RADIUS_SCORE.WORLD;
    if (observer.provinceId === source.provinceId) {
      observerScore = RADIUS_SCORE.COURT;
    } else if (isSameRealm(observer.provinceId, source.provinceId)) {
      observerScore = RADIUS_SCORE.REALM;
    }

    if (observerScore > targetScore) continue;

    const observerSv = observer.stateVector;

    // ── Generic Category Baselines ──
    // Every action category produces a baseline ripple effect depending on the observer's type.
    switch (action.category) {
      case 'VIOLENT':
        if (observerSv.characterType === 'PEASANT_COHORT') adjustContinuous(observerSv, 'fear', 2.0);
        else adjustContinuous(observerSv, 'paranoia', 1.0);
        break;
      case 'DIPLOMATIC':
        if (observerSv.tier >= 3) adjustContinuous(observerSv, 'political_savvy', 0.5);
        break;
      case 'ECONOMIC':
        if (observerSv.characterType === 'MASTER_MERCHANT') adjustContinuous(observerSv, 'greed', 1.0);
        if (observerSv.characterType === 'PEASANT_COHORT') adjustContinuous(observerSv, 'hunger', 0.5); // generic economic friction
        break;
      case 'RELIGIOUS':
        adjustContinuous(observerSv, 'piety', 1.0);
        break;
      case 'TRUST':
        if (observerSv.tier >= 3) adjustContinuous(observerSv, 'suspicion_of_liege', -1.0);
        break;
      case 'DEFENSIVE':
        // Fortifications or defensive postures breed paranoia and fear in observers
        adjustContinuous(observerSv, 'paranoia', 1.5);
        if (observerSv.characterType === 'PEASANT_COHORT') adjustContinuous(observerSv, 'fear', 1.0);
        break;
      case 'IMPULSIVE':
        adjustContinuous(observerSv, 'unrest', 1.5);
        adjustContinuous(observerSv, 'suspicion', 1.0);
        break;
      case 'ROUTINE':
        // Routine actions normalize the environment
        if (observerSv.characterType === 'PEASANT_COHORT') adjustContinuous(observerSv, 'hope', 0.2);
        break;
    }

    // ── Concrete Action Interactions (Section 7.3) ──

    // 1. Violent and Hostile Actions
    if (action.category === 'VIOLENT') {
      // If the actor is the player/liege, vassals grow suspicious and lose loyalty
      if (source.isPlayer && observerSv.characterType === 'VASSAL_LORD') {
        adjustContinuous(observerSv, 'suspicion_of_liege', 10.0);
        // Cruel lords might respect violence; compassionate lords abhor it.
        if (observerSv.continuous['cruelty']?.value > 60) {
          adjustContinuous(observerSv, 'respect_for_player', 5.0);
        } else {
          adjustContinuous(observerSv, 'loyalty_to_liege', -8.0);
          adjustContinuous(observerSv, 'grudge_weight', 5.0);
        }
      }
      
      // Peasants witnessing violence (on top of baseline)
      if (observerSv.characterType === 'PEASANT_COHORT') {
        adjustContinuous(observerSv, 'fear', 3.0);
        adjustContinuous(observerSv, 'trauma', 2.0); // Decays very slowly
        adjustContinuous(observerSv, 'unrest', 3.0);
      }

      // Memory integration for extreme violent actions
      if (['EXECUTE_CAPTIVE', 'TERRORIZE_POPULATION', 'SACK_CITY'].includes(action.id)) {
        recordMemory(observerSv, 'MASSACRE_WITNESSED', source.id, currentTick, 80, 'TRAUMATIC', 
          `Witnessed extreme violence perpetrated by ${source.id}`, true);
      }
    }

    // 2. Bandit/Mercenary specific violence
    if (source.stateVector.characterType === 'BANDIT_CHIEF' || source.stateVector.characterType === 'MERCENARY_CAPTAIN') {
      if (action.id === 'RAID_VILLAGE' || action.id === 'RAID_SUPPLY_CONVOY') {
        if (observerSv.characterType === 'PEASANT_COHORT') {
          adjustContinuous(observerSv, 'fear', 8.0);
          adjustContinuous(observerSv, 'desperation', 5.0);
        }
        if (observerSv.characterType === 'MASTER_MERCHANT') {
          adjustContinuous(observerSv, 'market_confidence', -10.0);
          adjustContinuous(observerSv, 'fear', 5.0);
        }
      }
    }

    // 3. Diplomatic Successes (Treaties, Marriages)
    if (action.category === 'DIPLOMATIC') {
      if (observerSv.characterType === 'FOREIGN_RULER') {
        adjustContinuous(observerSv, 'respect_for_player', 3.0);
      }
      if (observerSv.characterType === 'VASSAL_LORD') {
        adjustContinuous(observerSv, 'loyalty_to_liege', 2.0);
        adjustContinuous(observerSv, 'discontent', -3.0);
      }
      if (action.id === 'ARRANGE_MARRIAGE_DEAL' || action.id === 'PERFORM_WEDDING') {
        if (observerScore <= RADIUS_SCORE.REALM) {
          adjustContinuous(observerSv, 'hope', 5.0); // Commoners feel stability
        }
      }
    }

    // 4. Treasonous / Factional Court Actions
    if (['DECLARE_INDEPENDENCE', 'EMBEZZLE', 'LEAK_INTEL_TO_ENEMY', 'RECRUIT_FACTION'].includes(action.id)) {
      if (observerSv.characterType === 'VASSAL_LORD') {
        // Blood in the water: ambitious vassals are pulled toward factionalism
        if (observerSv.continuous['ambition']?.value > 50) {
          adjustContinuous(observerSv, 'faction_pull', 8.0);
          adjustContinuous(observerSv, 'loyalty_to_liege', -5.0);
        }
      }
      if (observerSv.characterType === 'FOREIGN_RULER') {
        adjustContinuous(observerSv, 'respect_for_player', -5.0); // Player realm looks weak
        adjustContinuous(observerSv, 'expansionism', 3.0); // Opportunistic
      }
      
      // Memory logging for betrayals (if seen by loyalists or the player)
      if (observerSv.tier >= 3 && observerSv.continuous['loyalty_to_liege']?.value > 70) {
        recordMemory(observerSv, 'BETRAYAL', source.id, currentTick, 60, 'NEGATIVE', 
          `Witnessed treachery by ${source.id}`, false);
      }
    }

    // 5. Religious / Clergy Actions
    if (action.category === 'RELIGIOUS') {
      if (['WARN_OF_EXCOMMUNICATION', 'THREATEN_INTERDICT', 'CONDUCT_INQUISITION'].includes(action.id)) {
        if (observerSv.characterType === 'PEASANT_COHORT') {
          adjustContinuous(observerSv, 'fear', 6.0);
          adjustContinuous(observerSv, 'piety', 4.0);
          adjustContinuous(observerSv, 'unrest', 5.0);
        }
        if (observerSv.characterType === 'VASSAL_LORD') {
          adjustContinuous(observerSv, 'suspicion_of_liege', 8.0); // If the liege provoked the church
          adjustContinuous(observerSv, 'piety', 3.0);
        }
      } else {
        // General preaching / benign religion
        adjustContinuous(observerSv, 'piety', 2.0);
        if (observerSv.characterType === 'PEASANT_COHORT') {
          adjustContinuous(observerSv, 'hope', 3.0);
        }
      }
    }

    // 6. Economic / Taxation Policies
    if (['PROPOSE_TAX_INCREASE', 'RAISE_PRICES', 'PROPOSE_DEBASEMENT'].includes(action.id)) {
      if (observerSv.characterType === 'PEASANT_COHORT') {
        adjustContinuous(observerSv, 'unrest', 5.0);
        adjustContinuous(observerSv, 'hunger', 2.0);
      }
      if (observerSv.characterType === 'MASTER_MERCHANT' && action.id === 'PROPOSE_TAX_INCREASE') {
        adjustContinuous(observerSv, 'smuggling_drive', 8.0);
        adjustContinuous(observerSv, 'loyalty_to_realm', -5.0);
      }
    }

  }
}

