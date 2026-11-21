/**
 * FeedbackLoopSystem.ts
 *
 * Implements the complete Environmental State-Action Feedback Loop Directory
 * as specified in environment_simulation.md (PART 2: THE EVENT AND ACTION OUTPUT MATRIX).
 *
 * This system is the authoritative cross-tier propagation engine. When any
 * environmental event fires anywhere in the simulation (from Tier1ProvinceSystem,
 * Tier2GeographicSystem, Tier3NetworkSystem, or Tier4GlobalSystem), that system
 * calls the appropriate handler here to ensure every downstream state mutation
 * described in the spec is applied with 1:1 fidelity.
 *
 * Architecture:
 *  - Each public `applyEvent_*` method corresponds to exactly one named event
 *    from the spec, implementing ALL effects listed for that event across all tiers.
 *  - Cross-tier effects (e.g., a Tier 2 event modifying Tier 1 provinces, or a
 *    Tier 4 macro-event modifying Tier 2 states) are resolved by this system.
 *  - The system also hosts the four canonical emergent feedback loops
 *    (deforestation→silting, volcanic→famine, desertification→nomad,
 *    glacial→trade-squeeze) as autonomous tick-driven detectors.
 *
 * Tick Rate: every 15 game days (for autonomous loop detection).
 * Individual event handlers are called on-demand by peer systems.
 *
 * Reference: environment_simulation.md — PART 2, Sections 2.1–2.9
 */

import type { GameLoop } from '../../engine/GameLoop';
import type {
  EnvironmentEntity,
  Tier1HexState,
  Tier2RiverBasinState,
  Tier2VolcanicChainState,
  Tier2FjordState,
  Tier3CaravanCorridorState,
  Tier3ArchipelagoState,
  Tier3RainforestState,
  Tier4ClimateEngineState,
  Tier4OceanConveyorState,
} from '../models/EnvironmentTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function delta(obj: Record<string, any>, field: string, amount: number, min = 0, max = 100) {
  obj[field] = clamp((obj[field] ?? 0) + amount, min, max);
}

function setTo(obj: Record<string, any>, field: string, value: any) {
  obj[field] = value;
}

