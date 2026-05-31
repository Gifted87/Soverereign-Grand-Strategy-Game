import type { GameLoop } from '../engine/GameLoop';
import { nanoid } from 'nanoid';

export interface SettlementUnit {
  id: string;
  name: string;
  type: 'HAMLET' | 'VILLAGE' | 'MARKET_TOWN' | 'FORTIFIED_CITY';
  population: number;
  efficiency: number; // 0 - 100%
  lastYield: number; // food produced
}

export interface AureliaPoliticalEntity {
  id: string;
  name: string;
  type: 'KINGDOM' | 'DUCHY' | 'CITY_STATE' | 'TRIBAL_CONFEDERATION' | 'THEOCRATIC_DOMAIN' | 'REPUBLIC' | 'EMPIRE_IN_DECLINE';
  capitalProvinceId: string;
  stability: number; // 0 - 100
  treasury: number;
  militaryPower: number;
  vassalCount: number;
  emblem: string;
  allianceId: string | null;
  tributeOwedTo: string | null;
}

export type ClimateBeltType = 'FAR_NORTH_TUNDRA' | 'NORTH_TEMPERATE_FOREST' | 'MIDLANDS_FERTILE' | 'SOUTHWEST_STEPPE' | 'SOUTHEAST_MONSOON' | 'FAR_SOUTH_JUNGLE';

export interface GeomorphicPlateData {
  plateId: string;
  description: string;
  seismicStress: number; // 0 - 100
  benefits: string;
  hazards: string;
}

export class AureliaWorldSimulation {
  // Power Centers Interactive States
  sarnBank = {
    playerDeposit: 0,
    activeLoan: 0,
    investedVentureAmount: 0,
    daysToVentureResolve: 0,
    accumulatedInterests: 0,
  };

  valedorToll = {
    tariffLevel: 'STANDARD' as 'MINIMAL' | 'STANDARD' | 'IMPERIAL',
    smugglingActivity: 12, // 0 - 100 %
    tollGoldCollected: 0,
  };

  highMarches = {
    beaconLevel: 2, // 1 to 5
    patrolsActive: false,
    mountainDefenseBonus: 25, // %
  };

  saltSteppes = {
    hordeFriendship: 55, // 0 - 100
    tradeAgreement: false,
    convoysEscorted: 0,
  };

  cathedralBasin = {
    endowmentsCount: 0,
    pilgrimTaxRate: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    dailyHolyTithe: 0,
  };

  // Plate tectonics
  tectonicPlates: Record<string, GeomorphicPlateData> = {
    WESTERN_VOLCANIC_COAST: {
      plateId: 'WESTERN_VOLCANIC_COAST',
      description: 'Active microplate margin with dense geothermal heat channels feeding black-ash soils under Sarn.',
      seismicStress: 14.5,
      benefits: '+15% Smelting efficiency & Fertile ash soil minerals.',
      hazards: 'Slight volcanic tremors & shoreline sea-fret fog.'
    },
    CENTRAL_MOUNTAIN_SPINE: {
      plateId: 'CENTRAL_MOUNTAIN_SPINE',
      description: 'Fast-rising convergent uplift plate creating the jagged ridges and stone passes of the High Marches.',
      seismicStress: 28.0,
      benefits: '+20% Stone and iron vein raw resource discoverability.',
      hazards: 'Sudden cold rock-slips, blizzards, and winter passes collapse.'
    },
    EASTERN_RIVER_PLAIN: {
      plateId: 'EASTERN_RIVER_PLAIN',
      description: 'Stable continental shield layered with deep alluvial lake beds and grain river deltas.',
      seismicStress: 3.2,
      benefits: '+25% Crops growth rotation yield & heavy population concentration.',
      hazards: 'Frequent seasonal flood water runoff in high climate days.'
    },
    SOUTHERN_RIFT_SEA: {
      plateId: 'SOUTHERN_RIFT_SEA',
      description: 'Tectonic spreading sea bed exposing rich deep-sea shelf materials along coastal channels.',
      seismicStress: 8.8,
      benefits: '+10% Port commercial toll income and trade wind routes speed.',
      hazards: 'Coastal Monsoonal water risings and increased shipping storms.'
    },
    NORTHERN_GLACIAL_SHELF: {
      plateId: 'NORTHERN_GLACIAL_SHELF',
      description: 'Tundric craton blanketed under persistent centuries-old sheets of glaciers.',
      seismicStress: 1.0,
      benefits: 'Vast high-density timber taiga forests.',
      hazards: 'Severe tundra ice freezing & persistent soil infertility.'
    },
    VARETH_RIFT_VALLEY: {
      plateId: 'VARETH_RIFT_VALLEY',
      description: 'Active spreading rift zone splitting Vareth\'s interior, generating intense hydrothermal heating fields.',
      seismicStress: 19.5,
      benefits: '+20% Raw iron vein mining and geothermal resource extraction.',
      hazards: 'Sudden volcanic steam vents and dry steppic dust gusts.'
    },
    NYTHARA_TRIPLE_JUNCTION: {
      plateId: 'NYTHARA_TRIPLE_JUNCTION',
      description: 'Complex junction of three fused microplates whose collision in ancient geological history created the island chain.',
      seismicStress: 34.0,
      benefits: '+25% Gold mine extraction and deep precious raw stone vein yields.',
      hazards: 'Sudden sea floor crust slips, monsoonal coastal surgers, and harbor earthquakes.'
    },
    ORUN_ALLUVIAL_SHIELD: {
      plateId: 'ORUN_ALLUVIAL_SHIELD',
      description: 'Extremely stable sedimentary continental shield loaded with alluvial river muds around Orun.',
      seismicStress: 2.1,
      benefits: '+30% Crop rotation fertility and river channel commerce efficiency.',
      hazards: 'Severe seasonal river overflow floods.'
    }
  };

