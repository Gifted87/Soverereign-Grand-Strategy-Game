/**
 * EnvironmentNPCBridge.ts
 *
 * Implements bidirectional state propagation between the NPC simulation layer
 * and the Environmental Engine.
 *
 * Upward Causation (NPC → Environment):
 *   All 23 NPC actions from environment_simulation.md Section 2.9 that exert
 *   physical, thermodynamic, or ecological force upon the world map are
 *   delegated to FeedbackLoopSystem for precise, spec-faithful application.
 *
 * Downward Causation (Environment → NPC):
 *   Environmental state vectors are read by NPC decision-making systems to
 *   penalise or bonus NPC stats (march speed, food supply, disease attrition).
 *
 * Cartographic Memory (Section 8.4):
 *   Generates and updates faction-level province snapshots when armies or
 *   spymaster agents visit a hex.
 *
 * Reference: environment_simulation.md — Section 2.9 (NPC Actions)
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { CartographicMemory } from '../models/EnvironmentTypes';
import type { FeedbackLoopSystem } from './FeedbackLoopSystem';

// ─────────────────────────────────────────────────────────────────────────────
// Full NPC Action type union — every action from spec Section 2.9
// plus the auxiliary actions referenced in Sections 1.1–1.7
// ─────────────────────────────────────────────────────────────────────────────

export type NPCActionType =
  // Section 2.9 — Primary NPC Actions
  | 'INTENSIVE_FARMING'
  | 'FALLOW_YEAR'
  | 'MASS_LOGGING'
  | 'CLEAR_CUT_FOREST'       // alias for MASS_LOGGING
  | 'PUBLIC_WORKS_DREDGE'
  | 'CONSTRUCT_CANAL_NETWORK'
  | 'BUILD_INFRASTRUCTURE'
  | 'BUILD_FORTRESS'
  | 'MASSACRE_POPULATION'
  | 'TERRORIZE_POPULATION'   // alias for MASSACRE_POPULATION
  | 'DUMP_WASTE'
  | 'URBAN_POLLUTION'        // alias for DUMP_WASTE
  | 'CONSECRATE_LAND'
  | 'MINE_VEIN'
  | 'EXTRACT_ORE'            // alias for MINE_VEIN
  | 'OVERFISH'
  | 'HUNT_RARE_ANIMALS'
  | 'POACHING'               // alias for HUNT_RARE_ANIMALS
  | 'SLASH_AND_BURN_CLEARING'
  | 'PLANT_OASIS'
  | 'MARCH_CARAVAN'
  | 'MARCH_ARMY'
  | 'SCAVENGE_WRECK'
  | 'NAVAL_PATROL'
  | 'TRADE_EXPEDITION'
  // Auxiliary actions referenced in state matrices (Sections 1.1–1.7)
  | 'EXPLORE_TERRITORY'
  | 'STOCKPILE_FOOD'
  | 'EXTRACT_PEAT'
  | 'CONSTRUCT_SANITATION'
  | 'HUNT_PREDATORS'
  | 'BUILD_FLEET'
  | 'LAUNCH_FLEET'
  | 'GATHER_RESOURCES'
  | 'CLEAR_RUINS';

// ─────────────────────────────────────────────────────────────────────────────
// Payload types for actions that target entities vs. provinces
// ─────────────────────────────────────────────────────────────────────────────

export interface NPCActionPayload {
  /** The NPC action type */
  action: NPCActionType;
  /**
   * Province ID for province-scoped actions (Tier 1 mutations).
   * Required for: INTENSIVE_FARMING, FALLOW_YEAR, MASS_LOGGING,
   * BUILD_INFRASTRUCTURE, BUILD_FORTRESS, MASSACRE_POPULATION,
   * DUMP_WASTE, CONSECRATE_LAND, MINE_VEIN, HUNT_RARE_ANIMALS,
   * SLASH_AND_BURN_CLEARING, PLANT_OASIS, MARCH_ARMY,
   * CONSTRUCT_CANAL_NETWORK, CONSTRUCT_SANITATION, HUNT_PREDATORS.
   */
  provinceId?: string;
  /**
   * Environment entity ID for entity-scoped actions (Tier 2/3 mutations).
   * Required for: PUBLIC_WORKS_DREDGE, OVERFISH, MARCH_CARAVAN,
   * SCAVENGE_WRECK, NAVAL_PATROL, TRADE_EXPEDITION, EXPLORE_TERRITORY,
   * STOCKPILE_FOOD, EXTRACT_PEAT, BUILD_FLEET, LAUNCH_FLEET,
   * GATHER_RESOURCES, CLEAR_RUINS.
   */
  entityId?: string;
  /** The NPC actor performing the action (for chronicle/logging) */
  actorId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Downward causation constants
