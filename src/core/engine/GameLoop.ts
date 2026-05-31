import { WorldClock } from './WorldClock';
import { RandomSeed } from './RandomSeed';
import { EventBus } from './EventBus';
import { TickScheduler } from './TickScheduler';
import { TRAIT_DEFINITIONS } from '../../data/trait-definitions';

import { WorldSystem } from '../systems/WorldSystem';
import { PopulationSystem } from '../systems/PopulationSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { LogisticsSystem } from '../systems/LogisticsSystem';
import { MilitarySystem } from '../systems/MilitarySystem';
import { DiplomacySystem } from '../systems/DiplomacySystem';
import { ReligionSystem } from '../systems/ReligionSystem';
import { PoliticsSystem } from '../systems/PoliticsSystem';
import { DiseaseSystem } from '../systems/DiseaseSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { IntelligenceSystem } from '../systems/IntelligenceSystem';
import { AureliaWorldSimulation } from '../systems/AureliaWorldSimulation';
import { generateDynamicNPC } from '../utils/npcGenerator';

import staticWorld from '../../data/static-world.json';
import { Province } from '../models/Province';
import { Army } from '../models/Army';
import { Battle, Siege } from '../models/Battle';
import { Character } from '../models/Character';
import { Dynasty } from '../models/Dynasty';
import { Faction, Plot } from '../models/Faction';
import { Religion } from '../models/Religion';
import { Treaty } from '../models/Treaty';
import { TreasuryState } from '../models/Resource';
import { Convoy } from '../models/TradeRoute';
import { nanoid } from 'nanoid';
import { ChronicleEntry, ChronicleType } from '../../types';
import { BUILDING_TYPES } from '../../data/building-types';
import { TECHNOLOGIES } from '../../data/technology-tree';

class EventSystem {
  constructor(private engine: GameLoop) {}
  tick() {
    if (this.engine.clock.currentDay % 15 === 0 && this.engine.rng.next() < 0.3) {
      const texts = [
        "A comet was seen in the sky over Kareth.",
        "Merchants report bandits on the eastern roads.",
        "A minor noble requests audience at the capital.",
        "Foreign emissaries arrived from across the sea.",
        "Unusual weather damages local crops in Sarn.",
        "A mysterious wanderer tells tales of an old god.",
      ];
      const text = texts[Math.floor(this.engine.rng.next() * texts.length)];
      this.engine.alertSystem.queueAlert(text, 'FLAVOR');
    }
  }
}

export class ChronicleSystem { 
  entries: ChronicleEntry[] = [];
  tick() {} 
  add(year: number, day: number, text: string, type: ChronicleType = 'NORMAL') {
    this.entries.push({ id: nanoid(), year, day, text, type });
  }
}

export class AlertSystem { 
  private queue: {text: string, type: string}[] = [];
  constructor(private chronicle: ChronicleSystem, private clock: WorldClock) {}
  
  queueAlert(text: string, type: ChronicleType = 'NORMAL') {
    this.queue.push({ text, type });
  }
  
  flush() {
    for (const a of this.queue) {
       this.chronicle.add(this.clock.currentYear, this.clock.currentDay, a.text, a.type as ChronicleType);
    }
    this.queue = [];
  }
}

export class GameLoop {
  clock: WorldClock;
  rng: RandomSeed;
  eventBus: EventBus;
  scheduler: TickScheduler;

  // Custom Resource and Technology state
  resources = {
    food: 12500,
    iron: 850,
    wood: 2100,
    stone: 400,
    manpower: 1200,
  };
  unlockedTechs: string[] = ['crop_rotation'];
  activeResearch: {
    techId: string;
    daysLeft: number;
    totalDays: number;
  } | null = null;

  provinces: Record<string, Province> = {};
  armies: Record<string, Army> = {};
  characters: Record<string, Character> = {};
  dynasties: Record<string, Dynasty> = {};
  battles: Record<string, Battle> = {};
  sieges: Record<string, Siege> = {};
  factions: Record<string, Faction> = {};
  plots: Record<string, Plot> = {};
  religions: Record<string, Religion> = {};
  treaties: Record<string, Treaty> = {};
  treasury: TreasuryState;
  convoys: Record<string, Convoy> = {};

  // Systems
  worldSystem: WorldSystem;
  populationSystem: PopulationSystem;
  economySystem: EconomySystem;
  logisticsSystem: LogisticsSystem;
  militarySystem: MilitarySystem;
  diplomacySystem: DiplomacySystem;
  religionSystem: ReligionSystem;
  politicsSystem: PoliticsSystem;
  diseaseSystem: DiseaseSystem;
  weatherSystem: WeatherSystem;
  intelligenceSystem: IntelligenceSystem;
  eventSystem: EventSystem;
  chronicleSystem: ChronicleSystem;
  alertSystem: AlertSystem;
  aureliaSim: AureliaWorldSimulation;