  // 37 fragmented medieval sovereigns
  entities: AureliaPoliticalEntity[] = [];

  // Local settlement lists for provinces
  settlementHierarchies: Record<string, SettlementUnit[]> = {};

  // Track province climate bindings
  provinceClimates: Record<string, ClimateBeltType> = {
    prov_1: 'MIDLANDS_FERTILE',       // Valedor (Grain river, midlands plains)
    prov_2: 'SOUTHEAST_MONSOON',      // Sarn (Coast, monsoon warm channels)
    prov_3: 'NORTH_TEMPERATE_FOREST',  // High Marches (Iron hills & forests)
    prov_4: 'FAR_SOUTH_JUNGLE',       // Cathedral Basin (Actually nested south border)
    prov_5: 'SOUTHWEST_STEPPE',       // Salt Steppes (Dry steppe & salt flat shadow)
    prov_v1: 'FAR_NORTH_TUNDRA',      // Kareth borders
  };

  constructor(private engine: GameLoop) {
    this.initializeEntities();
    this.initializeSettlementHierarchies();
  }

  initializeEntities() {
    // 9 kingdoms
    const kingdomsList: [string, string, string][] = [
      ['Kingdom of Valedor', 'prov_1', '🦁'],
      ['Kingdom of Solmere', 'prov_2', '🦅'],
      ['Kingdom of Orun', 'prov_3', '🦖'],
      ['Kingdom of Asteria', 'prov_4', '🌟'],
      ['Kingdom of Eldoria', 'prov_5', '🌲'],
      ['Kingdom of Lumeria', 'prov_6', '☀️'],
      ['Kingdom of Boreas', 'prov_7', '❄️'],
      ['Kingdom of Mercia', 'prov_8', '🦌'],
      ['Kingdom of Westvalia', 'prov_9', '⚓'],
    ];

    // 6 duchies
    const duchiesList: [string, string, string][] = [
      ['Duchy of Westmarch', 'prov_10', '⚔️'],
      ['Duchy of Eastfold', 'prov_11', '🛡️'],
      ['Duchy of Southshire', 'prov_12', '🌹'],
      ['Duchy of Northpeak', 'prov_13', '🏔️'],
      ['Duchy of Glenwood', 'prov_14', '🐗'],
      ['Duchy of Riverrun', 'prov_15', '🐟'],
    ];

    // 11 city-states
    const cityStatesList: [string, string, string][] = [
      ['City of Oakhaven', 'prov_16', '🌳'],
      ['City of Stoneport', 'prov_17', '⚓'],
      ['City of Ironford', 'prov_18', '⚒️'],
      ['City of Highcliff', 'prov_19', '🦅'],
      ['City of Rivermouth', 'prov_20', '🌊'],
      ['City of Goldcrest', 'prov_21', '💰'],
      ['City of Crownshield', 'prov_22', '🛡️'],
      ['City of Blackthorn', 'prov_23', '🍇'],
      ['City of Deepwell', 'prov_24', '🔮'],
      ['City of Windshear', 'prov_25', '🌀'],
      ['City of Kingscrossing', 'prov_26', '👑'],
    ];

    // 5 tribal confederations
    const tribalsList: [string, string, string][] = [
      ['Salt-Steppe Horse-Clans', 'prov_27', '🐎'],
      ['Tundra Wolf Confederations', 'prov_28', '🐺'],
      ['Iron Hills Coal Clans', 'prov_29', '⚒️'],
      ['Swallowing Moss Mud-Clans', 'prov_30', '🌿'],
      ['Jagged Peak Cave-Clans', 'prov_31', '🐻'],
    ];

    // 3 theocracies
    const theocraciesList: [string, string, string][] = [
      ['Holy Cathedral Patriarchate', 'prov_32', '⛪'],
      ['Sovereign Solar Monastic estates', 'prov_33', '☀️'],
      ['Shrines of Northern Tundra', 'prov_34', '🕯️'],
    ];

    // 2 republics
    const republicsList: [string, string, string][] = [
      ['Maritime Senate of Sarn', 'prov_35', '⛵'],
      ['Free Canton of High-Hills', 'prov_36', '⚖️'],
    ];

    // 1 empire in decline
    const empireList: [string, string, string][] = [
      ['Sovereign Imperium of Rhakar', 'prov_37', '🐲'],
    ];

    let idIdx = 1;

    kingdomsList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'KINGDOM', capitalProvinceId: `prov_${currId}`, stability: 85, treasury: 1200, militaryPower: 1200, vassalCount: 2, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    duchiesList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'DUCHY', capitalProvinceId: `prov_${currId}`, stability: 78, treasury: 500, militaryPower: 800, vassalCount: 1, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    cityStatesList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'CITY_STATE', capitalProvinceId: `prov_${currId}`, stability: 92, treasury: 2500, militaryPower: 450, vassalCount: 0, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    tribalsList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'TRIBAL_CONFEDERATION', capitalProvinceId: `prov_${currId}`, stability: 65, treasury: 150, militaryPower: 1500, vassalCount: 4, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    theocraciesList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'THEOCRATIC_DOMAIN', capitalProvinceId: `prov_${currId}`, stability: 88, treasury: 1800, militaryPower: 300, vassalCount: 0, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    republicsList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'REPUBLIC', capitalProvinceId: `prov_${currId}`, stability: 82, treasury: 3000, militaryPower: 600, vassalCount: 1, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
    empireList.forEach(([name, _, emb]) => {
      const currId = idIdx++;
      this.entities.push({ id: `ent_${currId}`, name, type: 'EMPIRE_IN_DECLINE', capitalProvinceId: `prov_${currId}`, stability: 40, treasury: 800, militaryPower: 2200, vassalCount: 5, emblem: emb, allianceId: null, tributeOwedTo: null });
    });
  }

