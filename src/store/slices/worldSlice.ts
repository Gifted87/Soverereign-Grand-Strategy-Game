import { StateCreator } from 'zustand';
import { Province, Season, Era } from '../../types';

// Coordinate generator function to lay out hex clusters in spiral rings
function getDynamicCoords(centerQ: number, centerR: number, count: number, existingCoords: { q: number, r: number }[] = []): { q: number, r: number, s: number }[] {
  const coordsList: { q: number, r: number, s: number }[] = [];
  
  existingCoords.forEach(c => {
    coordsList.push({ q: c.q, r: c.r, s: -c.q - c.r });
  });

  let ring = 0;
  while (coordsList.length < count) {
    if (ring === 0) {
      const exists = coordsList.some(c => c.q === centerQ && c.r === centerR);
      if (!exists) {
        coordsList.push({ q: centerQ, r: centerR, s: -centerQ - centerR });
      }
    } else {
      for (let dq = -ring; dq <= ring; dq++) {
        for (let dr = -ring; dr <= ring; dr++) {
          const ds = -dq - dr;
          if (Math.abs(dq) + Math.abs(dr) + Math.abs(ds) === ring * 2) {
            const q = centerQ + dq;
            const r = centerR + dr;
            const s = ds;
            const exists = coordsList.some(c => c.q === q && c.r === r);
            if (!exists) {
              coordsList.push({ q, r, s: -q - r });
              if (coordsList.length >= count) return coordsList;
            }
          }
        }
      }
    }
    ring++;
  }
  return coordsList;
}

// Function to determine physical parameters based on the kingdom's name
function getTerrainAndBio(name: string, type: string): { terrain: string, biome: string, elevation: number, fertility: number } {
  const n = name.toLowerCase();
  let terrain = 'PLAINS';
  let biome = 'TEMPERATE';
  let elevation = 120;
  let fertility = 80;

  if (n.includes('peak') || n.includes('mountain') || n.includes('ridge') || n.includes('skywall') || n.includes('caldera')) {
    terrain = 'MOUNTAINS';
    elevation = 1200;
    fertility = 20;
    biome = n.includes('frozen') || n.includes('boreas') ? 'BOREAL' : 'ALPINE';
  } else if (n.includes('hills') || n.includes('pass') || n.includes('cliff') || n.includes('highlands')) {
    terrain = 'HILLS';
    elevation = 450;
    fertility = 50;
    biome = 'STEPPE';
  } else if (n.includes('river') || n.includes('basin') || n.includes('valley') || n.includes('crossing') || n.includes('delta')) {
    terrain = 'RIVER_VALLEY';
    elevation = 40;
    fertility = 100;
  } else if (n.includes('coast') || n.includes('port') || n.includes('sea') || n.includes('harbor') || n.includes('shore')) {
    terrain = 'COAST';
    elevation = 10;
    fertility = 75;
    biome = 'MARITIME_WARM';
  } else if (n.includes('forest') || n.includes('wood') || n.includes('moss') || n.includes('rainforest')) {
    terrain = 'FOREST';
    elevation = 180;
    fertility = 85;
    biome = n.includes('rainforest') || n.includes('swallowing') ? 'SUBTROPICAL_WET' : 'TEMPERATE';
  } else if (n.includes('steppe') || n.includes('nomad') || n.includes('horse') || n.includes('clay')) {
    terrain = 'PLAINS';
    elevation = 200;
    fertility = 40;
    biome = 'STEPPE';
  } else if (n.includes('tundra') || n.includes('frozen') || n.includes('ice') || n.includes('blanket')) {
    terrain = 'PLAINS';
    elevation = 150;
    fertility = 15;
    biome = 'TUNDRA';
  }

  // Override specific major cities for starting flavor consistency
  if (name === 'Kingdom of Valedor') {
    terrain = 'RIVER_VALLEY';
    biome = 'TEMPERATE';
    elevation = 45;
    fertility = 95;
  } else if (name === 'Maritime Senate of Sarn') {
    terrain = 'COAST';
    biome = 'MEDITERRANEAN';
    elevation = 12;
    fertility = 70;
  }

  return { terrain, biome, elevation, fertility };
}

