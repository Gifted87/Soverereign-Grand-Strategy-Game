import { TerrainType } from '../../data/terrain-types';

export interface TerrainDefinition {
  type: TerrainType;
  name: string;
  movementCost: number; // baseline movement points drained (higher is slower)
  speedAdjustment: string;
  defenseBonus: number; // percentage addition to defender effectiveness
  agricultureModifier: number; // multiplier for crop yields / food production
  cavalryModifier: number; // multiplier to cavalry troop effectiveness
  diseaseRiskModifier: number; // addition to daily disease outbreak probability (0.0 = none)
  specialRules: string[];
  description: string;
}

export const TERRAIN_DEFINITIONS: Record<TerrainType, TerrainDefinition> = {
  [TerrainType.PLAINS]: {
    type: TerrainType.PLAINS,
    name: 'Plains',
    movementCost: 15,
    speedAdjustment: 'Full speed',
    defenseBonus: 0,
    agricultureModifier: 1.2, // Excellent
    cavalryModifier: 1.5, // Cavalry charges maximally effective
    diseaseRiskModifier: 0,
    specialRules: ['Cavalry charges maximally effective (+50% combat boost)'],
    description: 'Flat, sweeping meadows and fields. Perfect for farming and devastating cavalry charges.'
  },
  [TerrainType.HILLS]: {
    type: TerrainType.HILLS,
    name: 'Rolling Hills',
    movementCost: 18, // ~15% slower
    speedAdjustment: '-15% speed',
    defenseBonus: 10, // +10%
    agricultureModifier: 1.1, // Good
    cavalryModifier: 0.9,
    diseaseRiskModifier: 0,
    specialRules: ['Elevated visibility bonus (+1 scout range)'],
    description: 'Undulating landscapes providing scouts with commanding views and defenders with high ground.'
  },
  [TerrainType.MOUNTAINS]: {
    type: TerrainType.MOUNTAINS,
    name: 'Mountains',
    movementCost: 30, // -50% speed
    speedAdjustment: '-50% speed (Blocked for wheeled units)',
    defenseBonus: 40, // +40%
    agricultureModifier: 0.5, // Poor
    cavalryModifier: 0.3, // Cavalry highly ineffective
    diseaseRiskModifier: 0,
    specialRules: ['Impassable in winter without mountain pass', 'Mining bonus (iron, stone, gold)'],
    description: 'Soaring rocky peaks. Treacherous to cross, virtually impregnable to assault, and rich in precious ores.'
  },
  [TerrainType.FOREST]: {
    type: TerrainType.FOREST,
    name: 'Forest',
    movementCost: 20,
    speedAdjustment: '-25% speed',
    defenseBonus: 15,
    agricultureModifier: 0.8,
    cavalryModifier: 0.6,
    diseaseRiskModifier: 0.02,
    specialRules: ['Ambush bonus for attacker', 'Lumber production'],
    description: 'Light woodland with moderate tree density, offering useful cover and valuable hunting grounds.'
  },
  [TerrainType.DEEP_FOREST]: {
    type: TerrainType.DEEP_FOREST,
    name: 'Deep Forest',
    movementCost: 25, // -30% speed
    speedAdjustment: '-30% speed',
    defenseBonus: 20, // +20%
    agricultureModifier: 0.4, // Poor (requires land clearing)
    cavalryModifier: 0.4,
    diseaseRiskModifier: 0.04,
    specialRules: [
      'Ambush bonus for attacker',
      'Lumber production',
      'Can be burned (Permanent conversion to cleared Plains)',
      'Regrows over ~20 years if not actively maintained'
    ],
    description: 'Primal, ancient hyper-dense woodland. Obstructs cavalry charges but yields immense timber supplies. Subject to deliberate burning.'
  },
  [TerrainType.WETLAND]: {
    type: TerrainType.WETLAND,
    name: 'Wetland / Marsh',
    movementCost: 38, // -60% speed
    speedAdjustment: '-60% speed (Cavalry unusable)',
    defenseBonus: 25, // +25%
    agricultureModifier: 0.1, // None for standard crops
    cavalryModifier: 0.1, // Near zero
    diseaseRiskModifier: 0.20, // Disease risk +20%
    specialRules: [
      'Cavalry charges completely negated',
      'Fish production, salt flats harvesting',
      'Disease risk +20%',
      'Siege engines cannot operate'
    ],
    description: 'Sinking, murky marshland. Swarms with pestilence, bogs down heavy armor, and renders horses useless.'
  },
  [TerrainType.COAST]: {
    type: TerrainType.COAST,
    name: 'Coastal Cliff',
    movementCost: 15,
    speedAdjustment: 'Full speed',
    defenseBonus: 50, // +50% if fortified
    agricultureModifier: 0.8,
    cavalryModifier: 1.0,
    diseaseRiskModifier: 0,
    specialRules: [
      'Cannot be flanked from sea',
      '+50% defender advantage if fortified',
      'Enables sea supply fleets',
      'Vulnerable to offshore naval bombardment'
    ],
    description: 'Steep elevations overlooking oceans. Secures flanks against land forces but remains vulnerable to warships.'
  },
  [TerrainType.DESERT]: {
    type: TerrainType.DESERT,
    name: 'Desert / Arid Steppe',
    movementCost: 15,
    speedAdjustment: 'Full speed (no vegetation, high heat risk)',
    defenseBonus: 5,
    agricultureModifier: 0.2, // Only near oasis
    cavalryModifier: 1.2,
    diseaseRiskModifier: 0.05,
    specialRules: [
      'Heat exhaustion penalty during midday',
      'Army attrition multiplier is 3x normal rate',
      'Water supply is a critical strategic resource'
    ],
    description: 'Blistering, waterless dunes and sun-scorched gravel flats. Travel is swift but extremely lethal due to dehydration.'
  },
  [TerrainType.TUNDRA]: {
    type: TerrainType.TUNDRA,
    name: 'Tundra / Permafrost',
    movementCost: 15, // full in summer, roads frozen in winter
    speedAdjustment: 'Full speed in summer, frozen road patterns in winter',
    defenseBonus: 10,
    agricultureModifier: 0.1, // None
    cavalryModifier: 0.8,
    diseaseRiskModifier: 0.02,
    specialRules: [
      'Cold exposure damage to unequipped troops (-10% troop counts in Winter)',
      'Reindeer herding yields basic food supply',
      'Severe frostbite mechanics apply in Winter'
    ],
    description: 'Desolate frozen mossy fields. Yields almost no crops but is rich in tough game animals and reindeer.'
  },
  [TerrainType.RIVER_VALLEY]: {
    type: TerrainType.RIVER_VALLEY,
    name: 'River Crossing / Ford',
    movementCost: 25, // -40% with ford, blocked without bridge
    speedAdjustment: '-40% via ford crossing. Blocked without bridge',
    defenseBonus: 60, // Massive defender advantage
    agricultureModifier: 1.4, // River silt provides excellent soil
    cavalryModifier: 0.5,
    diseaseRiskModifier: 0.03,
    specialRules: [
      'Massive (+60%) defender advantage at river crossings',
      'Freezes solid in deep Winter (enabling flat cavalry charges)',
      'Floods completely in Spring (impassable for 15-30 days)'
    ],
    description: 'Wide, raging fresh water streams offering bottleneck crossings. Subject to severe seasonal flow fluctuations.'
  }
};