  initializeSettlementHierarchies() {
    Object.keys(this.engine.provinces).forEach(pId => {
      const isPlayerCapital = pId === 'prov_1';
      const isSarn = pId === 'prov_35'; // Sarn's dynamic ID is prov_35 (35th kingdom)
      const p = this.engine.provinces[pId];
      if (!p) return;
      const baseName = p.name.replace(/^(Kingdom of|Duchy of|City of|Holy|Sovereign|Free Canton of|Maritime Senate of|Empire of|Steppe Confederation of|Merchant League of) /, '');
      
      const totalPop = p.population?.total || 5000;
      // Dynamic multiplier to scale down settlement figures appropriately for millions total
      const mult = totalPop > 200000 ? Math.max(1, Math.floor(totalPop / 550000)) : 1;

      // Kareth Prime target is exactly 600,000 for its primary urban city center
      const cityPop = p.name.includes('Kareth') 
        ? 600000 
        : Math.min(800000, 15000 * mult);

      this.settlementHierarchies[pId] = [
        { id: `set_${pId}_city`, name: isPlayerCapital ? 'Valedor Royal Keep' : (isSarn ? 'Grande Sarn Harbor' : (p.name.includes('Kareth') ? 'Kareth Prime' : `${baseName} Capital Keep`)), type: 'FORTIFIED_CITY', population: cityPop, efficiency: 95, lastYield: 0 },
        { id: `set_${pId}_town_1`, name: p.name.includes('Kareth') ? 'Kareth Sound Emporium' : `${baseName} Crossing Market`, type: 'MARKET_TOWN', population: Math.floor(4200 * mult), efficiency: 90, lastYield: 0 },
        { id: `set_${pId}_town_2`, name: p.name.includes('Kareth') ? 'Kareth Insurance Exchange' : `Upper Tolgate District`, type: 'MARKET_TOWN', population: Math.floor(3100 * mult), efficiency: 85, lastYield: 0 },
        { id: `set_${pId}_vil_1`, name: `Broad-Water Village`, type: 'VILLAGE', population: Math.floor(1200 * mult), efficiency: 90, lastYield: 0 },
        { id: `set_${pId}_vil_2`, name: `Iron-Forge Settlement`, type: 'VILLAGE', population: Math.floor(950 * mult), efficiency: 80, lastYield: 0 },
        { id: `set_${pId}_vil_3`, name: `Loom-Weaver Mills`, type: 'VILLAGE', population: Math.floor(1100 * mult), efficiency: 88, lastYield: 0 },
        { id: `set_${pId}_ham_1`, name: `Muck-Crest Farming Plot`, type: 'HAMLET', population: Math.floor(280 * mult), efficiency: 95, lastYield: 0 },
        { id: `set_${pId}_ham_2`, name: `Hillwood Lumber Yards`, type: 'HAMLET', population: Math.floor(340 * mult), efficiency: 90, lastYield: 0 },
        { id: `set_${pId}_ham_3`, name: `Clay-Vat Meadows`, type: 'HAMLET', population: Math.floor(190 * mult), efficiency: 95, lastYield: 0 },
        { id: `set_${pId}_ham_4`, name: `Deep-Creek Silt Farm`, type: 'HAMLET', population: Math.floor(220 * mult), efficiency: 95, lastYield: 0 },
      ];
    });
  }