  constructor(seed: number) {
    this.clock = new WorldClock(1142, 250);
    this.rng = new RandomSeed(seed);
    this.eventBus = new EventBus();
    this.scheduler = new TickScheduler();
    this.chronicleSystem = new ChronicleSystem();
    this.alertSystem = new AlertSystem(this.chronicleSystem, this.clock);

    // Initial chronicle
    this.chronicleSystem.add(1142, 248, "The Grand Host marches on Valedor.", "URGENT");
    this.chronicleSystem.add(1142, 250, "Your realm stands ready.", "FLAVOR");

    // Initialize state
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

    const getDynCoords = (centerQ: number, centerR: number, count: number, existing: {q: number, r: number}[] = []) => {
      const coordsList: { q: number, r: number, s: number }[] = [];
      existing.forEach(c => coordsList.push({ q: c.q, r: c.r, s: -c.q - c.r }));
      let ring = 0;
      while (coordsList.length < count) {
        if (ring === 0) {
          const exists = coordsList.some(c => c.q === centerQ && c.r === centerR);
          if (!exists) coordsList.push({ q: centerQ, r: centerR, s: -centerQ - centerR });
        } else {
          for (let dq = -ring; dq <= ring; dq++) {
            for (let dr = -ring; dr <= ring; dr++) {
              const ds = -dq - dr;
              if (Math.abs(dq) + Math.abs(dr) + Math.abs(ds) === ring * 2) {
                const q = centerQ + dq;
                const r = centerR + dr;
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
    };

    const getTerrainAndBio = (name: string, type: string) => {
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
    };

    // 1. Generate Aurelia
    const aureliaCoords = getDynCoords(0, 0, 37, [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 }
    ]);

    AURELIA_REALMS.forEach((realm, idx) => {
      const pId = `prov_${idx + 1}`;
      const coords = aureliaCoords[idx];
      const isPlayerStart = idx === 0;
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

      this.provinces[pId] = {
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
    const varethCoords = getDynCoords(8, -8, 12);
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

      this.provinces[pId] = {
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
    const nytharaCoords = getDynCoords(-8, 8, 12);
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

      this.provinces[pId] = {
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

    // Seeding initial Dynasties
    this.dynasties['dyn_1'] = {
      id: 'dyn_1',
      name: 'Valerius',
      coatOfArms: { colors: ['blue', 'gold'], charges: ['lion'] } as any,
      founderId: 'enemy_founder',
      foundedDate: 900,
      headId: 'enemy_lord',
      members: ['enemy_lord'],
      extinct: false,
      prestigeLevel: 500,
      cultureId: 'latin',
      homeProvinceId: 'prov_2',
      renown: 300,
      legendaryAncestors: []
    };
    this.dynasties['dyn_player'] = {
      id: 'dyn_player',
      name: 'Valedor',
      coatOfArms: { colors: ['green', 'silver'], charges: ['oak_tree'] } as any,
      founderId: 'player_founder',
      foundedDate: 1050,
      headId: 'player',
      members: ['player'],
      extinct: false,
      prestigeLevel: 250,
      cultureId: 'saxon',
      homeProvinceId: 'prov_1',
      renown: 150,
      legendaryAncestors: []
    };

    // Seeding initial Characters
    this.characters['player'] = {
      id: 'player',
      firstName: 'Lord',
      lastName: 'Valedor',
      dynastyId: 'dyn_player',
      isPlayer: true,
      gender: 'MALE',
      age: 26,
      health: 100,
      fertility: 80,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon', 'Latin'],
      title: { id: 'title_1', name: 'Duke' },
      position: null,
      traits: [],
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: ['enemy_lord'],
      allyIds: [],
      mentorId: null,
      diplomacy: 12,
      martial: 14,
      stewardship: 11,
      intrigue: 9,
      learning: 10,
      piety: 30,
      ambition: 'LEGACY',
      opinion: { 'enemy_lord': -80 },
      suspicion: { 'enemy_lord': 50 },
      memories: [],
      traumaIds: [],
      primaryTitle: { id: 'title_1', name: 'Duke' },
      heldTitles: [{ id: 'title_1', name: 'Duke' }],
      landedProvinceIds: ['prov_1'],
      goldHoldings: 1000
    };

    this.characters['enemy_lord'] = {
      id: 'enemy_lord',
      firstName: 'Lord',
      lastName: 'Valerius',
      dynastyId: 'dyn_1',
      isPlayer: false,
      gender: 'MALE',
      age: 42,
      health: 100,
      fertility: 70,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_2',
      religion: 'christianity',
      culture: 'Latin',
      languagesSpoken: ['Latin'],
      title: { id: 'title_2', name: 'Lord' },
      position: null,
      traits: [],
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: ['player'],
      allyIds: [],
      mentorId: null,
      diplomacy: 10,
      martial: 16,
      stewardship: 12,
      intrigue: 13,
      learning: 8,
      piety: 60,
      ambition: 'POWER',
      opinion: { 'player': -80 },
      suspicion: { 'player': 40 },
      memories: [],
      traumaIds: [],
      primaryTitle: { id: 'title_2', name: 'Lord' },
      heldTitles: [{ id: 'title_2', name: 'Lord' }],
      landedProvinceIds: ['prov_2'],
      goldHoldings: 2500
    };

    // Seeding initial Armies
    this.armies['army_1'] = {
      id: 'army_1',
      name: 'Riverlands Vanguard',
      realmId: 'realm_1',
      commanderId: 'player',
      officerIds: [],
      units: [
        {
          id: 'unit_1',
          type: 'PROFESSIONAL_INFANTRY' as any,
          count: 500,
          maxCount: 1000,
          strength: 100,
          morale: 80,
          experience: 20,
          equipmentQuality: 70,
          supplyConsumed: 2,
          upkeepCost: 10,
          formation: 'STANDARD',
          isMounted: false,
          isRanged: false,
          hasArmor: 'LEATHER' as any,
          specialAbility: null
        }
      ],
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
    };

    this.armies['army_2'] = {
      id: 'army_2',
      name: 'Valerian Host',
      realmId: 'enemy',
      commanderId: 'enemy_lord',
      officerIds: [],
      units: [
        {
          id: 'unit_2',
          type: 'HEAVY_CAVALRY_KNIGHTS' as any,
          count: 800,
          maxCount: 800,
          strength: 100,
          morale: 95,
          experience: 50,
          equipmentQuality: 90,
          supplyConsumed: 4,
          upkeepCost: 30,
          formation: 'WEDGE',
          isMounted: true,
          isRanged: false,
          hasArmor: 'PLATE' as any,
          specialAbility: null
        }
      ],
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
    };

    // Seeding initial Religions
    this.religions['christianity'] = {
      id: 'christianity',
      name: 'Christianity',
      headquartersId: 'prov_1',
      headId: 'priest_1',
      doctrines: [{ name: 'Pacifism' }],
      holyWarJustification: 'Defend the faith',
      piousActions: [{ name: 'Pray' }],
      sinfulActions: [{ name: 'Steal' }],
      attitude: {},
      isMonotheistic: true,
      holyTextName: 'Holy Bible',
      iconId: 'cross'
    };

    // Seeding Treasury State
    this.treasury = {
      goldBalance: 5400,
      goldPerTick: 12,
      taxRevenue: 50,
      tradeIncome: 20,
      tributeIncome: 0,
      militaryUpkeep: 40,
      buildingUpkeep: 15,
      courtUpkeep: 3,
      debtRepayment: 0,
      minters: 1,
      inflationRate: 1.0,
      debtAmount: 0,
      debtCreditorId: null,
      coinsInCirculation: 100000
    };

    // Initialize systems
    this.worldSystem = new WorldSystem(this);
    this.populationSystem = new PopulationSystem(this);
    this.economySystem = new EconomySystem(this);
    this.logisticsSystem = new LogisticsSystem(this);
    this.militarySystem = new MilitarySystem(this);
    this.diplomacySystem = new DiplomacySystem(this);
    this.religionSystem = new ReligionSystem(this);
    this.politicsSystem = new PoliticsSystem(this);
    this.diseaseSystem = new DiseaseSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.intelligenceSystem = new IntelligenceSystem(this);
    this.eventSystem = new EventSystem(this);
    this.initializeAllNPCs();
    this.aureliaSim = new AureliaWorldSimulation(this);
  }

  tick() {
    this.clock.advance();
    this.weatherSystem.tick();
    this.worldSystem.tick();
    this.populationSystem.tick();
    this.diseaseSystem.tick();
    this.economySystem.tick();
    this.logisticsSystem.tick();
    this.militarySystem.tick();
    this.intelligenceSystem.tick();
    this.diplomacySystem.tick();
    this.politicsSystem.tick();
    this.religionSystem.tick();
    this.eventSystem.tick();
    this.chronicleSystem.tick();
    this.alertSystem.flush();
    if (this.aureliaSim) this.aureliaSim.tick();

    // 1. Process active building construction queues across all provinces
    Object.values(this.provinces).forEach(prov => {
      if (prov.constructionQueue && prov.constructionQueue.length > 0) {
        const currentProject = prov.constructionQueue[0];
        currentProject.daysLeft -= 1;
        if (currentProject.daysLeft <= 0) {
          prov.constructionQueue.shift();
          if (!prov.buildings) prov.buildings = [];
          prov.buildings.push({
            id: 'bld_' + prov.id + '_' + Date.now().toString(36),
            typeId: currentProject.typeId,
            level: 1,
            condition: 100
          } as any);

          const bType = BUILDING_TYPES[currentProject.typeId];
          if (bType) {
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `The construction of ${bType.name} in ${prov.name} has been completed! ${bType.effectsDescription}.`,
              'NORMAL'
            );
          }
        }
      }
    });

    // 2. Process active technology research progress
    if (this.activeResearch) {
      let speedMult = 1.0;
      Object.values(this.provinces).forEach(prov => {
        prov.buildings?.forEach((b: any) => {
          if (b.typeId === 'MONASTERY') speedMult += 0.10;
          if (b.typeId === 'CATHEDRAL') speedMult += 0.30;
          if (b.typeId === 'GUILDHALL') speedMult += 0.15;
        });
      });

      this.activeResearch.daysLeft -= 1 * speedMult;
      if (this.activeResearch.daysLeft <= 0) {
        const techId = this.activeResearch.techId;
        if (!this.unlockedTechs.includes(techId)) {
          this.unlockedTechs.push(techId);
        }
        const tech = TECHNOLOGIES[techId];
        if (tech) {
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Great scholars in the realm have completed research on ${tech.name}! ${tech.effectsDescription}.`,
            'URGENT'
          );
        }
        this.activeResearch = null;
      }
    }

    // 3. Process passive daily resource generation
    let dailyWoodAdd = 8;
    let dailyStoneAdd = 5;
    let dailyIronAdd = 2;
    let dailyManpowerAdd = 4;
    let dailyFoodAdd = 15;

    // Factor building structures owned by the player
    Object.values(this.provinces).forEach(prov => {
      if (prov.ownerId === 'player') {
        prov.buildings?.forEach((b: any) => {
          if (b.typeId === 'LUMBER_CAMP') dailyWoodAdd += 10;
          if (b.typeId === 'MINE') {
            dailyStoneAdd += 8;
            dailyIronAdd += 2;
          }
          if (b.typeId === 'KILN') dailyStoneAdd += 6;
          if (b.typeId === 'SMELTER') dailyIronAdd += 6;
          if (b.typeId === 'FARM') dailyFoodAdd += 12;
          if (b.typeId === 'FISHERY') dailyFoodAdd += 15;
          if (b.typeId === 'BARRACKS' || b.typeId === 'TRAINING_GROUNDS') dailyManpowerAdd += 8;
          
          // Additional military structures adding recruitment pools
          if (b.typeId === 'STABLE') dailyManpowerAdd += 12;
          if (b.typeId === 'ARCHERY_RANGE') dailyManpowerAdd += 6;

          // Logistics, storage, and processing structures reducing food waste or aiding logistics
          if (b.typeId === 'GRANARY') dailyFoodAdd += 10;
          if (b.typeId === 'MILL') dailyFoodAdd += 8;
          if (b.typeId === 'WAREHOUSE') dailyFoodAdd += 5;

          // Infrastructure structures aiding supply routes
          if (b.typeId === 'ROAD_NETWORK') {
            dailyWoodAdd += 3;
            dailyStoneAdd += 3;
          }
          if (b.typeId === 'BRIDGE') {
            dailyWoodAdd += 2;
            dailyStoneAdd += 2;
          }
        });
        if (prov.population) {
          dailyFoodAdd -= Math.floor(prov.population.total * 0.005);
        }
      }
    });

    // Apply technology bonuses to multipliers
    if (this.unlockedTechs.includes('crop_rotation')) dailyFoodAdd = Math.floor(dailyFoodAdd * 1.15);
    if (this.unlockedTechs.includes('written_administration')) dailyFoodAdd = Math.floor(dailyFoodAdd * 1.10);
    if (this.unlockedTechs.includes('castle_architecture')) {
      dailyStoneAdd = Math.floor(dailyStoneAdd * 1.25);
    }
    if (this.unlockedTechs.includes('iron_working')) {
      dailyIronAdd = Math.floor(dailyIronAdd * 1.20);
    }

    this.resources.wood = Math.max(0, this.resources.wood + dailyWoodAdd);
    this.resources.stone = Math.max(0, this.resources.stone + dailyStoneAdd);
    this.resources.iron = Math.max(0, this.resources.iron + dailyIronAdd);
    this.resources.manpower = Math.min(5000, this.resources.manpower + dailyManpowerAdd);
    this.resources.food = Math.max(0, this.resources.food + dailyFoodAdd);
    
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      currentDay: this.clock.currentDay,
      currentYear: this.clock.currentYear,
      currentSeason: this.clock.currentSeason,
      currentEra: this.clock.currentEra,
      provinces: this.provinces,
      armies: this.armies,
      characters: this.characters,
      dynasties: this.dynasties,
      battles: this.battles,
      sieges: this.sieges,
      factions: this.factions,
      plots: this.plots,
      religions: this.religions,
      treaties: this.treaties,
      treasury: this.treasury,
      resources: {
        gold: Math.floor(this.treasury.goldBalance),
        food: Math.floor(this.resources.food),
        iron: Math.floor(this.resources.iron),
        wood: Math.floor(this.resources.wood),
        stone: Math.floor(this.resources.stone),
        manpower: Math.floor(this.resources.manpower),
        prestige: 150 + Math.floor(this.dynasties['dyn_player']?.renown || 0)
      },
      activeResearch: this.activeResearch,
      unlockedTechs: this.unlockedTechs,
      convoys: this.convoys,
      aureliaSimState: this.aureliaSim ? this.aureliaSim.getState() : null,
      chronicle: this.chronicleSystem.entries.slice(-50) // keep last 50 for UI
    };
  }

  initializeCustomGame(options: any) {
    // 1. Wipe default characters, dynasties, and customize
    this.characters = {};
    this.dynasties = {};
    this.armies = {};
    this.factions = {};
    this.plots = {};

    // Base variables
    const dynastyName = options.dynastyName || 'Valedor';
    const charName = options.characterName || 'Lord John';
    const gender = options.gender || 'MALE';
    const birthProvinceId = options.birthProvinceId || 'prov_1';
    const situation = options.startingSituation || 'MINOR_LORD';
    const coatOfArms = options.coatOfArms || { colors: ['green', 'silver'], charges: ['oak_tree'] };

    // Set starting stats
    const statsOpt = options.stats || { diplomacy: 10, martial: 10, stewardship: 10, intrigue: 10, learning: 10 };

    // Build traits from definition ids
    const traitIds = options.traits || ['BRAVE', 'DILIGENT'];
    const resolvedTraits = traitIds.map((tid: string) => TRAIT_DEFINITIONS[tid]).filter(Boolean);

    // Dynamic culture mapping based on birth province
    let culture = 'Saxon';
    let languages = ['Saxon', 'Latin'];
    if (birthProvinceId === 'prov_2') { culture = 'Norse'; languages = ['Norse', 'Saxon']; }
    if (birthProvinceId === 'prov_3') { culture = 'Celtic'; languages = ['Celtic', 'Gaelic', 'Latin']; }
    if (birthProvinceId === 'prov_4') { culture = 'Latin'; languages = ['Latin', 'Saxon']; }
    if (birthProvinceId === 'prov_5') { culture = 'Sylvan'; languages = ['Sylvan', 'Saxon']; }

    // Seed player Dynasty
    this.dynasties['dyn_player'] = {
      id: 'dyn_player',
      name: dynastyName,
      coatOfArms: coatOfArms,
      founderId: 'player',
      foundedDate: 1120,
      headId: 'player',
      members: ['player'],
      extinct: false,
      prestigeLevel: 250,
      cultureId: culture.toLowerCase(),
      homeProvinceId: birthProvinceId,
      renown: 150,
      legendaryAncestors: []
    };

    // Override Player Characters
    this.characters['player'] = {
      id: 'player',
      firstName: charName,
      lastName: dynastyName,
      dynastyId: 'dyn_player',
      isPlayer: true,
      gender: gender as any,
      age: 25,
      health: 100,
      fertility: 80,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: birthProvinceId,
      religion: 'christianity',
      culture: culture,
      languagesSpoken: languages,
      title: { id: 'title_1', name: situation === 'REBEL' ? 'Rebel Leader' : 'Duke' },
      position: null,
      traits: resolvedTraits,
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: ['enemy_lord'],
      allyIds: [],
      mentorId: null,
      diplomacy: statsOpt.diplomacy,
      martial: statsOpt.martial,
      stewardship: statsOpt.stewardship,
      intrigue: statsOpt.intrigue,
      learning: statsOpt.learning,
      piety: situation === 'CRUSADER' ? 250 : 50,
      ambition: options.ambition || 'POWER',
      opinion: {},
      suspicion: {},
      memories: [
        { id: 'mem_1', description: 'Crowned as Sovereign of the Realm.', tick: 0 }
      ],
      traumaIds: [],
      primaryTitle: { id: 'title_1', name: situation === 'REBEL' ? 'Rebel Leader' : 'Duke' },
      heldTitles: [{ id: 'title_1', name: situation === 'REBEL' ? 'Rebel Leader' : 'Duke' }],
      landedProvinceIds: situation === 'REBEL' ? [] : [birthProvinceId],
      goldHoldings: situation === 'MERCHANT_PRINCE' ? 6000 : (situation === 'WARLORD' ? 100 : (situation === 'MINOR_LORD' ? 1500 : (situation === 'CRUSADER' ? 2000 : 500)))
    };

    // Seed AI Aggressive Adversary
    this.dynasties['dyn_enemy'] = {
      id: 'dyn_enemy',
      name: 'Valerius',
      coatOfArms: { colors: ['darkred', 'gold'], charges: ['lion_rampant'] } as any,
      founderId: 'enemy_lord',
      foundedDate: 900,
      headId: 'enemy_lord',
      members: ['enemy_lord'],
      extinct: false,
      prestigeLevel: 600,
      cultureId: 'latin',
      homeProvinceId: 'prov_4',
      renown: 400,
      legendaryAncestors: []
    };

    this.characters['enemy_lord'] = {
      id: 'enemy_lord',
      firstName: 'Duke Berold',
      lastName: 'Valerius',
      dynastyId: 'dyn_enemy',
      isPlayer: false,
      gender: 'MALE',
      age: 46,
      health: 95,
      fertility: 60,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_4',
      religion: 'christianity',
      culture: 'Latin',
      languagesSpoken: ['Latin', 'Saxon'],
      title: { id: 'title_enemy', name: 'Archduke' },
      position: null,
      traits: [TRAIT_DEFINITIONS['CRUEL'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: ['player'],
      allyIds: [],
      mentorId: null,
      diplomacy: 12,
      martial: 16,
      stewardship: 11,
      intrigue: 14,
      learning: 10,
      piety: 30,
      ambition: 'REVENGE',
      opinion: { 'player': -80 },
      suspicion: { 'player': 80 },
      memories: [
        { id: 'mem_enemy_1', description: 'Swore to crush the upstart dynasty', tick: 0 }
      ],
      traumaIds: [],
      primaryTitle: { id: 'title_enemy', name: 'Archduke' },
      heldTitles: [{ id: 'title_enemy', name: 'Archduke' }],
      landedProvinceIds: ['prov_4'],
      goldHoldings: 3500
    };

    // Initialize Vassal Dynasties
    const vassalDyns = [
      { id: 'dyn_vass_vet', name: 'Bouillon', colors: ['navy', 'white'], charge: 'cross' },
      { id: 'dyn_vass_nep', name: dynastyName, colors: coatOfArms.colors, charge: coatOfArms.charges[0] }, 
      { id: 'dyn_vass_bis', name: 'Clairvaux', colors: ['gold', 'white'], charge: 'chalice' },
      { id: 'dyn_vass_mer', name: 'Guildford', colors: ['emerald', 'gold'], charge: 'coin' },
      { id: 'dyn_vass_bar', name: 'Haverhill', colors: ['charcoal', 'crimson'], charge: 'shield' },
      { id: 'dyn_vass_cow', name: 'Cotswold', colors: ['grey', 'yellow'], charge: 'hare' },
      { id: 'dyn_vass_loc', name: 'Aethelgard', colors: ['green', 'bronze'], charge: 'boar' },
      { id: 'dyn_vass_sch', name: 'Montdidier', colors: ['purple', 'black'], charge: 'crow' },
      { id: 'dyn_vass_drn', name: 'Gisors', colors: ['burgundy', 'silver'], charge: 'grape' },
    ];

    vassalDyns.forEach(vd => {
      this.dynasties[vd.id] = {
        id: vd.id,
        name: vd.name,
        coatOfArms: { colors: vd.colors, charges: [vd.charge] } as any,
        founderId: 'vassal_' + vd.id,
        foundedDate: 1080,
        headId: 'vassal_' + vd.id,
        members: ['vassal_' + vd.id],
        extinct: false,
        prestigeLevel: 150,
        cultureId: culture.toLowerCase(),
        homeProvinceId: 'prov_1',
        renown: 80,
        legendaryAncestors: []
      };
    });

    // Generate Vassal Lord characters corresponding to our Complete NPC Roster archetypes
    const vassals = [
      {
        id: 'vassal_veteran',
        firstName: 'Sir Godefroy',
        lastName: 'Bouillon',
        dynastyId: 'dyn_vass_vet',
        traits: ['BRAVE', 'PATIENT'],
        stats: { diplomacy: 11, martial: 18, stewardship: 10, intrigue: 6, learning: 9 },
        opinionOfPlayer: 60,
        age: 58,
        gender: 'MALE',
        archetype: 'THE LOYAL VETERAN',
        ambition: 'LEGACY',
        desc: 'Old battlefield commander. Demands loyalty & respect for past service.'
      },
      {
        id: 'vassal_nephew',
        firstName: 'Robert',
        lastName: dynastyName,
        dynastyId: 'dyn_vass_nep',
        traits: ['AMBITIOUS', 'DECEITFUL'],
        stats: { diplomacy: 12, martial: 10, stewardship: 8, intrigue: 17, learning: 9 },
        opinionOfPlayer: -20,
        age: 21,
        gender: 'MALE',
        archetype: 'THE AMBITIOUS NEPHEW',
        ambition: 'POWER',
        desc: 'Young and brilliant at court schemes. Looking for a chance to usurp you.'
      },
      {
        id: 'vassal_bishop',
        firstName: 'Bishop Baldwin',
        lastName: 'Clairvaux',
        dynastyId: 'dyn_vass_bis',
        traits: ['ZEALOUS', 'HUMBLE'],
        stats: { diplomacy: 13, martial: 6, stewardship: 11, intrigue: 9, learning: 18 },
        opinionOfPlayer: 35,
        age: 49,
        gender: 'MALE',
        archetype: 'THE PIOUS BISHOP',
        ambition: 'PIETY',
        desc: 'Demands church gold allocations and protection against heretics.'
      },
      {
        id: 'vassal_merchant',
        firstName: 'Master Thaddeus',
        lastName: 'Guildford',
        dynastyId: 'dyn_vass_mer',
        traits: ['GREEDY', 'ARBITRARY'],
        stats: { diplomacy: 8, martial: 5, stewardship: 19, intrigue: 12, learning: 10 },
        opinionOfPlayer: 10,
        age: 44,
        gender: 'MALE',
        archetype: 'THE GREEDY MERCHANT',
        ambition: 'WEALTH',
        desc: 'Wealthy burgher who skims royal taxes to fund merchant projects.'
      },
      {
        id: 'vassal_baron',
        firstName: 'Baron Roger',
        lastName: 'Haverhill',
        dynastyId: 'dyn_vass_bar',
        traits: ['PARANOID', 'WRATHFUL'],
        stats: { diplomacy: 5, martial: 16, stewardship: 8, intrigue: 13, learning: 7 },
        opinionOfPlayer: -10,
        age: 39,
        gender: 'MALE',
        archetype: 'THE XENOPHOBIC BARON',
        ambition: 'FREEDOM',
        desc: 'Paranoid border lord. Deeply dislikes non-native marriages or foreign treaties.'
      },
      {
        id: 'vassal_coward',
        firstName: 'Earl Richard',
        lastName: 'Cotswold',
        dynastyId: 'dyn_vass_cow',
        traits: ['CRAVEN', 'LAZY'],
        stats: { diplomacy: 10, martial: 4, stewardship: 12, intrigue: 14, learning: 10 },
        opinionOfPlayer: 15,
        age: 36,
        gender: 'MALE',
        archetype: 'THE COWARD LORD',
        ambition: 'WEALTH',
        desc: 'Refuses to lead standard armies. Flees instantly behind fortified walls under siege.'
      },
      {
        id: 'vassal_local',
        firstName: 'Sir Eldred',
        lastName: 'Aethelgard',
        dynastyId: 'dyn_vass_loc',
        traits: ['KIND', 'JUST'],
        stats: { diplomacy: 17, martial: 12, stewardship: 11, intrigue: 5, learning: 11 },
        opinionOfPlayer: 40,
        age: 31,
        gender: 'MALE',
        archetype: 'THE BELOVED LOCAL',
        ambition: 'FREEDOM',
        desc: 'Intensely popular with field peasants and serfs. Rebellious if taxes rise too much.'
      },
      {
        id: 'vassal_schemer',
        firstName: 'Count Geoffrey',
        lastName: 'Montdidier',
        dynastyId: 'dyn_vass_sch',
        traits: ['DECEITFUL', 'AMBITIOUS'],
        stats: { diplomacy: 9, martial: 8, stewardship: 10, intrigue: 19, learning: 13 },
        opinionOfPlayer: -5,
        age: 32,
        gender: 'MALE',
        archetype: 'THE SCHEMER',
        ambition: 'POWER',
        desc: 'Specializes in document forge, covert poisons, and framing court enemies.'
      },
      {
        id: 'vassal_drunkard',
        firstName: 'Lord Berenger',
        lastName: 'Gisors',
        dynastyId: 'dyn_vass_drn',
        traits: ['DRUNKARD', 'CONTENT'],
        stats: { diplomacy: 14, martial: 9, stewardship: 7, intrigue: 6, learning: 8 },
        opinionOfPlayer: 25,
        age: 51,
        gender: 'MALE',
        archetype: 'THE DRUNKARD',
        ambition: 'WEALTH',
        desc: 'Mismanages local towns, but universally liked at feasts. Opinion moves erratically.'
      }
    ];

    // Build the characters in the store
    vassals.forEach(v => {
      const vTraits = v.traits.map(tid => TRAIT_DEFINITIONS[tid]).filter(Boolean);
      this.characters[v.id] = {
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        dynastyId: v.dynastyId,
        isPlayer: false,
        gender: v.gender as any,
        age: v.age,
        health: 100,
        fertility: 70,
        isPregnant: false,
        isAlive: true,
        causeOfDeath: null,
        deathDate: null,
        birthProvinceId: 'prov_1',
        religion: 'christianity',
        culture: culture,
        languagesSpoken: [culture],
        title: { id: 'title_' + v.id, name: 'Baron' },
        position: null,
        traits: vTraits,
        virtues: [],
        flaws: [],
        secretTrait: null,
        fatherId: null,
        motherId: null,
        spouseId: null,
        childrenIds: [],
        siblingIds: [],
        loverIds: [],
        enemyIds: [],
        allyIds: [],
        mentorId: null,
        diplomacy: v.stats.diplomacy,
        martial: v.stats.martial,
        stewardship: v.stats.stewardship,
        intrigue: v.stats.intrigue,
        learning: v.stats.learning,
        piety: 40,
        ambition: v.ambition as any,
        opinion: { 'player': v.opinionOfPlayer },
        suspicion: {},
        memories: [
          { id: 'mem_' + v.id + '_1', description: `Established allegiance under player's dynasty.`, tick: 0 }
        ],
        traumaIds: [],
        primaryTitle: { id: 'title_' + v.id, name: 'Baron' },
        heldTitles: [{ id: 'title_' + v.id, name: 'Baron' }],
        landedProvinceIds: [],
        goldHoldings: 300,
        archetype: v.archetype,
        desc: v.desc
      } as any;
    });

    // Reset Provinces & Assign Ownership based on Situation
    Object.keys(this.provinces).forEach(pid => {
      this.provinces[pid].ownerId = 'enemy_lord'; 
      this.provinces[pid].controlledBy = 'enemy_lord';
      this.provinces[pid].loyalty = 100;
    });

    let storyText = "";
    
    if (situation === 'MINOR_LORD') {
      this.provinces['prov_1'].ownerId = 'player';
      this.provinces['prov_1'].controlledBy = 'player';
      this.characters['player'].landedProvinceIds = ['prov_1'];

      this.provinces['prov_5'].ownerId = 'vassal_veteran'; 
      this.provinces['prov_5'].controlledBy = 'vassal_veteran';
      this.characters['vassal_veteran'].landedProvinceIds = ['prov_5'];

      this.provinces['prov_2'].ownerId = 'vassal_nephew'; 
      this.provinces['prov_2'].controlledBy = 'vassal_nephew';
      this.characters['vassal_nephew'].landedProvinceIds = ['prov_2'];

      this.provinces['prov_3'].ownerId = 'vassal_bishop'; 
      this.provinces['prov_3'].controlledBy = 'vassal_bishop';
      this.characters['vassal_bishop'].landedProvinceIds = ['prov_3'];

      this.provinces['prov_4'].ownerId = 'enemy_lord';

      this.treasury = {
        goldBalance: 1500,
        goldPerTick: 40,
        taxRevenue: 60,
        tradeIncome: 0,
        tributeIncome: 0,
        militaryUpkeep: 15,
        buildingUpkeep: 5,
        courtUpkeep: 0,
        debtRepayment: 0,
        minters: 1,
        inflationRate: 1.0,
        debtAmount: 0,
        debtCreditorId: null,
        coinsInCirculation: 120000
      };

      this.armies['army_1'] = {
        id: 'army_1',
        name: `${dynastyName} Retinue`,
        realmId: 'realm_1',
        commanderId: 'player',
        officerIds: [],
        units: [
          { id: 'unit_u1', type: 'PROFESSIONAL_INFANTRY' as any, count: 500, maxCount: 500, strength: 100, morale: 80, experience: 20, equipmentQuality: 70, supplyConsumed: 2, upkeepCost: 10, formation: 'STANDARD', isMounted: false, isRanged: false, hasArmor: 'LEATHER' as any, specialAbility: null }
        ],
        location: this.provinces['prov_1'].coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 85,
        discipline: 80,
        experience: 25,
        stance: 'DEFEND',
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      };

      storyText = `Sir ${charName} of Dynasty ${dynastyName} has inherited the fertile riverlands of Valedor. Sir Godefroy guards the borders, but Robert (Ambitious Nephew) eyes your seat with deep suspicion. Keep the peace!`;

    } else if (situation === 'WARLORD') {
      this.provinces['prov_1'].ownerId = 'player';
      this.provinces['prov_1'].controlledBy = 'player';
      this.provinces['prov_5'].ownerId = 'player';
      this.provinces['prov_5'].controlledBy = 'player';
      this.characters['player'].landedProvinceIds = ['prov_1', 'prov_5'];

      this.provinces['prov_2'].ownerId = 'vassal_coward'; 
      this.provinces['prov_2'].controlledBy = 'vassal_coward';
      this.characters['vassal_coward'].landedProvinceIds = ['prov_2'];

      this.provinces['prov_3'].ownerId = 'vassal_veteran'; 
      this.provinces['prov_3'].controlledBy = 'vassal_veteran';
      this.characters['vassal_veteran'].landedProvinceIds = ['prov_3'];

      this.provinces['prov_4'].ownerId = 'enemy_lord';

      this.treasury = {
        goldBalance: 100,
        goldPerTick: -30,
        taxRevenue: 10,
        tradeIncome: 0,
        tributeIncome: 0,
        militaryUpkeep: 40,
        buildingUpkeep: 0,
        courtUpkeep: 0,
        debtRepayment: 0,
        minters: 1,
        inflationRate: 1.0,
        debtAmount: 0,
        debtCreditorId: null,
        coinsInCirculation: 100000
      };

      this.armies['army_1'] = {
        id: 'army_1',
        name: 'The Doom Vanguard',
        realmId: 'realm_1',
        commanderId: 'player',
        officerIds: [],
        units: [
          { id: 'unit_u1', type: 'HEAVY_CAVALRY_KNIGHTS' as any, count: 1200, maxCount: 1500, strength: 100, morale: 95, experience: 45, equipmentQuality: 85, supplyConsumed: 4, upkeepCost: 25, formation: 'WEDGE', isMounted: true, isRanged: false, hasArmor: 'PLATE' as any, specialAbility: null },
          { id: 'unit_u2', type: 'PROFESSIONAL_INFANTRY' as any, count: 400, maxCount: 400, strength: 100, morale: 80, experience: 30, equipmentQuality: 80, supplyConsumed: 2, upkeepCost: 15, formation: 'STANDARD', isMounted: false, isRanged: false, hasArmor: 'CHAINMAIL' as any, specialAbility: null }
        ],
        location: this.provinces['prov_1'].coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 95,
        discipline: 90,
        experience: 45,
        stance: 'ATTACK' as any,
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      };

      storyText = `WAR! Sir ${charName} has mobilized 1,600 elite veterans. Your gold reserve is nearly dry (100 gold). Conquer other provinces before severe deficit triggers mutiny!`;

    } else if (situation === 'MERCHANT_PRINCE') {
      this.provinces['prov_2'].ownerId = 'player';
      this.provinces['prov_2'].controlledBy = 'player';
      this.characters['player'].landedProvinceIds = ['prov_2'];

      this.provinces['prov_1'].ownerId = 'vassal_nephew'; 
      this.provinces['prov_1'].controlledBy = 'vassal_nephew';
      this.characters['vassal_nephew'].landedProvinceIds = ['prov_1'];

      this.provinces['prov_5'].ownerId = 'vassal_merchant'; 
      this.provinces['prov_5'].controlledBy = 'vassal_merchant';
      this.characters['vassal_merchant'].landedProvinceIds = ['prov_5'];

      this.provinces['prov_3'].ownerId = 'vassal_veteran';
      this.provinces['prov_3'].controlledBy = 'vassal_veteran';
      this.characters['vassal_veteran'].landedProvinceIds = ['prov_3'];

      this.provinces['prov_4'].ownerId = 'enemy_lord';

      this.treasury = {
        goldBalance: 6000,
        goldPerTick: 180,
        taxRevenue: 200,
        tradeIncome: 0,
        tributeIncome: 0,
        militaryUpkeep: 5,
        buildingUpkeep: 15,
        courtUpkeep: 0,
        debtRepayment: 0,
        minters: 1,
        inflationRate: 1.0,
        debtAmount: 0,
        debtCreditorId: null,
        coinsInCirculation: 350000
      };

      this.armies['army_1'] = {
        id: 'army_1',
        name: 'Merchant Fleet Guard',
        realmId: 'realm_1',
        commanderId: 'player',
        offsetIds: [],
        units: [
          { id: 'unit_u1', type: 'PROFESSIONAL_INFANTRY' as any, count: 150, maxCount: 150, strength: 100, morale: 70, experience: 10, equipmentQuality: 85, supplyConsumed: 1, upkeepCost: 5, formation: 'STANDARD', isMounted: false, isRanged: false, hasArmor: 'LEATHER' as any, specialAbility: null }
        ],
        location: this.provinces['prov_2'].coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 70,
        discipline: 75,
        experience: 10,
        stance: 'DEFEND',
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      } as any;

      storyText = `Dynasty ${dynastyName} controls the golden ports of Sarn. Your chest holds 6,000 gold with passive returns of +180 per tick. Hire mercenaries to expand the empire!`;

    } else if (situation === 'REBEL') {
      this.provinces['prov_1'].ownerId = 'enemy_lord';
      this.provinces['prov_1'].controlledBy = 'enemy_lord';
      this.provinces['prov_2'].ownerId = 'enemy_lord';
      this.provinces['prov_2'].controlledBy = 'enemy_lord';
      this.provinces['prov_5'].ownerId = 'enemy_lord';
      this.provinces['prov_5'].controlledBy = 'enemy_lord';

      this.provinces['prov_3'].ownerId = 'vassal_veteran';
      this.provinces['prov_3'].controlledBy = 'vassal_veteran';
      this.characters['vassal_veteran'].landedProvinceIds = ['prov_3'];

      this.treasury = {
        goldBalance: 500,
        goldPerTick: -10,
        taxRevenue: 0,
        tradeIncome: 0,
        tributeIncome: 0,
        militaryUpkeep: 10,
        buildingUpkeep: 0,
        courtUpkeep: 0,
        debtRepayment: 0,
        minters: 1,
        inflationRate: 1.0,
        debtAmount: 0,
        debtCreditorId: null,
        coinsInCirculation: 80000
      };

      this.armies['army_1'] = {
        id: 'army_1',
        name: 'The Liberation Host',
        realmId: 'realm_1',
        commanderId: 'player',
        officerIds: [],
        units: [
          { id: 'unit_u1', type: 'PROFESSIONAL_INFANTRY' as any, count: 1800, maxCount: 2000, strength: 100, morale: 95, experience: 20, equipmentQuality: 40, supplyConsumed: 2, upkeepCost: 10, formation: 'STANDARD', isMounted: false, isRanged: false, hasArmor: 'NONE' as any, specialAbility: null }
        ],
        location: this.provinces['prov_1'].coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 95,
        discipline: 60,
        experience: 15,
        stance: 'BESIEGE',
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      };

      storyText = `REBEL! Sir ${charName} owns no castle. You lead a powerful revolt of 1,800 peasant liberating forces inside Valedor! Sieze the castles and turn the tables!`;

    } else if (situation === 'CRUSADER') {
      this.provinces['prov_3'].ownerId = 'player';
      this.provinces['prov_3'].controlledBy = 'player';
      this.provinces['prov_3'].loyalty = 30; 
      this.characters['player'].landedProvinceIds = ['prov_3'];

      this.provinces['prov_1'].ownerId = 'vassal_nephew';
      this.provinces['prov_1'].controlledBy = 'vassal_nephew';
      this.characters['vassal_nephew'].landedProvinceIds = ['prov_1'];

      this.provinces['prov_5'].ownerId = 'vassal_bishop'; 
      this.provinces['prov_5'].controlledBy = 'vassal_bishop';
      this.characters['vassal_bishop'].landedProvinceIds = ['prov_5'];

      this.provinces['prov_2'].ownerId = 'vassal_merchant';
      this.provinces['prov_2'].controlledBy = 'vassal_merchant';
      this.characters['vassal_merchant'].landedProvinceIds = ['prov_2'];

      this.provinces['prov_4'].ownerId = 'enemy_lord';

      this.treasury = {
        goldBalance: 2000,
        goldPerTick: -5,
        taxRevenue: 25,
        tradeIncome: 0,
        tributeIncome: 0,
        militaryUpkeep: 30,
        buildingUpkeep: 0,
        courtUpkeep: 0,
        debtRepayment: 0,
        minters: 1,
        inflationRate: 1.0,
        debtAmount: 0,
        debtCreditorId: null,
        coinsInCirculation: 110000
      };

      this.armies['army_1'] = {
        id: 'army_1',
        name: 'The Templer Retinue',
        realmId: 'realm_1',
        commanderId: 'player',
        officerIds: [],
        units: [
          { id: 'unit_u1', type: 'HEAVY_CAVALRY_KNIGHTS' as any, count: 500, maxCount: 500, strength: 100, morale: 98, experience: 40, equipmentQuality: 90, supplyConsumed: 3, upkeepCost: 20, formation: 'WEDGE', isMounted: true, isRanged: false, hasArmor: 'PLATE' as any, specialAbility: null },
          { id: 'unit_u2', type: 'PROFESSIONAL_INFANTRY' as any, count: 300, maxCount: 500, strength: 100, morale: 95, experience: 30, equipmentQuality: 80, supplyConsumed: 2, upkeepCost: 10, formation: 'STANDARD', isMounted: false, isRanged: false, hasArmor: 'CHAINMAIL' as any, specialAbility: null }
        ],
        location: this.provinces['prov_3'].coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 98,
        discipline: 88,
        experience: 35,
        stance: 'DEFEND',
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      };

      if (!this.characters['player'].traits.some((t: any) => t.id === 'ZEALOUS')) {
        this.characters['player'].traits.push(TRAIT_DEFINITIONS['ZEALOUS']);
      }

      storyText = `Crusader Lord ${charName} defender of Kareth. With 2000 gold and 800 holy warriors, guard the sacred heights! Beware, local peasant loyalty is critically low (30%).`;
    }

    this.chronicleSystem.entries = [];
    this.chronicleSystem.add(1142, 250, storyText, 'CRITICAL');
    
    // Initialize full NPC roster
    this.initializeAllNPCs();
  }

  initializeAllNPCs() {
    // 1. Spouses & Heirs (Player's dynasty)
    const pChar = this.characters['player'];
    if (pChar) {
      this.characters['spouse_player'] = {
        id: 'spouse_player',
        firstName: pChar.gender === 'MALE' ? 'Lady Catherine' : 'Lord William',
        lastName: pChar.lastName,
        dynastyId: pChar.dynastyId,
        isPlayer: false,
        gender: pChar.gender === 'MALE' ? 'FEMALE' : 'MALE',
        age: 24,
        health: 100,
        fertility: 90,
        isPregnant: false,
        isAlive: true,
        causeOfDeath: null,
        deathDate: null,
        birthProvinceId: pChar.birthProvinceId,
        religion: pChar.religion,
        culture: pChar.culture,
        languagesSpoken: [...pChar.languagesSpoken],
        title: { id: 'title_spouse', name: 'Consort Spouse' },
        position: null,
        traits: [TRAIT_DEFINITIONS['KIND'], TRAIT_DEFINITIONS['TEMPERATE']].filter(Boolean),
        virtues: [],
        flaws: [],
        secretTrait: null,
        fatherId: null,
        motherId: null,
        spouseId: 'player',
        childrenIds: ['heir_player'],
        siblingIds: [],
        loverIds: [],
        enemyIds: [],
        allyIds: [],
        mentorId: null,
        diplomacy: 14,
        martial: 6,
        stewardship: 13,
        intrigue: 9,
        learning: 12,
        piety: 60,
        ambition: 'LEGACY',
        opinion: { 'player': 80 },
        suspicion: {},
        memories: [],
        traumaIds: [],
        primaryTitle: null,
        heldTitles: [],
        landedProvinceIds: [],
        goldHoldings: 0
      };

      this.characters['heir_player'] = {
        id: 'heir_player',
        firstName: 'Prince William',
        lastName: pChar.lastName,
        dynastyId: pChar.dynastyId,
        isPlayer: false,
        gender: 'MALE',
        age: 8,
        health: 100,
        fertility: 85,
        isPregnant: false,
        isAlive: true,
        causeOfDeath: null,
        deathDate: null,
        birthProvinceId: pChar.birthProvinceId,
        religion: pChar.religion,
        culture: pChar.culture,
        languagesSpoken: [...pChar.languagesSpoken],
        title: { id: 'title_heir', name: 'Prince' },
        position: null,
        traits: [TRAIT_DEFINITIONS['QUICK'], TRAIT_DEFINITIONS['HONEST']].filter(Boolean),
        virtues: [],
        flaws: [],
        secretTrait: null,
        fatherId: 'player',
        motherId: 'spouse_player',
        spouseId: null,
        childrenIds: [],
        siblingIds: [],
        loverIds: [],
        enemyIds: [],
        allyIds: [],
        mentorId: null,
        diplomacy: 8,
        martial: 7,
        stewardship: 8,
        intrigue: 5,
        learning: 10,
        piety: 40,
        ambition: 'LEGACY',
        opinion: { 'player': 90 },
        suspicion: {},
        memories: [],
        traumaIds: [],
        primaryTitle: null,
        heldTitles: [],
        landedProvinceIds: [],
        goldHoldings: 0
      };

      pChar.spouseId = 'spouse_player';
      pChar.childrenIds = ['heir_player'];
    }

    // 2. Court Advisors (Player's Council)
    this.characters['advisor_chancellor'] = {
      id: 'advisor_chancellor',
      firstName: 'Lord Vane',
      lastName: 'Abernathy',
      dynastyId: 'dyn_vass_vet',
      isPlayer: false,
      gender: 'MALE',
      age: 41,
      health: 95,
      fertility: 50,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon', 'Latin'],
      title: null,
      position: { id: 'pos_chancellor', name: 'Chancellor' },
      traits: [TRAIT_DEFINITIONS['HONEST'], TRAIT_DEFINITIONS['PATIENT']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 14,
      martial: 5,
      stewardship: 10,
      intrigue: 7,
      learning: 11,
      piety: 50,
      ambition: 'POWER',
      opinion: { 'player': 50 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 200
    };

    this.characters['advisor_marshal'] = {
      id: 'advisor_marshal',
      firstName: 'Sir Kaelen',
      lastName: 'Gallowglass',
      dynastyId: 'dyn_vass_vet',
      isPlayer: false,
      gender: 'MALE',
      age: 38,
      health: 100,
      fertility: 60,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon'],
      title: null,
      position: { id: 'pos_marshal', name: 'Marshal' },
      traits: [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['WRATHFUL']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 6,
      martial: 18,
      stewardship: 7,
      intrigue: 8,
      learning: 6,
      piety: 30,
      ambition: 'LEGACY',
      opinion: { 'player': 60 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 150
    };

    this.characters['advisor_spymaster'] = {
      id: 'advisor_spymaster',
      firstName: 'Silas',
      lastName: 'Blackwood',
      dynastyId: 'dyn_vass_sch',
      isPlayer: false,
      gender: 'MALE',
      age: 29,
      health: 90,
      fertility: 65,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon', 'Latin'],
      title: null,
      position: { id: 'pos_spymaster', name: 'Spymaster' },
      traits: [TRAIT_DEFINITIONS['DECEITFUL'], TRAIT_DEFINITIONS['PARANOID']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 8,
      martial: 9,
      stewardship: 8,
      intrigue: 16,
      learning: 11,
      piety: 20,
      ambition: 'REVENGE',
      opinion: { 'player': 30 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 100
    };

    this.characters['advisor_treasurer'] = {
      id: 'advisor_treasurer',
      firstName: 'Master Thade',
      lastName: 'Garnier',
      dynastyId: 'dyn_vass_mer',
      isPlayer: false,
      gender: 'MALE',
      age: 47,
      health: 88,
      fertility: 50,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon'],
      title: null,
      position: { id: 'pos_treasurer', name: 'Treasurer' },
      traits: [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['DILIGENT']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 9,
      martial: 4,
      stewardship: 14,
      intrigue: 10,
      learning: 9,
      piety: 35,
      ambition: 'WEALTH',
      opinion: { 'player': 40 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 500
    };

    this.characters['advisor_priest'] = {
      id: 'advisor_priest',
      firstName: 'Father Martin',
      lastName: 'Luther',
      dynastyId: 'dyn_vass_bis',
      isPlayer: false,
      gender: 'MALE',
      age: 52,
      health: 92,
      fertility: 0,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon', 'Latin'],
      title: null,
      position: { id: 'pos_priest', name: 'Spiritual Advisor' },
      traits: [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['HUMBLE']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 11,
      martial: 3,
      stewardship: 9,
      intrigue: 7,
      learning: 15,
      piety: 120,
      ambition: 'PIETY',
      opinion: { 'player': 45 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 50
    };

    // 3. Clergy NPCs
    this.characters['clergy_high_priest'] = {
      id: 'clergy_high_priest',
      firstName: 'Pope Benedictus',
      lastName: 'Roma',
      dynastyId: 'dyn_vass_bis',
      isPlayer: false,
      gender: 'MALE',
      age: 63,
      health: 85,
      fertility: 0,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_3',
      religion: 'christianity',
      culture: 'Latin',
      languagesSpoken: ['Latin'],
      title: { id: 'title_high_priest', name: 'Pope' },
      position: null,
      traits: [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['PROUD']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 15,
      martial: 5,
      stewardship: 12,
      intrigue: 13,
      learning: 19,
      piety: 500,
      ambition: 'PIETY',
      opinion: { 'player': 20 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 5000
    };

    // 4. Merchant & Guild NPCs
    this.characters['npc_guild_master'] = {
      id: 'npc_guild_master',
      firstName: 'Guild Master Thomas',
      lastName: 'Mason',
      dynastyId: 'dyn_vass_mer',
      isPlayer: false,
      gender: 'MALE',
      age: 46,
      health: 91,
      fertility: 55,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon'],
      title: { id: 'title_guild_master', name: 'Guild Master' },
      position: null,
      traits: [TRAIT_DEFINITIONS['DILIGENT'], TRAIT_DEFINITIONS['GREEDY']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 12,
      martial: 6,
      stewardship: 16,
      intrigue: 10,
      learning: 10,
      piety: 40,
      ambition: 'WEALTH',
      opinion: { 'player': 15 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 800
    };

    this.characters['npc_banker'] = {
      id: 'npc_banker',
      firstName: 'Solomon',
      lastName: 'Lombardy',
      dynastyId: 'dyn_vass_mer',
      isPlayer: false,
      gender: 'MALE',
      age: 50,
      health: 89,
      fertility: 40,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_4',
      religion: 'christianity',
      culture: 'Latin',
      languagesSpoken: ['Latin'],
      title: { id: 'title_banker', name: 'Master Banker' },
      position: null,
      traits: [TRAIT_DEFINITIONS['PATIENT'], TRAIT_DEFINITIONS['GREEDY']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 13,
      martial: 4,
      stewardship: 19,
      intrigue: 12,
      learning: 11,
      piety: 30,
      ambition: 'WEALTH',
      opinion: { 'player': 25 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 12000
    };

    // 5. Military NPCs
    this.characters['npc_general'] = {
      id: 'npc_general',
      firstName: 'General James',
      lastName: 'Hawk',
      dynastyId: 'dyn_vass_vet',
      isPlayer: false,
      gender: 'MALE',
      age: 43,
      health: 98,
      fertility: 60,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_1',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon'],
      title: { id: 'title_general', name: 'General' },
      position: null,
      traits: [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 8,
      martial: 16,
      stewardship: 8,
      intrigue: 11,
      learning: 8,
      piety: 25,
      ambition: 'POWER',
      opinion: { 'player': 40 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 150
    };

    this.characters['npc_mercenary_captain'] = {
      id: 'npc_mercenary_captain',
      firstName: 'Captain Hawkwood',
      lastName: 'FreeCompany',
      dynastyId: 'dyn_vass_vet',
      isPlayer: false,
      gender: 'MALE',
      age: 39,
      health: 99,
      fertility: 50,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_2',
      religion: 'christianity',
      culture: 'Norse',
      languagesSpoken: ['Norse', 'Saxon'],
      title: { id: 'title_merc_capt', name: 'Mercenary Captain' },
      position: null,
      traits: [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['ARBITRARY']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 10,
      martial: 17,
      stewardship: 11,
      intrigue: 12,
      learning: 7,
      piety: 15,
      ambition: 'WEALTH',
      opinion: { 'player': 0 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 2000
    };

    this.characters['npc_bandit_chief'] = {
      id: 'npc_bandit_chief',
      firstName: 'Robin',
      lastName: 'Outlaws',
      dynastyId: 'dyn_vass_loc',
      isPlayer: false,
      gender: 'MALE',
      age: 28,
      health: 100,
      fertility: 75,
      isPregnant: false,
      isAlive: true,
      causeOfDeath: null,
      deathDate: null,
      birthProvinceId: 'prov_5',
      religion: 'christianity',
      culture: 'Saxon',
      languagesSpoken: ['Saxon'],
      title: { id: 'title_bandit_chief', name: 'Bandit Chief' },
      position: null,
      traits: [TRAIT_DEFINITIONS['AGILE'], TRAIT_DEFINITIONS['DECEITFUL']].filter(Boolean),
      virtues: [],
      flaws: [],
      secretTrait: null,
      fatherId: null,
      motherId: null,
      spouseId: null,
      childrenIds: [],
      siblingIds: [],
      loverIds: [],
      enemyIds: [],
      allyIds: [],
      mentorId: null,
      diplomacy: 11,
      martial: 14,
      stewardship: 6,
      intrigue: 15,
      learning: 8,
      piety: 10,
      ambition: 'FREEDOM',
      opinion: { 'player': -30 },
      suspicion: {},
      memories: [],
      traumaIds: [],
      primaryTitle: null,
      heldTitles: [],
      landedProvinceIds: [],
      goldHoldings: 50
    };

    // 6. Foreign Rulers (Rival Lords)
    const rivals = [
      { id: 'foreign_expansionist', first: 'King Ethelred', last: 'Saxon', type: 'THE EXPANSIONIST KING', agenda: 'EXPANSION', stats: { diplomacy: 12, martial: 17, stewardship: 11, intrigue: 9, learning: 9 }, traits: ['BRAVE', 'AMBITIOUS'] },
      { id: 'foreign_isolationist', first: 'Earl Bernard', last: 'Mercia', type: 'THE ISOLATIONIST', agenda: 'CONSOLIDATION', stats: { diplomacy: 10, martial: 13, stewardship: 15, intrigue: 9, learning: 12 }, traits: ['PATIENT', 'TEMPERATE'] },
      { id: 'foreign_holy_crusader', first: 'Duke Bohemond', last: 'Taranto', type: 'THE HOLY CRUSADER', agenda: 'HOLY_WAR', stats: { diplomacy: 13, martial: 16, stewardship: 10, intrigue: 8, learning: 11 }, traits: ['BRAVE', 'ZEALOUS'] },
      { id: 'foreign_schemer', first: 'Duchess Matilda', last: 'Canossa', type: 'THE SCHEMER QUEEN', agenda: 'CONSOLIDATION', stats: { diplomacy: 14, martial: 9, stewardship: 11, intrigue: 18, learning: 14 }, traits: ['DECEITFUL', 'PARANOID'] },
      { id: 'foreign_mercantile', first: 'Doge Alvise', last: 'Mocenigo', type: 'THE MERCANTILE REPUBLIC', agenda: 'TRADE', stats: { diplomacy: 15, martial: 8, stewardship: 19, intrigue: 13, learning: 11 }, traits: ['GREEDY', 'TEMPERATE'] },
      { id: 'foreign_barbarian', first: 'Chieftain Ragnar', last: 'Lothbrok', type: 'THE BARBARIAN CHIEFTAIN', agenda: 'EXPANSION', stats: { diplomacy: 7, martial: 18, stewardship: 7, intrigue: 12, learning: 6 }, traits: ['WRATHFUL', 'BRAVE'] },
      { id: 'foreign_vassal_rebel', first: 'Count Robert', last: 'Fell', type: 'THE VASSAL REBEL KING', agenda: 'DEFENSE', stats: { diplomacy: 11, martial: 14, stewardship: 10, intrigue: 13, learning: 9 }, traits: ['PARANOID', 'HONEST'] },
      { id: 'foreign_puppet', first: 'Lord Charles', last: 'Valois', type: 'THE PUPPET RULER', agenda: 'TRADE', stats: { diplomacy: 11, martial: 7, stewardship: 8, intrigue: 15, learning: 10 }, traits: ['LAZY', 'SLOW'] }
    ];

    rivals.forEach(r => {
      const resolvedTraits = r.traits.map(t => TRAIT_DEFINITIONS[t]).filter(Boolean);
      this.characters[r.id] = {
        id: r.id,
        firstName: r.first,
        lastName: r.last,
        dynastyId: 'dyn_enemy',
        isPlayer: false,
        gender: 'MALE',
        age: 35 + Math.floor(this.rng.next() * 20),
        health: 100,
        fertility: 70,
        isPregnant: false,
        isAlive: true,
        causeOfDeath: null,
        deathDate: null,
        birthProvinceId: 'prov_4',
        religion: 'christianity',
        culture: 'Latin',
        languagesSpoken: ['Latin'],
        title: { id: 'title_' + r.id, name: r.type.replace('THE ', '') },
        position: null,
        traits: resolvedTraits,
        virtues: [],
        flaws: [],
        secretTrait: null,
        fatherId: null,
        motherId: null,
        spouseId: null,
        childrenIds: [],
        siblingIds: [],
        loverIds: [],
        enemyIds: ['player'],
        allyIds: [],
        mentorId: null,
        diplomacy: r.stats.diplomacy,
        martial: r.stats.martial,
        stewardship: r.stats.stewardship,
        intrigue: r.stats.intrigue,
        learning: r.stats.learning,
        piety: 50,
        ambition: r.agenda as any,
        opinion: { 'player': -30 - Math.floor(this.rng.next() * 30) },
        suspicion: { 'player': 20 },
        memories: [
          { id: 'mem_' + r.id + '_1', description: 'Established dynamic court with player dynasty in vicinity.', tick: 0 }
        ],
        traumaIds: [],
        primaryTitle: { id: 'title_' + r.id, name: 'Sovereign' },
        heldTitles: [{ id: 'title_' + r.id, name: 'Sovereign' }],
        landedProvinceIds: [],
        goldHoldings: 1500,
        archetype: r.type,
        desc: r.first + " executes rule with high strategic intent."
      } as any;
    });

    // 7. Auto-seed rulers for all interactive provinces (including Aurelia and Vareth)
    Object.values(this.provinces).forEach(prov => {
      const rulerId = prov.ownerId;
      if (rulerId && rulerId !== 'player' && !this.characters[rulerId]) {
        // Build customized details based on continent
        let first = 'Lord';
        let last = 'Noble';
        let culture = 'Saxon';
        let titleName = 'Lord';
        let goldHoldings = 1000;
        let stats = { diplomacy: 10, martial: 10, stewardship: 10, intrigue: 10, learning: 10 };
        let agenda = 'CONSOLIDATION';

        if (prov.continent === 'Vareth') {
          if (prov.id === 'prov_v1') {
            const firstNames = ['Kaelen', 'Cassian', 'Valerius', 'Malakor', 'Theron', 'Darius'];
            const lastNames = ['Rhakar', 'von Rhak', 'Iron-Spire', 'Skywall'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Rhakari';
            titleName = 'Kaiser';
            stats = { diplomacy: 12, martial: 18, stewardship: 10, intrigue: 12, learning: 10 };
            agenda = 'POWER';
            goldHoldings = 2500;
          } else if (prov.id === 'prov_v2') {
            const firstNames = ['Vito', 'Kareth', 'Alvise', 'Mocenigo', 'Gaston', 'Balthasar'];
            const lastNames = ['Mocenigo', 'Foscari', 'Valier', 'Karethi'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Karethi';
            titleName = 'Grand Doge';
            stats = { diplomacy: 17, martial: 7, stewardship: 19, intrigue: 14, learning: 11 };
            agenda = 'WEALTH';
            goldHoldings = 5000;
          } else if (prov.id === 'prov_v3') {
            const firstNames = ['Armand', 'Simeon', 'Gervais', 'Solmere', 'Renaud', 'Louis'];
            const lastNames = ['de Solmere', 'Valois', 'Beaufort', 'Solmer'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Solmerian';
            titleName = 'Sovereign King';
            stats = { diplomacy: 14, martial: 11, stewardship: 15, intrigue: 9, learning: 13 };
            agenda = 'LEGACY';
            goldHoldings = 2200;
          } else if (prov.id === 'prov_v4') {
            const firstNames = ['Temujin', 'Ulan', 'Batu', 'Yesugei', 'Chagatai', 'Kadan'];
            const lastNames = ['Ulan-Khan', 'Steppe-Born', 'Bat-Erdene', 'Ogedei'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Ulan';
            titleName = 'Khagan';
            stats = { diplomacy: 9, martial: 19, stewardship: 7, intrigue: 11, learning: 8 };
            agenda = 'EXPANSION';
            goldHoldings = 1000;
          } else {
            const firstNames = ['Yuri', 'Talsgar', 'Volden', 'Stark', 'Olaf', 'Snorri'];
            const lastNames = ['Talsgar', 'Frost-Born', 'Grey-Watcher', 'Pine-Splitter'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Talsgari';
            titleName = 'High Chieftain';
            stats = { diplomacy: 8, martial: 16, stewardship: 10, intrigue: 9, learning: 9 };
            agenda = 'FREEDOM';
            goldHoldings = 800;
          }
        } else if (prov.continent === 'Nythara') {
          if (prov.id === 'prov_n1') {
            const firstNames = ['Bernardo', 'Lucio', 'Marco', 'Andrea', 'Piero', 'Niccolo'];
            const lastNames = ['Talassar', 'Contarini', 'Dandolo', 'Loredan'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Talassarian';
            titleName = 'Noble Doge';
            stats = { diplomacy: 18, martial: 9, stewardship: 18, intrigue: 15, learning: 10 };
            agenda = 'WEALTH';
            goldHoldings = 4500;
          } else if (prov.id === 'prov_n2') {
            const firstNames = ['Khemera', 'Jayavarman', 'Orun', 'Suryavarman', 'Varman'];
            const lastNames = ['of Orun', 'Great-River', 'Sunder-Root', 'Sun-King'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Orunian';
            titleName = 'Sun King';
            stats = { diplomacy: 12, martial: 15, stewardship: 16, intrigue: 10, learning: 12 };
            agenda = 'LEGACY';
            goldHoldings = 3000;
          } else if (prov.id === 'prov_n3') {
            const firstNames = ['Bartholomew', 'Morgan', 'Drake', 'Hawkins', 'Avery'];
            const lastNames = ['the Corsair', 'Black-Flag', 'Skerry-Bane', 'Iron-Sides'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Skerrian';
            titleName = 'High Captain';
            stats = { diplomacy: 8, martial: 18, stewardship: 11, intrigue: 14, learning: 8 };
            agenda = 'POWER';
            goldHoldings = 3200;
          } else if (prov.id === 'prov_n4') {
            const firstNames = ['Maras', 'Tidal', 'Aranya', 'Jungle-Born', 'Kaelm'];
            const lastNames = ['Canopy', 'Silt', 'Vine-Breaker', 'Rainforest'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Ranarian';
            titleName = 'Rain Chieftain';
            stats = { diplomacy: 11, martial: 14, stewardship: 10, intrigue: 13, learning: 11 };
            agenda = 'FREEDOM';
            goldHoldings = 900;
          } else {
            const firstNames = ['Sargon', 'Ophir', 'Hiram', 'Solomon', 'Zabir'];
            const lastNames = ['the Gilded', 'Plateau-Lord', 'Mine-Master', 'Twin-Peak'];
            first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
            last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
            culture = 'Plateau';
            titleName = 'High Warden';
            stats = { diplomacy: 14, martial: 11, stewardship: 17, intrigue: 11, learning: 12 };
            agenda = 'CONSOLIDATION';
            goldHoldings = 4000;
          }
        } else {
          // Aurelia AI
          const firstNames = ['Berold', 'Robert', 'Geoffrey', 'Eustace', 'Audoin', 'Matilda'];
          const lastNames = ['Valerius', 'Fell', 'Gallowglass', 'Abernathy', 'Hearth-Keeper'];
          first = firstNames[Math.floor(this.rng.next() * firstNames.length)];
          last = lastNames[Math.floor(this.rng.next() * lastNames.length)];
          culture = prov.id === 'prov_3' ? 'Celtic' : 'Latin';
          titleName = 'Baron';
          stats = { diplomacy: 11, martial: 11, stewardship: 11, intrigue: 11, learning: 11 };
          agenda = 'CONSOLIDATION';
          goldHoldings = 1500;
        }

        // Determine religion based on continent
        let provReligion = 'christianity';
        if (prov.continent === 'Vareth' && (prov.id === 'prov_v4' || prov.id === 'prov_v5')) {
          provReligion = 'paganism';
        } else if (prov.continent === 'Nythara') {
          if (prov.id === 'prov_n4') {
            provReligion = 'paganism';
          } else if (prov.id === 'prov_n3') {
            provReligion = 'heresy';
          }
        }

        // Seed character
        this.characters[rulerId] = {
          id: rulerId,
          firstName: first,
          lastName: last,
          dynastyId: 'dyn_' + prov.id,
          isPlayer: false,
          gender: 'MALE',
          age: 30 + Math.floor(this.rng.next() * 25),
          health: 100,
          fertility: 70,
          isPregnant: false,
          isAlive: true,
          causeOfDeath: null,
          deathDate: null,
          birthProvinceId: prov.id,
          religion: provReligion,
          culture: culture,
          languagesSpoken: [culture, 'Latin'],
          title: { id: 'title_' + rulerId, name: titleName },
          position: null,
          traits: [],
          virtues: [],
          flaws: [],
          secretTrait: null,
          fatherId: null,
          motherId: null,
          spouseId: null,
          childrenIds: [],
          siblingIds: [],
          loverIds: [],
          enemyIds: [],
          allyIds: [],
          mentorId: null,
          diplomacy: stats.diplomacy,
          martial: stats.martial,
          stewardship: stats.stewardship,
          intrigue: stats.intrigue,
          learning: stats.learning,
          piety: 40,
          ambition: agenda as any,
          opinion: { 'player': -10 },
          suspicion: {},
          memories: [],
          traumaIds: [],
          primaryTitle: { id: 'title_' + rulerId, name: titleName },
          heldTitles: [{ id: 'title_' + rulerId, name: titleName }],
          landedProvinceIds: [prov.id],
          goldHoldings: goldHoldings,
          desc: `${first} ${last} rules ${prov.name} with absolute local authority.`
        } as any;

        // Seed dynasty
        let coaColors = ['gold', 'purple'];
        let coaCharges = ['crown'];
        if (prov.continent === 'Vareth') {
          coaColors = ['darkred', 'charcoal'];
          coaCharges = ['sword'];
        } else if (prov.continent === 'Nythara') {
          coaColors = ['blue', 'gold'];
          coaCharges = ['lion'];
        }

        this.dynasties['dyn_' + prov.id] = {
          id: 'dyn_' + prov.id,
          name: last,
          coatOfArms: { colors: coaColors, charges: coaCharges } as any,
          founderId: rulerId,
          foundedDate: 1050,
          headId: rulerId,
          members: [rulerId],
          extinct: false,
          prestigeLevel: 250,
          cultureId: culture.toLowerCase(),
          homeProvinceId: prov.id,
          renown: 100,
          legendaryAncestors: []
        };
      }
    });
  }

  loadGameSnapshot(snapshot: any) {
    if (!snapshot) return;
    
    // Restore clock
    if (snapshot.currentDay !== undefined && this.clock) {
      this.clock.currentDay = snapshot.currentDay;
    }
    if (snapshot.currentYear !== undefined && this.clock) {
      this.clock.currentYear = snapshot.currentYear;
    }

    // Restore resources
    if (snapshot.resources) {
      this.resources.food = snapshot.resources.food ?? this.resources.food;
      this.resources.iron = snapshot.resources.iron ?? this.resources.iron;
      this.resources.wood = snapshot.resources.wood ?? this.resources.wood;
      this.resources.stone = snapshot.resources.stone ?? this.resources.stone;
      this.resources.manpower = snapshot.resources.manpower ?? this.resources.manpower;
    }

    // Restore treasury
    if (snapshot.treasury) {
      this.treasury = {
        ...this.treasury,
        ...snapshot.treasury
      };
    } else if (snapshot.resources && snapshot.resources.gold !== undefined) {
      if (!this.treasury) {
        this.treasury = {
          goldBalance: snapshot.resources.gold,
          goldPerTick: 0,
          taxRevenue: 0,
          tradeIncome: 0,
          tributeIncome: 0,
          militaryUpkeep: 0,
          buildingUpkeep: 0,
          courtUpkeep: 0,
          debtRepayment: 0,
          minters: 1,
          inflationRate: 1.0,
          debtAmount: 0,
          debtCreditorId: null,
          coinsInCirculation: 10000
        };
      } else {
        this.treasury.goldBalance = snapshot.resources.gold;
      }
    }

    // Restore collections
    if (snapshot.provinces) this.provinces = snapshot.provinces;
    if (snapshot.armies) this.armies = snapshot.armies;
    if (snapshot.characters) this.characters = snapshot.characters;
    if (snapshot.dynasties) this.dynasties = snapshot.dynasties;
    if (snapshot.battles) this.battles = snapshot.battles;
    if (snapshot.sieges) this.sieges = snapshot.sieges;
    if (snapshot.factions) this.factions = snapshot.factions;
    if (snapshot.plots) this.plots = snapshot.plots;
    if (snapshot.religions) this.religions = snapshot.religions;
    if (snapshot.treaties) this.treaties = snapshot.treaties;
    if (snapshot.convoys) this.convoys = snapshot.convoys;

    // Restore tech
    if (snapshot.unlockedTechs) this.unlockedTechs = snapshot.unlockedTechs;
    if (snapshot.activeResearch !== undefined) this.activeResearch = snapshot.activeResearch;

    // Restore chronicle
    if (snapshot.chronicle && this.chronicleSystem) {
      this.chronicleSystem.entries = snapshot.chronicle;
    }
  }

  handleAction(action: { type: string, payload: any }) {
    if (!action) return;
    
    switch (action.type) {
      case 'AURELIA_SIM_ACTION': {
        if (this.aureliaSim) {
          this.aureliaSim.handleCustomAction(action.payload);
        }
        break;
      }
      case 'LOAD_GAME_SAVE': {
        this.loadGameSnapshot(action.payload);
        break;
      }
      case 'GENERATE_NPC': {
        const { roleType, overrides } = action.payload;
        const npc = generateDynamicNPC(roleType, overrides || {});
        this.characters[npc.id] = npc;
        
        // Log this event in the chronicle
        this.chronicleSystem.add(
          this.clock.currentYear,
          this.clock.currentDay,
          `A new ${npc.title?.name || 'courtier'}, ${npc.firstName} ${npc.lastName}, has been summoned to court.`,
          'NORMAL'
        );
        break;
      }
      case 'UPDATE_OPINION': {
        const { charId, amount } = action.payload;
        if (this.characters[charId]) {
          const char = this.characters[charId];
          if (!char.opinion) char.opinion = {};
          char.opinion['player'] = Math.max(-100, Math.min(100, (char.opinion['player'] || 0) + amount));
        }
        break;
      }
      case 'SPEND_GOLD': {
        const { amount } = action.payload;
        this.treasury.goldBalance = Math.max(0, this.treasury.goldBalance - amount);
        break;
      }
      case 'DISPATCH_MANUAL_CONVOY': {
        const { originId, food, wood, stone, iron } = action.payload;
        const province = this.provinces[originId] || Object.values(this.provinces).find(p => p.ownerId === 'player');
        if (province) {
          const capitalProv = this.provinces['prov_1'] || Object.values(this.provinces).find(p => p.ownerId === 'player');
          if (capitalProv && capitalProv.id !== province.id) {
            const destinationCoords = capitalProv.coords;
            const dist = Math.max(1, Math.floor(Math.sqrt((province.coords.q - destinationCoords.q)**2 + (province.coords.r - destinationCoords.r)**2)));
            const routePath: any[] = [];
            for (let i = 0; i <= dist; i++) {
              const t = i / dist;
              routePath.push({
                q: Math.round(province.coords.q + (destinationCoords.q - province.coords.q) * t),
                r: Math.round(province.coords.r + (destinationCoords.r - province.coords.r) * t),
                s: Math.round(province.coords.s + (destinationCoords.s - province.coords.s) * t),
              });
            }

            const cargo = {
              food: food || 40,
              wood: wood || 30,
              stone: stone || 20,
              iron: iron || 15
            };

            const convoyId = 'convoy_' + nanoid();
            const newConvoy = {
              id: convoyId,
              tradeRouteId: null,
              militaryArmyId: null,
              cargo: {
                GRAIN: cargo.food,
                TIMBER: cargo.wood,
                STONE: cargo.stone,
                IRON_INGOTS: cargo.iron,
              },
              origin: province.coords,
              destination: destinationCoords,
              currentLocation: province.coords,
              path: routePath,
              escort: null,
              speed: 1,
              isRaided: false,
              raidedByArmyId: null,
              rawCargo: cargo,
              progressIndex: 0,
              originProvinceName: province.name,
              status: 'ACTIVE',
              logs: [`Manual supply dispatch initiated from ${province.name}.`]
            };
            this.convoys[convoyId] = newConvoy as any;
            
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Sovereign emergency dispatch convoy departed from ${province.name} towards Capital.`,
              'NORMAL'
            );
          }
        }
        break;
      }
      case 'ADD_CHRONICLE': {
        const { text, type } = action.payload;
        this.chronicleSystem.add(
          this.clock.currentYear,
          this.clock.currentDay,
          text,
          type || 'NORMAL'
        );
        break;
      }
      case 'IMPRISON_CHARACTER': {
        const { charId } = action.payload;
        const c = this.characters[charId];
        if (c) {
          if (!c.opinion) c.opinion = {};
          c.opinion['player'] = Math.max(-100, (c.opinion['player'] || 0) - 30);
          c.title = { id: 'imprisoned', name: 'Prisoner' };
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `${c.firstName} ${c.lastName} has been arrested and cast into the dungeons.`,
            'URGENT'
          );
        }
        break;
      }
      case 'BANISH_CHARACTER': {
        const { charId } = action.payload;
        const b = this.characters[charId];
        if (b) {
          b.isAlive = false;
          b.causeOfDeath = 'Exile';
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `${b.firstName} ${b.lastName} has been banished and stripped of all titles.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'BURN_FOREST': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && (prov.terrain === 'DEEP_FOREST' || prov.terrain === 'FOREST')) {
          const oldTerrain = prov.terrain;
          prov.terrain = 'PLAINS' as any;
          prov.forestCoverage = 0;
          prov.loyalty = Math.max(0, prov.loyalty - 15); // Peasants angered by wild flames
          
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `The ancient forests of ${prov.name} have been set ablaze. The land has been permanently cleared for agriculture.`,
            'URGENT'
          );
        }
        break;
      }
      case 'CONSTRUCT_ROAD': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov) {
          prov.roadQuality = Math.min(100, (prov.roadQuality || 0) + 30);
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Royal stonemasons completed road construction projects in ${prov.name}. Movement speed drains reduced.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'LAUNCH_PLOT': {
        const { type, initiatorId, targetId, cost } = action.payload;
        this.treasury.goldBalance = Math.max(0, this.treasury.goldBalance - (cost || 0));
        
        const plotId = 'plot_' + Date.now();
        const newPlot = {
          id: plotId,
          type: type,
          initiatorId: initiatorId || 'player',
          targetId: targetId || 'enemy_lord',
          agentIds: [],
          progressPercent: 0,
          exposureRisk: type === 'ASSASSINATION' ? 3.0 : 1.2,
          potentialConsequences: [{ description: 'Severed diplomatic relations and threat of war' }],
          isExposed: false,
          outcomeId: null
        };
        this.plots[plotId] = newPlot as any;
        
        const plotNames: Record<string, string> = {
          'SPY_INFILTRATE': 'Espionage Infiltration',
          'ASSASSINATION': 'Assassination Conspiracy',
          'CLAIM_FORGERY': 'Sovereign Claim Fabrication'
        };
        const pName = plotNames[type] || 'Espionage Operation';
        
        this.chronicleSystem.add(
          this.clock.currentYear,
          this.clock.currentDay,
          `Decretum: Sponsored ${pName} against Lord Valerius. Spies are infiltrating key strongholds in the region.`,
          'URGENT'
        );
        break;
      }
      case 'BUILD_BRIDGE_CROSSING': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.terrain === 'RIVER_VALLEY') {
          prov.roadQuality = 100; // Road quality set to maximum to neutralize ford crossing costs
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `A monumental stone bridge has been constructed across the high rivers of ${prov.name}, overcoming seasonal floods.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'CLEAR_LAND': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && (prov.terrain === 'DEEP_FOREST' || prov.terrain === 'FOREST')) {
          prov.terrain = 'PLAINS' as any;
          prov.forestCoverage = 10;
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Landed serfs successfully cleared tree groves in ${prov.name}, rendering the soil fit for high-yield grains.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'QUARANTINE_PROVINCE': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov) {
          prov.quarantined = !prov.quarantined;
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Garrison guards in ${prov.name} have ${prov.quarantined ? 'sealed' : 'opened'} territorial checkpoints to control infection spread.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'BURN_INFECTED_AREAS': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.disease) {
          prov.disease.infectedCount = Math.floor(prov.disease.infectedCount * 0.5);
          prov.disease.severity = Math.max(10, prov.disease.severity - 20);
          
          const casualties = Math.min(250, Math.floor(prov.population.total * 0.05));
          prov.population.serfs = Math.max(10, prov.population.serfs - Math.floor(casualties * 0.8));
          prov.population.merchants = Math.max(10, prov.population.merchants - Math.floor(casualties * 0.2));
          prov.population.total = prov.population.serfs + prov.population.merchants + prov.population.clergy + prov.population.nobles;
          
          prov.loyalty = Math.max(5, prov.loyalty - 25);
          prov.population.mood = 'ANGRY';
          
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `A draconian decree led to the burning of contaminated wooden quarters in ${prov.name}, slaying infected subjects to contain the scourge.`,
            'CRITICAL'
          );
        }
        break;
      }
      case 'CALL_PHYSICIAN': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.disease) {
          prov.disease.severity = Math.max(5, prov.disease.severity - 30);
          this.treasury.goldBalance = Math.max(0, this.treasury.goldBalance - 150);
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `A learned plague doctor from the capital arrived in ${prov.name} to administer therapeutic treatments (-150 Gold).`,
            'NORMAL'
          );
        }
        break;
      }
      case 'PRAY_FOR_HEAVEN': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.disease) {
          prov.loyalty = Math.min(100, prov.loyalty + 15);
          prov.population.mood = 'CONTENT';
          
          prov.neighbors.forEach(nId => {
            const neighbor = this.provinces[nId];
            if (neighbor && !neighbor.disease && !neighbor.quarantined) {
              if (this.rng.next() < 0.50) {
                neighbor.disease = {
                  diseaseId: prov.disease!.diseaseId,
                  infectedCount: 15,
                  severity: Math.max(10, prov.disease!.severity - 10),
                  startedAt: this.clock.currentDay
                };
                this.chronicleSystem.add(
                  this.clock.currentYear,
                  this.clock.currentDay,
                  `Congregational prayers in ${prov.name} disseminated infections across borders to ${neighbor.name}.`,
                  'URGENT'
                );
              }
            }
          });
          
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Thousands of pious peasants in ${prov.name} gathered to hold solemn prayers for divine intervention against pestilence.`,
            'NORMAL'
          );
        }
        break;
      }
      case 'RAISE_LEVY': {
        const { provinceId } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.population.serfs > 600) {
          prov.population.serfs -= 500;
          prov.population.total -= 500;
          
          const season = this.clock.currentSeason;
          const isFamineRisk = season === 'SPRING' || season === 'AUTUMN';
          
          if (isFamineRisk) {
            prov.loyalty = Math.max(10, prov.loyalty - 30);
            prov.population.mood = 'ANGRY';
            this.alertSystem.queueAlert(`Angered peasants in ${prov.name} protest! Drafting agricultural workers during the ${season.toLowerCase()} planting/harvest cycle causes critical famine risk!`, 'CRITICAL');
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `A heavy war draft in ${prov.name} during the labor-critical ${season.toLowerCase()} cycle sparked deep agrarian unrest and famine risk.`,
              'URGENT'
            );
          } else {
            prov.loyalty = Math.max(20, prov.loyalty - 5);
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Consubstantial spearmen levies raised from the villages of ${prov.name} turned out for combat duty.`,
              'NORMAL'
            );
          }

          const existingArmy = Object.values(this.armies).find(a => 
            a.realmId === 'realm_1' && 
            a.location.q === prov.coords.q && 
            a.location.r === prov.coords.r
          );

          if (existingArmy) {
            const spearUnit = existingArmy.units.find(u => u.type === 'LEVY_SPEARMEN');
            if (spearUnit) {
              spearUnit.count += 500;
            } else {
              existingArmy.units.push({
                id: 'unit_spear_reinforce_' + nanoid(),
                type: 'LEVY_SPEARMEN' as any,
                count: 500,
                maxCount: 500,
                strength: 100,
                morale: 60,
                experience: 0,
                equipmentQuality: 30,
                supplyConsumed: 1,
                upkeepCost: 1,
                formation: 'STANDARD',
                isMounted: false,
                isRanged: false,
                hasArmor: 'NONE' as any,
                specialAbility: null
              });
            }
          } else {
            const armyId = 'army_levy_' + prov.id + '_' + this.clock.currentDay;
            this.armies[armyId] = {
              id: armyId,
              name: `${prov.name} Royal Levy`,
              realmId: 'realm_1',
              commanderId: 'player',
              officerIds: [],
              units: [
                {
                  id: 'unit_spear_' + armyId,
                  type: 'LEVY_SPEARMEN' as any,
                  count: 500,
                  maxCount: 500,
                  strength: 100,
                  morale: 60,
                  experience: 0,
                  equipmentQuality: 30,
                  supplyConsumed: 1,
                  upkeepCost: 1,
                  formation: 'STANDARD',
                  isMounted: false,
                  isRanged: false,
                  hasArmor: 'NONE' as any,
                  specialAbility: null
                }
              ],
              location: prov.coords,
              destination: null,
              path: [],
              movementPoints: 50,
              supplyLevel: 100,
              supplyConvoyId: null,
              morale: 60,
              discipline: 40,
              experience: 0,
              stance: 'DEFEND',
              orders: [],
              pendingOrders: [],
              isExhausted: false,
              frostbiteRisk: 0,
              diseases: [],
              deserterRate: 0,
              loot: 0,
              attritionDays: 0
            };
          }
        }
        break;
      }
      case 'CONSTRUCT_BUILDING': {
        const { provinceId, typeId } = action.payload;
        const prov = this.provinces[provinceId];
        const bType = BUILDING_TYPES[typeId];
        if (prov && bType) {
          if (this.treasury.goldBalance >= bType.cost.gold &&
              this.resources.wood >= bType.cost.wood &&
              this.resources.stone >= bType.cost.stone &&
              this.resources.manpower >= bType.cost.manpower) {
            
            this.treasury.goldBalance -= bType.cost.gold;
            this.resources.wood -= bType.cost.wood;
            this.resources.stone -= bType.cost.stone;
            this.resources.manpower -= bType.cost.manpower;

            if (!prov.constructionQueue) prov.constructionQueue = [];
            prov.constructionQueue.push({
              typeId: bType.id,
              daysLeft: bType.buildTimeDays,
              totalDays: bType.buildTimeDays
            });

            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Commissioned construction of ${bType.name} in ${prov.name} (-${bType.cost.gold} gold, -${bType.cost.wood} wood, -${bType.cost.stone} stone, -${bType.cost.manpower} manpower).`,
              'NORMAL'
            );
          }
        }
        break;
      }
      case 'CANCEL_CONSTRUCTION': {
        const { provinceId, index } = action.payload;
        const prov = this.provinces[provinceId];
        if (prov && prov.constructionQueue && prov.constructionQueue[index]) {
          const item = prov.constructionQueue[index];
          const bType = BUILDING_TYPES[item.typeId];
          if (bType) {
            this.treasury.goldBalance += bType.cost.gold;
            this.resources.wood += bType.cost.wood;
            this.resources.stone += bType.cost.stone;
            this.resources.manpower += bType.cost.manpower;

            prov.constructionQueue.splice(index, 1);

            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Canceled building project ${bType.name} in ${prov.name}. All construction resources fully refunded.`,
              'NORMAL'
            );
          }
        }
        break;
      }
      case 'START_RESEARCH': {
        const { techId } = action.payload;
        const tech = TECHNOLOGIES[techId];
        if (tech && !this.activeResearch) {
          if (this.treasury.goldBalance >= tech.cost.gold &&
              this.resources.manpower >= tech.cost.manpower) {
            
            this.treasury.goldBalance -= tech.cost.gold;
            this.resources.manpower -= tech.cost.manpower;

            this.activeResearch = {
              techId: tech.id,
              daysLeft: tech.cost.days,
              totalDays: tech.cost.days
            };

            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Initiated research on ${tech.name} (-${tech.cost.gold} gold, -${tech.cost.manpower} manpower). Scribes and clergymen are drafting legal/scientific scrolls.`,
              'NORMAL'
            );
          }
        }
        break;
      }
      case 'CANCEL_RESEARCH': {
        if (this.activeResearch) {
          const tech = TECHNOLOGIES[this.activeResearch.techId];
          if (tech) {
            this.treasury.goldBalance += tech.cost.gold;
            this.resources.manpower += tech.cost.manpower;

            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Research on ${tech.name} canceled. Research resources fully refunded to treasury and baronies.`,
              'NORMAL'
            );
          }
          this.activeResearch = null;
        }
        break;
      }
      case 'RECRUIT_REGIMENT': {
        const { armyId, type, count } = action.payload;
        const army = this.armies[armyId];
        if (army) {
          let goldCost = 150;
          let manpowerCost = 150;
          
          if (type.includes('CAVALRY') || type.includes('KNIGHTS')) {
            goldCost = 300;
            manpowerCost = 200;
          } else if (type.includes('ARCHER') || type.includes('LONGBOWMEN') || type.includes('CROSSBOWMEN')) {
            goldCost = 100;
            manpowerCost = 120;
          } else if (type.includes('SIEGE') || type.includes('TREBUCHET') || type.includes('MANGONEL')) {
            goldCost = 450;
            manpowerCost = 100;
          }

          if (this.treasury.goldBalance >= goldCost && this.resources.manpower >= manpowerCost) {
            this.treasury.goldBalance -= goldCost;
            this.resources.manpower -= manpowerCost;

            const existingUnit = army.units.find(u => u.type === type);
            if (existingUnit) {
              existingUnit.count += count;
              existingUnit.maxCount = Math.max(existingUnit.maxCount, existingUnit.count);
            } else {
              army.units.push({
                id: 'unit_' + nanoid(),
                type: type,
                count: count,
                maxCount: count,
                strength: 100,
                morale: 80,
                experience: 10,
                equipmentQuality: 75,
                supplyConsumed: type.includes('CAVALRY') ? 2 : 1,
                upkeepCost: type.includes('CAVALRY') ? 3 : 1,
                formation: 'STANDARD',
                isMounted: type.includes('CAVALRY') || type.includes('KNIGHTS'),
                isRanged: type.includes('ARCHER') || type.includes('LONGBOWMEN') || type.includes('CROSSBOWMEN'),
                hasArmor: type.includes('KNIGHTS') ? 'PLATE' as any : 'PADDED' as any,
                specialAbility: null
              });
            }

            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Recruited ${count} soldiers of type ${type.replace(/_/g, ' ')} for ${army.name} (-${goldCost} gold, -${manpowerCost} manpower).`,
              'NORMAL'
            );
          }
        }
        break;
      }
      case 'DIPLOMAT_MISSION': {
        const { charId, actionType } = action.payload;
        const target = this.characters[charId];
        if (target) {
          if (actionType === 'GIFT') {
            if (this.treasury.goldBalance >= 250) {
              this.treasury.goldBalance -= 250;
              if (!target.opinion) target.opinion = {};
              target.opinion['player'] = Math.min(100, (target.opinion['player'] || 0) + 20);
              this.chronicleSystem.add(
                this.clock.currentYear,
                this.clock.currentDay,
                `Sent a magnificent chest of gold ornaments to ${target.firstName} ${target.lastName}. Opinion raised to ${target.opinion['player']}.`,
                'NORMAL'
              );
            }
          } else if (actionType === 'INSULT') {
            if (!target.opinion) target.opinion = {};
            target.opinion['player'] = Math.max(-100, (target.opinion['player'] || 0) - 25);
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Dispatched a public scolding insult to ${target.firstName} ${target.lastName}! Relations soured dramatically.`,
              'URGENT'
            );
          } else if (actionType === 'ALLIANCE') {
            const playerDynasty = this.dynasties['dyn_player'];
            if (playerDynasty && playerDynasty.renown >= 40) {
              playerDynasty.renown -= 40;
              if (!target.opinion) target.opinion = {};
              target.opinion['player'] = Math.min(100, (target.opinion['player'] || 0) + 15);
              this.chronicleSystem.add(
                this.clock.currentYear,
                this.clock.currentDay,
                `Signed a mutual defense covenant with the house of ${target.firstName} ${target.lastName}.`,
                'NORMAL'
              );
            }
          }
        }
        break;
      }
      case 'COUNCIL_ASSIGNMENT': {
        const { advisorId, mission } = action.payload;
        if (this.treasury.goldBalance >= 100) {
          this.treasury.goldBalance -= 100;
          let chronicleText = `Your Council Advisor commenced specialized duties.`;
          
          if (mission === 'COLLECT_TAXES') {
            this.treasury.goldBalance += 350;
            chronicleText = `The Lord Treasurer collected back-due vassal tariffs across the fields, bringing +350 Gold to the treasury.`;
          } else if (mission === 'FOSTER_RELATIONS') {
            const playerDyn = this.dynasties['dyn_player'];
            if (playerDyn) playerDyn.renown += 15;
            chronicleText = `The Lord Chancellor sponsored grand banquets for regional bailiffs, raising national Prestige/Renown.`;
          } else if (mission === 'MUSTER_DRAFTS') {
            this.resources.manpower += 250;
            chronicleText = `The Lord Marshal commissioned standard militia inspection rosters, gaining +250 extra Reserve Manpower.`;
          }

          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            chronicleText,
            'NORMAL'
          );
        }
        break;
      }
      case 'CHURCH_TITHE': {
        const { type } = action.payload;
        if (type === 'PRAY') {
          const playerDyn = this.dynasties['dyn_player'];
          if (playerDyn) playerDyn.renown += 10;
          this.chronicleSystem.add(
            this.clock.currentYear,
            this.clock.currentDay,
            `Proclaimed the week as a day of prayer and sovereign contrition. Increased Royal Prestige.`,
            'NORMAL'
          );
        } else if (type === 'DONATE') {
          if (this.treasury.goldBalance >= 300) {
            this.treasury.goldBalance -= 300;
            const playerDyn = this.dynasties['dyn_player'];
            if (playerDyn) playerDyn.renown += 35;
            this.chronicleSystem.add(
              this.clock.currentYear,
              this.clock.currentDay,
              `Sponsored marble cathedral stained glass restorations (-300 Gold). Clergy favor and prestige rose significantly!`,
              'NORMAL'
            );
          }
        }
        break;
      }
    }
  }
}
