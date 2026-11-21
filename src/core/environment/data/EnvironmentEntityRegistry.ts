/**
 * EnvironmentEntityRegistry.ts
 *
 * Seed data registry for the 9 Continents and their associated Tier 2, 3, and 4
 * environmental entities. Used to initialize the EnvironmentSystem.
 */

import type { EnvironmentEntity, Tier2State, Tier3State, Tier4State } from '../models/EnvironmentTypes';

export function getInitialEnvironmentEntities(): EnvironmentEntity<Tier2State | Tier3State | Tier4State>[] {
  return [
    // ─────────────────────────────────────────────────────────────────────────────
    // TIER 4: GLOBAL MACRO-SYSTEMS
    // ─────────────────────────────────────────────────────────────────────────────
    {
      id: 'env_t4_climate',
      name: 'Planetary Climate Engine',
      tier: 4,
      continent: 'GLOBAL',
      affectedProvinceIds: [], // Affects all
      tickRate: 90,
      lastTickDay: 0,
      state: {
        type: 'CLIMATE_ENGINE',
        data: {
          global_temperature_offset: 0,
          atmospheric_ash_load: 0,
          solar_intensity: 50,
          polar_ice_extent: 50,
          global_humidity: 50,
          jet_stream_stability: 80,
          years_since_climate_shift: 0,
          sea_level_variance_cm: 0,
          global_carbon_sink: 50,
          climate_epoch: 'WARMING_OPTIMUM',
          precipitation_regime: 'WET_CYCLE'
        }
      }
    },
    {
      id: 'env_t4_conveyor',
      name: 'Oceanic Conveyor Belt',
      tier: 4,
      continent: 'GLOBAL',
      affectedProvinceIds: [],
      tickRate: 90,
      lastTickDay: 0,
      state: {
        type: 'OCEAN_CONVEYOR',
        data: {
          current_velocity: 80,
          salinity_differential: 50,
          deep_water_upwelling: 50,
          surface_temperature: 50,
          nutrient_tons_delivered: 0,
          heat_joules_transferred: 0,
          conveyor_status: 'ACTIVE'
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // TIER 2 & 3: CONTINENTAL FEATURES
    // ─────────────────────────────────────────────────────────────────────────────
    
    // 1. Aurelia (The Hearthland Basin)
    {
      id: 'env_t2_aurelia_river',
      name: 'Crown Lakes River System',
      tier: 2,
      continent: 'Aurelia',
      affectedProvinceIds: ['prov_0_0', 'prov_1_-1', 'prov_0_-1', 'prov_-1_0'], // Bounding box to be mapped properly later
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'RIVER_BASIN',
        data: {
          water_volume: 50, silt_load: 20, navigability: 80, ice_coverage: 0,
          pollution_flow: 10, fish_stocks: 80, bank_erosion: 10, toll_friction: 20,
          flood_pressure: 30, delta_health: 90, total_length: 1200, tributary_count: 5,
          delta_depth: 15, bridges_spanning: 8, annual_cargo_tons: 0, dredging_deficit: 0,
          flow_state: 'NORMAL', flood_cycle: 'PRE_FLOOD', economic_status: 'OPEN'
        }
      }
    },

    // 2. Thalmyr (River Empire)
    {
      id: 'env_t2_thalmyr_river',
      name: 'Great Ardyn River',
      tier: 2,
      continent: 'Thalmyr',
      affectedProvinceIds: [],
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'RIVER_BASIN',
        data: {
          water_volume: 80, silt_load: 40, navigability: 95, ice_coverage: 10,
          pollution_flow: 30, fish_stocks: 60, bank_erosion: 20, toll_friction: 50,
          flood_pressure: 60, delta_health: 70, total_length: 3500, tributary_count: 12,
          delta_depth: 25, bridges_spanning: 14, annual_cargo_tons: 0, dredging_deficit: 0,
          flow_state: 'NORMAL', flood_cycle: 'PRE_FLOOD', economic_status: 'OPEN'
        }
      }
    },

    // 3. Drakoria (Volcanic Chains)
    {
      id: 'env_t2_drakoria_volcano',
      name: 'Fire Spine of Drakoria',
      tier: 2,
      continent: 'Drakoria',
      affectedProvinceIds: [],
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'VOLCANIC_CHAIN',
        data: {
          magma_chamber_pressure: 70, tectonic_stress: 60, snowpack_depth: 10, pass_accessibility: 40,
          mineral_exposure: 80, slope_stability: 30, wind_shear: 70, isolation_factor: 80,
          geothermal_activity: 90, alpine_biomass: 20, erosion_rate: 60, peak_elevation: 4500,
          active_vents: 3, known_passes: 2, fortress_count: 5, trapped_carbon_tons: 1000,
          volcanic_status: 'SMOKING', winter_status: 'CLEAR', seismic_phase: 'SWARM'
        }
      }
    },

    // 4. Vareth (Fractured Continent)
    {
      id: 'env_t2_vareth_volcano',
      name: 'Skywall Mountains',
      tier: 2,
      continent: 'Vareth',
      affectedProvinceIds: ['prov_v_8_-8', 'prov_v_9_-8', 'prov_v_7_-7'],
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'VOLCANIC_CHAIN',
        data: {
          magma_chamber_pressure: 30, tectonic_stress: 80, snowpack_depth: 80, pass_accessibility: 20,
          mineral_exposure: 50, slope_stability: 50, wind_shear: 90, isolation_factor: 95,
          geothermal_activity: 40, alpine_biomass: 30, erosion_rate: 40, peak_elevation: 6000,
          active_vents: 1, known_passes: 3, fortress_count: 8, trapped_carbon_tons: 500,
          volcanic_status: 'DORMANT', winter_status: 'SNOWBOUND', seismic_phase: 'QUIET'
        }
      }
    },

    // 5. Eryndor (Arctic Fjord)
    {
      id: 'env_t2_eryndor_fjord',
      name: 'Frostback Fjords',
      tier: 2,
      continent: 'Eryndor',
      affectedProvinceIds: [],
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'FJORD_TAIGA',
        data: {
          permafrost_integrity: 90, fjord_depth: 80, pack_ice_density: 60, timber_maturity: 80,
          peat_accumulation: 70, aurora_intensity: 90, wildlife_migration: 50, glacier_advance: 30,
          winter_darkness: 60, frostbite_risk: 70, months_below_zero: 8, whale_pods: 12,
          amber_deposits: 60, tar_kiln_capacity: 40, surviving_granaries: 30,
          season_state: 'FREEZE', ice_status: 'SLUSH', migration_phase: 'INBOUND'
        }
      }
    },

    // 6. Selkhar (Desert Caravan)
    {
      id: 'env_t3_selkhar_corridor',
      name: 'Red Dune Sea Route',
      tier: 3,
      continent: 'Selkhar',
      affectedProvinceIds: [],
      tickRate: 30,
      lastTickDay: 0,
      state: {
        type: 'CARAVAN_CORRIDOR',
        data: {
          aquifer_level: 30, surface_water: 10, dune_encroachment: 80, wind_scour: 70,
          heat_intensity: 90, night_freeze: 60, route_clarity: 40, forage_availability: 15,
          salt_accumulation: 50, mirage_frequency: 70, bandit_concealment: 60, nomad_pressure: 40,
          days_between_water: 14, palm_tree_count: 500, buried_ruins_count: 5, active_caravans: 12,
          camels_supported: 2000, corridor_status: 'OPEN', water_quality: 'SWEET', prevailing_wind: 'EAST'
        }
      }
    },

    // 7. Azhurak (Tropical Archipelago)
    {
      id: 'env_t3_azhurak_archipelago',
      name: 'Sapphire Islands',
      tier: 3,
      continent: 'Azhurak',
      affectedProvinceIds: [],
      tickRate: 30,
      lastTickDay: 0,
      state: {
        type: 'ARCHIPELAGO',
        data: {
          monsoon_strength: 60, typhoon_probability: 40, reef_hazard: 80, current_velocity: 60,
          pirate_concealment: 90, marine_biodiversity: 100, strait_congestion: 30, tide_extremes: 50,
          wind_reliability: 70, salt_spray_decay: 60, underwater_volcanism: 20, naval_hegemony: 10,
          navigable_channels: 15, shipwreck_count: 42, island_count: 108, active_fleets: 30,
          pearl_beds_active: 8, wind_regime: 'TRADE_WINDS', chokepoint_status: 'OPEN', water_depth: 'REEF_MAZE'
        }
      }
    },

    // 8. Nythara (The Ocean Continent - River/Rainforest)
    {
      id: 'env_t2_nythara_river',
      name: 'Orun River Basin',
      tier: 2,
      continent: 'Nythara',
      affectedProvinceIds: ['prov_n_-8_8', 'prov_n_-7_8', 'prov_n_-8_7'],
      tickRate: 15,
      lastTickDay: 0,
      state: {
        type: 'RIVER_BASIN',
        data: {
          water_volume: 70, silt_load: 30, navigability: 85, ice_coverage: 0,
          pollution_flow: 5, fish_stocks: 90, bank_erosion: 15, toll_friction: 10,
          flood_pressure: 40, delta_health: 80, total_length: 2200, tributary_count: 8,
          delta_depth: 20, bridges_spanning: 4, annual_cargo_tons: 0, dredging_deficit: 0,
          flow_state: 'NORMAL', flood_cycle: 'PRE_FLOOD', economic_status: 'OPEN'
        }
      }
    },
    {
      id: 'env_t3_nythara_rainforest',
      name: 'Emerald Rainforest',
      tier: 3,
      continent: 'Nythara',
      affectedProvinceIds: ['prov_n_-8_8', 'prov_n_-7_8', 'prov_n_-8_7'],
      tickRate: 30,
      lastTickDay: 0,
      state: {
        type: 'RAINFOREST',
        data: {
          canopy_density: 95, humidity_index: 90, medicinal_yield: 80, parasite_load: 60,
          soil_leaching: 70, exotic_timber: 80, ruin_overgrowth: 90, river_meander: 50,
          ambient_toxicity: 70, biodiversity_index: 100, uncontacted_tribes: 12,
          clearcut_hectares: 0, days_of_rain: 15, rare_animal_spawns: 25, navigable_creeks: 40,
          rain_phase: 'DRY_SEASON', canopy_status: 'INTACT'
        }
      }
    },

    // 9. Umbros (Shadow Jungle)
    {
      id: 'env_t3_umbros_rainforest',
      name: 'The Obsidian Canopy',
      tier: 3,
      continent: 'Umbros',
      affectedProvinceIds: [],
      tickRate: 30,
      lastTickDay: 0,
      state: {
        type: 'RAINFOREST',
        data: {
          canopy_density: 100, humidity_index: 95, medicinal_yield: 40, parasite_load: 90,
          soil_leaching: 80, exotic_timber: 60, ruin_overgrowth: 100, river_meander: 60,
          ambient_toxicity: 95, biodiversity_index: 80, uncontacted_tribes: 20,
          clearcut_hectares: 0, days_of_rain: 20, rare_animal_spawns: 5, navigable_creeks: 10,
          rain_phase: 'MONSOON', canopy_status: 'INTACT'
        }
      }
    }
  ];
}