  tick() {
    const year = this.engine.clock.currentYear;
    const day = this.engine.clock.currentDay;
    const isSpring = this.engine.clock.currentSeason === 'SPRING';
    const isSummer = this.engine.clock.currentSeason === 'SUMMER';
    const isAutumn = this.engine.clock.currentSeason === 'AUTUMN';
    const isWinter = this.engine.clock.currentSeason === 'WINTER';

    // 1. Process Bank of Sarn Compound Interest
    if (day % 15 === 0) {
      if (this.sarnBank.playerDeposit > 0) {
        const rate = 0.04; // 4% compound returns every 15 days
        const gained = Math.floor(this.sarnBank.playerDeposit * rate);
        this.sarnBank.playerDeposit += gained;
        this.sarnBank.accumulatedInterests += gained;
        this.engine.alertSystem.queueAlert(`Sarn Banking Guilds credited +${gained}🪙 interest to your capital account.`, 'FLAVOR');
      }
      
      // Accrue Loan Interest
      if (this.sarnBank.activeLoan > 0) {
        const debtGrew = Math.floor(this.sarnBank.activeLoan * 0.06); // 6% fee every 15 days
        this.sarnBank.activeLoan += debtGrew;
        this.engine.alertSystem.queueAlert(`Sarn banking interest expanded your outstanding royal loan by +${debtGrew}🪙.`, 'FLAVOR');
      }
    }

    // Resolving investments
    if (this.sarnBank.daysToVentureResolve > 0) {
      this.sarnBank.daysToVentureResolve--;
      if (this.sarnBank.daysToVentureResolve === 0 && this.sarnBank.investedVentureAmount > 0) {
        const luck = this.engine.rng.next();
        let multiplier = 0;
        let outcomeText = '';
        
        if (luck > 0.85) {
          multiplier = 2.2; // Huge success
          outcomeText = 'returned with high-value spice cargoes, doubling our venture capitals!';
        } else if (luck > 0.40) {
          multiplier = 1.35; // Standard profit
          outcomeText = 'landed valuable merchant goods, paying standard dividend dividends.';
        } else if (luck > 0.15) {
          multiplier = 0.70; // Minor loss due to storms
          outcomeText = 'confronted high sea tempests, suffering minor cargo spoilages.';
        } else {
          multiplier = 0.10; // Pirate raid / absolute shipwreck
          outcomeText = 'has been sacked by corsair reivers near the Southern Rift. Absolute shipwreck.';
        }

        const returned = Math.floor(this.sarnBank.investedVentureAmount * multiplier);
        this.engine.treasury.goldBalance += returned;
        this.engine.alertSystem.queueAlert(`Our Sarn maritime fleet ${outcomeText} (+${returned}🪙)`, luck > 0.40 ? 'NORMAL' : 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `Venture investment returned from Southern waters. Original Capital: ${this.sarnBank.investedVentureAmount}🪙. Returns: ${returned}🪙.`, 'NORMAL');
        this.sarnBank.investedVentureAmount = 0;
      }
    }

    // 2. Process Valedor River tolls
    const valedor = this.engine.provinces['prov_1'];
    if (valedor && valedor.ownerId === 'player') {
      let multiplier = 1.0;
      if (this.valedorToll.tariffLevel === 'MINIMAL') {
        multiplier = 0.5;
        this.valedorToll.smugglingActivity = Math.max(3, this.valedorToll.smugglingActivity - 0.2);
        valedor.loyalty = Math.min(100, valedor.loyalty + 0.1);
      } else if (this.valedorToll.tariffLevel === 'IMPERIAL') {
        multiplier = 2.5;
        this.valedorToll.smugglingActivity = Math.min(45, this.valedorToll.smugglingActivity + 0.5);
        valedor.loyalty = Math.max(25, valedor.loyalty - 0.25);
        if (day % 12 === 0 && this.engine.rng.next() < 0.3) {
          this.engine.alertSystem.queueAlert(`Smugglers successfully bypassed the River Crown checkpoints today due to Imperial tariff burdens.`, 'FLAVOR');
        }
      } else {
        multiplier = 1.0;
        this.valedorToll.smugglingActivity = Math.max(10, Math.min(100, this.valedorToll.smugglingActivity + (this.engine.rng.next() - 0.5) * 0.1));
      }

      const rawToll = Math.floor(25 * multiplier * (valedor.roadQuality / 60) * (1 - this.valedorToll.smugglingActivity / 100));
      this.valedorToll.tollGoldCollected += rawToll;
      this.engine.treasury.goldBalance += rawToll;
    }

    // 3. High Marches patrols maintenance cost and guard
    if (this.highMarches.patrolsActive) {
      this.engine.treasury.goldBalance = Math.max(0, this.engine.treasury.goldBalance - 5); // 5 gold daily upkeep for elite patrols
      const march = this.engine.provinces['prov_3'];
      if (march) {
        march.loyalty = Math.min(100, march.loyalty + 0.05); // active policing improves safety/loyalty
      }
    }

    // 4. Cathedral tithes
    if (this.cathedralBasin.endowmentsCount > 0) {
      const titheRateMultiplier = this.p_rate_mult();
      const holyTithing = Math.floor((this.cathedralBasin.endowmentsCount * 8) * titheRateMultiplier);
      this.cathedralBasin.dailyHolyTithe = holyTithing;
      this.engine.treasury.goldBalance += holyTithing;
      
      const cathedralProv = this.engine.provinces['prov_4'];
      if (cathedralProv) {
        if (this.cathedralBasin.pilgrimTaxRate === 'HIGH') {
          cathedralProv.loyalty = Math.max(20, cathedralProv.loyalty - 0.2);
        } else if (this.cathedralBasin.pilgrimTaxRate === 'LOW') {
          cathedralProv.loyalty = Math.min(100, cathedralProv.loyalty + 0.1);
        }
      }
    }

    // 5. Plate friction stress escalation
    this.tectonicPlates.WESTERN_VOLCANIC_COAST.seismicStress += this.engine.rng.next() * 0.16;
    this.tectonicPlates.CENTRAL_MOUNTAIN_SPINE.seismicStress += this.engine.rng.next() * 0.22;
    this.tectonicPlates.SOUTHERN_RIFT_SEA.seismicStress += this.engine.rng.next() * 0.08;
    this.tectonicPlates.VARETH_RIFT_VALLEY.seismicStress += this.engine.rng.next() * 0.18;
    this.tectonicPlates.NYTHARA_TRIPLE_JUNCTION.seismicStress += this.engine.rng.next() * 0.25;
    this.tectonicPlates.ORUN_ALLUVIAL_SHIELD.seismicStress += this.engine.rng.next() * 0.04;

    // Check volcanic trigger Coast
    if (this.tectonicPlates.WESTERN_VOLCANIC_COAST.seismicStress >= 100) {
      this.tectonicPlates.WESTERN_VOLCANIC_COAST.seismicStress = 10.0;
      const sarn = this.engine.provinces['prov_2'];
      if (sarn) {
        sarn.roadQuality = Math.max(10, sarn.roadQuality - 25);
        sarn.fertility = Math.min(100, sarn.fertility + 10); // Enrich soils
        this.engine.alertSystem.queueAlert(`Volcanic eruption from offshore arc near Sarn! Choking charcoal ash blanketed fields, enriching soil fertility but ruining arterial roads.`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `A major volcanic venting occurred along Sarn's seismic fracture fault, burying roads under active basalts.`, 'URGENT');
      }
    }

    // Check mountain collapse Convergent spine
    if (this.tectonicPlates.CENTRAL_MOUNTAIN_SPINE.seismicStress >= 100) {
      this.tectonicPlates.CENTRAL_MOUNTAIN_SPINE.seismicStress = 15.0;
      const hm = this.engine.provinces['prov_3'];
      if (hm) {
        hm.roadQuality = Math.max(10, hm.roadQuality - 40);
        hm.population.total = Math.max(500, hm.population.total - 120);
        // Discover some iron
        this.engine.resources.iron += 400;
        this.engine.alertSystem.queueAlert(`A massive tectonic landslide swept the High Marches! Narrow mountain corridors were completely crushed, but exposed deep ores containing +400 Iron!`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `A violent tectonic slip shattered High Marches' pass walls, collapsing ancient fortresses but bringing iron lodes to surface.`, 'URGENT');
      }
    }

    // Check Vareth Rift Valley trigger
    if (this.tectonicPlates.VARETH_RIFT_VALLEY.seismicStress >= 100) {
      this.tectonicPlates.VARETH_RIFT_VALLEY.seismicStress = 12.0;
      const rhakar = this.engine.provinces['prov_v2']; // Empire of Rhakar
      if (rhakar) {
        rhakar.roadQuality = Math.max(10, rhakar.roadQuality - 20);
        this.engine.resources.iron += 300;
        this.engine.alertSystem.queueAlert(`Geothermal sulfur flares cracked Vareth's central salt basins! Basalt tremors shook Rhakar's outposts, but exposed +300 Iron veins.`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `A heavy tectonic rift flare split the Vareth Rift plate, impacting trade corridors but revealing pristine iron channels.`, 'NORMAL');
      }
    }

    // Check Nythara Triple Junction trigger
    if (this.tectonicPlates.NYTHARA_TRIPLE_JUNCTION.seismicStress >= 100) {
      this.tectonicPlates.NYTHARA_TRIPLE_JUNCTION.seismicStress = 14.0;
      const talassar = this.engine.provinces['prov_n1']; // Talassar
      if (talassar) {
        talassar.roadQuality = Math.max(15, talassar.roadQuality - 25);
        this.engine.treasury.goldBalance += 500;
        this.engine.alertSystem.queueAlert(`A violent seafloor crust earthquake shook the Sapphire Coast of Nythara! Storm surges flooded Talassar port districts but swept rich pearls and ambergris onto its shores (+500🪙).`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `Nythara geomorphic plates slid under the ocean, triggering minor coastal tsunamis and coastal trade interruptions paired with deep-water salvage discoveries.`, 'URGENT');
      }
    }

    // Check Orun Alluvial Shield trigger
    if (this.tectonicPlates.ORUN_ALLUVIAL_SHIELD.seismicStress >= 100) {
      this.tectonicPlates.ORUN_ALLUVIAL_SHIELD.seismicStress = 5.0;
      const orun = this.engine.provinces['prov_n2']; // Great River Orun
      if (orun) {
        orun.fertility = Math.min(100, orun.fertility + 15);
        orun.roadQuality = Math.max(10, orun.roadQuality - 30);
        this.engine.alertSystem.queueAlert(`A massive silt-rich seasonal flood of the Great River Orun occurred! Alluvial loam deposits enriched fields (+15% Fertility) but washed away canal towpaths.`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, day, `A violent mud-wave overflowed Great Orun levees, depositing millions of tons of premium agricultural crop fertilizing silts.`, 'NORMAL');
      }
    }

    // 6. Climate constraints mapping weathering events
    Object.entries(this.provinceClimates).forEach(([pId, belt]) => {
      const prov = this.engine.provinces[pId];
      if (!prov) return;

      switch (belt) {
        case 'FAR_NORTH_TUNDRA': {
          if (isWinter) {
            prov.currentWeather = 'BLIZZARD';
            prov.population.health = Math.max(20, prov.population.health - 0.4);
            prov.roadQuality = Math.max(5, prov.roadQuality - 1.2);
            // double food consumption effect simulated by stripping some reserves
            this.engine.resources.food = Math.max(0, this.engine.resources.food - 3);
          }
          break;
        }
        case 'SOUTHWEST_STEPPE': {
          if (isSummer) {
            prov.currentWeather = 'DROUGHT';
            prov.population.health = Math.max(30, prov.population.health - 0.2);
            prov.roadQuality = Math.min(100, prov.roadQuality + 0.3); // dry roads stay intact
          }
          break;
        }
        case 'FAR_SOUTH_JUNGLE': {
          // high threat of tropical fevers in summer/autumn
          if ((isSummer || isAutumn) && this.engine.rng.next() < 0.12) {
            prov.population.health = Math.max(15, prov.population.health - 1.5);
            if (this.engine.rng.next() < 0.15 && !prov.disease) {
              prov.disease = {
                diseaseId: 'ST-29 Malaria Swamp Fever',
                infectedCount: 150,
                severity: 18,
                startedAt: day,
              };
              this.engine.alertSystem.queueAlert(`Tropical malaria swamp plague has broken out in the stagnant pools of ${prov.name}!`, 'URGENT');
            }
          }
          break;
        }
        case 'SOUTHEAST_MONSOON': {
          if (isAutumn) {
            prov.currentWeather = 'THUNDERSTORM';
            prov.roadQuality = Math.max(15, prov.roadQuality - 1.5);
          }
          break;
        }
      }
    });

    // 7. Settlement hierarchy flow tick: Hamlets feed villages, feed towns, feed cities
    Object.entries(this.settlementHierarchies).forEach(([pId, sets]) => {
      const parentProv = this.engine.provinces[pId];
      if (!parentProv) return;

      let rawGrainSack = 0;
      let rawFibreSack = 0;

      // Filter by type
      const hamlets = sets.filter(s => s.type === 'HAMLET');
      const villages = sets.filter(s => s.type === 'VILLAGE');
      const marketTowns = sets.filter(s => s.type === 'MARKET_TOWN');
      const city = sets.find(s => s.type === 'FORTIFIED_CITY');

      // (A) Hamlets produce raw grains
      hamlets.forEach(ham => {
        const out = Math.floor(ham.population * 0.08 * (parentProv.fertility / 100));
        ham.lastYield = out;
        rawGrainSack += out;
      });

      // (B) Villages process raw assets
      villages.forEach(vil => {
        const received = Math.floor(rawGrainSack / villages.length);
        const processed = Math.floor(received * 1.35 * (vil.efficiency / 100));
        vil.lastYield = processed;
        rawFibreSack += processed;
      });

      // (C) Market Towns host auctions, generating gold tax coins based on road network connections
      const roadModifier = parentProv.roadQuality / 100;
      let cityTaxInfusion = 0;

      marketTowns.forEach(twn => {
        // Bandit tax bleed if road network is terrible
        const lossToBandits = roadModifier < 0.40 ? Math.floor(rawFibreSack * 0.25 * (1 - roadModifier)) : 0;
        const netFlow = Math.max(0, Math.floor(rawFibreSack / marketTowns.length) - lossToBandits);
        
        const marketGold = Math.floor(netFlow * 0.18 + twn.population * 0.015);
        twn.lastYield = marketGold;
        
        cityTaxInfusion += marketGold;
      });

      // (D) Capital city collects the feudal returns, giving direct resources payload
      if (city && parentProv.ownerId === 'player') {
        const finalRevenue = Math.floor(cityTaxInfusion * 0.25); // Sovereign tax share
        this.engine.treasury.goldBalance += finalRevenue;
        this.engine.resources.food += Math.floor(rawGrainSack * 0.15); // Sovereign grain bin
      }
    });

    // 8. Independent Medieval polities basic simulate (gold collections, recruitment, stability shifts)
    this.entities.forEach(ent => {
      // Passive finance growth
      const baseFee = ent.type === 'KINGDOM' ? 14 : (ent.type === 'EMPIRE_IN_DECLINE' ? 5 : 8);
      ent.treasury += baseFee + Math.floor(ent.stability * 0.04);
      
      // Decaying stability of declining empire
      if (ent.type === 'EMPIRE_IN_DECLINE') {
        ent.stability = Math.max(10, ent.stability - 0.02);
        if (ent.stability < 20 && this.engine.rng.next() < 0.015) {
          ent.stability = 45;
          ent.treasury = Math.max(10, ent.treasury - 400);
          this.engine.alertSystem.queueAlert(`Local serf revolt erupted inside the capital provinces of the declining Rhakari Imperium! Elite mercenaries mobilized to suppress it.`, 'NORMAL');
          this.engine.chronicleSystem.add(year, day, `A severe anti-feudal guild riot in Rhakar shattered trade district halls, costed millions of coinages.`, 'URGENT');
        }
      }

      // Random alliance creations among small city-states
      if (ent.type === 'CITY_STATE' && this.engine.rng.next() < 0.0006) {
        const other = this.entities.find(e => e.type === 'CITY_STATE' && e.id !== ent.id && !e.allianceId);
        if (other) {
          ent.allianceId = `all_${ent.id}`;
          other.allianceId = `all_${ent.id}`;
          this.engine.chronicleSystem.add(year, day, `${ent.name} signed a mutual protective league with ${other.name} to reinforce coastal sea lane routes.`, 'NORMAL');
        }
      }
    });

    // Sync simulated political entities to active engine provinces state
    this.entities.forEach(ent => {
      const pId = ent.capitalProvinceId;
      const prov: any = this.engine.provinces[pId];
      if (prov) {
        prov.stability = ent.stability;
        prov.treasury = ent.treasury;
        prov.militaryPower = ent.militaryPower;
        prov.vassalCount = ent.vassalCount;
        prov.allianceId = ent.allianceId;
        prov.emblem = ent.emblem;
        prov.type = ent.type as any;
      }
    });
  }