// Aurelia: 37 historic sovereign realms
const AURELIA_REALMS = [
  { name: 'Kingdom of Valedor', emblem: '🦁', type: 'KINGDOM' },
  { name: 'Kingdom of Solmere', emblem: '🦅', type: 'KINGDOM' },
  { name: 'Kingdom of Orun', emblem: '🦖', type: 'KINGDOM' },
  { name: 'Kingdom of Asteria', emblem: '🌟', type: 'KINGDOM' },
  { name: 'Kingdom of Eldoria', emblem: '🌲', type: 'KINGDOM' },
  { name: 'Kingdom of Lumeria', emblem: '☀️', type: 'KINGDOM' },
  { name: 'Kingdom of Boreas', emblem: '❄️', type: 'KINGDOM' },
  { name: 'Kingdom of Mercia', emblem: '🦌', type: 'KINGDOM' },
  { name: 'Kingdom of Westvalia', emblem: '⚓', type: 'KINGDOM' },
  { name: 'Duchy of Westmarch', emblem: '⚔️', type: 'DUCHY' },
  { name: 'Duchy of Eastfold', emblem: '🛡️', type: 'DUCHY' },
  { name: 'Duchy of Southshire', emblem: '🌹', type: 'DUCHY' },
  { name: 'Duchy of Northpeak', emblem: '🏔️', type: 'DUCHY' },
  { name: 'Duchy of Glenwood', emblem: '🐗', type: 'DUCHY' },
  { name: 'Duchy of Riverrun', emblem: '🐟', type: 'DUCHY' },
  { name: 'City of Oakhaven', emblem: '🌳', type: 'CITY_STATE' },
  { name: 'City of Stoneport', emblem: '⚓', type: 'CITY_STATE' },
  { name: 'City of Ironford', emblem: '⚒️', type: 'CITY_STATE' },
  { name: 'City of Highcliff', emblem: '🦅', type: 'CITY_STATE' },
  { name: 'City of Rivermouth', emblem: '🌊', type: 'CITY_STATE' },
  { name: 'City of Goldcrest', emblem: '💰', type: 'CITY_STATE' },
  { name: 'City of Crownshield', emblem: '🛡️', type: 'CITY_STATE' },
  { name: 'City of Blackthorn', emblem: '🍇', type: 'CITY_STATE' },
  { name: 'City of Deepwell', emblem: '🔮', type: 'CITY_STATE' },
  { name: 'City of Windshear', emblem: '🌀', type: 'CITY_STATE' },
  { name: 'City of Kingscrossing', emblem: '👑', type: 'CITY_STATE' },
  { name: 'Salt-Steppe Horse-Clans', emblem: '🐎', type: 'TRIBAL_CONFEDERATION' },
  { name: 'Tundra Wolf Confederations', emblem: '🐺', type: 'TRIBAL_CONFEDERATION' },
  { name: 'Iron Hills Coal Clans', emblem: '⚒️', type: 'TRIBAL_CONFEDERATION' },
  { name: 'Swallowing Moss Mud-Clans', emblem: '🌿', type: 'TRIBAL_CONFEDERATION' },
  { name: 'Jagged Peak Cave-Clans', emblem: '🐻', type: 'TRIBAL_CONFEDERATION' },
  { name: 'Holy Cathedral Patriarchate', emblem: '⛪', type: 'THEOCRATIC_DOMAIN' },
  { name: 'Sovereign Solar Monastic estates', emblem: '☀️', type: 'THEOCRATIC_DOMAIN' },
  { name: 'Shrines of Northern Tundra', emblem: '🕯️', type: 'THEOCRATIC_DOMAIN' },
  { name: 'Maritime Senate of Sarn', emblem: '⛵', type: 'REPUBLIC' },
  { name: 'Free Canton of High-Hills', emblem: '⚖️', type: 'REPUBLIC' },
  { name: 'Sovereign Imperium of Rhakar', emblem: '🐲', type: 'EMPIRE_IN_DECLINE' }
];

// Vareth: 12 dynamic realms
const VARETH_REALMS = [
  { name: 'Kingdom of Solmere', emblem: '🦅', type: 'KINGDOM', pop: 23000000 },
  { name: 'Empire of Rhakar', emblem: '🐲', type: 'EMPIRE_IN_DECLINE', pop: 28000000 },
  { name: 'Merchant League of Kareth', emblem: '⛵', type: 'REPUBLIC', pop: 22000000 },
  { name: 'Steppe Confederation of Ulan', emblem: '🐎', type: 'TRIBAL_CONFEDERATION', pop: 11000000 },
  { name: 'Skywall Passes', emblem: '🏔️', type: 'DUCHY', pop: 3000000 },
  { name: 'Mirror Sea Coast', emblem: '🌊', type: 'REPUBLIC', pop: 6000000 },
  { name: 'Endless Steppes', emblem: '🐎', type: 'TRIBAL_CONFEDERATION', pop: 7000000 },
  { name: 'Eastfold Conifer Ridges', emblem: '🌲', type: 'DUCHY', pop: 4000000 },
  { name: 'Blackwood Conifer Taiga', emblem: '🌳', type: 'DUCHY', pop: 3500000 },
  { name: 'Silver-Vein Skywall Crags', emblem: '⚒️', type: 'CITY_STATE', pop: 2500000 },
  { name: 'South-Cape Vineyards', emblem: '🍇', type: 'CITY_STATE', pop: 5000000 },
  { name: 'Southwestern Salt Flats', emblem: '🏜️', type: 'TRIBAL_CONFEDERATION', pop: 5000000 }
];

