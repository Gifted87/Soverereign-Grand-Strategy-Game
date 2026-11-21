/**
 * historical-eras.ts
 *
 * Eras define the technological and institutional backdrop of the game.
 * Used for game setup, tech tree gates, and dynamic events.
 */

import { Era } from '../types';

export interface EraDefinition {
  id: Era;
  name: string;
  description: string;
  startYear: number;
  endYear: number;
  /** Technologies automatically unlocked when entering this era */
  baseTechs: string[];
  /** Building types unlocked in this era */
  availableBuildings: string[];
  /** Modifiers applied universally while in this era */
  globalModifiers: {
    baseTaxEfficiency: number;
    baseLevySize: number;
    innovationRate: number;
    tradeVolume: number;
  };
}

export const ERAS: Record<Era, EraDefinition> = {
  DARK_AGES: {
    id: 'DARK_AGES',
    name: 'The Dark Ages',
    description: 'A time of fractured realms, wandering tribes, and lost knowledge. Warlords rule from wooden palisades, and the old Roman roads decay.',
    startYear: 400,
    endYear: 900,
    baseTechs: ['basic_agriculture', 'wooden_fortifications', 'tribal_levies'],
    availableBuildings: ['palisade', 'village_market', 'shrine'],
    globalModifiers: {
      baseTaxEfficiency: 0.5,
      baseLevySize: 0.8,
      innovationRate: 0.5,
      tradeVolume: 0.4,
    },
  },
  FEUDAL: {
    id: 'FEUDAL',
    name: 'The Feudal Age',
    description: 'The rise of the heavily armoured knight and the stone keep. Power is decentralised among landed nobility bound by oaths of fealty.',
    startYear: 900,
    endYear: 1200,
    baseTechs: ['feudal_contract', 'heavy_cavalry', 'stone_keeps', 'crop_rotation'],
    availableBuildings: ['stone_castle', 'blacksmith', 'abbey', 'town_market'],
    globalModifiers: {
      baseTaxEfficiency: 0.7,
      baseLevySize: 1.0,
      innovationRate: 0.8,
      tradeVolume: 0.8,
    },
  },
  HIGH_MEDIEVAL: {
    id: 'HIGH_MEDIEVAL',
    name: 'The High Middle Ages',
    description: 'A period of population boom, crusades, and the flourishing of trade and scholasticism. Cities grow powerful and guilds begin to assert control.',
    startYear: 1200,
    endYear: 1350,
    baseTechs: ['scholasticism', 'guild_system', 'plate_armor', 'crossbows', 'cathedrals'],
    availableBuildings: ['cathedral', 'guildhall', 'university', 'citadel', 'port'],
    globalModifiers: {
      baseTaxEfficiency: 0.9,
      baseLevySize: 1.2,
      innovationRate: 1.2,
      tradeVolume: 1.5,
    },
  },
  LATE_MEDIEVAL: {
    id: 'LATE_MEDIEVAL',
    name: 'The Late Middle Ages',
    description: 'The twilight of chivalry. The advent of gunpowder and professional standing armies begins the centralisation of state power.',
    startYear: 1350,
    endYear: 1500,
    baseTechs: ['gunpowder', 'professional_armies', 'printing_press', 'ocean_navigation'],
    availableBuildings: ['star_fort', 'arsenal', 'printing_house', 'shipyard', 'bank'],
    globalModifiers: {
      baseTaxEfficiency: 1.2,
      baseLevySize: 1.5,
      innovationRate: 1.5,
      tradeVolume: 2.0,
    },
  },
};

/** Get the current era based on the given year. */
export function getEraForYear(year: number): EraDefinition {
  if (year < 900) return ERAS.DARK_AGES;
  if (year < 1200) return ERAS.FEUDAL;
  if (year < 1350) return ERAS.HIGH_MEDIEVAL;
  return ERAS.LATE_MEDIEVAL;
}