  handleCustomAction(action: { type: string; payload?: any }) {
    const year = this.engine.clock.currentYear;
    const day = this.engine.clock.currentDay;

    switch (action.type) {
      // SARN BANK ACTIONS
      case 'DEPOSIT_GOLD': {
        const amt = action.payload.amount;
        if (this.engine.treasury.goldBalance >= amt) {
          this.engine.treasury.goldBalance -= amt;
          this.sarnBank.playerDeposit += amt;
          this.engine.alertSystem.queueAlert(`Successfully deposited ${amt}🪙 to the Sarn Merchant Bank. Compound rate: 4% per 15 days.`, 'NORMAL');
        }
        break;
      }
      case 'WITHDRAW_GOLD': {
        const amt = action.payload.amount;
        if (this.sarnBank.playerDeposit >= amt) {
          this.sarnBank.playerDeposit -= amt;
          this.engine.treasury.goldBalance += amt;
          this.engine.alertSystem.queueAlert(`Withdrew ${amt}🪙 from your Sarn bank reserves back to the royal coffer.`, 'NORMAL');
        }
        break;
      }
      case 'TAKE_LOAN': {
        if (this.sarnBank.activeLoan === 0) {
          const amt = 1000;
          this.engine.treasury.goldBalance += amt;
          this.sarnBank.activeLoan = amt;
          this.engine.alertSystem.queueAlert(`Contracted a 1,000🪙 emergency loan from Sarn bankers at 6% biweekly interest rate.`, 'URGENT');
        }
        break;
      }
      case 'REPAY_LOAN': {
        const debt = this.sarnBank.activeLoan;
        if (debt > 0 && this.engine.treasury.goldBalance >= debt) {
          this.engine.treasury.goldBalance -= debt;
          this.sarnBank.activeLoan = 0;
          this.engine.alertSystem.queueAlert(`Fully repaid your outstanding ${debt}🪙 debt. Your royal standing has cleared of liens.`, 'NORMAL');
        }
        break;
      }
      case 'LAUNCH_VENTURE': {
        if (this.sarnBank.investedVentureAmount === 0 && this.engine.treasury.goldBalance >= 500) {
          this.engine.treasury.goldBalance -= 500;
          this.sarnBank.investedVentureAmount = 500;
          this.sarnBank.daysToVentureResolve = 16; // 16 days voyage
          this.engine.alertSystem.queueAlert(`Soveriegn merchant caravans loaded! Maritime venture fleet set sails for the spices sea route (Expected: 16 Days).`, 'NORMAL');
        }
        break;
      }

      // VALEDOR TOLL ACTIONS
      case 'SET_TARIFF_LEVEL': {
        const level = action.payload.level;
        this.valedorToll.tariffLevel = level;
        this.engine.alertSystem.queueAlert(`Set River Crown toll tariffs to: ${level}.`, 'NORMAL');
        break;
      }

      // HIGH MARCHES ACTIONS
      case 'REINFORCE_BEACONS': {
        if (this.engine.resources.stone >= 200 && this.engine.treasury.goldBalance >= 250) {
          if (this.highMarches.beaconLevel < 5) {
            this.engine.resources.stone -= 200;
            this.engine.treasury.goldBalance -= 250;
            this.highMarches.beaconLevel++;
            this.highMarches.mountainDefenseBonus += 5;
            this.engine.alertSystem.queueAlert(`Rebuilt peak keep signal towers! Beacon Network escalated to Level ${this.highMarches.beaconLevel}. Mountain Defense: +${this.highMarches.mountainDefenseBonus}%.`, 'NORMAL');
          }
        }
        break;
      }
      case 'TOGGLE_BORDER_PATROLS': {
        this.highMarches.patrolsActive = !this.highMarches.patrolsActive;
        const msg = this.highMarches.patrolsActive 
          ? `Sovereign mountain guard mobilized patrols. Upkeep cost: 5🪙/day. Royal safety increased.` 
          : `Mountain border checkpoints returned to baseline local militia duties. Daily upkeep saved.`;
        this.engine.alertSystem.queueAlert(msg, 'NORMAL');
        break;
      }

      // STEPPE KHANATE ACTIONS
      case 'BARTER_STEPPE_HORSES': {
        if (this.engine.resources.food >= 600) {
          this.engine.resources.food -= 600;
          this.saltSteppes.hordeFriendship = Math.min(100, this.saltSteppes.hordeFriendship + 8);
          // Reward manpower as horses draft pool
          this.engine.resources.manpower += 150;
          this.engine.alertSystem.queueAlert(`Bartered 600 grain sacks for fresh Grassland draft stallions. Obtained +150 military horses pool!`, 'NORMAL');
        }
        break;
      }
      case 'RECRUIT_STEPPE_MOUNTED_ARCHERS': {
        if (this.engine.treasury.goldBalance >= 400 && this.engine.resources.manpower >= 100) {
          const army = this.engine.armies['army_1'];
          if (army) {
            this.engine.treasury.goldBalance -= 400;
            this.engine.resources.manpower -= 100;
            
            if (!army.units) army.units = [];
            army.units.push({
              id: 'unit_steppe_' + Date.now().toString(36),
              type: 'STEPPE_HORSE_ARCHERS' as any,
              count: 100,
              maxCount: 100,
              strength: 100,
              morale: 90,
              experience: 40,
              equipmentQuality: 65,
              supplyConsumed: 2,
              upkeepCost: 8,
              formation: 'LOOSE',
              isMounted: true,
              isRanged: true,
              hasArmor: 'LEATHER' as any,
              specialAbility: { id: 'feigned_retreat', name: 'Feigned Retreat' }
            });
            this.engine.alertSystem.queueAlert(`Enlisted 100 nomadic Grassland horse archers to your Vanguard stack!`, 'NORMAL');
            this.engine.chronicleSystem.add(year, day, `Enlisted loyal Salt-Steppe mobile archers into the vanguard divisions of Riverlands Host.`, 'NORMAL');
          }
        }
        break;
      }

      // CATHEDRAL BASIN ACTIONS
      case 'ENDOW_SHRINE': {
        if (this.engine.treasury.goldBalance >= 300) {
          this.engine.treasury.goldBalance -= 300;
          this.cathedralBasin.endowmentsCount++;
          // Piety boost on player
          const player = this.engine.characters['player'];
          if (player) {
            player.piety = (player.piety || 0) + 15;
          }
          this.engine.alertSystem.queueAlert(`Endowed a new pilgrimage cathedral chapel. Monastic loyalty surged and earned +15 Sovereign Piety!`, 'NORMAL');
        }
        break;
      }
      case 'SET_TITHE_LEVEL': {
        this.cathedralBasin.pilgrimTaxRate = action.payload.level;
        this.engine.alertSystem.queueAlert(`Set Cathedral pilgrimage tithing rate to: ${action.payload.level}.`, 'NORMAL');
        break;
      }
    }
  }

  p_rate_mult(): number {
    if (this.cathedralBasin.pilgrimTaxRate === 'LOW') return 0.5;
    if (this.cathedralBasin.pilgrimTaxRate === 'HIGH') return 1.8;
    return 1.0;
  }

  getState() {
    return {
      sarnBank: this.sarnBank,
      valedorToll: this.valedorToll,
      highMarches: this.highMarches,
      saltSteppes: this.saltSteppes,
      cathedralBasin: this.cathedralBasin,
      tectonicPlates: this.tectonicPlates,
      entities: this.entities,
      settlementHierarchies: this.settlementHierarchies
    };
  }
}