// Nythara: 12 dynamic realms
const NYTHARA_REALMS = [
  { name: 'Maritime Republic of Talassar', emblem: '⛵', type: 'REPUBLIC', pop: 15000000 },
  { name: 'Kingdom of Orun', emblem: '👑', type: 'KINGDOM', pop: 35000000 },
  { name: 'Island Compact Coalition', emblem: '🏴‍☠️', type: 'REPUBLIC', pop: 18000000 },
  { name: 'Rainforest Realms Alliance', emblem: '🌿', type: 'TRIBAL_CONFEDERATION', pop: 15000000 },
  { name: 'Twin Plateaus Highlands', emblem: '⛏️', type: 'REPUBLIC', pop: 14000000 },
  { name: 'Sapphire Coast Shipyards', emblem: '⚓', type: 'CITY_STATE', pop: 8000000 },
  { name: 'Gloomwood Rainforest Fief', emblem: '🌲', type: 'DUCHY', pop: 9000000 },
  { name: 'Central Silt Valley Margins', emblem: '🌾', type: 'KINGDOM', pop: 12000000 },
  { name: 'Northern Shrines Block', emblem: '⛪', type: 'THEOCRATIC_DOMAIN', pop: 8000000 },
  { name: 'Wyvern Peak Sanctuary', emblem: '🏔️', type: 'THEOCRATIC_DOMAIN', pop: 10000000 },
  { name: 'Southern Caldera Volcano', emblem: '🌋', type: 'CITY_STATE', pop: 6000000 },
  { name: 'West-Pass Rainforest Fortress', emblem: '⚔️', type: 'DUCHY', pop: 10000000 }
];

const INITIAL_PROVINCES: Record<string, Province> = {};

// 1. Generate Aurelia
const aureliaCoords = getDynamicCoords(0, 0, 37, [
  { q: 0, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 }
]);

AURELIA_REALMS.forEach((realm, idx) => {
  const pId = `prov_${idx + 1}`;
  const coords = aureliaCoords[idx];
  const isPlayerStart = idx === 0; // prov_1
  const ownerId = isPlayerStart ? 'player' : `lord_ent_${idx + 1}`;
  const realmId = isPlayerStart ? 'realm_1' : `realm_ent_${idx + 1}`;
  const { terrain, biome, elevation, fertility } = getTerrainAndBio(realm.name, realm.type);

  // Aurelia total targets 140,000,000 across 37 realms
  let targetPop = 2500000;
  if (realm.type === 'KINGDOM') targetPop = 5500000;
  else if (realm.type === 'DUCHY') targetPop = 3500000;
  else if (realm.type === 'REPUBLIC') targetPop = 6000000;
  else if (realm.type === 'CITY_STATE') targetPop = 2000000;
  else if (realm.type === 'EMPIRE_IN_DECLINE') targetPop = 15500000;

  const serfs = Math.floor(targetPop * 0.85);
  const merchants = Math.floor(targetPop * 0.10);
  const clergy = Math.floor(targetPop * 0.03);
  const nobles = Math.floor(targetPop * 0.02);

  INITIAL_PROVINCES[pId] = {
    id: pId,
    name: realm.name,
    ownerId: ownerId,
    realmId: realmId,
    continent: 'Aurelia',
    coords: coords,
    terrain: terrain,
    biome: biome,
    elevation: elevation,
    fertility: fertility,
    settlements: [],
    currentWeather: 'CLEAR',
    floodRisk: 0,
    forestCoverage: terrain === 'DEEP_FOREST' ? 100 : (terrain === 'FOREST' ? 60 : 10),
    roadQuality: 50,
    loyalty: 100,
    grievances: [],
    population: { total: targetPop, serfs, clergy, nobles, merchants, health: 100, mood: 'CONTENT' },
    disease: null,
    fortificationLevel: 1,
    isBlockaded: false,
    isBesieged: false,
    siegeProgress: null,
    controlledBy: ownerId,
    salted: false,
    ruined: false,
    lastRaided: null,
    buildings: [],
    constructionQueue: [],

    stability: idx === 0 ? 92 : 85,
    treasury: idx === 0 ? 1800 : 1200,
    militaryPower: idx === 0 ? 8600 : 1200,
    vassalCount: realm.type === 'KINGDOM' ? 2 : (realm.type === 'DUCHY' ? 1 : 0),
    emblem: realm.emblem,
    allianceId: null,
    type: realm.type as any
  } as any;
});

