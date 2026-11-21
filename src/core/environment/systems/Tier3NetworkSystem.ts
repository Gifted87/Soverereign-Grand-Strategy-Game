/**
 * Tier3NetworkSystem.ts
 *
 * Simulates Tier 3 Corridor and Network Features: Caravan Routes, Archipelagos, and Rainforests.
 * - Tick Rate: every 30 game days
 * - Network-level events cascading down to T1 hexes
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { EnvironmentEntity, Tier3State, EnvironmentEvent } from '../models/EnvironmentTypes';
import { EnvironmentEventEngine } from './EnvironmentEventEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 CARAVAN CORRIDOR EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const CARAVAN_EVENTS: EnvironmentEvent[] = [
  {
    id: 'DUST_STORM_MAJOR', name: 'Major Dust Storm',
    baseWeight: 15, cooldownDays: 90, lastFiredDay: -999,
    conditions: [
      { field: 'wind_scour', op: '>', value: 70, isHardGate: true },
      { field: 'surface_water', op: '<', value: 30, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'corridor_status', op: 'set', value: 'DUST_STORM' },
      { target: 'self', field: 'route_clarity', op: 'delta', value: -40 },
      { target: 'province', field: 'accessibility', op: 'delta', value: -50 },
    ],
    chronicleTemplate: 'A massive dust storm sweeps through the {name}, burying the ancient caravan trails and stalling all trade.',
    alertTemplate: 'MAJOR DUST STORM in the {name}. Trade routes blocked.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'AQUIFER_DEPLETION', name: 'Aquifer Depletion',
    baseWeight: 2, cooldownDays: 365, lastFiredDay: -999,
    conditions: [
      { field: 'aquifer_level', op: '<', value: 20, isHardGate: true },
      { field: 'active_caravans', op: '>', value: 50, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'surface_water', op: 'set', value: 0 },
      { target: 'self', field: 'water_quality', op: 'set', value: 'DRY' },
      { target: 'province', field: 'carrying_capacity', op: 'multiply', value: 0.5 },
      { target: 'province', field: 'disaster', op: 'set', value: 'DROUGHT' },
    ],
    chronicleTemplate: 'The deep aquifers beneath the {name} have run dry. Oases turn to dust, and nomads are forced to migrate or die.',
    alertTemplate: 'AQUIFER DEPLETION in the {name}! Severe drought.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'LOCUST_SWARM', name: 'Locust Swarm',
    baseWeight: 5, cooldownDays: 180, lastFiredDay: -999,
    conditions: [
      { field: 'surface_water', op: '>', value: 50, isHardGate: false, multiplier: 3.0 }, // after rare rains
    ],
    effects: [
      { target: 'province', field: 'stored_calories', op: 'set', value: 0 },
      { target: 'province', field: 'disaster', op: 'set', value: 'LOCUST' },
    ],
    chronicleTemplate: 'A black cloud blocks the sun over the {name}—a locust swarm of biblical proportions devours every green leaf and grain store.',
    alertTemplate: 'LOCUST SWARM in the {name}! Crops destroyed.',
    alertSeverity: 'CRITICAL',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 ARCHIPELAGO EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const ARCHIPELAGO_EVENTS: EnvironmentEvent[] = [
  {
    id: 'TYPHOON_STRIKE', name: 'Typhoon Strike',
    baseWeight: 8, cooldownDays: 180, lastFiredDay: -999,
    conditions: [
      { field: 'typhoon_probability', op: '>', value: 80, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'shipwreck_count', op: 'delta', value: 5 },
      { target: 'self', field: 'reef_hazard', op: 'delta', value: -10 }, // Storm breaks reefs
      { target: 'province', field: 'infrastructure_integrity', op: 'delta', value: -40 },
      { target: 'province', field: 'disaster', op: 'set', value: 'TSUNAMI' },
    ],
    chronicleTemplate: 'A monstrous typhoon tears through the {name}, smashing fleets into splintered wood and drowning coastal ports.',
    alertTemplate: 'TYPHOON STRIKES the {name}! Navies scattered.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'DOLDRUMS_CALM', name: 'Doldrums Calm',
    baseWeight: 15, cooldownDays: 90, lastFiredDay: -999,
    conditions: [
      { field: 'wind_regime', op: '==', value: 'DOLDRUMS', isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'current_velocity', op: 'multiply', value: 0.2 },
      { target: 'province', field: 'disease_reservoir', op: 'delta', value: 15 },
    ],
    chronicleTemplate: 'The winds die entirely in the {name}. Ships sit becalmed for weeks as disease festers in the stagnant heat.',
    alertTemplate: 'Doldrums trap fleets in the {name}.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'PIRATE_PROLIFERATION', name: 'Pirate Proliferation',
    baseWeight: 20, cooldownDays: 120, lastFiredDay: -999,
    conditions: [
      { field: 'pirate_concealment', op: '>', value: 70, isHardGate: true },
      { field: 'naval_hegemony', op: '<', value: 30, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'chokepoint_status', op: 'set', value: 'CONTESTED' },
      { target: 'province', field: 'ambient_unrest', op: 'delta', value: 20 },
    ],
    chronicleTemplate: 'With imperial navies absent, pirate kings have claimed the hidden coves of the {name}, exacting a heavy toll on all trade.',
    alertTemplate: 'Pirates infest the {name}. Trade disrupted.',
    alertSeverity: 'URGENT',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 RAINFOREST EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const RAINFOREST_EVENTS: EnvironmentEvent[] = [
  {
    id: 'TROPICAL_DELUGE', name: 'Tropical Deluge',
    baseWeight: 20, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'rain_phase', op: '==', value: 'MONSOON', isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'days_of_rain', op: 'delta', value: 30 },
      { target: 'self', field: 'river_meander', op: 'delta', value: 15 },
      { target: 'province', field: 'water_saturation', op: 'set', value: 100 },
      { target: 'province', field: 'accessibility', op: 'set', value: 5 }, // Impassable mud
    ],
    chronicleTemplate: 'Endless rains pound the {name}. The jungle trails dissolve into impassable mud swamps.',
    alertTemplate: 'Deluge in the {name}. Jungle impassable.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'RAPID_RECLAMATION', name: 'Rapid Reclamation',
    baseWeight: 15, cooldownDays: 90, lastFiredDay: -999,
    conditions: [
      { field: 'humidity_index', op: '>', value: 80, isHardGate: true },
      { field: 'clearcut_hectares', op: '>', value: 100, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'clearcut_hectares', op: 'multiply', value: 0.5 },
      { target: 'self', field: 'ruin_overgrowth', op: 'delta', value: 20 },
      { target: 'province', field: 'infrastructure_integrity', op: 'delta', value: -15 },
    ],
    chronicleTemplate: 'The voracious jungle of the {name} reclaims cleared land with terrifying speed, tearing down stone walls with thick vines.',
    alertTemplate: 'Jungle reclaiming settlements in the {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'PARASITE_OUTBREAK', name: 'Parasite Outbreak',
    baseWeight: 10, cooldownDays: 120, lastFiredDay: -999,
    conditions: [
      { field: 'parasite_load', op: '>', value: 70, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'parasite_load', op: 'delta', value: -20 },
      { target: 'province', field: 'disease_reservoir', op: 'delta', value: 40 },
      { target: 'province', field: 'disaster', op: 'set', value: 'PLAGUE' },
    ],
    chronicleTemplate: 'A gruesome parasite outbreak sweeps from the deep canopy of the {name}, afflicting armies and villagers alike.',
    alertTemplate: 'PARASITE OUTBREAK in the {name}! Armies suffering severe attrition.',
    alertSeverity: 'URGENT',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────
export class Tier3NetworkSystem {
  private engine: EnvironmentEventEngine;
  private eventPools: Record<string, EnvironmentEvent[]>;

  constructor(private gameLoop: GameLoop) {
    this.engine = new EnvironmentEventEngine(gameLoop.rng);
    
    this.eventPools = {
      CARAVAN_CORRIDOR: CARAVAN_EVENTS.map(e => ({ ...e })),
      ARCHIPELAGO: ARCHIPELAGO_EVENTS.map(e => ({ ...e })),
      RAINFOREST: RAINFOREST_EVENTS.map(e => ({ ...e }))
    };
  }

  tick() {
    const { currentDay, currentYear } = this.gameLoop.clock;
    const entities = this.gameLoop.environmentEntities || [];
    
    for (const entity of entities) {
      if (entity.tier !== 3) continue;

      const t3Entity = entity as EnvironmentEntity<Tier3State>;
      const { type, data } = t3Entity.state;
      const events = this.eventPools[type];

      if (!events) continue;

      const selectedEvent = this.engine.selectEvent(events, data, 3, currentDay);

      if (selectedEvent) {
        this.fireEvent(selectedEvent, t3Entity, currentDay, currentYear);
        selectedEvent.lastFiredDay = currentDay;
      }
      
      t3Entity.lastTickDay = currentDay;
    }
  }

  private fireEvent(
    event: EnvironmentEvent,
    entity: EnvironmentEntity<Tier3State>,
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
    province.fertility = Math.round(env.soil_vitality);
    province.roadQuality = Math.round(env.infrastructure_integrity);
    province.forestCoverage = Math.round(env.biomass_density * 0.8);
    province.floodRisk = env.water_saturation > 80 ? Math.round((env.water_saturation - 80) * 5) : 0;
    if (province.stockpiles) {
      province.stockpiles.food = Math.round(env.stored_calories);
      province.stockpiles.wood = Math.round(env.timber_reserves * 0.01);
    }
    if (env.disaster === 'FLOODED') province.currentWeather = 'FLOOD';
    if (env.disaster === 'BURNING') province.hasWildfire = true;
    if (env.disaster === 'NONE') {
      province.hasWildfire = false;
      if (province.currentWeather === 'FLOOD') province.currentWeather = 'CLEAR';
    }
  }
}
