/**
 * SettlementFactory.ts
 *
 * Generates settlements (castles, towns, monasteries) within provinces.
 */

import { RandomSeed } from '../engine/RandomSeed';
import { TerrainType } from '../../data/terrain-types';
import { nanoid } from 'nanoid';

export type SettlementType = 'CASTLE' | 'TOWN' | 'VILLAGE' | 'MONASTERY' | 'PORT';

export interface Settlement {
  id: string;
  name: string;
  type: SettlementType;
  population: number;
  fortificationLevel: number; // 0-10
  prosperity: number;         // 0-100
  garrisonSize: number;
  isCapital: boolean;
  builtYear: number;
}

export class SettlementFactory {
  constructor(private rng: RandomSeed) {}

  generateSettlementsForProvince(provinceName: string, terrain: TerrainType, isCapital: boolean, year: number): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Every province has at least a main village/town
    const mainType: SettlementType = isCapital ? 'TOWN' : 'VILLAGE';
    settlements.push({
      id: `settlement_${nanoid()}`,
      name: `${provinceName} ${mainType === 'TOWN' ? 'City' : 'Village'}`,
      type: mainType,
      population: isCapital ? 5000 : 800,
      fortificationLevel: isCapital ? 4 : 1,
      prosperity: isCapital ? 60 : 30,
      garrisonSize: isCapital ? 300 : 50,
      isCapital: true, // Capital of the province
      builtYear: year - Math.floor(this.rng.next() * 200)
    });

    // Generate a castle
    if (this.rng.next() > 0.4 || isCapital) {
      const castleNames = ['Keep', 'Hold', 'Fast', 'Castle', 'Tower'];
      const suffix = castleNames[Math.floor(this.rng.next() * castleNames.length)];
      settlements.push({
        id: `settlement_${nanoid()}`,
        name: `${provinceName} ${suffix}`,
        type: 'CASTLE',
        population: 200,
        fortificationLevel: Math.floor(this.rng.next() * 3) + 3, // 3-5
        prosperity: 20,
        garrisonSize: Math.floor(this.rng.next() * 200) + 100,
        isCapital: false,
        builtYear: year - Math.floor(this.rng.next() * 100)
      });
    }

    // Generate a monastery
    if (this.rng.next() > 0.7) {
      settlements.push({
        id: `settlement_${nanoid()}`,
        name: `St. ${['John', 'Peter', 'Michael', 'Mary', 'Anne'][Math.floor(this.rng.next() * 5)]}'s Abbey`,
        type: 'MONASTERY',
        population: Math.floor(this.rng.next() * 150) + 50,
        fortificationLevel: 2,
        prosperity: 40,
        garrisonSize: 0,
        isCapital: false,
        builtYear: year - Math.floor(this.rng.next() * 150)
      });
    }

    // Coastal provinces get a port
    if (terrain === 'COASTAL' && this.rng.next() > 0.2) {
      settlements.push({
        id: `settlement_${nanoid()}`,
        name: `Port ${provinceName}`,
        type: 'PORT',
        population: 1500,
        fortificationLevel: 2,
        prosperity: 70,
        garrisonSize: 100,
        isCapital: false,
        builtYear: year - Math.floor(this.rng.next() * 80)
      });
    }

    return settlements;
  }
}
