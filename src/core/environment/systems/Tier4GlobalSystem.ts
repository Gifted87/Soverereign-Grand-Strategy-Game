/**
 * Tier4GlobalSystem.ts
 *
 * Simulates Tier 4 Global Macro-Systems: Climate Engine and Oceanic Conveyor.
 * - Tick Rate: every 90 game days (once per season)
 * - T4 events shift global baselines and affect all lower tiers.
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { EnvironmentEntity, Tier4State, EnvironmentEvent } from '../models/EnvironmentTypes';
import { EnvironmentEventEngine } from './EnvironmentEventEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4 CLIMATE ENGINE MACRO-EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const CLIMATE_EVENTS: EnvironmentEvent[] = [
  {
    id: 'ONSET_LITTLE_ICE_AGE', name: 'Onset of a Little Ice Age',
    baseWeight: 1, cooldownDays: 3650, lastFiredDay: -999,
    conditions: [
      { field: 'atmospheric_ash_load', op: '>', value: 70, isHardGate: false, multiplier: 5.0 },
      { field: 'solar_intensity', op: '<', value: 40, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'climate_epoch', op: 'set', value: 'COOLING' },
      { target: 'self', field: 'global_temperature_offset', op: 'delta', value: -3 },
      { target: 'self', field: 'polar_ice_extent', op: 'delta', value: 15 },
    ],
    chronicleTemplate: 'The sun dims across the world. Winters grow longer and the glaciers begin to advance. A Little Ice Age has begun.',
    alertTemplate: 'LITTLE ICE AGE begins. Global temperatures dropping.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'MEDIEVAL_WARM_PERIOD', name: 'Medieval Warm Period',
    baseWeight: 2, cooldownDays: 3650, lastFiredDay: -999,
    conditions: [
      { field: 'solar_intensity', op: '>', value: 70, isHardGate: false, multiplier: 3.0 },
      { field: 'global_carbon_sink', op: '<', value: 40, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'climate_epoch', op: 'set', value: 'WARMING_OPTIMUM' },
      { target: 'self', field: 'global_temperature_offset', op: 'delta', value: 2 },
      { target: 'self', field: 'sea_level_variance_cm', op: 'delta', value: 20 },
    ],
    chronicleTemplate: 'The world warms. Crop yields soar, but the rising seas threaten low-lying deltas.',
    alertTemplate: 'CLIMATE OPTIMUM begins. Global temperatures rising.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'GLOBAL_CIRCULATION_SHIFT', name: 'Global Circulation Shift',
    baseWeight: 5, cooldownDays: 1800, lastFiredDay: -999,
    conditions: [
      { field: 'jet_stream_stability', op: '<', value: 30, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'precipitation_regime', op: 'set', value: 'CHAOTIC' },
      { target: 'self', field: 'global_humidity', op: 'delta', value: 10 },
      { target: 'self', field: 'jet_stream_stability', op: 'delta', value: 30 },
    ],
    chronicleTemplate: 'The planetary winds have shifted unpredictably. Weather patterns descend into chaos.',
    alertTemplate: 'CIRCULATION SHIFT. Weather patterns becoming highly unpredictable.',
    alertSeverity: 'URGENT',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4 OCEANIC CONVEYOR EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const CONVEYOR_EVENTS: EnvironmentEvent[] = [
  {
    id: 'CONVEYOR_COLLAPSE', name: 'Conveyor Collapse',
    baseWeight: 0.5, cooldownDays: 7300, lastFiredDay: -999,
    conditions: [
      { field: 'salinity_differential', op: '<', value: 20, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'conveyor_status', op: 'set', value: 'COLLAPSED' },
      { target: 'self', field: 'current_velocity', op: 'multiply', value: 0.1 },
      { target: 'self', field: 'deep_water_upwelling', op: 'multiply', value: 0.1 },
    ],
    chronicleTemplate: 'The great oceanic conveyor has stalled. Heat no longer flows to the poles, and the deep ocean stagnates.',
    alertTemplate: 'OCEANIC CONVEYOR COLLAPSE! Marine ecosystems failing.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'UPWELLING_BOOM', name: 'Upwelling Boom',
    baseWeight: 5, cooldownDays: 1800, lastFiredDay: -999,
    conditions: [
      { field: 'deep_water_upwelling', op: '>', value: 60, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'nutrient_tons_delivered', op: 'delta', value: 50000 },
      { target: 'self', field: 'surface_temperature', op: 'delta', value: -5 },
    ],
    chronicleTemplate: 'Massive nutrient upwellings from the deep ocean feed an unprecedented bloom of marine life.',
    alertTemplate: 'Nutrient upwelling boom. Coastal fisheries thriving.',
    alertSeverity: 'NORMAL',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────
export class Tier4GlobalSystem {
  private engine: EnvironmentEventEngine;
  private eventPools: Record<string, EnvironmentEvent[]>;

  constructor(private gameLoop: GameLoop) {
    this.engine = new EnvironmentEventEngine(gameLoop.rng);
    
    this.eventPools = {
      CLIMATE_ENGINE: CLIMATE_EVENTS.map(e => ({ ...e })),
      OCEAN_CONVEYOR: CONVEYOR_EVENTS.map(e => ({ ...e }))
    };
  }

  tick() {
    const { currentDay, currentYear } = this.gameLoop.clock;
    const entities = this.gameLoop.environmentEntities || [];
    
    for (const entity of entities) {
      if (entity.tier !== 4) continue;

      const t4Entity = entity as EnvironmentEntity<Tier4State>;
      const { type, data } = t4Entity.state;
      const events = this.eventPools[type];

      if (!events) continue;

      const selectedEvent = this.engine.selectEvent(events, data, 4, currentDay);

      if (selectedEvent) {
        this.fireEvent(selectedEvent, t4Entity, currentDay, currentYear);
        selectedEvent.lastFiredDay = currentDay;
      }
      
      t4Entity.lastTickDay = currentDay;

      // Apply continuous drift for T4
      this.applyDrift(t4Entity.state);
    }
  }

  private applyDrift(state: Tier4State) {
    if (state.type === 'CLIMATE_ENGINE') {
      const data = state.data;
      // Ash load slowly settles
      data.atmospheric_ash_load = Math.max(0, data.atmospheric_ash_load - 1);
      
      // Solar intensity cycles slowly (e.g. 11 yr / 100 yr cycles, approximated here with a slow random walk)
      data.solar_intensity = Math.max(0, Math.min(100, data.solar_intensity + (Math.random() - 0.5)));
      
      data.years_since_climate_shift += 0.25; // 90 days = 0.25 years
    }
  }

  private fireEvent(
    event: EnvironmentEvent,
    entity: EnvironmentEntity<Tier4State>,
    currentDay: number,
    currentYear: number
  ) {
    const envSystem = (this.gameLoop as any).environmentSystem;
    const feedbackMethod = 'applyEvent_' + event.id;
    if (envSystem && envSystem.feedback && typeof envSystem.feedback[feedbackMethod] === 'function') {
      envSystem.feedback[feedbackMethod]();
    } else {
      for (const effect of event.effects) {
        if (effect.target === 'self') {
          this.applyEffect(entity.state.data, effect.field, effect.op, effect.value);
        }
      }
    }

    if (event.alertTemplate && event.alertSeverity !== 'NORMAL') {
      const msg = event.alertTemplate.replace('{name}', entity.name);
      this.gameLoop.alertSystem.queueAlert(msg, event.alertSeverity as any);
    }

    if (event.chronicleTemplate) {
      const msg = event.chronicleTemplate.replace('{name}', entity.name);
      this.gameLoop.chronicleSystem.add(currentYear, currentDay, msg, 'URGENT');
    }
  }

  private applyEffect(target: Record<string, any>, field: string, op: string, value: any) {
    if (op === 'set') target[field] = value;
    else if (op === 'delta') target[field] = (target[field] ?? 0) + value;
    else if (op === 'multiply') target[field] = (target[field] ?? 0) * value;
  }
}