// ─────────────────────────────────────────────────────────────────────────────

/** Thresholds above which environmental states impose NPC stat penalties */
const ENV_THRESHOLDS = {
  HIGH_DISEASE:     60,  // disease_reservoir > 60 → army attrition
  HIGH_UNREST:      70,  // ambient_unrest > 70 → loyalty drain
  LOW_ACCESSIBILITY: 20, // accessibility < 20 → march speed halved
  HIGH_PREDATOR:    60,  // predator_threat > 60 → foragers lost
  SEVERE_POLLUTION: 80,  // pollution_level > 80 → sickness
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Main class
// ─────────────────────────────────────────────────────────────────────────────

export class EnvironmentNPCBridge {
  constructor(
    private gameLoop: GameLoop,
    private feedback: FeedbackLoopSystem
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // UPWARD CAUSATION: NPC Action → Environment
  // Delegates to the authoritative FeedbackLoopSystem handlers.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Primary dispatch entry point. Call this whenever an NPC performs an
   * action that has environmental consequences.
   */
  applyNPCAction(payload: NPCActionPayload) {
    const { action, provinceId, entityId } = payload;

    switch (action) {

      // ─── Province-Scoped Actions ───────────────────────────────────────────

      case 'INTENSIVE_FARMING':
        if (provinceId) this.feedback.applyNPC_INTENSIVE_FARMING(provinceId);
        break;

      case 'FALLOW_YEAR':
        if (provinceId) this.feedback.applyNPC_FALLOW_YEAR(provinceId);
        break;

      case 'MASS_LOGGING':
      case 'CLEAR_CUT_FOREST':
        if (provinceId) this.feedback.applyNPC_MASS_LOGGING(provinceId);
        break;

      case 'CONSTRUCT_CANAL_NETWORK':
        if (provinceId) this.feedback.applyNPC_CONSTRUCT_CANAL_NETWORK(provinceId);
        break;

      case 'BUILD_INFRASTRUCTURE':
        if (provinceId) this.feedback.applyNPC_BUILD_INFRASTRUCTURE(provinceId);
        break;

      case 'BUILD_FORTRESS':
        if (provinceId) this.feedback.applyNPC_BUILD_FORTRESS(provinceId);
        break;

      case 'MASSACRE_POPULATION':
      case 'TERRORIZE_POPULATION':
        if (provinceId) this.feedback.applyNPC_MASSACRE_POPULATION(provinceId);
        break;

      case 'DUMP_WASTE':
      case 'URBAN_POLLUTION':
        if (provinceId) this.feedback.applyNPC_DUMP_WASTE(provinceId);
        break;

      case 'CONSECRATE_LAND':
        if (provinceId) this.feedback.applyNPC_CONSECRATE_LAND(provinceId);
        break;

      case 'MINE_VEIN':
      case 'EXTRACT_ORE':
        if (provinceId) this.feedback.applyNPC_MINE_VEIN(provinceId);
        break;

      case 'HUNT_RARE_ANIMALS':
      case 'POACHING':
        if (provinceId) this.feedback.applyNPC_HUNT_RARE_ANIMALS(provinceId);
        break;

      case 'SLASH_AND_BURN_CLEARING':
        if (provinceId) this.feedback.applyNPC_SLASH_AND_BURN_CLEARING(provinceId);
        break;

      case 'PLANT_OASIS':
        if (provinceId) this.feedback.applyNPC_PLANT_OASIS(provinceId);
        break;

      case 'MARCH_ARMY':
        if (provinceId) this.feedback.applyNPC_MARCH_ARMY(provinceId);
        break;

      case 'CONSTRUCT_SANITATION':
        if (provinceId) this.feedback.applyNPC_CONSTRUCT_SANITATION(provinceId);
        break;

      case 'HUNT_PREDATORS':
        if (provinceId) this.feedback.applyNPC_HUNT_PREDATORS(provinceId);
        break;

      // ─── Entity-Scoped Actions ─────────────────────────────────────────────

      case 'PUBLIC_WORKS_DREDGE':
        if (entityId) this.feedback.applyNPC_PUBLIC_WORKS_DREDGE(entityId);
        break;

      case 'OVERFISH':
        if (entityId) this.feedback.applyNPC_OVERFISH(entityId);
        break;

      case 'MARCH_CARAVAN':
        if (entityId) this.feedback.applyNPC_MARCH_CARAVAN(entityId);
        break;

      case 'SCAVENGE_WRECK':
        if (entityId) this.feedback.applyNPC_SCAVENGE_WRECK(entityId);
        break;

      case 'NAVAL_PATROL':
        if (entityId) this.feedback.applyNPC_NAVAL_PATROL(entityId);
        break;

      case 'TRADE_EXPEDITION':
        if (entityId) this.feedback.applyNPC_TRADE_EXPEDITION(entityId);
        break;

      case 'EXPLORE_TERRITORY':
        if (entityId) this.feedback.applyNPC_EXPLORE_TERRITORY(entityId);
        break;

      case 'STOCKPILE_FOOD':
        if (entityId) this.feedback.applyNPC_STOCKPILE_FOOD(entityId);
        break;

      case 'EXTRACT_PEAT':
        if (entityId) this.feedback.applyNPC_EXTRACT_PEAT(entityId);
        break;

      case 'BUILD_FLEET':
        if (entityId) this.feedback.applyNPC_BUILD_FLEET(entityId);
        break;

      case 'LAUNCH_FLEET':
        if (entityId) this.feedback.applyNPC_LAUNCH_FLEET(entityId);
        break;

      case 'GATHER_RESOURCES':
        if (entityId) this.feedback.applyNPC_GATHER_RESOURCES(entityId);
        break;

      case 'CLEAR_RUINS':
        if (entityId) this.feedback.applyNPC_CLEAR_RUINS(entityId);
        break;

      default:
        // Unknown action — log and skip
        console.warn(`[EnvironmentNPCBridge] Unknown NPC action: ${action}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNWARD CAUSATION: Environment → NPC
  // Compute environmental modifiers for NPC stats on a given province.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns the attrition rate (0.0–1.0) imposed on an army in this province
   * by the current environmental state.
   */
  getArmyAttritionRate(provinceId: string): number {
    const env = this.gameLoop.provinces[provinceId]?.tier1Env;
    if (!env) return 0;

    let attrition = 0;

    // Disease reservoir: up to 5% daily attrition above threshold
    if (env.disease_reservoir > ENV_THRESHOLDS.HIGH_DISEASE) {
      attrition += ((env.disease_reservoir - ENV_THRESHOLDS.HIGH_DISEASE) / 100) * 0.05;
    }

    // Severe pollution: sickens troops
    if (env.pollution_level > ENV_THRESHOLDS.SEVERE_POLLUTION) {
      attrition += 0.02;
    }

    // Predator threat: forager losses
    if (env.predator_threat > ENV_THRESHOLDS.HIGH_PREDATOR) {
      attrition += 0.01;
    }

    // Disaster state: severe attrition in active disasters
    if (env.disaster === 'PLAGUE')      attrition += 0.08;
    if (env.disaster === 'FLOODED')     attrition += 0.02;
    if (env.disaster === 'BURNING')     attrition += 0.03;
    if (env.disaster === 'BLIZZARD')    attrition += 0.04;
    if (env.disaster === 'TSUNAMI')     attrition += 0.05;

    return Math.min(attrition, 0.25); // Cap at 25% daily attrition
  }

  /**
   * Returns the march speed multiplier (0.1–1.5) for an army crossing this province.
   */
  getMarchSpeedMultiplier(provinceId: string): number {
    const env = this.gameLoop.provinces[provinceId]?.tier1Env;
    if (!env) return 1.0;

    let multiplier = 1.0;

    // Low accessibility: big penalty
    if (env.accessibility < ENV_THRESHOLDS.LOW_ACCESSIBILITY) {
      multiplier *= 0.4;
    } else {
      multiplier *= (0.4 + env.accessibility * 0.006); // scales 0.4→1.0 over 0→100
    }

    // Snow cover: significant penalty
    if (env.snow_cover > 50) {
      multiplier *= (1.0 - (env.snow_cover - 50) * 0.01);
    }

    // River crossings: check for bridges
    // (actual bridge count lives in the T2 river entity)
    if (env.biome === 'MARSH' || env.biome === 'RIVER_DELTA') {
      multiplier *= 0.5;
    }

    return Math.max(0.1, Math.min(2.0, multiplier));
  }

  /**
   * Returns the forage yield multiplier for an army in this province.
   * Determines how well the army can live off the land.
   */
  getForageMultiplier(provinceId: string): number {
    const env = this.gameLoop.provinces[provinceId]?.tier1Env;
    if (!env) return 0;

    if (env.stored_calories <= 0) return 0;
    if (env.biomass_density < 10)  return 0.1;

    const biomassFactor   = env.biomass_density / 100;
    const soilFactor      = env.soil_vitality / 100;
    const calorieFactor   = Math.min(1.0, env.stored_calories / 10000);

    return (biomassFactor * 0.5 + soilFactor * 0.3 + calorieFactor * 0.2);
  }

  /**
   * Returns the loyalty drain modifier for the province owner, caused by
   * environmental conditions (ambient_unrest, disasters, disease, cold).
   */
  getLoyaltyDrainPerDay(provinceId: string): number {
    const env = this.gameLoop.provinces[provinceId]?.tier1Env;
    if (!env) return 0;

    let drain = 0;
    if (env.ambient_unrest > ENV_THRESHOLDS.HIGH_UNREST) {
      drain += (env.ambient_unrest - ENV_THRESHOLDS.HIGH_UNREST) * 0.03;
    }
    if (env.disease_reservoir > ENV_THRESHOLDS.HIGH_DISEASE) drain += 0.2;
    if (env.disaster !== 'NONE') drain += 0.5;

    return drain;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARTOGRAPHIC MEMORY (Section 8.4)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generates or updates a cartographic memory snapshot for a given province.
   * Called when a player's army visits a hex or a spymaster successfully
   * infiltrates. Records the current environmental state for the fog-of-war
   * system.
   */
  updateCartographicMemory(factionId: string, provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    if (!prov || !prov.tier1Env) return;

    const faction = this.gameLoop.factions?.[factionId];
    if (!faction) return;

    if (!faction.cartographicMemory) {
      faction.cartographicMemory = {};
    }

    const env = prov.tier1Env;

    const snapshot: CartographicMemory['snapshot'] = {
      soil_vitality:            env.soil_vitality,
      water_saturation:         env.water_saturation,
      infrastructure_integrity: env.infrastructure_integrity,
      disease_reservoir:        env.disease_reservoir,
      biomass_density:          env.biomass_density,
      predator_threat:          env.predator_threat,
      ambient_unrest:           env.ambient_unrest,
      pollution_level:          env.pollution_level,
      defensibility:            env.defensibility,
      accessibility:            env.accessibility,
      snow_cover:               env.snow_cover,
      fire_risk:                env.fire_risk,
      carrying_capacity:        env.carrying_capacity,
      current_temperature:      env.current_temperature,
      mineral_reserves:         env.mineral_reserves,
      timber_reserves:          env.timber_reserves,
      arable_land_area:         env.arable_land_area,
      stored_calories:          env.stored_calories,
      biome:                    env.biome,
      season:                   env.season,
      disaster:                 env.disaster,
    };

    faction.cartographicMemory[provinceId] = {
      provinceId,
      lastObservedDay: this.gameLoop.clock.currentDay,
      snapshot,
    } as CartographicMemory;
  }

  /**
   * Returns whether a faction's memory of a province is stale (older than
   * `staleDays` game days). A stale memory means the fog-of-war display
   * should show the outdated environmental state.
   */
  isMemoryStale(factionId: string, provinceId: string, staleDays = 60): boolean {
    const faction = this.gameLoop.factions?.[factionId];
    const memory = faction?.cartographicMemory?.[provinceId];
    if (!memory) return true;
    return (this.gameLoop.clock.currentDay - memory.lastObservedDay) > staleDays;
  }

  /**
   * Retrieves the most recent known environmental snapshot for a province,
   * or null if the faction has never observed it.
   */
  getKnownEnvSnapshot(factionId: string, provinceId: string): CartographicMemory['snapshot'] | null {
    const faction = this.gameLoop.factions?.[factionId];
    return faction?.cartographicMemory?.[provinceId]?.snapshot ?? null;
  }
}
