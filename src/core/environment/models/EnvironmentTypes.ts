/**
 * EnvironmentTypes.ts
 *
 * Complete type system for the Sovereign multi-layer stochastic environmental simulation.
 * Covers Tier 1 (Province/Hex), Tier 2 (Geographic Features), Tier 3 (Networks),
 * and Tier 4 (Continental/Global Macro-Systems).
 *
 * Reference: environment_simulation.md — Sections 2, 3, 4, 5
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CATEGORICAL ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'WET' | 'DRY';

export type ProvinceBiome =
  | 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'DESERT' | 'MARSH'
  | 'JUNGLE' | 'TAIGA' | 'TUNDRA' | 'COASTAL' | 'RIVER_DELTA'
  | 'VOLCANIC' | 'ALPINE' | 'STEPPE' | 'SAVANNA' | 'BOREAL';

export type DisasterState =
  | 'NONE' | 'FLOODED' | 'BURNING' | 'BLIZZARD' | 'DROUGHT'
  | 'EARTHQUAKE' | 'PLAGUE' | 'ASHFALL' | 'TSUNAMI' | 'LOCUST';

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — THE BASE PROVINCE / LOCAL HEX (Section 4.1)
// 12 continuous + 6 integer + 3 categorical = 21 total
// ─────────────────────────────────────────────────────────────────────────────

export interface Tier1HexState {
  // CONTINUOUS (drift toward geographicBaseline)
  soil_vitality: number;            // 0-100 Nutrient density
  water_saturation: number;         // 0-100 Local water table
  infrastructure_integrity: number; // 0-100 Roads, bridges, walls
  disease_reservoir: number;        // 0-100 Endemic pathogen load
  biomass_density: number;          // 0-100 Flora/fauna health
  predator_threat: number;          // 0-100 Wolves, bandits as natural hazards
  ambient_unrest: number;           // 0-100 Geographic danger / scarred land memory
  pollution_level: number;          // 0-100 Toxicity from mining, tanning, graves
  defensibility: number;            // 0-100 Natural tactical advantage
  accessibility: number;            // 0-100 Ease of army/merchant traversal
  snow_cover: number;               // 0-100 Winter accumulation, blocks movement
  fire_risk: number;                // 0-100 Combustibility; rises with heat + low water

  // INTEGER (hard physical limits)
  carrying_capacity: number;        // Max human population hex can locally feed
  current_temperature: number;      // Raw degrees Celsius
  mineral_reserves: number;         // Tons of extractable ore (depletes permanently)
  timber_reserves: number;          // Tons of harvestable wood (regenerates via biomass)
  arable_land_area: number;         // Hectares suitable for plowing
  stored_calories: number;          // Food in silos/granaries (vulnerable to rot/pests)

  // CATEGORICAL
  biome: ProvinceBiome;
  season: Season;
  disaster: DisasterState;

  // META (for LoD / sleep system)
  geographicBaseline: Partial<Pick<Tier1HexState,
    'soil_vitality' | 'biomass_density' | 'water_saturation' |
    'carrying_capacity' | 'current_temperature' | 'accessibility'
  >>;
  lastTickDay: number;
  isSleeping: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 — GEOGRAPHIC FEATURES (Sections 4.2, 4.3, 4.5)
// ─────────────────────────────────────────────────────────────────────────────

export type FlowState = 'SLUGGISH' | 'NORMAL' | 'RAPID' | 'TORRENTIAL' | 'FROZEN';
export type FloodCycle = 'PRE_FLOOD' | 'FLOODING' | 'RECEDING' | 'DROUGHT';
export type RiverEconomicStatus = 'OPEN' | 'BLOCKADED' | 'CONGESTED' | 'ABANDONED';

/** River Basin System — Thalmyr/Nythara model (Section 4.2) */
export interface Tier2RiverBasinState {
  water_volume: number;        // 0-100 Current flow intensity
  silt_load: number;           // 0-100 Suspended nutrients/mud; blocks ports
  navigability: number;        // 0-100 Deep-draft merchant ship viability
  ice_coverage: number;        // 0-100 Frozen surface area
  pollution_flow: number;      // 0-100 Toxins carried downstream
  fish_stocks: number;         // 0-100 Biological health
  bank_erosion: number;        // 0-100 Structural damage to river edges
  toll_friction: number;       // 0-100 Σ Derived from NPC castle chains
  flood_pressure: number;      // 0-100 Tension building for catastrophic breach
  delta_health: number;        // 0-100 Ecological stability of river mouth

