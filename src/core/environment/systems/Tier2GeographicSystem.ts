/**
 * Tier2GeographicSystem.ts
 *
 * Simulates Tier 2 Geographic Features: River Basins, Volcanic Chains, and Fjords/Taigas.
 * - Tick Rate: every 15 game days
 * - Events defined per feature type
 * - Effects cascade downwards to affected Tier 1 hexes
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { EnvironmentEntity, Tier2State, EnvironmentEvent } from '../models/EnvironmentTypes';
import { EnvironmentEventEngine } from './EnvironmentEventEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 RIVER BASIN EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const RIVER_EVENTS: EnvironmentEvent[] = [
  {
    id: 'SPRING_INUNDATION', name: 'Spring Inundation',
    baseWeight: 80, cooldownDays: 100, lastFiredDay: -999,
    conditions: [
      { field: 'water_volume', op: '>', value: 70, isHardGate: true },
      { field: 'flood_cycle', op: '==', value: 'PRE_FLOOD', isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'flood_cycle', op: 'set', value: 'FLOODING' },
      { target: 'self', field: 'water_volume', op: 'delta', value: -20 },
      { target: 'province', field: 'water_saturation', op: 'delta', value: 30 }, // cascaded
    ],
    chronicleTemplate: 'The banks of the {name} swell with the spring melt, inundating the surrounding valleys.',
    alertTemplate: 'SPRING INUNDATION along the {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'CATASTROPHIC_BREACH', name: 'Catastrophic Breach',
    baseWeight: 5, cooldownDays: 300, lastFiredDay: -999,
    conditions: [
      { field: 'flood_pressure', op: '>', value: 90, isHardGate: true },
      { field: 'bank_erosion', op: '>', value: 80, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'flood_pressure', op: 'set', value: 0 },
      { target: 'province', field: 'infrastructure_integrity', op: 'delta', value: -60 },
      { target: 'province', field: 'disaster', op: 'set', value: 'FLOODED' },
    ],
    chronicleTemplate: 'A catastrophic levee breach along the {name} has swept away entire towns and destroyed infrastructure.',
    alertTemplate: 'CATASTROPHIC BREACH of the {name}! Massive flooding.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'SILT_CHOKE', name: 'Silt Choke',
    baseWeight: 10, cooldownDays: 120, lastFiredDay: -999,
    conditions: [
      { field: 'silt_load', op: '>', value: 80, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'navigability', op: 'delta', value: -40 },
      { target: 'self', field: 'dredging_deficit', op: 'delta', value: 5000 },
    ],
    chronicleTemplate: 'Heavy silt loads in the {name} have choked the river mouths, stalling merchant traffic.',
    alertTemplate: 'SILT CHOKE blocking the {name}. Navigation severely impaired.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'DROUGHT_RECESSION', name: 'Drought Recession',
    baseWeight: 15, cooldownDays: 100, lastFiredDay: -999,
    conditions: [
      { field: 'water_volume', op: '<', value: 20, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'flow_state', op: 'set', value: 'SLUGGISH' },
      { target: 'self', field: 'fish_stocks', op: 'delta', value: -30 },
      { target: 'self', field: 'pollution_flow', op: 'delta', value: 20 },
    ],
    chronicleTemplate: 'The {name} recedes to a sluggish trickle. Fish die in stagnant pools as pollution concentrates.',
    alertTemplate: 'DROUGHT along the {name}. Water levels critically low.',
    alertSeverity: 'URGENT',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 VOLCANIC CHAIN EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const VOLCANIC_EVENTS: EnvironmentEvent[] = [
  {
    id: 'ERUPTION_MINOR', name: 'Minor Eruption',
    baseWeight: 5, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'magma_chamber_pressure', op: '>', value: 60, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'magma_chamber_pressure', op: 'delta', value: -30 },
      { target: 'self', field: 'volcanic_status', op: 'set', value: 'ERUPTING' },
      { target: 'self', field: 'mineral_exposure', op: 'delta', value: 10 },
      { target: 'province', field: 'soil_vitality', op: 'delta', value: 15 }, // Ash fertilization
    ],
    chronicleTemplate: 'A minor eruption of the {name} scatters fertile ash across the slopes, exposing new mineral veins.',
    alertTemplate: 'Minor Eruption in the {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'ERUPTION_CATACLYSMIC', name: 'Cataclysmic Eruption',
    baseWeight: 0.5, cooldownDays: 1000, lastFiredDay: -999,
    conditions: [
      { field: 'magma_chamber_pressure', op: '>', value: 95, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'magma_chamber_pressure', op: 'set', value: 10 },
      { target: 'self', field: 'active_vents', op: 'delta', value: 1 },
      { target: 'province', field: 'disaster', op: 'set', value: 'ASHFALL' },
      { target: 'province', field: 'biomass_density', op: 'set', value: 0 },
      { target: 'tier4', field: 'atmospheric_ash_load', op: 'delta', value: 40 }, // Hits T4 climate engine
    ],
    chronicleTemplate: 'The {name} tears itself apart in a CATACLYSMIC ERUPTION! Ash chokes the skies, plunging the continent into twilight.',
    alertTemplate: 'CATACLYSMIC ERUPTION of {name}! Skies darkened.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'EARTHQUAKE', name: 'Earthquake',
    baseWeight: 4, cooldownDays: 120, lastFiredDay: -999,
    conditions: [
      { field: 'tectonic_stress', op: '>', value: 80, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'tectonic_stress', op: 'set', value: 20 },
      { target: 'self', field: 'slope_stability', op: 'delta', value: -40 },
      { target: 'province', field: 'infrastructure_integrity', op: 'delta', value: -50 },
      { target: 'province', field: 'disaster', op: 'set', value: 'EARTHQUAKE' },
    ],
    chronicleTemplate: 'A violent earthquake shakes the {name}, crumbling fortresses and triggering massive landslides.',
    alertTemplate: 'EARTHQUAKE in the {name}! Severe infrastructure damage.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'AVALANCHE', name: 'Avalanche',
    baseWeight: 10, cooldownDays: 30, lastFiredDay: -999,
    conditions: [
      { field: 'snowpack_depth', op: '>', value: 60, isHardGate: true },
      { field: 'slope_stability', op: '<', value: 40, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'pass_accessibility', op: 'delta', value: -30 },
      { target: 'province', field: 'accessibility', op: 'delta', value: -40 },
    ],
    chronicleTemplate: 'Massive avalanches in the {name} have blocked key mountain passes.',
    alertTemplate: 'Avalanches blocking passes in the {name}.',
    alertSeverity: 'URGENT',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 FJORD / TAIGA EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const FJORD_EVENTS: EnvironmentEvent[] = [
  {
    id: 'GLACIAL_CALVING', name: 'Glacial Calving',
    baseWeight: 10, cooldownDays: 90, lastFiredDay: -999,
    conditions: [
      { field: 'season_state', op: '==', value: 'THAW', isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'pack_ice_density', op: 'delta', value: 30 },
      { target: 'self', field: 'ice_status', op: 'set', value: 'ICEBERGS' },
    ],
    chronicleTemplate: 'Thunderous cracks echo through the {name} as ancient glaciers calve, filling the waters with treacherous icebergs.',
    alertTemplate: 'Icebergs hazard navigation in the {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'PERMAFROST_MELT', name: 'Permafrost Melt',
    baseWeight: 5, cooldownDays: 180, lastFiredDay: -999,
    conditions: [
      { field: 'permafrost_integrity', op: '<', value: 30, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'peat_accumulation', op: 'delta', value: -10 },
      { target: 'province', field: 'infrastructure_integrity', op: 'delta', value: -20 },
      { target: 'province', field: 'disease_reservoir', op: 'delta', value: 30 }, // ancient diseases
    ],
    chronicleTemplate: 'The melting permafrost of the {name} turns the land to a muddy bog, threatening structures and releasing dormant plagues.',
    alertTemplate: 'Permafrost failing in the {name}. Infrastructure sinking.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'WHALE_MIGRATION', name: 'Whale Migration',
    baseWeight: 20, cooldownDays: 300, lastFiredDay: -999,
    conditions: [
      { field: 'ice_status', op: '==', value: 'OPEN_WATER', isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'whale_pods', op: 'delta', value: 5 },
      { target: 'self', field: 'migration_phase', op: 'set', value: 'INBOUND' },
      { target: 'province', field: 'stored_calories', op: 'delta', value: 1000 },
    ],
    chronicleTemplate: 'Vast pods of migratory whales have entered the {name}, promising rich harvests of blubber and meat.',
    alertTemplate: 'Whale pods sighted in the {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'WINTER_STARVATION', name: 'Winter Starvation',
    baseWeight: 15, cooldownDays: 100, lastFiredDay: -999,
    conditions: [
      { field: 'season_state', op: '==', value: 'POLAR_NIGHT', isHardGate: true },
      { field: 'surviving_granaries', op: '<', value: 20, isHardGate: false, multiplier: 4.0 },
    ],
    effects: [
      { target: 'province', field: 'stored_calories', op: 'set', value: 0 },
      { target: 'province', field: 'ambient_unrest', op: 'delta', value: 20 },
    ],
    chronicleTemplate: 'With the sun gone and granaries empty, starvation stalks the frozen settlements of the {name}.',
    alertTemplate: 'WINTER STARVATION in the {name}! Famine during the polar night.',
    alertSeverity: 'CRITICAL',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────
export class Tier2GeographicSystem {
  private engine: EnvironmentEventEngine;
  private eventPools: Record<string, EnvironmentEvent[]>;

  constructor(private gameLoop: GameLoop) {
    this.engine = new EnvironmentEventEngine(gameLoop.rng);
    
    // Deep copy event pools for state tracking per type
    this.eventPools = {
      RIVER_BASIN: RIVER_EVENTS.map(e => ({ ...e })),
      VOLCANIC_CHAIN: VOLCANIC_EVENTS.map(e => ({ ...e })),
      FJORD_TAIGA: FJORD_EVENTS.map(e => ({ ...e }))
    };
  }

  tick() {
    const { currentDay, currentYear } = this.gameLoop.clock;

    // We assume gameLoop.environmentEntities is where all T2/T3/T4 entities are stored
    const entities = this.gameLoop.environmentEntities || [];
    
    for (const entity of entities) {
      if (entity.tier !== 2) continue;

      const t2Entity = entity as EnvironmentEntity<Tier2State>;
      const { type, data } = t2Entity.state;
      const events = this.eventPools[type];

      if (!events) continue;

      // Select an event
      const selectedEvent = this.engine.selectEvent(events, data, 2, currentDay);

      if (selectedEvent) {
        this.fireEvent(selectedEvent, t2Entity, currentDay, currentYear);
        selectedEvent.lastFiredDay = currentDay;
      }
      
      t2Entity.lastTickDay = currentDay;
    }
  }

  private fireEvent(
    event: EnvironmentEvent,
    entity: EnvironmentEntity<Tier2State>,
    currentDay: number,
    currentYear: number
  ) {
    const envSystem = (this.gameLoop as any).environmentSystem || (this.gameLoop as any).environment;
    const feedbackMethod = 'applyEvent_' + event.id;
    if (envSystem && envSystem.feedback && typeof envSystem.feedback[feedbackMethod] === 'function') {
      envSystem.feedback[feedbackMethod](entity.id);
    } else {
      for (const effect of event.effects) {
        if (effect.target === 'self') {
          this.applyEffect(entity.state.data, effect.field, effect.op, effect.value);
        } else if (effect.target === 'province') {
          for (const provId of entity.affectedProvinceIds) {
            const prov = this.gameLoop.provinces[provId];
            if (prov && prov.tier1Env) {
              this.applyEffect(prov.tier1Env as any, effect.field, effect.op, effect.value);
              this.syncToProvince(prov, prov.tier1Env);
            }
          }
        } else if (effect.target === 'tier4') {
          const t4Entities = (this.gameLoop.environmentEntities || []).filter(e => e.tier === 4);
          for (const t4 of t4Entities) {
            this.applyEffect(t4.state.data as any, effect.field, effect.op, effect.value);
          }
        }
      }
    }

    if (event.alertTemplate && event.alertSeverity !== 'NORMAL') {
      const msg = event.alertTemplate.replace('{name}', entity.name);
      this.gameLoop.alertSystem.queueAlert(msg, event.alertSeverity as any);
    }

    if (event.chronicleTemplate) {
      const msg = event.chronicleTemplate.replace('{name}', entity.name);
      this.gameLoop.chronicleSystem.add(currentYear, currentDay, msg, 'NORMAL');
    }
  }

  private applyEffect(target: Record<string, any>, field: string, op: string, value: any) {
    if (op === 'set') target[field] = value;
    else if (op === 'delta') target[field] = (target[field] ?? 0) + value;
    else if (op === 'multiply') target[field] = (target[field] ?? 0) * value;
  }
  
  private syncToProvince(province: any, env: any) {
    province.fertility    = Math.round(env.soil_vitality);
    province.roadQuality  = Math.round(env.infrastructure_integrity);
    province.forestCoverage = Math.round(env.biomass_density * 0.8);
    province.floodRisk    = env.water_saturation > 80 ? Math.round((env.water_saturation - 80) * 5) : 0;
    if (province.stockpiles) {
      province.stockpiles.food = Math.round(env.stored_calories);
      province.stockpiles.wood = Math.round(env.timber_reserves * 0.01);
    }
    // Propagate disaster
    if (env.disaster === 'FLOODED') { province.currentWeather = 'FLOOD'; }
    if (env.disaster === 'BURNING') { province.hasWildfire = true; }
    if (env.disaster === 'NONE') {
      province.hasWildfire = false;
      if (province.currentWeather === 'FLOOD') province.currentWeather = 'CLEAR';
    }
  }
}
