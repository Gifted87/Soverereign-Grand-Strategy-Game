import { nanoid } from 'nanoid';
import { Army } from '../models/Army';

export class ArmyFactory {
  static create(overrides: Partial<Army> = {}): Army {
    return {
      id: nanoid(),
      name: 'Levy',
      realmId: 'none',
      commanderId: 'none',
      officerIds: [],
      units: [],
      location: { q: 0, r: 0, s: 0 },
      destination: null,
      path: [],
      movementPoints: 0,
      supplyLevel: 100,
      supplyConvoyId: null,
      morale: 100,
      discipline: 50,
      experience: 0,
      stance: 'DEFEND',
      orders: [],
      pendingOrders: [],
      isExhausted: false,
      frostbiteRisk: 0,
      diseases: [],
      deserterRate: 0,
      loot: 0,
      attritionDays: 0,
      ...overrides
    };
  }
}