  total_length: number;        // Kilometres of navigable waterway
  tributary_count: number;     // Number of feeding streams
  delta_depth: number;         // Depth of river mouth in metres
  bridges_spanning: number;    // Count of physical crossings (chokepoints)
  annual_cargo_tons: number;   // Σ Total wealth moved this year
  dredging_deficit: number;    // Labour required to clear silt

  flow_state: FlowState;
  flood_cycle: FloodCycle;
  economic_status: RiverEconomicStatus;
}

export type VolcanicStatus = 'DORMANT' | 'SMOKING' | 'RUMBLING' | 'ERUPTING';
export type WinterStatus = 'CLEAR' | 'SNOWBOUND' | 'IMPASSABLE';
export type SeismicPhase = 'QUIET' | 'SWARM' | 'AFTERSHOCK';

/** Volcanic Mountain Chain — Drakoria/Vareth model (Section 4.3) */
export interface Tier2VolcanicChainState {
  magma_chamber_pressure: number; // 0-100 Builds slowly; dictates eruption probability
  tectonic_stress: number;        // 0-100 Builds along fault lines
  snowpack_depth: number;         // 0-100 Feeds river basins in spring
  pass_accessibility: number;     // 0-100 How open physical crossings are
  mineral_exposure: number;       // 0-100 Valuable ores near surface
  slope_stability: number;        // 0-100 Resistance to landslides
  wind_shear: number;             // 0-100 Intensity of mountain weather
  isolation_factor: number;       // 0-100 Political power projection difficulty
  geothermal_activity: number;    // 0-100 Hot springs and vents
  alpine_biomass: number;         // 0-100 Health of high-altitude flora/fauna
  erosion_rate: number;           // 0-100 Weather breakdown of rock

  peak_elevation: number;         // Highest point in metres
  active_vents: number;           // Number of smoking craters
  known_passes: number;           // Number of viable routes through chain
  fortress_count: number;         // Σ NPC castles blocking passes
  trapped_carbon_tons: number;    // Deadly gases in crater lakes

  volcanic_status: VolcanicStatus;
  winter_status: WinterStatus;
  seismic_phase: SeismicPhase;
}

export type FjordSeasonState = 'MIDNIGHT_SUN' | 'POLAR_NIGHT' | 'THAW' | 'FREEZE';
export type IceStatus = 'OPEN_WATER' | 'SLUSH' | 'SOLID_ICE' | 'ICEBERGS';
export type MigrationPhase = 'INBOUND' | 'OUTBOUND' | 'ABSENT';

/** Subarctic Fjord & Taiga — Eryndor model (Section 4.5) */
export interface Tier2FjordState {
  permafrost_integrity: number;  // 0-100 Frozen ground stability
  fjord_depth: number;           // 0-100 Deep water for large ships
  pack_ice_density: number;      // 0-100 Blocks ocean navigation
  timber_maturity: number;       // 0-100 Age of forest; old-growth = rare ship masts
  peat_accumulation: number;     // 0-100 Burnable fuel; grows over centuries
  aurora_intensity: number;      // 0-100 NPC piety/mysticism impact
  wildlife_migration: number;    // 0-100 Reindeer, bears, whales
  glacier_advance: number;       // 0-100 Slow ice sheet movement
  winter_darkness: number;       // 0-100 Psychological weight of polar night
  frostbite_risk: number;        // 0-100 Lethality to unprepared NPCs

  months_below_zero: number;     // Determines length of survival season
  whale_pods: number;            // Count of high-value marine life
  amber_deposits: number;        // Precious coastal resource
  tar_kiln_capacity: number;     // Shipbuilding material infrastructure
  surviving_granaries: number;   // Food stores for winter survival

