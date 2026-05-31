import { StateCreator } from 'zustand';
import { Army } from '../../types';

export interface MilitarySlice {
  armies: Record<string, Army>;
}

export const createMilitarySlice: StateCreator<MilitarySlice> = () => ({
  armies: {
    'army_1': { 
      id: 'army_1', 
      name: 'Riverlands Vanguard', 
      realmId: 'realm_1',
      commanderId: 'player',
      officerIds: [],
      units: [],
      location: { q: 0, r: 0, s: 0 },
      destination: null,
      path: [],
      movementPoints: 50,
      supplyLevel: 90, 
      supplyConvoyId: null,
      morale: 85, 
      discipline: 80,
      experience: 20,
      stance: 'DEFEND', 
      orders: [],
      pendingOrders: [],
      isExhausted: false,
      frostbiteRisk: 0,
      diseases: [],
      deserterRate: 0,
      loot: 0,
      attritionDays: 0
    },
    'army_2': { 
      id: 'army_2', 
      name: 'Valerian Host', 
      realmId: 'enemy',
      commanderId: 'enemy_lord',
      officerIds: [],
      units: [],
      location: { q: 0, r: 1, s: -1 },
      destination: null,
      path: [],
      movementPoints: 50,
      supplyLevel: 40,
      supplyConvoyId: null,
      morale: 95, 
      discipline: 90,
      experience: 50,
      stance: 'BESIEGE', 
      orders: [],
      pendingOrders: [],
      isExhausted: false,
      frostbiteRisk: 0,
      diseases: [],
      deserterRate: 0,
      loot: 500,
      attritionDays: 0
    },
  },
});