// 2. Generate Vareth
const varethCoords = getDynamicCoords(8, -8, 12);
VARETH_REALMS.forEach((realm, idx) => {
  const pId = `prov_v${idx + 1}`;
  const coords = varethCoords[idx];
  const ownerId = `lord_v_${idx + 1}`;
  const realmId = `realm_v_${idx + 1}`;
  const { terrain, biome, elevation, fertility } = getTerrainAndBio(realm.name, realm.type);

  // Vareth total: exactly 120,000,000 across 12 realms.
  // 18% Urbanization rate (82% serfs, 14% merchants, 3% clergy, 1% nobles)
  const targetPop = realm.pop;
  const serfs = Math.floor(targetPop * 0.82);
  const merchants = Math.floor(targetPop * 0.14);
  const clergy = Math.floor(targetPop * 0.03);
  const nobles = Math.floor(targetPop * 0.01);

  INITIAL_PROVINCES[pId] = {
    id: pId,
    name: realm.name,
    ownerId: ownerId,
    realmId: realmId,
    continent: 'Vareth',
    coords: coords,
    terrain: terrain,
    biome: biome,
    elevation: elevation,
    fertility: fertility,
    settlements: [],
    currentWeather: 'CLEAR',
    floodRisk: 0,
    forestCoverage: terrain === 'DEEP_FOREST' ? 100 : (terrain === 'FOREST' ? 60 : 10),
    roadQuality: 50,
    loyalty: 100,
    grievances: [],
    population: { total: targetPop, serfs, clergy, nobles, merchants, health: 100, mood: 'CONTENT' },
    disease: null,
    fortificationLevel: 1,
    isBlockaded: false,
    isBesieged: false,
    siegeProgress: null,
    controlledBy: ownerId,
    salted: false,
    ruined: false,
    lastRaided: null,
    buildings: [],
    constructionQueue: [],

    stability: 80,
    treasury: 1000,
    militaryPower: 3000,
    vassalCount: realm.type === 'KINGDOM' ? 2 : (realm.type === 'DUCHY' ? 1 : 0),
    emblem: realm.emblem,
    allianceId: null,
    type: realm.type as any
  } as any;
});

// 3. Generate Nythara
const nytharaCoords = getDynamicCoords(-8, 8, 12);
NYTHARA_REALMS.forEach((realm, idx) => {
  const pId = `prov_n${idx + 1}`;
  const coords = nytharaCoords[idx];
  const ownerId = `lord_n_${idx + 1}`;
  const realmId = `realm_n_${idx + 1}`;
  const { terrain, biome, elevation, fertility } = getTerrainAndBio(realm.name, realm.type);

  // Nythara total: exactly 160,000,000 across 12 realms
  // 20% Urbanization (80% serfs, 15% merchants, 3% clergy, 2% nobles)
  const targetPop = realm.pop;
  const serfs = Math.floor(targetPop * 0.80);
  const merchants = Math.floor(targetPop * 0.15);
  const clergy = Math.floor(targetPop * 0.03);
  const nobles = Math.floor(targetPop * 0.02);

  INITIAL_PROVINCES[pId] = {
    id: pId,
    name: realm.name,
    ownerId: ownerId,
    realmId: realmId,
    continent: 'Nythara',
    coords: coords,
    terrain: terrain,
    biome: biome,
    elevation: elevation,
    fertility: fertility,
    settlements: [],
    currentWeather: 'CLEAR',
    floodRisk: 0,
    forestCoverage: terrain === 'DEEP_FOREST' ? 100 : (terrain === 'FOREST' ? 60 : 10),
    roadQuality: 50,
    loyalty: 100,
    grievances: [],
    population: { total: targetPop, serfs, clergy, nobles, merchants, health: 100, mood: 'CONTENT' },
    disease: null,
    fortificationLevel: 1,
    isBlockaded: false,
    isBesieged: false,
    siegeProgress: null,
    controlledBy: ownerId,
    salted: false,
    ruined: false,
    lastRaided: null,
    buildings: [],
    constructionQueue: [],

    stability: 80,
    treasury: 1000,
    militaryPower: 3000,
    vassalCount: realm.type === 'KINGDOM' ? 2 : (realm.type === 'DUCHY' ? 1 : 0),
    emblem: realm.emblem,
    allianceId: null,
    type: realm.type as any
  } as any;
});

export interface WorldSlice {
  currentDay: number;
  currentYear: number;
  currentSeason: Season;
  currentEra: Era;
  provinces: Record<string, Province>;
  selectedProvinceId: string | null;
  selectProvince: (id: string | null) => void;
}

export const createWorldSlice: StateCreator<WorldSlice> = (set) => ({
  currentDay: 250,
  currentYear: 1142,
  currentEra: 'FEUDAL',
  currentSeason: 'AUTUMN',
  provinces: INITIAL_PROVINCES,
  selectedProvinceId: null,
  selectProvince: (id) => set({ selectedProvinceId: id }),
});