  season_state: FjordSeasonState;
  ice_status: IceStatus;
  migration_phase: MigrationPhase;
}

export type Tier2State =
  | { type: 'RIVER_BASIN'; data: Tier2RiverBasinState }
  | { type: 'VOLCANIC_CHAIN'; data: Tier2VolcanicChainState }
  | { type: 'FJORD_TAIGA'; data: Tier2FjordState };

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 — NETWORKS / CORRIDORS (Sections 4.4, 4.6, 4.7)
// ─────────────────────────────────────────────────────────────────────────────

export type CorridorStatus = 'OPEN' | 'DUST_STORM' | 'BURIED' | 'ABANDONED';
export type WaterQuality = 'SWEET' | 'BRACKISH' | 'POISONOUS' | 'DRY';
export type WindDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'STILL';

/** Arid Caravan Corridor & Oasis Network — Selkhar model (Section 4.4) */
export interface Tier3CaravanCorridorState {
  aquifer_level: number;         // 0-100 Underground water; recharges extremely slowly
  surface_water: number;         // 0-100 Visible oasis pools; evaporates rapidly
  dune_encroachment: number;     // 0-100 Movement of sand seas; threatens oases
  wind_scour: number;            // 0-100 Erosion and dust-storm intensity
  heat_intensity: number;        // 0-100 Daytime lethality
  night_freeze: number;          // 0-100 Nighttime lethality
  route_clarity: number;         // 0-100 Visibility of caravan trails
  forage_availability: number;   // 0-100 Sparse scrub for camels/goats
  salt_accumulation: number;     // 0-100 Soil toxicity near dead inland seas
  mirage_frequency: number;      // 0-100 Psychological hazard for NPCs
  bandit_concealment: number;    // 0-100 Geographic ambush potential
  nomad_pressure: number;        // 0-100 Σ Steppe lords seeking water

  days_between_water: number;    // Distance metric to next node
  palm_tree_count: number;       // Shade and date harvest
  buried_ruins_count: number;    // Undiscovered ancient sites
  active_caravans: number;       // Σ Trade units in transit
  camels_supported: number;      // Carrying capacity for pack animals

  corridor_status: CorridorStatus;
  water_quality: WaterQuality;
  prevailing_wind: WindDirection;
}

export type WindRegime = 'TRADE_WINDS' | 'DOLDRUMS' | 'MONSOON' | 'TYPHOON';
export type ChokepointStatus = 'OPEN' | 'TOLL_HEAVY' | 'BLOCKADED' | 'CONTESTED';
export type WaterDepth = 'SHALLOWS' | 'DROP_OFF' | 'TRENCH' | 'REEF_MAZE';

/** Maritime Archipelago & Oceanic Chokepoint — Azhurak model (Section 4.6) */
export interface Tier3ArchipelagoState {
  monsoon_strength: number;      // 0-100 Speed of sailing ships; trade seasons
  typhoon_probability: number;   // 0-100 Risk of catastrophic storms
  reef_hazard: number;           // 0-100 Danger of shipwreck
  current_velocity: number;      // 0-100 Passive speed boost/penalty to navigation
  pirate_concealment: number;    // 0-100 Hidden coves and mangrove mazes
  marine_biodiversity: number;   // 0-100 Pearl beds and coastal fisheries health
  strait_congestion: number;     // 0-100 Traffic at chokepoints
  tide_extremes: number;         // 0-100 High/low tide difference
  wind_reliability: number;      // 0-100 Consistency of trade winds
  salt_spray_decay: number;      // 0-100 Environmental damage to ships/ports
  underwater_volcanism: number;  // 0-100 Sea floor instability
  naval_hegemony: number;        // 0-100 Σ Single empire control of waters

  navigable_channels: number;    // Number of safe routes through islands
  shipwreck_count: number;       // Accumulated sunken vessels (scavengeable)
  island_count: number;          // Physical number of landmasses
  active_fleets: number;         // Σ NPC armadas/merchant convoys in network
  pearl_beds_active: number;     // Luxury goods harvest locations

  wind_regime: WindRegime;
  chokepoint_status: ChokepointStatus;
  water_depth: WaterDepth;
}