function zero(obj: Record<string, any>, field: string) {
  obj[field] = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main system class
// ─────────────────────────────────────────────────────────────────────────────

export class FeedbackLoopSystem {
  constructor(private gameLoop: GameLoop) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS TICK — Canonical Emergent Feedback Loop Detectors
  // ═══════════════════════════════════════════════════════════════════════════

  tick() {
    this.detectDeforestationSilting();
    this.detectVolcanicAgriculturalCollapse();
    this.detectDesertificationNomadMigration();
    this.detectGlacialTradeSqueeze();
    this.propagateTier4ToLowerTiers();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loop 1 — Deforestation → Silting → Port Block
  // When >40% of a river basin's provinces have biomass_density < 30,
  // runoff dramatically accelerates silt accumulation.
  // ─────────────────────────────────────────────────────────────────────────
  private detectDeforestationSilting() {
    const rivers = this.getRiverEntities();
    for (const river of rivers) {
      const state = river.state.data as Tier2RiverBasinState;
      const hexes = river.affectedProvinceIds.length;
      if (hexes === 0) continue;

      let lowBiomassCount = 0;
      for (const provId of river.affectedProvinceIds) {
        const prov = this.gameLoop.provinces[provId];
        if (prov?.tier1Env && prov.tier1Env.biomass_density < 30) lowBiomassCount++;
      }

      const deforestationRatio = lowBiomassCount / hexes;
      if (deforestationRatio > 0.4) {
        // Silt accumulates proportionally to deforestation severity
        delta(state, 'silt_load', deforestationRatio * 3);
        delta(state, 'bank_erosion', deforestationRatio * 1.5);
        delta(state, 'dredging_deficit', deforestationRatio * 2, 0, 99999);

        if (state.silt_load > 90 && this.gameLoop.rng.next() < 0.15) {
          this.alert(`Severe deforestation along the ${river.name} chokes its delta with silt. Ports are blockaded.`, 'URGENT');
          (state as any).economic_status = 'BLOCKADED';
          (state as any).navigability = Math.max(0, state.navigability - 20);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loop 2 — Volcanic Winter → Agricultural Collapse → Revolt
  // High atmospheric ash load drops global temperature and causes
  // crop failure in summer provinces, cascading into unrest.
  // ─────────────────────────────────────────────────────────────────────────
  private detectVolcanicAgriculturalCollapse() {
    const climateEng = this.getClimateEngine();
    if (!climateEng) return;
    const climate = climateEng.state.data as Tier4ClimateEngineState;

    if (climate.atmospheric_ash_load > 60) {
      // Global temperature impact
      climate.global_temperature_offset = Math.max(-100,
        climate.global_temperature_offset - 0.08
      );

      let starvingCount = 0;
      for (const prov of Object.values(this.gameLoop.provinces)) {
        const env = prov.tier1Env;
        if (!env) continue;

        // Direct cold shock from ashfall
        env.current_temperature = Math.max(-50, env.current_temperature - 0.4);

        // Crop failure in growing season
        if (env.season === 'SUMMER' && env.current_temperature < 10) {
          delta(env as any, 'soil_vitality', -2);
          env.stored_calories = Math.max(0, env.stored_calories - 200);
        }

        if (env.stored_calories <= 0 && (prov.population?.total ?? 0) > 0) {
          starvingCount++;
          delta(env as any, 'ambient_unrest', 5);
        }
      }

      if (starvingCount > 10 && this.gameLoop.rng.next() < 0.06) {
        this.alert('Volcanic ash blots out the sun. Famine and peasant revolts erupt across the realm!', 'CRITICAL');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loop 3 — Desertification → Aquifer Collapse → Nomad Invasion
  // When oasis aquifer levels fall critically, nomad_pressure builds
  // until a migration/invasion event fires.
  // ─────────────────────────────────────────────────────────────────────────
  private detectDesertificationNomadMigration() {
    const corridors = this.getCorridorEntities();
    for (const corridor of corridors) {
      const state = corridor.state.data as Tier3CaravanCorridorState;
      if (state.aquifer_level < 15) {
        delta(state as any, 'nomad_pressure', 4);
        delta(state as any, 'salt_accumulation', 1);

        if (state.nomad_pressure > 90 && this.gameLoop.rng.next() < 0.06) {
          this.alert(`Nomadic tribes, driven from the desiccated ${corridor.name}, pour southward in a desperate migration.`, 'CRITICAL');
          // Chronicle the event
          this.chronicle(`Desperate nomads abandon the dying ${corridor.name} and march for greener lands.`);
          // Spawn an NPC army event via event bus if available
          if (this.gameLoop.eventBus) {
            this.gameLoop.eventBus.publish('NOMAD_INVASION', {
              corridorId: corridor.id,
              corridorName: corridor.name,
              pressure: state.nomad_pressure,
            });
          }
          (state as any).nomad_pressure = 10; // Pressure released by migration
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loop 4 — Glacial Advance → Pass Freeze → Trade Squeeze → Military Loss
  // When glacier_advance is extreme, mountain passes freeze and trade routes
  // collapse, starving downstream realms of iron and silver.
  // ─────────────────────────────────────────────────────────────────────────
  private detectGlacialTradeSqueeze() {
    const fjords = this.getFjordEntities();
    for (const fjord of fjords) {
      const state = fjord.state.data as Tier2FjordState;
      if (state.glacier_advance > 70) {
        (state as any).ice_status = 'SOLID_ICE';
        delta(state as any, 'fjord_depth', -2);
        // Glacier advance cascades to adjacent mountain chains
        const mountains = this.getMountainEntities().filter(m =>
          m.continent === fjord.continent
        );
        for (const mtn of mountains) {
          const mState = mtn.state.data as Tier2VolcanicChainState;
          delta(mState as any, 'pass_accessibility', -3);
          delta(mState as any, 'isolation_factor', 2);
        }

        if (state.glacier_advance > 85 && this.gameLoop.rng.next() < 0.06) {
          this.alert(`Glacier advance in the ${fjord.name} has sealed the mountain passes. Trade routes severed.`, 'URGENT');
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tier 4 → Lower Tier continuous propagation
  // Global climate offsets gradually push lower-tier baselines.
  // ─────────────────────────────────────────────────────────────────────────
  private propagateTier4ToLowerTiers() {
    const climateEng = this.getClimateEngine();
    if (!climateEng) return;
    const climate = climateEng.state.data as Tier4ClimateEngineState;

    // Global temp offset shifts Tier 1 province temperatures toward global norm
    const tempOffset = climate.global_temperature_offset * 0.002; // gentle per-tick nudge
    for (const prov of Object.values(this.gameLoop.provinces)) {
      if (prov.tier1Env) {
        prov.tier1Env.current_temperature = clamp(
          prov.tier1Env.current_temperature + tempOffset, -60, 60
        );
      }
    }

    // Sea level rise deletes low-lying delta/coastal hexes when extreme
    if (climate.sea_level_variance_cm > 150) {
      for (const prov of Object.values(this.gameLoop.provinces)) {
        if (prov.tier1Env && (prov.tier1Env.biome === 'RIVER_DELTA' || prov.tier1Env.biome === 'COASTAL')) {
          delta(prov.tier1Env as any, 'accessibility', -0.5);
          delta(prov.tier1Env as any, 'infrastructure_integrity', -0.3);
        }
      }
    }

    // Global carbon sink feedback: high biomass slows warming
    let totalBiomass = 0;
    let count = 0;
    for (const prov of Object.values(this.gameLoop.provinces)) {
      if (prov.tier1Env) { totalBiomass += prov.tier1Env.biomass_density; count++; }
    }
    if (count > 0) {
      climate.global_carbon_sink = clamp((totalBiomass / count) * 0.8);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.1 — TIER 1 EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * REGENERATE_FLORA
   * biomass_density ↑, timber_reserves ↑, slope_stability ↑ (Tier 2)
   */
  applyEvent_REGENERATE_FLORA(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    delta(env as any, 'biomass_density', 8);
    env.timber_reserves = Math.min(env.timber_reserves + 300, 99999);
    // Cascade: improve slope stability on co-located mountain chains
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        delta(mtn.state.data as any, 'slope_stability', 3);
      }
    }
    // Also reduces dune encroachment on adjacent caravan corridors
    for (const corridor of this.getCorridorEntities()) {
      if (corridor.affectedProvinceIds.includes(provinceId)) {
        delta(corridor.state.data as any, 'dune_encroachment', -4);
      }
    }
  }

  /**
   * SOIL_DEPLETION
   * soil_vitality ↓, carrying_capacity ↓
   */
  applyEvent_SOIL_DEPLETION(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    delta(env as any, 'soil_vitality', -8);
    env.carrying_capacity = Math.max(0, env.carrying_capacity - 500);
  }

  /**
   * LOCALIZED_FLOOD
   * infrastructure_integrity ↓, soil_vitality ↑, accessibility ↓,
   * disaster = FLOODED
   */
  applyEvent_LOCALIZED_FLOOD(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    delta(env as any, 'infrastructure_integrity', -15);
    delta(env as any, 'soil_vitality', 5);
    delta(env as any, 'accessibility', -25);
    delta(env as any, 'fire_risk', -10);
    setTo(env as any, 'disaster', 'FLOODED');
  }

  /**
   * WILDFIRE
   * timber_reserves → 0, biomass_density → 0, predator_threat ↓,
   * disaster = BURNING
   */
  applyEvent_WILDFIRE(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    zero(env as any, 'timber_reserves');
    zero(env as any, 'biomass_density');
    delta(env as any, 'predator_threat', -20);
    setTo(env as any, 'disaster', 'BURNING');
  }

  /**
   * DISEASE_OUTBREAK
   * disease_reservoir ↑, ambient_unrest ↑, disaster = PLAGUE
   */
  applyEvent_DISEASE_OUTBREAK(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    delta(env as any, 'disease_reservoir', 25);
    delta(env as any, 'ambient_unrest', 15);
    setTo(env as any, 'disaster', 'PLAGUE');
  }

  /**
   * INFRASTRUCTURE_COLLAPSE
   * accessibility → 0, defensibility ↓, infrastructure_integrity → 0
   */
  applyEvent_INFRASTRUCTURE_COLLAPSE(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    zero(env as any, 'accessibility');
    delta(env as any, 'defensibility', -20);
    zero(env as any, 'infrastructure_integrity');
  }

  /**
   * PREDATOR_MIGRATION
   * predator_threat ↑ in adjacent hexes, predator_threat ↓ in origin hex
   */
  applyEvent_PREDATOR_MIGRATION(originProvinceId: string, adjacentProvinceIds: string[]) {
    const origin = this.gameLoop.provinces[originProvinceId];
    if (origin?.tier1Env) delta(origin.tier1Env as any, 'predator_threat', -15);
    for (const adjId of adjacentProvinceIds) {
      const adj = this.gameLoop.provinces[adjId];
      if (adj?.tier1Env) delta(adj.tier1Env as any, 'predator_threat', 12);
    }
  }

  /**
   * RESOURCE_DISCOVERY
   * mineral_reserves ↑
   */
  applyEvent_RESOURCE_DISCOVERY(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    env.mineral_reserves = Math.min(env.mineral_reserves + 5000, 999999);
  }

  /**
   * GROUNDWATER_DRYUP
   * water_saturation → 0, carrying_capacity ↓, fire_risk ↑
   * Also decreases tributary_count on adjacent rivers (Tier 2)
   */
  applyEvent_GROUNDWATER_DRYUP(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    zero(env as any, 'water_saturation');
    env.carrying_capacity = Math.max(0, env.carrying_capacity - 1000);
    delta(env as any, 'fire_risk', 20);
    // Cascade to river basin: reduces tributary count
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        const st = river.state.data as Tier2RiverBasinState;
        st.tributary_count = Math.max(0, st.tributary_count - 1);
      }
    }
  }

  /**
   * BLIGHT
   * stored_calories → 0
   */
  applyEvent_BLIGHT(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    zero(env as any, 'stored_calories');
  }

  /**
   * ECOLOGICAL_RECOVERY
   * pollution_level → 0, disease_reservoir → 0, biomass_density ↑,
   * ambient_unrest ↓
   * Also flushes pollution_flow on adjacent rivers.
   */
  applyEvent_ECOLOGICAL_RECOVERY(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    zero(env as any, 'pollution_level');
    zero(env as any, 'disease_reservoir');
    delta(env as any, 'biomass_density', 10);
    delta(env as any, 'ambient_unrest', -15);
    // Cascade: flush pollution_flow in rivers that include this province
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'pollution_flow', -10);
        delta(river.state.data as any, 'fish_stocks', 5);
      }
    }
  }

  /**
   * SEASONAL_SHIFT
   * current_temperature modified by season, triggers Tier 2/3 seasonal events.
   */
  applyEvent_SEASONAL_SHIFT(provinceId: string, newSeason: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    setTo(env as any, 'season', newSeason);
    // Trigger secondary seasonal effects on Tier 2 entities
    if (newSeason === 'SPRING') {
      for (const river of this.getRiverEntities()) {
        if (river.affectedProvinceIds.includes(provinceId)) {
          delta(river.state.data as any, 'flood_pressure', 5); // Snowmelt loading
        }
      }
      for (const fjord of this.getFjordEntities()) {
        if (fjord.affectedProvinceIds.includes(provinceId)) {
          delta(fjord.state.data as any, 'wildlife_migration', 15);
          delta(fjord.state.data as any, 'winter_darkness', -10);
        }
      }
    } else if (newSeason === 'WINTER') {
      for (const fjord of this.getFjordEntities()) {
        if (fjord.affectedProvinceIds.includes(provinceId)) {
          delta(fjord.state.data as any, 'winter_darkness', 15);
        }
      }
      for (const archipelago of this.getArchipelagoEntities()) {
        if (archipelago.affectedProvinceIds.includes(provinceId)) {
          delta(archipelago.state.data as any, 'typhoon_probability', -10);
        }
      }
    } else if (newSeason === 'DRY') {
      for (const rainforest of this.getRainforestEntities()) {
        if (rainforest.affectedProvinceIds.includes(provinceId)) {
          delta(rainforest.state.data as any, 'humidity_index', -10);
          delta(rainforest.state.data as any, 'navigable_creeks', -5);
          delta(rainforest.state.data as any, 'days_of_rain', -10, 0, 9999);
        }
      }
    }
  }

  /**
   * WINTER_FREEZE
   * current_temperature < 0, water_saturation → snow_cover, accessibility ↓
   * Also: permafrost_integrity ↑ (Tier 2 Taiga), snowpack_depth ↑ (Tier 2 Mountain)
   */
  applyEvent_WINTER_FREEZE(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    const waterConvertedToSnow = env.water_saturation;
    env.snow_cover = Math.min(100, env.snow_cover + waterConvertedToSnow * 0.6);
    env.water_saturation = Math.max(0, env.water_saturation - waterConvertedToSnow * 0.6);
    delta(env as any, 'accessibility', -20);
    delta(env as any, 'disease_reservoir', -5); // Cold kills pathogens
    delta(env as any, 'fire_risk', -15);
    // Cascade to Tier 2
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        delta(fjord.state.data as any, 'permafrost_integrity', 5);
        delta(fjord.state.data as any, 'frostbite_risk', 8);
      }
    }
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        delta(mtn.state.data as any, 'snowpack_depth', 8);
      }
    }
  }

  /**
   * THAW
   * snow_cover → water_saturation, accessibility ↑
   * Also: pack_ice_density ↓ (Tier 2 Taiga)
   */
  applyEvent_THAW(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    const meltedSnow = env.snow_cover * 0.8;
    env.water_saturation = Math.min(100, env.water_saturation + meltedSnow);
    env.snow_cover = Math.max(0, env.snow_cover - meltedSnow);
    delta(env as any, 'accessibility', 15);
    // Cascade to Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        delta(fjord.state.data as any, 'pack_ice_density', -10);
      }
    }
  }

  /**
   * BLIZZARD (Tier 1 event)
   * snow_cover ↑, accessibility ↓, frostbite_risk ↑ (Tier 2 Taiga)
   */
  applyEvent_BLIZZARD(provinceId: string) {
    const prov = this.gameLoop.provinces[provinceId];
    const env = prov?.tier1Env;
    if (!env) return;
    delta(env as any, 'snow_cover', 25);
    delta(env as any, 'accessibility', -30);
    setTo(env as any, 'disaster', 'BLIZZARD');
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        delta(fjord.state.data as any, 'frostbite_risk', 15);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.2 — TIER 2 RIVER BASIN EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * SPRING_INUNDATION
   * silt_load ↓, navigability ↑
   * On adjacent Tier 1: soil_vitality ↑, pollution_level ↓
   */
  applyEvent_SPRING_INUNDATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'silt_load', -10);
    delta(state as any, 'navigability', 8);
    delta(state as any, 'pollution_flow', -8); // Spec: flushes system
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'soil_vitality', 6);
      delta(env as any, 'pollution_level', -8);
    }
  }

  /**
   * CATASTROPHIC_BREACH
   * flood_pressure → 0, bank_erosion ↑, bridges_spanning ↓
   * On adjacent Tier 1: infrastructure_integrity → 0, stored_calories → 0,
   * defensibility ↓
   */
  applyEvent_CATASTROPHIC_BREACH(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    zero(state as any, 'flood_pressure');
    delta(state as any, 'bank_erosion', 25);
    state.bridges_spanning = Math.max(0, state.bridges_spanning - 3);
    delta(state as any, 'toll_friction', -15); // Checkpoints destroyed
    delta(state as any, 'navigability', -20); // Debris in river
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      zero(env as any, 'stored_calories');
      delta(env as any, 'defensibility', -20);
      setTo(env as any, 'disaster', 'FLOODED');
    }
    this.alert(`A catastrophic breach in the ${entity!.name} has destroyed all downstream infrastructure!`, 'CRITICAL');
  }

  /**
   * SILT_CHOKE
   * delta_depth ↓, navigability → 0, flood_pressure ↑
   * fjord_depth ↓ (if flowing to Fjord — same continent)
   */
  applyEvent_SILT_CHOKE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    state.delta_depth = Math.max(0, state.delta_depth - 5);
    zero(state as any, 'navigability');
    delta(state as any, 'flood_pressure', 15);
    delta(state as any, 'fish_stocks', -10); // Suffocates fish
    // Cascade to same-continent Taiga fjord
    for (const fjord of this.getFjordEntities()) {
      if (fjord.continent === entity!.continent) {
        delta(fjord.state.data as any, 'fjord_depth', -3);
      }
    }
  }

  /**
   * FREEZE_OVER
   * ice_coverage ↑, navigability → 0, annual_cargo_tons ↓
   */
  applyEvent_FREEZE_OVER(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'ice_coverage', 40);
    zero(state as any, 'navigability');
    state.annual_cargo_tons = Math.max(0, state.annual_cargo_tons - 1000);
    setTo(state as any, 'flow_state', 'FROZEN');
  }

  /**
   * ICE_BREAKUP
   * ice_coverage → 0, bridges_spanning ↓, toll_friction ↓, accessibility ↑
   * Also: pack_ice_density ↓ (Tier 2 Taiga)
   */
  applyEvent_ICE_BREAKUP(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    zero(state as any, 'ice_coverage');
    state.bridges_spanning = Math.max(0, state.bridges_spanning - 2);
    delta(state as any, 'toll_friction', -10);
    delta(state as any, 'navigability', 15);
    // Cascade to T1 provinces
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'accessibility', 10);
    }
    // Cascade to Taiga
    for (const fjord of this.getFjordEntities()) {
      if (fjord.continent === entity!.continent) {
        delta(fjord.state.data as any, 'pack_ice_density', -15);
      }
    }
  }

  /**
   * FISH_SPAWN_RUN
   * fish_stocks ↑, stored_calories ↑ (Tier 1)
   */
  applyEvent_FISH_SPAWN_RUN(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'fish_stocks', 20);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.stored_calories = Math.min(env.stored_calories + 1500, 999999);
    }
  }

  /**
   * COURSE_CHANGE
   * total_length changes, arable_land_area alters violently,
   * biome_type (Tier 1) re-calculated
   */
  applyEvent_COURSE_CHANGE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    const deltaLength = (this.gameLoop.rng.next() - 0.5) * 400;
    state.total_length = Math.max(50, state.total_length + deltaLength);
    for (const provId of entity!.affectedProvinceIds) {
      const prov = this.gameLoop.provinces[provId];
      const env = prov?.tier1Env;
      if (!env) continue;
      // Violent arable land change — river relocates through province
      const arable_delta = (this.gameLoop.rng.next() - 0.5) * 3000;
      env.arable_land_area = Math.max(0, env.arable_land_area + arable_delta);
      // Biome shift: provinces at the old bed may shift to MARSH
      if (arable_delta < -1000) {
        setTo(env as any, 'biome', 'MARSH');
      } else if (arable_delta > 1000) {
        setTo(env as any, 'biome', 'RIVER_DELTA');
      }
    }
  }

  /**
   * POLLUTION_CASCADE
   * fish_stocks → 0, delta_health ↓
   * On Tier 1: disease_reservoir ↑
   */
  applyEvent_POLLUTION_CASCADE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    zero(state as any, 'fish_stocks');
    delta(state as any, 'delta_health', -25);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'disease_reservoir', 20);
    }
    this.alert(`Toxic pollution cascade in the ${entity!.name} wipes out all fish stocks.`, 'URGENT');
  }

  /**
   * DROUGHT_RECESSION
   * water_volume ↓, navigability → 0, fire_risk ↑ (Tier 1),
   * water_saturation ↓ (Tier 1)
   */
  applyEvent_DROUGHT_RECESSION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'water_volume', -25);
    zero(state as any, 'navigability');
    setTo(state as any, 'flood_cycle', 'DROUGHT');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'fire_risk', 15);
      delta(env as any, 'water_saturation', -20);
    }
  }

  /**
   * SEDIMENT_DEPOSIT
   * silt_load ↓, delta_health ↑, arable_land_area ↑ (Tier 1),
   * carrying_capacity ↑ (Tier 1)
   */
  applyEvent_SEDIMENT_DEPOSIT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'silt_load', -15);
    delta(state as any, 'delta_health', 10);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      env.arable_land_area = Math.min(env.arable_land_area + 500, 999999);
      env.carrying_capacity = Math.min(env.carrying_capacity + 300, 999999);
    }
  }

  /**
   * CASCADING_DAM_FAILURE
   * water_volume ↑ (massive spike), overrides all downstream
   * infrastructure_integrity → 0
   */
  applyEvent_CASCADING_DAM_FAILURE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'water_volume', 50);
    delta(state as any, 'flood_pressure', 40);
    state.bridges_spanning = 0;
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      zero(env as any, 'stored_calories');
      setTo(env as any, 'disaster', 'FLOODED');
    }
    this.alert(`CASCADING DAM FAILURE on the ${entity!.name}! All downstream infrastructure destroyed!`, 'CRITICAL');
  }

  /**
   * RIVER_PIRACY_SPIKE
   * toll_friction ↑, annual_cargo_tons ↓
   */
  applyEvent_RIVER_PIRACY_SPIKE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2RiverBasinState;
    if (!state) return;
    delta(state as any, 'toll_friction', 20);
    state.annual_cargo_tons = Math.max(0, state.annual_cargo_tons - 800);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.3 — TIER 2 VOLCANIC MOUNTAIN EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ERUPTION_MINOR
   * magma_chamber_pressure ↓, active_vents ↑, alpine_biomass ↓,
   * current_temperature ↓ (local Tier 1)
   */
  applyEvent_ERUPTION_MINOR(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'magma_chamber_pressure', -30);
    state.active_vents += 1;
    delta(state as any, 'alpine_biomass', -15);
    delta(state as any, 'geothermal_activity', 10);
    setTo(state as any, 'volcanic_status', 'ERUPTING');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'current_temperature', -2);
      setTo(env as any, 'disaster', 'ASHFALL');
    }
  }

  /**
   * ERUPTION_CATACLYSMIC
   * peak_elevation ↓, magma_chamber_pressure → 0, timber_reserves → 0
   * On Tier 4: atmospheric_ash_load ↑
   * On Tier 1: ASH_FERTILIZATION delayed effect
   */
  applyEvent_ERUPTION_CATACLYSMIC(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    state.peak_elevation = Math.max(0, state.peak_elevation - 500);
    zero(state as any, 'magma_chamber_pressure');
    state.active_vents = Math.max(0, state.active_vents - 2);
    // Destroy Tier 1 timber
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'timber_reserves');
      zero(env as any, 'biomass_density');
      setTo(env as any, 'disaster', 'ASHFALL');
    }
    // Cascade to Tier 4
    const climateEng = this.getClimateEngine();
    if (climateEng) {
      delta(climateEng.state.data as any, 'atmospheric_ash_load', 30);
      delta(climateEng.state.data as any, 'jet_stream_stability', -15);
    }
    this.alert(`CATACLYSMIC ERUPTION in the ${entity!.name}! Ashfall darkens the sky for hundreds of miles.`, 'CRITICAL');
  }

  /**
   * EARTHQUAKE
   * tectonic_stress ↓, fortress_count ↓, mineral_exposure ↑,
   * geothermal_activity ↑
   * On Tier 1: infrastructure_integrity → 0, defensibility ↑ (sheer cliffs)
   */
  applyEvent_EARTHQUAKE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'tectonic_stress', -30);
    state.fortress_count = Math.max(0, state.fortress_count - 1);
    delta(state as any, 'mineral_exposure', 15);
    delta(state as any, 'geothermal_activity', 10);
    setTo(state as any, 'seismic_phase', 'AFTERSHOCK');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      delta(env as any, 'defensibility', 8); // New cliff formations
      setTo(env as any, 'disaster', 'EARTHQUAKE');
    }
    this.alert(`An earthquake shakes the ${entity!.name}! Fortresses crumble, minerals exposed.`, 'URGENT');
  }

  /**
   * AVALANCHE
   * snowpack_depth ↓, pass_accessibility → 0, fortress_count ↓,
   * isolation_factor ↑
   * Also: alpine_biomass ↓
   */
  applyEvent_AVALANCHE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'snowpack_depth', -20);
    zero(state as any, 'pass_accessibility');
    state.fortress_count = Math.max(0, state.fortress_count - 1);
    state.known_passes = Math.max(0, state.known_passes - 1);
    delta(state as any, 'isolation_factor', 20);
    delta(state as any, 'alpine_biomass', -10);
    // Cascade to Tier 1: deposits snow, reduces accessibility
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'snow_cover', 20);
      delta(env as any, 'accessibility', -25);
    }
  }

  /**
   * VEIN_EXPOSURE
   * mineral_exposure ↑, mineral_reserves ↑
   */
  applyEvent_VEIN_EXPOSURE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'mineral_exposure', 20);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.mineral_reserves = Math.min(env.mineral_reserves + 8000, 999999);
    }
  }

  /**
   * SPRING_MELT
   * snowpack_depth → 0, water_volume ↑ (Tier 2 River),
   * flood_pressure ↑ (Tier 2 River)
   */
  applyEvent_SPRING_MELT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    const snowMelt = state.snowpack_depth;
    zero(state as any, 'snowpack_depth');
    // Cascade meltwater to co-continental rivers
    for (const river of this.getRiverEntities()) {
      if (river.continent === entity!.continent) {
        delta(river.state.data as any, 'water_volume', Math.min(snowMelt * 0.5, 30));
        delta(river.state.data as any, 'flood_pressure', Math.min(snowMelt * 0.3, 20));
      }
    }
    setTo(state as any, 'winter_status', 'CLEAR');
  }

  /**
   * LANDSLIDE
   * pass_accessibility → 0, known_passes ↓, defensibility ↓ (Tier 1)
   * mineral_exposure ↑ (spec Section 1.3)
   */
  applyEvent_LANDSLIDE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    zero(state as any, 'pass_accessibility');
    state.known_passes = Math.max(0, state.known_passes - 1);
    delta(state as any, 'mineral_exposure', 5);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'defensibility', -15);
    }
  }

  /**
   * PASS_FREEZE
   * pass_accessibility → 0, isolation_factor ↑
   */
  applyEvent_PASS_FREEZE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    zero(state as any, 'pass_accessibility');
    delta(state as any, 'isolation_factor', 20);
    setTo(state as any, 'winter_status', 'IMPASSABLE');
  }

  /**
   * PASS_THAW
   * pass_accessibility ↑, isolation_factor ↓
   */
  applyEvent_PASS_THAW(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'pass_accessibility', 40);
    delta(state as any, 'isolation_factor', -20);
    setTo(state as any, 'winter_status', 'CLEAR');
  }

  /**
   * ASH_FERTILIZATION
   * soil_vitality ↑ (Tier 1), carrying_capacity ↑ (Tier 1),
   * biomass_density ↑ (Tier 1)
   */
  applyEvent_ASH_FERTILIZATION(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    for (const provId of entity.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'soil_vitality', 12);
      env.carrying_capacity = Math.min(env.carrying_capacity + 800, 999999);
      delta(env as any, 'biomass_density', 8);
    }
  }

  /**
   * CALDERA_COLLAPSE
   * geothermal_activity ↓, peak_elevation ↓, active_vents ↓
   * biome_type (Tier 1) shifts to Lake/Marsh
   */
  applyEvent_CALDERA_COLLAPSE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'geothermal_activity', -40);
    state.peak_elevation = Math.max(0, state.peak_elevation - 800);
    state.active_vents = Math.max(0, state.active_vents - 3);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      setTo(env as any, 'biome', 'MARSH');
      env.arable_land_area = Math.max(0, env.arable_land_area - 2000);
    }
    this.alert(`The ${entity!.name} collapses into a caldera! Provinces transformed into a vast volcanic lake.`, 'CRITICAL');
  }

  /**
   * LAKE_OVERTURN
   * trapped_carbon_tons → 0
   * On adjacent Tier 1: carrying_capacity → 0 temporarily
   */
  applyEvent_LAKE_OVERTURN(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    zero(state as any, 'trapped_carbon_tons');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      const prev = env.carrying_capacity;
      zero(env as any, 'carrying_capacity');
      // CO2 release also poisons province
      delta(env as any, 'disease_reservoir', 30);
      // Carrying capacity will recover via drift, log it
      this.chronicle(`Lake overturn in the ${entity!.name} releases lethal CO₂, killing thousands instantly.`);
      // Schedule recovery (state drift will handle gradual return)
      env.carrying_capacity = prev; // restore after one tick so drift can apply
    }
    this.alert(`LAKE OVERTURN near the ${entity!.name}! Lethal volcanic gas suffocates the valley.`, 'CRITICAL');
  }

  /**
   * GLACIER_ADVANCE
   * pass_accessibility ↓, known_passes ↓
   */
  applyEvent_GLACIER_ADVANCE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    delta(state as any, 'pass_accessibility', -20);
    state.known_passes = Math.max(0, state.known_passes - 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.4 — TIER 3 OASIS / CARAVAN CORRIDOR EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DUST_STORM_MAJOR
   * route_clarity → 0, dune_encroachment ↑, active_caravans ↓,
   * accessibility → 0 (Tier 1)
   */
  applyEvent_DUST_STORM_MAJOR(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    zero(state as any, 'route_clarity');
    delta(state as any, 'dune_encroachment', 15);
    state.active_caravans = Math.max(0, state.active_caravans - 5);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'accessibility');
    }
    this.alert(`A massive dust storm engulfs the ${entity!.name}. All caravans halted, routes buried.`, 'URGENT');
  }

  /**
   * AQUIFER_DEPLETION
   * aquifer_level → 0, water_quality = DRY, salt_accumulation ↑,
   * nomad_pressure ↑
   */
  applyEvent_AQUIFER_DEPLETION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    zero(state as any, 'aquifer_level');
    setTo(state as any, 'water_quality', 'DRY');
    delta(state as any, 'salt_accumulation', 20);
    delta(state as any, 'nomad_pressure', 25);
    state.camels_supported = Math.max(0, state.camels_supported - 500);
    this.alert(`The ${entity!.name} aquifer is exhausted! The oasis dries up.`, 'CRITICAL');
  }

  /**
   * SAND_DUNE_SHIFT
   * buried_ruins_count ↑, bandit_concealment ↑,
   * arable_land_area ↓ (Tier 1), deletes Tier 1 Hex data (swallowed)
   */
  applyEvent_SAND_DUNE_SHIFT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    state.buried_ruins_count += 1;
    delta(state as any, 'bandit_concealment', 10);
    delta(state as any, 'route_clarity', -10);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      env.arable_land_area = Math.max(0, env.arable_land_area - 1000);
    }
  }

  /**
   * FLASH_FLOOD
   * aquifer_level ↑, surface_water ↑, forage_availability ↑,
   * salt_accumulation ↓, camels_supported ↑
   */
  applyEvent_FLASH_FLOOD(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    delta(state as any, 'aquifer_level', 20);
    delta(state as any, 'surface_water', 25);
    delta(state as any, 'forage_availability', 20);
    delta(state as any, 'salt_accumulation', -15);
    state.camels_supported = Math.min(state.camels_supported + 300, 999999);
    delta(state as any, 'nomad_pressure', -10); // Nomads are content
    // Cascade to Tier 1
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) {
        delta(env as any, 'water_saturation', 30);
        delta(env as any, 'soil_vitality', 5);
      }
    }
  }

  /**
   * RUIN_UNCOVERED
   * buried_ruins_count ↓, bandit_concealment ↑
   */
  applyEvent_RUIN_UNCOVERED(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    state.buried_ruins_count = Math.max(0, state.buried_ruins_count - 1);
    delta(state as any, 'bandit_concealment', 15);
  }

  /**
   * OASIS_SALINIZATION
   * water_quality = BRACKISH, salt_accumulation ↑,
   * carrying_capacity ↓ (Tier 1)
   */
  applyEvent_OASIS_SALINIZATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    setTo(state as any, 'water_quality', 'BRACKISH');
    delta(state as any, 'salt_accumulation', 20);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.carrying_capacity = Math.max(0, env.carrying_capacity - 800);
    }
  }

  /**
   * LOCUST_SWARM
   * forage_availability → 0, camels_supported ↓,
   * stored_calories → 0 (Tier 1)
   */
  applyEvent_LOCUST_SWARM(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    zero(state as any, 'forage_availability');
    state.camels_supported = Math.max(0, state.camels_supported - 1000);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'stored_calories');
      setTo(env as any, 'disaster', 'LOCUST');
    }
    this.alert(`A biblical locust swarm sweeps the ${entity!.name}! All food stores destroyed.`, 'CRITICAL');
  }

  /**
   * PALM_BLIGHT
   * palm_tree_count ↓, surface_water ↓ (due to evaporation spike)
   */
  applyEvent_PALM_BLIGHT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    state.palm_tree_count = Math.max(0, state.palm_tree_count - 100);
    delta(state as any, 'surface_water', -10);
    delta(state as any, 'forage_availability', -5);
  }

  /**
   * WELL_COLLAPSE
   * days_between_water ↑, active_caravans ↓
   */
  applyEvent_WELL_COLLAPSE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    state.days_between_water = Math.min(state.days_between_water + 5, 999);
    state.active_caravans = Math.max(0, state.active_caravans - 3);
  }

  /**
   * ROUTE_LOST
   * active_caravans → 0, bandit_concealment ↓ (no one to hide from)
   */
  applyEvent_ROUTE_LOST(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    zero(state as any, 'active_caravans');
    delta(state as any, 'bandit_concealment', -15);
    setTo(state as any, 'corridor_status', 'ABANDONED');
  }

  /**
   * SEASONAL_COOLING (Oasis)
   * heat_intensity ↓, wind_scour ↓, route_clarity ↑
   */
  applyEvent_SEASONAL_COOLING(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    delta(state as any, 'heat_intensity', -15);
    delta(state as any, 'wind_scour', -10);
    delta(state as any, 'route_clarity', 15);
  }

  /**
   * MIRAGE_MADNESS
   * active_caravans ↓
   */
  applyEvent_MIRAGE_MADNESS(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    state.active_caravans = Math.max(0, state.active_caravans - 4);
    delta(state as any, 'mirage_frequency', 10);
  }

  /**
   * SALT_CRUST_COLLAPSE
   * carrying_capacity ↓, destroys Tier 1 trade infrastructure
   */
  applyEvent_SALT_CRUST_COLLAPSE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      env.carrying_capacity = Math.max(0, env.carrying_capacity - 1500);
      zero(env as any, 'infrastructure_integrity'); // Tier 1 trade infra destroyed
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.5 — TIER 2 TAIGA / FJORD EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GLACIAL_CALVING
   * glacier_advance ↓, fjord_depth ↑
   */
  applyEvent_GLACIAL_CALVING(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'glacier_advance', -15);
    delta(state as any, 'fjord_depth', 5);
    delta(state as any, 'pack_ice_density', 10); // Icebergs calve off
    setTo(state as any, 'ice_status', 'ICEBERGS');
  }

  /**
   * PERMAFROST_MELT
   * permafrost_integrity ↓, infrastructure_integrity → 0 (Tier 1)
   */
  applyEvent_PERMAFROST_MELT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'permafrost_integrity', -20);
    delta(state as any, 'peat_accumulation', -10);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      delta(env as any, 'disease_reservoir', 15); // Ancient pathogens released
    }
    this.alert(`Permafrost melting in the ${entity!.name}. All infrastructure sinking into the mud.`, 'URGENT');
  }

  /**
   * WHALE_MIGRATION
   * wildlife_migration ↑, whale_pods ↑
   */
  applyEvent_WHALE_MIGRATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'wildlife_migration', 20);
    state.whale_pods = Math.min(state.whale_pods + 6, 999);
    setTo(state as any, 'migration_phase', 'INBOUND');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.stored_calories = Math.min(env.stored_calories + 1500, 999999);
    }
  }

  /**
   * WINTER_STARVATION
   * surviving_granaries → 0, predator_threat ↓
   * nomad_pressure ↑ (Tier 3 - pushing south)
   */
  applyEvent_WINTER_STARVATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    zero(state as any, 'surviving_granaries');
    delta(state as any, 'wildlife_migration', -10); // Predators also die
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'stored_calories');
      delta(env as any, 'ambient_unrest', 20);
      delta(env as any, 'predator_threat', -10);
    }
    // Cascade: nomad pressure on adjacent caravan corridors (south-push)
    for (const corridor of this.getCorridorEntities()) {
      delta(corridor.state.data as any, 'nomad_pressure', 15);
    }
    this.alert(`Winter starvation strikes the ${entity!.name}. Granaries empty, desperate survivors push south.`, 'CRITICAL');
  }

  /**
   * PACK_ICE_LOCK
   * pack_ice_density ↑
   */
  applyEvent_PACK_ICE_LOCK(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'pack_ice_density', 25);
    setTo(state as any, 'ice_status', 'PACK_ICE');
  }

  /**
   * TAIGA_WILDFIRE
   * timber_maturity → 0, peat_accumulation → 0, tar_kiln_capacity ↓
   * biomass_density → 0 (Tier 1)
   */
  applyEvent_TAIGA_WILDFIRE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    zero(state as any, 'timber_maturity');
    zero(state as any, 'peat_accumulation');
    delta(state as any, 'tar_kiln_capacity', -20, 0, 99999);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'biomass_density');
      zero(env as any, 'timber_reserves');
      setTo(env as any, 'disaster', 'BURNING');
    }
    // Cascade to T4: releases carbon
    const climateEng = this.getClimateEngine();
    if (climateEng) {
      delta(climateEng.state.data as any, 'global_carbon_sink', -5);
    }
    this.alert(`Wildfire rages through the taiga of the ${entity!.name}! Vast forests reduced to ash.`, 'URGENT');
  }

  /**
   * AURORA_EVENT
   * Triggers purely NPC State changes (mysticism) — published via event bus
   */
  applyEvent_AURORA_EVENT(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    if (this.gameLoop.eventBus) {
      this.gameLoop.eventBus.publish('AURORA_EVENT', { entityId, entityName: entity.name });
    }
    this.chronicle(`Vast ribbons of aurora light the sky above the ${entity.name}, filling the hearts of the faithful with awe.`);
  }

  /**
   * AMBER_WASHUP
   * amber_deposits ↑
   */
  applyEvent_AMBER_WASHUP(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    state.amber_deposits = Math.min(state.amber_deposits + 20, 99999);
  }

  /**
   * FJORD_FREEZE
   * pack_ice_density ↑, accessibility ↑ (ice bridge for armies)
   */
  applyEvent_FJORD_FREEZE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'pack_ice_density', 30);
    setTo(state as any, 'ice_status', 'SOLID_ICE');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'accessibility', 15); // Ice bridge opens army routes
    }
  }

  /**
   * SLOW_GROWTH_RECOVERY
   * timber_maturity ↑, timber_reserves ↑ (Tier 1)
   */
  applyEvent_SLOW_GROWTH_RECOVERY(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'timber_maturity', 10);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.timber_reserves = Math.min(env.timber_reserves + 500, 999999);
    }
  }

  /**
   * CABIN_FEVER
   * Triggers purely NPC State changes (ambient_unrest) — published via event bus
   */
  applyEvent_CABIN_FEVER(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    if (this.gameLoop.eventBus) {
      this.gameLoop.eventBus.publish('CABIN_FEVER', { entityId, entityName: entity.name });
    }
    // Also directly adds ambient unrest to T1 provinces
    for (const provId of entity.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'ambient_unrest', 10);
    }
  }

  /**
   * MUD_SEASON
   * accessibility → 0 (Tier 1)
   */
  applyEvent_MUD_SEASON(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    for (const provId of entity.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) zero(env as any, 'accessibility');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.6 — TIER 3 ARCHIPELAGO EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * TYPHOON_STRIKE
   * active_fleets ↓, reef_hazard ↓, pirate_concealment ↓,
   * strait_congestion ↓, naval_hegemony ↓,
   * delta_depth ↑ (Tier 2 scouring), infrastructure_integrity → 0 (Tier 1)
   */
  applyEvent_TYPHOON_STRIKE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.active_fleets = Math.max(0, state.active_fleets - 8);
    delta(state as any, 'reef_hazard', -10); // Typhoon scours reefs
    delta(state as any, 'pirate_concealment', -15);
    delta(state as any, 'strait_congestion', -20);
    delta(state as any, 'naval_hegemony', -15);
    delta(state as any, 'salt_spray_decay', 20);
    state.shipwreck_count += 5;
    // Cascade to co-continental Tier 2 Rivers: delta_depth ↑ (scouring)
    for (const river of this.getRiverEntities()) {
      if (river.continent === entity!.continent) {
        delta(river.state.data as any, 'delta_depth', 3, 0, 99999);
      }
    }
    // Cascade to Tier 1
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      setTo(env as any, 'disaster', 'TSUNAMI'); // Typhoon surge
    }
    this.alert(`TYPHOON STRIKES the ${entity!.name}! Fleets shattered, coastal infrastructure destroyed.`, 'CRITICAL');
  }

  /**
   * MONSOON_SHIFT
   * wind_reliability ↑, wind_regime changes,
   * water_saturation ↑ (Tier 1)
   */
  applyEvent_MONSOON_SHIFT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'wind_reliability', 20);
    setTo(state as any, 'wind_regime', 'MONSOON');
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'water_saturation', 25);
    }
  }

  /**
   * DOLDRUMS_CALM
   * wind_reliability → 0, active_fleets ↓
   */
  applyEvent_DOLDRUMS_CALM(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    zero(state as any, 'wind_reliability');
    state.active_fleets = Math.max(0, state.active_fleets - 5);
    setTo(state as any, 'wind_regime', 'DOLDRUMS');
  }

  /**
   * REEF_GROWTH
   * reef_hazard ↑, navigable_channels ↓
   */
  applyEvent_REEF_GROWTH(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'reef_hazard', 15);
    state.navigable_channels = Math.max(0, state.navigable_channels - 2);
  }

  /**
   * CORAL_BLEACHING
   * marine_biodiversity → 0, reef_hazard ↓, pearl_beds_active ↓
   */
  applyEvent_CORAL_BLEACHING(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    zero(state as any, 'marine_biodiversity');
    delta(state as any, 'reef_hazard', -20);
    state.pearl_beds_active = Math.max(0, state.pearl_beds_active - 4);
  }

  /**
   * PIRATE_PROLIFERATION
   * strait_congestion ↓, naval_hegemony ↓, shipwreck_count ↑
   */
  applyEvent_PIRATE_PROLIFERATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'strait_congestion', -15);
    delta(state as any, 'naval_hegemony', -20);
    state.shipwreck_count += 3;
    setTo(state as any, 'chokepoint_status', 'CONTESTED');
  }

  /**
   * TSUNAMI
   * island_count ↓
   * On Tier 1: infrastructure_integrity → 0, carrying_capacity ↓,
   * defensibility ↓
   */
  applyEvent_TSUNAMI(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.island_count = Math.max(0, state.island_count - 1);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'infrastructure_integrity');
      env.carrying_capacity = Math.max(0, env.carrying_capacity - 2000);
      delta(env as any, 'defensibility', -25);
      setTo(env as any, 'disaster', 'TSUNAMI');
    }
    this.alert(`TSUNAMI devastates the ${entity!.name}! Islands swallowed, coastal defenses shattered.`, 'CRITICAL');
  }

  /**
   * CHOKEPOINT_SILTING
   * navigable_channels ↓, strait_congestion ↑
   */
  applyEvent_CHOKEPOINT_SILTING(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.navigable_channels = Math.max(0, state.navigable_channels - 2);
    delta(state as any, 'strait_congestion', 15);
  }

  /**
   * NEW_ISLAND_FORMATION
   * island_count ↑, pirate_concealment ↑, underwater_volcanism ↓
   */
  applyEvent_NEW_ISLAND_FORMATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.island_count += 1;
    delta(state as any, 'pirate_concealment', 10);
    delta(state as any, 'underwater_volcanism', -20);
  }

  /**
   * ROGUE_WAVES
   * shipwreck_count ↑, salt_spray_decay ↑
   */
  applyEvent_ROGUE_WAVES(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.shipwreck_count += 2;
    delta(state as any, 'salt_spray_decay', 10);
  }

  /**
   * MIGRATORY_FISH_RUN
   * marine_biodiversity ↑, stored_calories ↑ (Tier 1)
   */
  applyEvent_MIGRATORY_FISH_RUN(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'marine_biodiversity', 20);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) env.stored_calories = Math.min(env.stored_calories + 2000, 999999);
    }
  }

  /**
   * TIDAL_BORE
   * accessibility ↑ (temporary coastal access for deep ships)
   */
  applyEvent_TIDAL_BORE(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    for (const provId of entity.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'accessibility', 20);
    }
  }

  /**
   * MANGROVE_EXPANSION
   * pirate_concealment ↑, defensibility ↑ (Tier 1),
   * delta_health ↑ (Tier 2)
   */
  applyEvent_MANGROVE_EXPANSION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'pirate_concealment', 15);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'defensibility', 10);
    }
    for (const river of this.getRiverEntities()) {
      if (river.continent === entity!.continent) {
        delta(river.state.data as any, 'delta_health', 8);
      }
    }
  }

  /**
   * SEA_MONSTER_MIGRATION
   * predator_threat ↑ (Tier 1 — coastal)
   */
  applyEvent_SEA_MONSTER_MIGRATION(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    for (const provId of entity.affectedProvinceIds) {
      const prov = this.gameLoop.provinces[provId];
      const env = prov?.tier1Env;
      if (!env) continue;
      if (env.biome === 'COASTAL' || env.biome === 'RIVER_DELTA') {
        delta(env as any, 'predator_threat', 25);
      }
    }
    this.alert(`Sea monsters have been sighted off the ${entity.name}! Coastal provinces in peril.`, 'URGENT');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.7 — TIER 3 RAINFOREST EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RAPID_RECLAMATION
   * canopy_density ↑, soil_leaching ↓, ruin_overgrowth ↑,
   * biodiversity_index ↑, clear_cut_hectares ↓
   */
  applyEvent_RAPID_RECLAMATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'canopy_density', 15);
    delta(state as any, 'soil_leaching', -10);
    delta(state as any, 'ruin_overgrowth', 20);
    delta(state as any, 'biodiversity_index', 10);
    (state as any).clearcut_hectares = Math.max(0, ((state as any).clearcut_hectares ?? 0) - 200);
    // Cascade to T1: infrastructure damaged by roots
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'infrastructure_integrity', -10);
    }
  }

  /**
   * TROPICAL_DELUGE
   * humidity_index ↑, parasite_load ↑, soil_leaching ↑,
   * river_meander ↑, days_of_rain ↑,
   * water_saturation ↑ (Tier 1), fire_risk ↓ (Tier 1)
   */
  applyEvent_TROPICAL_DELUGE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'humidity_index', 20);
    delta(state as any, 'parasite_load', 15);
    delta(state as any, 'soil_leaching', 15);
    delta(state as any, 'river_meander', 10);
    (state as any).days_of_rain = Math.min(((state as any).days_of_rain ?? 0) + 20, 999);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'water_saturation', 30);
      delta(env as any, 'fire_risk', -15);
    }
    // Also increases water_volume on co-continental rivers
    for (const river of this.getRiverEntities()) {
      if (river.continent === entity!.continent) {
        delta(river.state.data as any, 'water_volume', 15);
        delta(river.state.data as any, 'silt_load', 10);
      }
    }
  }

  /**
   * MEDICINAL_BLOOM
   * medicinal_yield ↑, biomass_density ↑ (Tier 1)
   */
  applyEvent_MEDICINAL_BLOOM(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'medicinal_yield', 20);
    delta(state as any, 'biodiversity_index', 5);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (env) delta(env as any, 'biomass_density', 8);
    }
  }

  /**
   * PARASITE_OUTBREAK
   * parasite_load ↑
   */
  applyEvent_PARASITE_OUTBREAK(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'parasite_load', 25);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'disease_reservoir', 30);
      setTo(env as any, 'disaster', 'PLAGUE');
    }
    this.alert(`Parasite outbreak surges from the ${entity!.name}! Armies suffering severe attrition.`, 'URGENT');
  }

  /**
   * SLASH_AND_BURN_FIRE (event, not NPC action)
   * exotic_timber → 0, ambient_toxicity ↓, timber_reserves → 0 (Tier 1)
   */
  applyEvent_SLASH_AND_BURN_FIRE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    zero(state as any, 'exotic_timber');
    delta(state as any, 'ambient_toxicity', -20); // Smoke clears undergrowth
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      zero(env as any, 'timber_reserves');
      setTo(env as any, 'disaster', 'BURNING');
    }
  }

  /**
   * RIVER_SHIFT
   * river_meander ↑, navigable_creeks ↓
   */
  applyEvent_RIVER_SHIFT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'river_meander', 15);
    (state as any).navigable_creeks = Math.max(0, ((state as any).navigable_creeks ?? 10) - 5);
  }

  /**
   * CANOPY_COLLAPSE
   * canopy_density ↓, ambient_toxicity ↑
   */
  applyEvent_CANOPY_COLLAPSE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'canopy_density', -20);
    delta(state as any, 'ambient_toxicity', 25);
  }

  /**
   * EXOTIC_MIGRATION
   * biodiversity_index ↑, rare_animal_spawns ↑
   */
  applyEvent_EXOTIC_MIGRATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'biodiversity_index', 15);
    (state as any).rare_animal_spawns = Math.min(((state as any).rare_animal_spawns ?? 0) + 5, 999);
  }

  /**
   * DISEASE_MUTATION
   * biodiversity_index ↓, uncontacted_tribes ↓,
   * disease_reservoir ↑ (Tier 1)
   */
  applyEvent_DISEASE_MUTATION(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'biodiversity_index', -15);
    (state as any).uncontacted_tribes = Math.max(0, ((state as any).uncontacted_tribes ?? 0) - 1);
    for (const provId of entity!.affectedProvinceIds) {
      const env = this.getProvEnv(provId);
      if (!env) continue;
      delta(env as any, 'disease_reservoir', 35);
    }
    this.alert(`A new disease mutates in the depths of the ${entity!.name}. Quarantine tribes immediately.`, 'CRITICAL');
  }

  /**
   * TRIBAL_EMERGENCE
   * uncontacted_tribes ↓ (spawns NPC Factions — published via event bus)
   */
  applyEvent_TRIBAL_EMERGENCE(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    const tribeCount = (state as any).uncontacted_tribes ?? 0;
    if (tribeCount <= 0) return;
    (state as any).uncontacted_tribes = Math.max(0, tribeCount - 1);
    if (this.gameLoop.eventBus) {
      this.gameLoop.eventBus.publish('TRIBAL_EMERGENCE', { entityId, entityName: entity.name });
    }
    this.chronicle(`A tribe emerges from the depths of the ${entity.name}, making first contact with the outside world.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.8 — TIER 4 MACRO EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ONSET_LITTLE_ICE_AGE
   * global_temperature_offset ↓, polar_ice_extent ↑, global_humidity ↓
   * current_temperature ↓ (Tier 1)
   * ice_coverage ↑ (Tier 2 River)
   * snowpack_depth ↑ (Tier 2 Mountain)
   * permafrost_integrity ↑ (Tier 2 Taiga)
   */
  applyEvent_ONSET_LITTLE_ICE_AGE() {
    const climateEng = this.getClimateEngine();
    if (!climateEng) return;
    const climate = climateEng.state.data as Tier4ClimateEngineState;
    delta(climate as any, 'global_temperature_offset', -3, -100, 100);
    delta(climate as any, 'polar_ice_extent', 15);
    delta(climate as any, 'global_humidity', -10);
    setTo(climate as any, 'climate_epoch', 'GLACIAL');
    // Cascade to Tier 1
    for (const prov of Object.values(this.gameLoop.provinces)) {
      if (prov.tier1Env) delta(prov.tier1Env as any, 'current_temperature', -3, -60, 60);
    }
    // Cascade to Tier 2 Rivers
    for (const river of this.getRiverEntities()) {
      delta(river.state.data as any, 'ice_coverage', 20);
    }
    // Cascade to Tier 2 Mountains
    for (const mtn of this.getMountainEntities()) {
      delta(mtn.state.data as any, 'snowpack_depth', 20);
    }
    // Cascade to Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      delta(fjord.state.data as any, 'permafrost_integrity', 15);
    }
    this.alert('A Little Ice Age descends upon the world. Winters grow longer; glaciers advance across the land.', 'CRITICAL');
  }

  /**
   * MEDIEVAL_WARM_PERIOD
   * global_temperature_offset ↑, polar_ice_extent ↓,
   * surface_temperature ↑ (Ocean)
   * current_temperature ↑ (Tier 1)
   * ice_coverage ↓ (Tier 2 River)
   * alpine_biomass ↑ (Tier 2 Mountain)
   * heat_intensity ↑ (Tier 3 Oasis)
   * permafrost_integrity ↓ (Tier 2 Taiga)
   * glacier_advance ↓ (Tier 2 Taiga)
   */
  applyEvent_MEDIEVAL_WARM_PERIOD() {
    const climateEng = this.getClimateEngine();
    if (!climateEng) return;
    const climate = climateEng.state.data as Tier4ClimateEngineState;
    delta(climate as any, 'global_temperature_offset', 2, -100, 100);
    delta(climate as any, 'polar_ice_extent', -10);
    delta(climate as any, 'sea_level_variance_cm', 20, 0, 9999);
    setTo(climate as any, 'climate_epoch', 'WARMING_OPTIMUM');
    // Cascade to Tier 1
    for (const prov of Object.values(this.gameLoop.provinces)) {
      if (prov.tier1Env) delta(prov.tier1Env as any, 'current_temperature', 2, -60, 60);
    }
    // Ocean conveyor: surface temperature up
    const ocean = this.getOceanConveyor();
    if (ocean) delta(ocean.state.data as any, 'surface_temperature', 5);
    // Cascade to Tier 2 Rivers
    for (const river of this.getRiverEntities()) {
      delta(river.state.data as any, 'ice_coverage', -15);
    }
    // Cascade to Tier 2 Mountains
    for (const mtn of this.getMountainEntities()) {
      delta(mtn.state.data as any, 'alpine_biomass', 10);
    }
    // Cascade to Tier 3 Oasis
    for (const corridor of this.getCorridorEntities()) {
      delta(corridor.state.data as any, 'heat_intensity', 10);
    }
    // Cascade to Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      delta(fjord.state.data as any, 'permafrost_integrity', -10);
      delta(fjord.state.data as any, 'glacier_advance', -10);
    }
    this.alert('A Medieval Warm Period washes over the world. Crops thrive, but rising seas threaten the coasts.', 'URGENT');
  }

  /**
   * GLOBAL_CIRCULATION_SHIFT
   * jet_stream_stability ↓
   * wind_scour ↑ (Tier 3 Oasis)
   * monsoon_strength ↓ (Tier 3 Archipelago)
   */
  applyEvent_GLOBAL_CIRCULATION_SHIFT() {
    const climateEng = this.getClimateEngine();
    if (!climateEng) return;
    const climate = climateEng.state.data as Tier4ClimateEngineState;
    delta(climate as any, 'jet_stream_stability', -20);
    setTo(climate as any, 'precipitation_regime', 'CHAOTIC');
    // Cascade to Tier 3 Oasis
    for (const corridor of this.getCorridorEntities()) {
      delta(corridor.state.data as any, 'wind_scour', 20);
    }
    // Cascade to Tier 3 Archipelago
    for (const archipelago of this.getArchipelagoEntities()) {
      delta(archipelago.state.data as any, 'monsoon_strength', -15);
    }
    // Also triggers deep water upwelling
    const ocean = this.getOceanConveyor();
    if (ocean) delta(ocean.state.data as any, 'deep_water_upwelling', 10);
  }

  /**
   * CONVEYOR_COLLAPSE
   * current_velocity (Ocean) → 0, heat_joules_transferred → 0
   * (Causes massive drop in global_temperature_offset)
   */
  applyEvent_CONVEYOR_COLLAPSE() {
    const ocean = this.getOceanConveyor();
    if (!ocean) return;
    const oceanState = ocean.state.data as Tier4OceanConveyorState;
    oceanState.current_velocity = Math.round(oceanState.current_velocity * 0.1);
    oceanState.heat_joules_transferred = 0;
    oceanState.deep_water_upwelling = Math.max(0, oceanState.deep_water_upwelling - 30);
    setTo(oceanState as any, 'conveyor_status', 'COLLAPSED');
    // Cascades: global temp drops massively
    const climateEng = this.getClimateEngine();
    if (climateEng) {
      delta(climateEng.state.data as any, 'global_temperature_offset', -5, -100, 100);
    }
    this.alert('THE OCEANIC CONVEYOR HAS COLLAPSED! Heat flow to northern continents ceasing. An ice age may follow.', 'CRITICAL');
  }

  /**
   * UPWELLING_BOOM
   * deep_water_upwelling ↑, nutrient_tons_delivered ↑
   * fish_stocks ↑ (Tier 2 River)
   * marine_biodiversity ↑ (Tier 3 Archipelago)
   * pearl_beds_active ↑ (Tier 3 Archipelago)
   */
  applyEvent_UPWELLING_BOOM() {
    const ocean = this.getOceanConveyor();
    if (!ocean) return;
    const oceanState = ocean.state.data as Tier4OceanConveyorState;
    delta(oceanState as any, 'deep_water_upwelling', 20);
    oceanState.nutrient_tons_delivered = Math.min(oceanState.nutrient_tons_delivered + 80000, 9999999);
    // Cascade to Tier 2 Rivers
    for (const river of this.getRiverEntities()) {
      delta(river.state.data as any, 'fish_stocks', 20);
    }
    // Cascade to Tier 3 Archipelagos
    for (const archipelago of this.getArchipelagoEntities()) {
      delta(archipelago.state.data as any, 'marine_biodiversity', 20);
      const state = archipelago.state.data as Tier3ArchipelagoState;
      state.pearl_beds_active = Math.min(state.pearl_beds_active + 3, 999);
    }
    // Also raises global humidity slightly
    const climateEng = this.getClimateEngine();
    if (climateEng) {
      delta(climateEng.state.data as any, 'global_humidity', 5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2.9 — NPC ACTION HANDLERS (The Human Footprint)
  // All 23 NPC actions from the spec that exert environmental force.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * INTENSIVE_FARMING
   * stored_calories ↑, soil_vitality ↓, water_saturation ↓
   * aquifer_level ↓ (Tier 3 Oasis), water_volume ↓ (Tier 2 River)
   */
  applyNPC_INTENSIVE_FARMING(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    env.stored_calories = Math.min(env.stored_calories + 2000, 999999);
    delta(env as any, 'soil_vitality', -5);
    delta(env as any, 'water_saturation', -5);
    // Tier 3: drain oasis aquifer
    for (const corridor of this.getCorridorEntities()) {
      if (corridor.affectedProvinceIds.includes(provinceId)) {
        delta(corridor.state.data as any, 'aquifer_level', -5);
      }
    }
    // Tier 2: drain river
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'water_volume', -3);
      }
    }
  }

  /**
   * FALLOW_YEAR
   * soil_vitality ↑
   */
  applyNPC_FALLOW_YEAR(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'soil_vitality', 10);
  }

  /**
   * MASS_LOGGING / CLEAR_CUT_FOREST
   * timber_reserves ↓, biomass_density ↓, predator_threat ↑ (displacement)
   * silt_load ↑ (Tier 2 River)
   * slope_stability ↓ (Tier 2 Mountain)
   * erosion_rate ↑ (Tier 2 Mountain)
   * dune_encroachment ↑ (Tier 3 Oasis)
   * timber_maturity ↓ (Tier 2 Taiga)
   * canopy_density ↓ (Tier 3 Rainforest)
   * biodiversity_index ↓ (Tier 3 Rainforest)
   */
  applyNPC_MASS_LOGGING(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    env.timber_reserves = Math.max(0, env.timber_reserves - 2000);
    delta(env as any, 'biomass_density', -20);
    delta(env as any, 'predator_threat', 10); // Wolves displaced
    // Tier 2 River: soil runoff
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'silt_load', 8);
        delta(river.state.data as any, 'bank_erosion', 3);
      }
    }
    // Tier 2 Mountain: slope destabilization
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        delta(mtn.state.data as any, 'slope_stability', -10);
        delta(mtn.state.data as any, 'erosion_rate', 8);
        delta(mtn.state.data as any, 'timber_maturity', -15);
      }
    }
    // Tier 3 Oasis: dune advancement
    for (const corridor of this.getCorridorEntities()) {
      if (corridor.affectedProvinceIds.includes(provinceId)) {
        delta(corridor.state.data as any, 'dune_encroachment', 10);
      }
    }
    // Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        delta(fjord.state.data as any, 'timber_maturity', -10);
      }
    }
    // Tier 3 Rainforest
    for (const rainforest of this.getRainforestEntities()) {
      if (rainforest.affectedProvinceIds.includes(provinceId)) {
        delta(rainforest.state.data as any, 'canopy_density', -15);
        delta(rainforest.state.data as any, 'biodiversity_index', -10);
      }
    }
    // Tier 4: global carbon sink reduced
    const climateEng = this.getClimateEngine();
    if (climateEng) delta(climateEng.state.data as any, 'global_carbon_sink', -2);
  }

  /**
   * PUBLIC_WORKS_DREDGE
   * silt_load ↓, navigability ↑, flood_pressure ↓, delta_depth ↑
   * fjord_depth ↑ (Tier 2 Taiga), navigable_channels ↑ (Tier 3 Archipelago)
   */
  applyNPC_PUBLIC_WORKS_DREDGE(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    const state = entity.state.data as Tier2RiverBasinState;
    // If it's a river, apply river-specific effects
    if (entity.state.type === 'RIVER_BASIN') {
      delta(state as any, 'silt_load', -15);
      delta(state as any, 'navigability', 15);
      delta(state as any, 'flood_pressure', -10);
      state.delta_depth = Math.min(state.delta_depth + 3, 9999);
      state.dredging_deficit = Math.max(0, state.dredging_deficit - 10);
    }
    // Fjord: fjord_depth ↑
    for (const fjord of this.getFjordEntities()) {
      if (fjord.id === entityId || fjord.continent === entity.continent) {
        delta(fjord.state.data as any, 'fjord_depth', 3);
      }
    }
    // Archipelago: navigable_channels ↑
    for (const archipelago of this.getArchipelagoEntities()) {
      if (archipelago.continent === entity.continent) {
        (archipelago.state.data as Tier3ArchipelagoState).navigable_channels =
          Math.min((archipelago.state.data as Tier3ArchipelagoState).navigable_channels + 2, 999);
      }
    }
  }

  /**
   * CONSTRUCT_CANAL_NETWORK
   * water_saturation ↑, infrastructure_integrity ↑, carrying_capacity ↑
   * silt_load ↑ (Tier 2 River)
   * river_meander ↓ (Tier 3 Rainforest)
   */
  applyNPC_CONSTRUCT_CANAL_NETWORK(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'water_saturation', 20);
    delta(env as any, 'infrastructure_integrity', 10);
    env.carrying_capacity = Math.min(env.carrying_capacity + 1000, 999999);
    // Tier 2 River: construction adds silt
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'silt_load', 8);
      }
    }
    // Tier 3 Rainforest: banks stabilized
    for (const rainforest of this.getRainforestEntities()) {
      if (rainforest.affectedProvinceIds.includes(provinceId)) {
        delta(rainforest.state.data as any, 'river_meander', -10);
      }
    }
  }

  /**
   * BUILD_INFRASTRUCTURE (Roads, Wells, Levees)
   * infrastructure_integrity ↑, accessibility ↑
   * bank_erosion ↓ (Tier 2 River — levees)
   * bridges_spanning ↑ (Tier 2 River)
   * pass_accessibility ↑ (Tier 2 Mountain)
   * isolation_factor ↓ (Tier 2 Mountain)
   * days_between_water ↓ (Tier 3 Oasis — wells)
   * tar_kiln_capacity ↑ (Tier 2 Taiga)
   */
  applyNPC_BUILD_INFRASTRUCTURE(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'infrastructure_integrity', 15);
    delta(env as any, 'accessibility', 10);
    // Tier 2 River
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        const rState = river.state.data as Tier2RiverBasinState;
        delta(rState as any, 'bank_erosion', -8);
        rState.bridges_spanning = Math.min(rState.bridges_spanning + 1, 999);
      }
    }
    // Tier 2 Mountain
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        delta(mtn.state.data as any, 'pass_accessibility', 15);
        delta(mtn.state.data as any, 'isolation_factor', -10);
      }
    }
    // Tier 3 Oasis: well digging
    for (const corridor of this.getCorridorEntities()) {
      if (corridor.affectedProvinceIds.includes(provinceId)) {
        const cState = corridor.state.data as Tier3CaravanCorridorState;
        cState.days_between_water = Math.max(1, cState.days_between_water - 3);
      }
    }
    // Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        const fState = fjord.state.data as Tier2FjordState;
        fState.tar_kiln_capacity = Math.min(fState.tar_kiln_capacity + 10, 99999);
      }
    }
    // Also: salt_spray_decay ↓ (Tier 3 Archipelago — applying tar)
    for (const archipelago of this.getArchipelagoEntities()) {
      if (archipelago.affectedProvinceIds.includes(provinceId)) {
        delta(archipelago.state.data as any, 'salt_spray_decay', -5);
      }
    }
  }

  /**
   * BUILD_FORTRESS
   * defensibility ↑, toll_friction ↑ (Tier 2 River),
   * fortress_count ↑ (Tier 2 Mountain)
   */
  applyNPC_BUILD_FORTRESS(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'defensibility', 20);
    // Tier 2 River: river checkpoint
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'toll_friction', 10);
      }
    }
    // Tier 2 Mountain: mountain fortress
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        const mState = mtn.state.data as Tier2VolcanicChainState;
        mState.fortress_count = Math.min(mState.fortress_count + 1, 999);
      }
    }
  }

  /**
   * MASSACRE_POPULATION / TERRORIZE_POPULATION
   * disease_reservoir ↑, ambient_unrest ↑, pollution_level ↑
   */
  applyNPC_MASSACRE_POPULATION(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'disease_reservoir', 25);
    delta(env as any, 'ambient_unrest', 40);
    delta(env as any, 'pollution_level', 15);
  }

  /**
   * DUMP_WASTE / URBAN_POLLUTION
   * pollution_level ↑, disease_reservoir ↑,
   * pollution_flow ↑ (Tier 2 River)
   */
  applyNPC_DUMP_WASTE(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'pollution_level', 15);
    delta(env as any, 'disease_reservoir', 10);
    // Tier 2 River: downstream pollution
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'pollution_flow', 10);
      }
    }
  }

  /**
   * CONSECRATE_LAND
   * ambient_unrest ↓
   */
  applyNPC_CONSECRATE_LAND(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'ambient_unrest', -20);
  }

  /**
   * MINE_VEIN / EXTRACT_ORE
   * mineral_reserves ↓, pollution_level ↑
   * mineral_exposure ↓ (Tier 2 Mountain)
   * pollution_flow ↑ (Tier 2 River — upstream runoff)
   */
  applyNPC_MINE_VEIN(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    env.mineral_reserves = Math.max(0, env.mineral_reserves - 1000);
    delta(env as any, 'pollution_level', 10);
    // Tier 2 Mountain
    for (const mtn of this.getMountainEntities()) {
      if (mtn.affectedProvinceIds.includes(provinceId)) {
        delta(mtn.state.data as any, 'mineral_exposure', -10);
      }
    }
    // Tier 2 River: acid runoff
    for (const river of this.getRiverEntities()) {
      if (river.affectedProvinceIds.includes(provinceId)) {
        delta(river.state.data as any, 'pollution_flow', 10);
      }
    }
  }

  /**
   * OVERFISH
   * fish_stocks ↓ (Tier 2 River)
   * whale_pods ↓ (Tier 2 Taiga)
   * marine_biodiversity ↓ (Tier 3 Archipelago)
   * pearl_beds_active ↓ (Tier 3 Archipelago)
   */
  applyNPC_OVERFISH(entityId: string) {
    // Overfish targets a specific entity
    const entity = this.getEntity(entityId);
    if (!entity) return;
    if (entity.state.type === 'RIVER_BASIN') {
      delta(entity.state.data as any, 'fish_stocks', -20);
    } else if (entity.state.type === 'FJORD_TAIGA') {
      const fState = entity.state.data as Tier2FjordState;
      fState.whale_pods = Math.max(0, fState.whale_pods - 3);
    } else if (entity.state.type === 'ARCHIPELAGO') {
      delta(entity.state.data as any, 'marine_biodiversity', -15);
      const aState = entity.state.data as Tier3ArchipelagoState;
      aState.pearl_beds_active = Math.max(0, aState.pearl_beds_active - 2);
    }
  }

  /**
   * HUNT_RARE_ANIMALS / POACHING
   * predator_threat ↓
   * wildlife_migration ↓ (Tier 2 Taiga)
   * rare_animal_spawns ↓ (Tier 3 Rainforest)
   */
  applyNPC_HUNT_RARE_ANIMALS(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'predator_threat', -15);
    // Tier 2 Taiga
    for (const fjord of this.getFjordEntities()) {
      if (fjord.affectedProvinceIds.includes(provinceId)) {
        delta(fjord.state.data as any, 'wildlife_migration', -10);
      }
    }
    // Tier 3 Rainforest
    for (const rainforest of this.getRainforestEntities()) {
      if (rainforest.affectedProvinceIds.includes(provinceId)) {
        const rState = rainforest.state.data as Tier3RainforestState;
        (rState as any).rare_animal_spawns = Math.max(0, ((rState as any).rare_animal_spawns ?? 0) - 2);
      }
    }
  }

  /**
   * SLASH_AND_BURN_CLEARING (NPC Action)
   * arable_land_area ↑, fire_risk ↑
   * canopy_density ↓ (Tier 3 Rainforest)
   * medicinal_yield ↓ (Tier 3 Rainforest)
   * parasite_load ↓ (Tier 3 Rainforest — fire kills parasites)
   * ambient_toxicity ↓ (Tier 3 Rainforest)
   * clear_cut_hectares ↑ (Tier 3 Rainforest)
   */
  applyNPC_SLASH_AND_BURN_CLEARING(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    env.arable_land_area = Math.min(env.arable_land_area + 800, 999999);
    delta(env as any, 'fire_risk', 20);
    delta(env as any, 'biomass_density', -10);
    // Tier 3 Rainforest
    for (const rainforest of this.getRainforestEntities()) {
      if (rainforest.affectedProvinceIds.includes(provinceId)) {
        delta(rainforest.state.data as any, 'canopy_density', -20);
        delta(rainforest.state.data as any, 'medicinal_yield', -10);
        delta(rainforest.state.data as any, 'parasite_load', -15);
        delta(rainforest.state.data as any, 'ambient_toxicity', -10);
        (rainforest.state.data as any).clearcut_hectares =
          Math.min(((rainforest.state.data as any).clearcut_hectares ?? 0) + 300, 999999);
      }
    }
  }

  /**
   * PLANT_OASIS
   * palm_tree_count ↑ (Tier 3 Oasis)
   */
  applyNPC_PLANT_OASIS(provinceId: string) {
    for (const corridor of this.getCorridorEntities()) {
      if (corridor.affectedProvinceIds.includes(provinceId)) {
        const cState = corridor.state.data as Tier3CaravanCorridorState;
        cState.palm_tree_count = Math.min(cState.palm_tree_count + 50, 999999);
        delta(cState as any, 'surface_water', 3); // Palms attract moisture
      }
    }
  }

  /**
   * MARCH_CARAVAN
   * route_clarity ↑, forage_availability ↓ (Tier 3 Oasis — camels eat it)
   */
  applyNPC_MARCH_CARAVAN(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3CaravanCorridorState;
    if (!state) return;
    delta(state as any, 'route_clarity', 10);
    delta(state as any, 'forage_availability', -8);
    state.active_caravans = Math.min(state.active_caravans + 1, 999999);
  }

  /**
   * MARCH_ARMY
   * infrastructure_integrity ↓, biomass_density ↓ (forage depletion),
   * stored_calories ↓ (pillaging)
   */
  applyNPC_MARCH_ARMY(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'infrastructure_integrity', -8);
    delta(env as any, 'biomass_density', -5);
    env.stored_calories = Math.max(0, env.stored_calories - 500);
  }

  /**
   * SCAVENGE_WRECK
   * shipwreck_count ↓ (Tier 3 Archipelago)
   */
  applyNPC_SCAVENGE_WRECK(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.shipwreck_count = Math.max(0, state.shipwreck_count - 1);
  }

  /**
   * NAVAL_PATROL
   * pirate_concealment ↓ (Tier 3 Archipelago)
   * naval_hegemony ↑ (Tier 3 Archipelago)
   */
  applyNPC_NAVAL_PATROL(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'pirate_concealment', -15);
    delta(state as any, 'naval_hegemony', 10);
  }

  /**
   * TRADE_EXPEDITION
   * annual_cargo_tons ↑ (Tier 2 River)
   * active_caravans ↑ (Tier 3 Oasis)
   * strait_congestion ↑ (Tier 3 Archipelago)
   */
  applyNPC_TRADE_EXPEDITION(entityId: string) {
    const entity = this.getEntity(entityId);
    if (!entity) return;
    if (entity.state.type === 'RIVER_BASIN') {
      const rState = entity.state.data as Tier2RiverBasinState;
      rState.annual_cargo_tons = Math.min(rState.annual_cargo_tons + 500, 9999999);
    } else if (entity.state.type === 'CARAVAN_CORRIDOR') {
      const cState = entity.state.data as Tier3CaravanCorridorState;
      cState.active_caravans = Math.min(cState.active_caravans + 2, 999999);
    } else if (entity.state.type === 'ARCHIPELAGO') {
      delta(entity.state.data as any, 'strait_congestion', 10);
    }
  }

  /**
   * EXPLORE_TERRITORY (NPC Action — not in spec Section 2.9 but referenced in 1.3)
   * known_passes ↑ (Tier 2 Mountain)
   */
  applyNPC_EXPLORE_TERRITORY(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2VolcanicChainState;
    if (!state) return;
    state.known_passes = Math.min(state.known_passes + 1, 99);
  }

  /**
   * STOCKPILE_FOOD (NPC Action — referenced in Section 1.5)
   * surviving_granaries ↑ (Tier 2 Taiga)
   */
  applyNPC_STOCKPILE_FOOD(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    state.surviving_granaries = Math.min(state.surviving_granaries + 5, 999);
  }

  /**
   * EXTRACT_PEAT (NPC Action — referenced in Section 1.5)
   * peat_accumulation ↓ (Tier 2 Taiga)
   */
  applyNPC_EXTRACT_PEAT(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    delta(state as any, 'peat_accumulation', -15);
  }

  /**
   * CONSTRUCT_SANITATION (NPC Action — referenced in Section 1.1)
   * disease_reservoir ↓ (Tier 1)
   */
  applyNPC_CONSTRUCT_SANITATION(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'disease_reservoir', -20);
  }

  /**
   * HUNT_PREDATORS (NPC Action — referenced in Section 1.1)
   * predator_threat ↓ (Tier 1)
   */
  applyNPC_HUNT_PREDATORS(provinceId: string) {
    const env = this.getProvEnv(provinceId);
    if (!env) return;
    delta(env as any, 'predator_threat', -20);
  }

  /**
   * BUILD_FLEET (NPC Action — referenced in Section 1.6)
   * naval_hegemony ↑ (Tier 3 Archipelago)
   */
  applyNPC_BUILD_FLEET(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    delta(state as any, 'naval_hegemony', 10);
  }

  /**
   * LAUNCH_FLEET (NPC Action — referenced in Section 1.6)
   * active_fleets ↑ (Tier 3 Archipelago)
   */
  applyNPC_LAUNCH_FLEET(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3ArchipelagoState;
    if (!state) return;
    state.active_fleets = Math.min(state.active_fleets + 2, 999999);
  }

  /**
   * GATHER_RESOURCES (NPC Action — referenced in Section 1.5)
   * amber_deposits ↓ (Tier 2 Taiga)
   */
  applyNPC_GATHER_RESOURCES(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier2FjordState;
    if (!state) return;
    state.amber_deposits = Math.max(0, state.amber_deposits - 10);
  }

  /**
   * CLEAR_RUINS (NPC Action — referenced in Section 1.7)
   * ruin_overgrowth ↓ (Tier 3 Rainforest)
   */
  applyNPC_CLEAR_RUINS(entityId: string) {
    const entity = this.getEntity(entityId);
    const state = entity?.state.data as Tier3RainforestState;
    if (!state) return;
    delta(state as any, 'ruin_overgrowth', -20);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE ENTITY LOOKUP HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getEntity(id: string): EnvironmentEntity<any> | undefined {
    return (this.gameLoop.environmentEntities || []).find(e => e.id === id);
  }

  private getProvEnv(provId: string): Tier1HexState | null {
    const prov = this.gameLoop.provinces[provId];
    return prov?.tier1Env ?? null;
  }

  private getRiverEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 2 && e.state.type === 'RIVER_BASIN'
    );
  }

  private getMountainEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 2 && e.state.type === 'VOLCANIC_CHAIN'
    );
  }

  private getFjordEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 2 && e.state.type === 'FJORD_TAIGA'
    );
  }

  private getCorridorEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 3 && e.state.type === 'CARAVAN_CORRIDOR'
    );
  }

  private getArchipelagoEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 3 && e.state.type === 'ARCHIPELAGO'
    );
  }

  private getRainforestEntities(): EnvironmentEntity<any>[] {
    return (this.gameLoop.environmentEntities || []).filter(
      e => e.tier === 3 && e.state.type === 'RAINFOREST'
    );
  }

  private getClimateEngine(): EnvironmentEntity<any> | undefined {
    return (this.gameLoop.environmentEntities || []).find(
      e => e.tier === 4 && e.state.type === 'CLIMATE_ENGINE'
    );
  }

  private getOceanConveyor(): EnvironmentEntity<any> | undefined {
    return (this.gameLoop.environmentEntities || []).find(
      e => e.tier === 4 && e.state.type === 'OCEAN_CONVEYOR'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE WRAPPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private alert(msg: string, severity: 'NORMAL' | 'URGENT' | 'CRITICAL') {
    this.gameLoop.alertSystem?.queueAlert(msg, severity as any);
  }

  private chronicle(msg: string) {
    const { currentYear, currentDay } = this.gameLoop.clock;
    this.gameLoop.chronicleSystem?.add(currentYear, currentDay, msg, 'NORMAL');
  }
}
