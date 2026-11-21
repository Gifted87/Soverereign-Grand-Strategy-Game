/**
 * Tier1ProvinceSystem.ts
 *
 * Simulates the Tier 1 Province / Local Hex state machine.
 * - 21-field state vector (12 continuous, 6 integer, 3 categorical)
 * - 14 environmental events with full trigger conditions and effects
 * - Continuous drift toward geographic baseline
 * - Sleep mode: distant/inactive hexes batch-process every 30 days
 * - Province.tier1Env sidecar; syncs back to Province fields for UI compatibility
 *
 * Tick Rate: every 5 game days
 * Reference: environment_simulation.md Section 4.1
 */

import type { GameLoop } from '../../engine/GameLoop';
import type { Province } from '../../models/Province';
import type { Tier1HexState, ProvinceBiome, DisasterState } from '../models/EnvironmentTypes';
import { EnvironmentEventEngine } from './EnvironmentEventEngine';
import { EnvironmentEvent } from '../models/EnvironmentTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Geographic baseline factory — driven by biome type
// ─────────────────────────────────────────────────────────────────────────────
export function createGeographicBaseline(biome: ProvinceBiome, fertility: number): Partial<Tier1HexState> {
  const baseByBiome: Record<ProvinceBiome, Partial<Tier1HexState>> = {
    PLAINS:      { soil_vitality: 65, biomass_density: 50, water_saturation: 50, carrying_capacity: 8000,  current_temperature: 16, accessibility: 80 },
    FOREST:      { soil_vitality: 55, biomass_density: 80, water_saturation: 60, carrying_capacity: 5000,  current_temperature: 12, accessibility: 60 },
    MOUNTAIN:    { soil_vitality: 20, biomass_density: 30, water_saturation: 40, carrying_capacity: 2000,  current_temperature: 4,  accessibility: 30 },
    DESERT:      { soil_vitality: 10, biomass_density: 8,  water_saturation: 5,  carrying_capacity: 500,   current_temperature: 38, accessibility: 50 },
    MARSH:       { soil_vitality: 45, biomass_density: 65, water_saturation: 95, carrying_capacity: 3000,  current_temperature: 18, accessibility: 20 },
    JUNGLE:      { soil_vitality: 60, biomass_density: 95, water_saturation: 90, carrying_capacity: 4000,  current_temperature: 28, accessibility: 25 },
    TAIGA:       { soil_vitality: 35, biomass_density: 55, water_saturation: 45, carrying_capacity: 1500,  current_temperature: 1,  accessibility: 45 },
    TUNDRA:      { soil_vitality: 15, biomass_density: 20, water_saturation: 30, carrying_capacity: 400,   current_temperature: -5, accessibility: 35 },
    COASTAL:     { soil_vitality: 50, biomass_density: 55, water_saturation: 70, carrying_capacity: 6000,  current_temperature: 18, accessibility: 75 },
    RIVER_DELTA: { soil_vitality: 90, biomass_density: 70, water_saturation: 85, carrying_capacity: 15000, current_temperature: 22, accessibility: 70 },
    VOLCANIC:    { soil_vitality: 40, biomass_density: 25, water_saturation: 30, carrying_capacity: 2000,  current_temperature: 28, accessibility: 20 },
    ALPINE:      { soil_vitality: 25, biomass_density: 35, water_saturation: 50, carrying_capacity: 1000,  current_temperature: 2,  accessibility: 25 },
    STEPPE:      { soil_vitality: 40, biomass_density: 30, water_saturation: 25, carrying_capacity: 3000,  current_temperature: 14, accessibility: 70 },
    SAVANNA:     { soil_vitality: 50, biomass_density: 45, water_saturation: 30, carrying_capacity: 4500,  current_temperature: 30, accessibility: 65 },
    BOREAL:      { soil_vitality: 30, biomass_density: 60, water_saturation: 55, carrying_capacity: 2000,  current_temperature: 0,  accessibility: 40 },
  };
  const base = { ...baseByBiome[biome] };
  // Scale carrying capacity by fertility
  if (base.carrying_capacity) {
    base.carrying_capacity = Math.round(base.carrying_capacity * (fertility / 100));
  }
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize a brand-new Tier1HexState sidecar for a province
// ─────────────────────────────────────────────────────────────────────────────
export function initTier1HexState(province: Province, currentDay: number): Tier1HexState {
  const biome = (province.biome || 'PLAINS') as ProvinceBiome;
  const baseline = createGeographicBaseline(biome, province.fertility ?? 60);

  return {
    soil_vitality:            baseline.soil_vitality  ?? 50,
    water_saturation:         baseline.water_saturation ?? 50,
    infrastructure_integrity: province.roadQuality ?? 50,
    disease_reservoir:        0,
    biomass_density:          baseline.biomass_density ?? 50,
    predator_threat:          biome === 'FOREST' || biome === 'JUNGLE' ? 20 : 5,
    ambient_unrest:           0,
    pollution_level:          0,
    defensibility:            province.fortificationLevel ? province.fortificationLevel * 12 : 20,
    accessibility:            baseline.accessibility ?? 60,
    snow_cover:               0,
    fire_risk:                biome === 'FOREST' ? 15 : biome === 'JUNGLE' ? 10 : 5,

    carrying_capacity:        baseline.carrying_capacity ?? 5000,
    current_temperature:      baseline.current_temperature ?? 15,
    mineral_reserves:         (province.resources || []).reduce((s, r) => s + (r.richness || 0), 0) * 1000,
    timber_reserves:          Math.round((baseline.biomass_density ?? 50) * 200),
    arable_land_area:         Math.round((province.fertility ?? 60) * 50),
    stored_calories:          province.stockpiles?.food ?? 5000,

    biome,
    season:    'SPRING',
    disaster:  'NONE',

    geographicBaseline: baseline,
    lastTickDay: currentDay,
    isSleeping:  false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 14 Tier 1 event definitions (Section 4.1)
// ─────────────────────────────────────────────────────────────────────────────
const TIER1_EVENTS: EnvironmentEvent[] = [
  {
    id: 'REGENERATE_FLORA', name: 'Flora Regeneration',
    baseWeight: 200, cooldownDays: 15, lastFiredDay: -999,
    conditions: [
      { field: 'water_saturation', op: '>', value: 30, isHardGate: false, multiplier: 3.0 },
      { field: 'biomass_density',  op: '<', value: 80, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'biomass_density', op: 'delta', value: 5 },
      { target: 'self', field: 'timber_reserves',  op: 'delta', value: 200 },
    ],
    chronicleTemplate: 'The forests of {name} recover quietly, new growth spreading through the undergrowth.',
    alertTemplate: 'Flora regenerating in {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'SOIL_DEPLETION', name: 'Soil Depletion',
    baseWeight: 5, cooldownDays: 30, lastFiredDay: -999,
    conditions: [
      { field: 'soil_vitality', op: '<', value: 30, isHardGate: false, multiplier: 4.0 },
      { field: 'carrying_capacity', op: '>', value: 2000, isHardGate: false, multiplier: 2.5 },
    ],
    effects: [
      { target: 'self', field: 'soil_vitality',    op: 'delta', value: -10 },
      { target: 'self', field: 'carrying_capacity', op: 'delta', value: -500 },
    ],
    chronicleTemplate: 'The overfarmed soils of {name} are failing. Crops wither and the land cannot feed its people.',
    alertTemplate: 'SOIL DEPLETION crisis in {name}! Carrying capacity dropping.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'LOCALIZED_FLOOD', name: 'Localized Flood',
    baseWeight: 10, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'water_saturation', op: '>', value: 80, isHardGate: true },
      { field: 'season', op: '==', value: 'SPRING', isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'infrastructure_integrity', op: 'delta', value: -30 },
      { target: 'self', field: 'soil_vitality',            op: 'delta', value: 15 },
      { target: 'self', field: 'disaster',                 op: 'set',   value: 'FLOODED' },
      { target: 'self', field: 'stored_calories',          op: 'delta', value: -2000 },
    ],
    chronicleTemplate: 'Floodwaters sweep through {name}, destroying roads but enriching the soil for next year\'s harvest.',
    alertTemplate: 'FLOOD sweeping through {name}! Infrastructure damaged.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'WILDFIRE', name: 'Wildfire',
    baseWeight: 2, cooldownDays: 90, lastFiredDay: -999,
    conditions: [
      { field: 'season', op: '==', value: 'SUMMER', isHardGate: true },
      { field: 'fire_risk', op: '>', value: 60, isHardGate: false, multiplier: 5.0 },
      { field: 'water_saturation', op: '<', value: 20, isHardGate: false, multiplier: 4.0 },
    ],
    effects: [
      { target: 'self', field: 'biomass_density', op: 'delta',  value: -40 },
      { target: 'self', field: 'timber_reserves', op: 'multiply', value: 0.1 },
      { target: 'self', field: 'disaster',        op: 'set',    value: 'BURNING' },
      { target: 'self', field: 'fire_risk',        op: 'set',    value: 0 },
      { target: 'province', field: 'hasWildfire',  op: 'set',    value: 1 },
    ],
    chronicleTemplate: 'A catastrophic wildfire has broken out across {name}, reducing ancient forests to ash.',
    alertTemplate: 'WILDFIRE in {name}! Timber and biomass destroyed.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'DISEASE_OUTBREAK', name: 'Disease Outbreak',
    baseWeight: 3, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'disease_reservoir', op: '>', value: 60, isHardGate: false, multiplier: 5.0 },
      { field: 'current_temperature', op: '>', value: 25, isHardGate: false, multiplier: 2.5 },
    ],
    effects: [
      { target: 'self',     field: 'disease_reservoir', op: 'delta', value: -20 },
      { target: 'province', field: 'quarantined',        op: 'set',   value: 1 },
    ],
    chronicleTemplate: 'A virulent plague erupts from the fetid swamps of {name}, spreading through the local population.',
    alertTemplate: 'DISEASE OUTBREAK in {name}! Quarantine recommended.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'INFRASTRUCTURE_COLLAPSE', name: 'Infrastructure Collapse',
    baseWeight: 4, cooldownDays: 45, lastFiredDay: -999,
    conditions: [
      { field: 'infrastructure_integrity', op: '<', value: 20, isHardGate: false, multiplier: 6.0 },
    ],
    effects: [
      { target: 'self', field: 'infrastructure_integrity', op: 'set',   value: 5 },
      { target: 'self', field: 'accessibility',            op: 'delta', value: -40 },
    ],
    chronicleTemplate: 'Roads and bridges in {name} collapse into ruin. The province is nearly impassable.',
    alertTemplate: 'Infrastructure COLLAPSED in {name}! Trade routes severed.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'PREDATOR_MIGRATION', name: 'Predator Migration',
    baseWeight: 8, cooldownDays: 30, lastFiredDay: -999,
    conditions: [
      { field: 'predator_threat', op: '>', value: 70, isHardGate: false, multiplier: 4.0 },
    ],
    effects: [
      { target: 'self',     field: 'predator_threat', op: 'delta', value: -25 },
      { target: 'adjacent', field: 'predator_threat', op: 'delta', value: 15 },
    ],
    chronicleTemplate: 'Wolves and predators are driven out of {name} by overcrowding, spilling into neighboring provinces.',
    alertTemplate: 'Predator migration from {name} to neighboring lands.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'RESOURCE_DISCOVERY', name: 'Resource Discovery',
    baseWeight: 0.5, cooldownDays: 365, lastFiredDay: -999,
    conditions: [],
    effects: [
      { target: 'self', field: 'mineral_reserves', op: 'delta', value: 50000 },
    ],
    chronicleTemplate: 'Prospectors in {name} uncover rich mineral veins hidden beneath the earth!',
    alertTemplate: 'RESOURCE DISCOVERY in {name}! New mineral deposits found.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'GROUNDWATER_DRYUP', name: 'Groundwater Dry-Up',
    baseWeight: 2, cooldownDays: 120, lastFiredDay: -999,
    conditions: [
      { field: 'water_saturation', op: '<', value: 5, isHardGate: true },
    ],
    effects: [
      { target: 'self',     field: 'carrying_capacity', op: 'delta', value: -3000 },
      { target: 'self',     field: 'disaster',          op: 'set',   value: 'DROUGHT' },
      { target: 'province', field: 'droughtDays',        op: 'delta', value: 20 },
    ],
    chronicleTemplate: 'The wells of {name} run dry as the water table fails. Famine stalks the peasantry.',
    alertTemplate: 'GROUNDWATER CRISIS in {name}! Famine imminent.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'BLIGHT', name: 'Crop Blight',
    baseWeight: 5, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'humidity_index', op: '>', value: 70, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'stored_calories', op: 'set', value: 0 },
      { target: 'self', field: 'soil_vitality',   op: 'delta', value: -5 },
    ],
    chronicleTemplate: 'A devastating blight sweeps the harvest in {name}. Grain stores are lost to rot and fungus.',
    alertTemplate: 'BLIGHT in {name}! Stored food supplies destroyed.',
    alertSeverity: 'CRITICAL',
  },
  {
    id: 'ECOLOGICAL_RECOVERY', name: 'Ecological Recovery',
    baseWeight: 50, cooldownDays: 60, lastFiredDay: -999,
    conditions: [
      { field: 'pollution_level', op: '<', value: 10, isHardGate: false, multiplier: 2.0 },
    ],
    effects: [
      { target: 'self', field: 'biomass_density', op: 'delta', value: 10 },
      { target: 'self', field: 'pollution_level',  op: 'delta', value: -5 },
      { target: 'self', field: 'ambient_unrest',   op: 'delta', value: -3 },
    ],
    chronicleTemplate: 'Nature slowly reclaims abandoned lands in {name}. Wild growth returns to the empty fields.',
    alertTemplate: 'Ecological recovery underway in {name}.',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'SEASONAL_SHIFT', name: 'Seasonal Shift',
    baseWeight: 500, cooldownDays: 0, lastFiredDay: -999,
    conditions: [],
    effects: [],
    chronicleTemplate: 'The seasons turn in {name}.',
    alertTemplate: '',
    alertSeverity: 'NORMAL',
  },
  {
    id: 'WINTER_FREEZE', name: 'Winter Freeze',
    baseWeight: 80, cooldownDays: 30, lastFiredDay: -999,
    conditions: [
      { field: 'season', op: '==', value: 'WINTER', isHardGate: true },
      { field: 'current_temperature', op: '<', value: 0, isHardGate: false, multiplier: 3.0 },
    ],
    effects: [
      { target: 'self', field: 'snow_cover',       op: 'delta', value: 30 },
      { target: 'self', field: 'water_saturation', op: 'delta', value: -20 },
      { target: 'self', field: 'accessibility',    op: 'delta', value: -30 },
      { target: 'self', field: 'stored_calories',  op: 'delta', value: -500 },
    ],
    chronicleTemplate: 'Bitter cold grips {name} as winter sets in. Rivers freeze and crops wither.',
    alertTemplate: 'WINTER FREEZE in {name}. Movement restricted.',
    alertSeverity: 'URGENT',
  },
  {
    id: 'THAW', name: 'Spring Thaw',
    baseWeight: 80, cooldownDays: 30, lastFiredDay: -999,
    conditions: [
      { field: 'season', op: '==', value: 'SPRING', isHardGate: true },
      { field: 'snow_cover', op: '>', value: 10, isHardGate: true },
    ],
    effects: [
      { target: 'self', field: 'snow_cover',       op: 'multiply', value: 0.2 },
      { target: 'self', field: 'water_saturation', op: 'delta',   value: 25 },
      { target: 'self', field: 'accessibility',    op: 'delta',   value: 20 },
    ],
    chronicleTemplate: 'The snows of {name} melt with the spring warmth, flooding low-lying fields.',
    alertTemplate: 'Spring thaw in {name}. Roads clearing.',
    alertSeverity: 'NORMAL',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main system class
// ─────────────────────────────────────────────────────────────────────────────

declare module '../../models/Province' {
  interface Province {
    tier1Env?: Tier1HexState;
  }
}

export class Tier1ProvinceSystem {
  private engine: EnvironmentEventEngine;

  // Per-province copies of event states (cooldown tracking)
  private eventStatesByProvince: Map<string, EnvironmentEvent[]> = new Map();

  constructor(private gameLoop: GameLoop) {
    this.engine = new EnvironmentEventEngine(gameLoop.rng);
  }

  /** Initialize all provinces with their T1 sidecar on first boot */
  initialize() {
    const day = this.gameLoop.clock.currentDay;
    for (const province of Object.values(this.gameLoop.provinces)) {
      if (!province.tier1Env) {
        province.tier1Env = initTier1HexState(province, day);
      }
      // Each province gets its own copy of event states (for cooldown tracking)
      if (!this.eventStatesByProvince.has(province.id)) {
        this.eventStatesByProvince.set(province.id, TIER1_EVENTS.map(e => ({ ...e })));
      }
    }
  }

  tick() {
    const { currentDay, currentYear, currentSeason } = this.gameLoop.clock;

    for (const province of Object.values(this.gameLoop.provinces)) {
      if (!province.tier1Env) {
        province.tier1Env = initTier1HexState(province, currentDay);
      }

      const env = province.tier1Env;
      const events = this.eventStatesByProvince.get(province.id) ?? TIER1_EVENTS.map(e => ({ ...e }));

      // ── Sleep mode: batch-process distant/inactive provinces ──
      const daysSinceLastTick = currentDay - env.lastTickDay;
      if (env.isSleeping && daysSinceLastTick < 30) continue;
      const tickMultiplier = env.isSleeping ? daysSinceLastTick : 1;

      env.lastTickDay = currentDay;

      // ── Update categorical season from world clock ──
      env.season = currentSeason as any;

      // ── Continuous drift toward geographic baseline ──
      this.applyDrift(env, tickMultiplier);

      // ── Select and fire an environmental event ──
      const stateForEngine: Record<string, any> = { ...env };
      const selectedEvent = this.engine.selectEvent(events, stateForEngine, 1, currentDay);

      if (selectedEvent) {
        this.fireEvent(selectedEvent, province, env, currentDay, currentYear);
        selectedEvent.lastFiredDay = currentDay;
      }

      // ── Sync back to Province fields for UI/NPC compatibility ──
      this.syncToProvince(province, env);
    }
  }

  /** Drift continuous states toward their geographic baselines */
  private applyDrift(env: Tier1HexState, multiplier: number = 1) {
    const bl = env.geographicBaseline;
    const driftRate = 0.5 * multiplier; // 0.5 per tick base

    if (bl.soil_vitality    !== undefined) env.soil_vitality    = lerp(env.soil_vitality, bl.soil_vitality, 0.02 * multiplier);
    if (bl.biomass_density  !== undefined) env.biomass_density  = lerp(env.biomass_density, bl.biomass_density, 0.015 * multiplier);
    if (bl.water_saturation !== undefined) env.water_saturation = lerp(env.water_saturation, bl.water_saturation, 0.03 * multiplier);
    if (bl.accessibility    !== undefined) env.accessibility    = lerp(env.accessibility, bl.accessibility, 0.02 * multiplier);

    // Natural decay rates
    env.disease_reservoir   = Math.max(0, env.disease_reservoir  - 0.3 * multiplier);
    env.ambient_unrest      = Math.max(0, env.ambient_unrest     - 0.1 * multiplier);
    env.pollution_level     = Math.max(0, env.pollution_level    - 0.05 * multiplier);
    env.predator_threat     = clamp(env.predator_threat, 0, 100);
    env.snow_cover          = Math.max(0, env.snow_cover - (env.season === 'SUMMER' ? 5 : 1) * multiplier);

    // Temperature drift via season
    const targetTemp = getSeasonalTemperature(env.biome, env.season);
    env.current_temperature = lerp(env.current_temperature, targetTemp, 0.05 * multiplier);

    // Fire risk: rises in summer drought, drops with rain
    const heatFactor = Math.max(0, env.current_temperature - 20) * 0.5;
    const waterFactor = (100 - env.water_saturation) * 0.3;
    const targetFireRisk = (heatFactor + waterFactor) * (env.biome === 'FOREST' ? 1.5 : 1.0);
    env.fire_risk = lerp(env.fire_risk, clamp(targetFireRisk, 0, 100), 0.1 * multiplier);

    // Clamp all continuous values
    env.soil_vitality             = clamp(env.soil_vitality, 0, 100);
    env.water_saturation          = clamp(env.water_saturation, 0, 100);
    env.infrastructure_integrity  = clamp(env.infrastructure_integrity, 0, 100);
    env.biomass_density           = clamp(env.biomass_density, 0, 100);
    env.defensibility             = clamp(env.defensibility, 0, 100);
    env.accessibility             = clamp(env.accessibility, 0, 100);
    env.fire_risk                 = clamp(env.fire_risk, 0, 100);
  }

  /** Apply event effects to the province and its env state */
  private fireEvent(
    event: EnvironmentEvent,
    province: Province,
    env: Tier1HexState,
    currentDay: number,
    currentYear: number
  ) {
    const envSystem = (this.gameLoop as any).environmentSystem;
    const feedbackMethod = 'applyEvent_' + event.id;
    if (envSystem && envSystem.feedback && typeof envSystem.feedback[feedbackMethod] === 'function') {
      envSystem.feedback[feedbackMethod](province.id);
    } else {
      for (const effect of event.effects) {
        if (effect.target === 'self') {
          applyEffect(env as any, effect.field, effect.op, effect.value);
        } else if (effect.target === 'province') {
          applyEffect(province as any, effect.field, effect.op, effect.value);
        }
      }
    }

    // Clamp disaster state
    if (!['NONE','FLOODED','BURNING','BLIZZARD','DROUGHT','EARTHQUAKE','PLAGUE','ASHFALL','TSUNAMI','LOCUST'].includes(env.disaster)) {
      env.disaster = 'NONE';
    }

    // Reset disaster after 30 days (handled via drift back to NONE next tick)
    if (env.disaster !== 'NONE') {
      setTimeout(() => { if (env.disaster !== 'NONE') env.disaster = 'NONE'; }, 0);
    }

    if (event.alertTemplate && event.alertSeverity !== 'NORMAL') {
      const msg = event.alertTemplate.replace('{name}', province.name);
      this.gameLoop.alertSystem.queueAlert(msg, event.alertSeverity as any);
    }

    if (event.chronicleTemplate && event.id !== 'SEASONAL_SHIFT') {
      const msg = event.chronicleTemplate.replace('{name}', province.name);
      this.gameLoop.chronicleSystem.add(currentYear, currentDay, msg, 'NORMAL');
    }
  }

  /** Sync env state back to Province fields that the existing UI reads */
  private syncToProvince(province: Province, env: Tier1HexState) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyEffect(target: Record<string, any>, field: string, op: string, value: any) {
  if (op === 'set')      target[field] = value;
  else if (op === 'delta')   target[field] = (target[field] ?? 0) + value;
  else if (op === 'multiply') target[field] = (target[field] ?? 0) * value;
}

function getSeasonalTemperature(biome: ProvinceBiome, season: string): number {
  const base: Record<ProvinceBiome, number> = {
    PLAINS: 15, FOREST: 12, MOUNTAIN: 4, DESERT: 38, MARSH: 18,
    JUNGLE: 28, TAIGA: 1, TUNDRA: -5, COASTAL: 18, RIVER_DELTA: 22,
    VOLCANIC: 28, ALPINE: 2, STEPPE: 14, SAVANNA: 30, BOREAL: 0,
  };
  const offsets: Record<string, number> = {
    SPRING: 0, SUMMER: 8, AUTUMN: -3, WINTER: -12, WET: 2, DRY: 5,
  };
  return (base[biome] ?? 15) + (offsets[season] ?? 0);
}