export type RainPhase = 'MONSOON' | 'DRY_SEASON' | 'FLOOD_SEASON';
export type CanopyStatus = 'INTACT' | 'FRAGMENTED' | 'BURNING';

/** Deep Tropical Rainforest — Worldroot/Emerald Rainforest (Section 4.7) */
export interface Tier3RainforestState {
  canopy_density: number;        // 0-100 Blocks sunlight; restricts movement
  humidity_index: number;        // 0-100 Rot, disease, metal degradation
  medicinal_yield: number;       // 0-100 Rare curative plants
  parasite_load: number;         // 0-100 Constant army attrition
  soil_leaching: number;         // 0-100 Rain washing nutrients when trees cleared
  exotic_timber: number;         // 0-100 Ebony/mahogany availability
  ruin_overgrowth: number;       // 0-100 Speed jungle reclaims settlements
  river_meander: number;         // 0-100 Jungle rivers shifting unpredictably
  ambient_toxicity: number;      // 0-100 Poisonous frogs, insects, flora
  biodiversity_index: number;    // 0-100 Overall jungle ecosystem health

  uncontacted_tribes: number;    // Isolated NPC groups in deep canopy
  clearcut_hectares: number;     // Slashed-and-burned by expanding empires
  days_of_rain: number;          // Consecutive precipitation days
  rare_animal_spawns: number;    // Exotic beasts sought by poachers
  navigable_creeks: number;      // Waterways usable only by canoes

  rain_phase: RainPhase;
  canopy_status: CanopyStatus;
}

export type Tier3State =
  | { type: 'CARAVAN_CORRIDOR'; data: Tier3CaravanCorridorState }
  | { type: 'ARCHIPELAGO'; data: Tier3ArchipelagoState }
  | { type: 'RAINFOREST'; data: Tier3RainforestState };

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4 — CONTINENTAL / GLOBAL MACRO-SYSTEMS (Section 5)
// ─────────────────────────────────────────────────────────────────────────────

export type ClimateEpoch = 'WARMING_OPTIMUM' | 'COOLING' | 'GLACIAL' | 'GREENHOUSE';
export type PrecipitationRegime = 'WET_CYCLE' | 'DRY_CYCLE' | 'CHAOTIC';

/** Global Climatological Engine (Section 5.1) */
export interface Tier4ClimateEngineState {
  global_temperature_offset: number; // -100 to +100 deviation from planetary norm
  atmospheric_ash_load: number;      // 0-100 spikes after cataclysmic eruptions
  solar_intensity: number;           // 0-100 millennial cyclical drift
  polar_ice_extent: number;          // 0-100 global sea level and albedo
  global_humidity: number;           // 0-100 monsoon and typhoon intensity
  jet_stream_stability: number;      // 0-100 when low → unpredictable weather

  years_since_climate_shift: number;
  sea_level_variance_cm: number;     // Changes coastlines; high = deletes low hexes
  global_carbon_sink: number;        // Planetary biomass trapping heat

  climate_epoch: ClimateEpoch;
  precipitation_regime: PrecipitationRegime;
}

export type ConveyorStatus = 'ACTIVE' | 'SLUGGISH' | 'COLLAPSED';

/** Oceanic Conveyor Belt (Section 5.2) */
export interface Tier4OceanConveyorState {
  current_velocity: number;          // 0-100 Heat transfer speed equator→poles
  salinity_differential: number;     // 0-100 Freshwater melt risk of stopping conveyor
  deep_water_upwelling: number;      // 0-100 Nutrients pulled from trench
  surface_temperature: number;       // 0-100 Drives hurricane/typhoon formation

  nutrient_tons_delivered: number;   // Feeds T2 maritime archipelagos
  heat_joules_transferred: number;   // Keeps northern continents from freezing

  conveyor_status: ConveyorStatus;
}

export type Tier4State =
  | { type: 'CLIMATE_ENGINE'; data: Tier4ClimateEngineState }
  | { type: 'OCEAN_CONVEYOR'; data: Tier4OceanConveyorState };

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC ENVIRONMENT ENTITY WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentTier = 1 | 2 | 3 | 4;

export interface EnvironmentEntity<T> {
  id: string;
  name: string;
  tier: EnvironmentTier;
  continent: string;
  /** Province IDs that fall within this entity's geographic bounding box */
  affectedProvinceIds: string[];
  state: T;
  lastTickDay: number;
  /** Tick interval in game days */
  tickRate: 5 | 15 | 30 | 90;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** A condition that must be met for an event to be eligible */
export interface EventTriggerCondition {
  /** State variable path e.g. 'flood_pressure' */
  field: string;
  /** Comparison operator */
  op: '>' | '<' | '>=' | '<=' | '==';
  value: number | string;
  /** If false, sets event weight to 0 (hard gate). If true, acts as multiplier. */
  isHardGate: boolean;
  /** Weight multiplier when condition is met (ignored if isHardGate=true) */
  multiplier?: number;
}

/** Side effects of an environment event firing */
export interface EventEffect {
  /** Target: 'self' = same entity, 'province' = T1 hex, 'npc' = NPC agent, 'tier4' = global */
  target: 'self' | 'province' | 'npc' | 'tier4' | 'adjacent';
  field: string;
  /** 'set' | 'delta' | 'multiply' */
  op: 'set' | 'delta' | 'multiply';
  value: number | string;
}

export interface EnvironmentEvent {
  id: string;
  name: string;
  /** Base probability weight under equilibrium conditions */
  baseWeight: number;
  conditions: EventTriggerCondition[];
  effects: EventEffect[];
  chronicleTemplate: string;
  alertTemplate: string;
  alertSeverity: 'NORMAL' | 'URGENT' | 'CRITICAL';
  /** Minimum game days between successive firings of this event */
  cooldownDays: number;
  lastFiredDay: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTOGRAPHIC MEMORY (Section 8.4)
// ─────────────────────────────────────────────────────────────────────────────

export interface CartographicMemory {
  provinceId: string;
  /** Game day when this province was last observed by a player/friendly NPC */
  lastObservedDay: number;
  /** Snapshot of key states at observation time */
  snapshot: Partial<Tier1HexState>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER LENS TYPES (Section 11.2)
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentLens =
  | 'NONE'
  | 'MARSHAL'      // defensibility, accessibility, pass_accessibility
  | 'TREASURER'    // arable_land_area, mineral_reserves, toll_friction
  | 'PRIEST'       // ambient_unrest, disease_reservoir, mysticism
  | 'SPYMASTER';   // cartographic age / information freshness

// ─────────────────────────────────────────────────────────────────────────────
// RUMOR SYSTEM (Section 11.3)
// ─────────────────────────────────────────────────────────────────────────────

export type RumorStatus = 'ATMOSPHERIC' | 'HEARSAY' | 'CONFIRMED';

export interface EnvironmentRumor {
  id: string;
  entityId: string;
  eventId: string;
  eventName: string;
  continent: string;
  status: RumorStatus;
  createdDay: number;
  confirmedDay: number | null;
  /** Atmospheric hint text (vague sensory) */
  atmosphericText: string;
  /** Merchant rumor text (Day 15 hearsay) */
  hearsayText: string;
  /** Spymaster confirmed text (Day 30 fact) */
  confirmedText: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER INTERVENTION TYPES (Section 11.4)
// ─────────────────────────────────────────────────────────────────────────────

export type PlayerIntervention =
  | 'DREDGE_DELTA'           // Costs gold; reduces silt_load
  | 'ORDER_FALLOW_YEAR'      // Halts farming; restores soil_vitality
  | 'AUTHORIZE_CLEAR_CUT'    // Gains timber; destroys biomass + slope_stability
  | 'CONSTRUCT_LEVEE'        // Costs gold; reduces flood_pressure
  | 'QUARANTINE_PROVINCE'    // Reduces disease_reservoir spread
  | 'CONSECRATE_LAND';       // Cleric action; reduces ambient_unrest

export interface InterventionRequest {
  type: PlayerIntervention;
  provinceId: string;
  /** Additional target (e.g., T2 river entity id) */
  targetEntityId?: string;
}
