import type { GameLoop } from '../engine/GameLoop';
import { HexCoord, hexDistance, hexRound } from '../../utils/geo';
import { nanoid } from 'nanoid';

export function hexLerp(a: HexCoord, b: HexCoord, t: number): HexCoord {
  return {
    q: a.q + (b.q - a.q) * t,
    r: a.r + (b.r - a.r) * t,
    s: a.s + (b.s - a.s) * t
  };
}

export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const N = hexDistance(a, b);
  const results: HexCoord[] = [];
  for (let i = 0; i <= N; i++) {
    const t = N === 0 ? 0 : i / N;
    results.push(hexRound(hexLerp(a, b, t)));
  }
  return results;
}

export class LogisticsSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processProvinceRoadLogisticsAndBlockades();
    this.processProvinceProductionAndConvoys();
    this.simulateConvoysInTransit();
    this.processArmySupplyDepletionAndReplenish();
  }

  private processProvinceRoadLogisticsAndBlockades() {
    // Traverse all provinces to verify blockade conditions and commerce capacities
    Object.values(this.engine.provinces).forEach(province => {
      // 1. Calculate Blockade Statuses dynamically based on hostile armies
      const isHostileArmyPresent = Object.values(this.engine.armies).some(army => 
        army.realmId !== 'realm_1' && // Hostile to player
        army.location.q === province.coords.q && 
        army.location.r === province.coords.r
      );

      if (isHostileArmyPresent) {
        if (!province.isBlockaded) {
          province.isBlockaded = true;
          this.engine.alertSystem.queueAlert(
            `Trade highways in ${province.name} are blockaded by a military host!`,
            'URGENT'
          );
        }
      } else {
        province.isBlockaded = false;
      }

      // 2. Adjust logistical flow and road quality factors
      if (province.roadQuality < 25) {
        // Starve regional supplies or lower local economic prosperity due to transport friction
        province.loyalty = Math.max(0, province.loyalty - 0.5);

        // Army marching through bad roads suffers higher wear
        Object.values(this.engine.armies).forEach(army => {
          if (army.location.q === province.coords.q && army.location.r === province.coords.r) {
            army.morale = Math.max(0, army.morale - 1);
            army.supplyLevel = Math.max(0, army.supplyLevel - 5);
          }
        });
      }
    });
  }

  /**
   * Part 9.1: Supply Chain Flow - Step 1 & 2
   * Province produces resource (based on buildings + workers + season) and accumulates in local stockpiles.
   * Auto-dispatches convoys once stockpile goes past limit.
   */
  private processProvinceProductionAndConvoys() {
    // Ensure all provinces have stockpiles initialized
    Object.values(this.engine.provinces).forEach((province: any) => {
      if (!province.stockpiles) {
        province.stockpiles = {
          food: 0,
          wood: 0,
          stone: 0,
          iron: 0
        };
      }

      // Only simulate player/realm provinces for active trade logistics to capital
      if (province.ownerId !== 'player') return;

      // Base production
      let dailyFood = 5;
      let dailyWood = 3;
      let dailyStone = 2;
      let dailyIron = 1;

      // Apply building benefits
      province.buildings?.forEach((b: any) => {
        if (b.typeId === 'FARM') dailyFood += 12;
        if (b.typeId === 'FISHERY') dailyFood += 15;
        if (b.typeId === 'LUMBER_CAMP') dailyWood += 12;
        if (b.typeId === 'MINE') {
          dailyIron += 8;
          dailyStone += 8;
        }
        if (b.typeId === 'SMELTER') {
          dailyIron += 15;
          dailyWood = Math.max(0, dailyWood - 4); // smiting consumes lumber
        }
        if (b.typeId === 'KILN') dailyStone += 10;
        if (b.typeId === 'GRANARY') dailyFood += 5; // storage protection
        if (b.typeId === 'ROAD_NETWORK') {
          dailyWood += 3;
          dailyStone += 3;
        }
        if (b.typeId === 'BRIDGE') {
          dailyWood += 2;
          dailyStone += 2;
        }
      });

      // Apply season multipliers
      const season = this.engine.clock.currentSeason;
      if (season === 'WINTER') {
        dailyFood = Math.floor(dailyFood * 0.4); // winter frost decays crops
      } else if (season === 'SPRING') {
        dailyFood = Math.floor(dailyFood * 1.25); // spring blooms amplify
      } else if (season === 'SUMMER') {
        dailyFood = Math.floor(dailyFood * 1.15);
      }

      // Add to local stockpiles
      province.stockpiles.food += dailyFood;
      province.stockpiles.wood += dailyWood;
      province.stockpiles.stone += dailyStone;
      province.stockpiles.iron += dailyIron;

      // Check if any resource exceeds threshold of 50 units
      const totalStockpile = province.stockpiles.food + province.stockpiles.wood + province.stockpiles.stone + province.stockpiles.iron;
      if (totalStockpile > 80 || province.stockpiles.food >= 50 || province.stockpiles.wood >= 50 || province.stockpiles.stone >= 50 || province.stockpiles.iron >= 50) {
        // Find Capital Province Destination (default to prov_1 or player capital)
        const capitalProv = this.engine.provinces['prov_1'] || Object.values(this.engine.provinces).find(p => p.ownerId === 'player');
        if (capitalProv && capitalProv.id !== province.id) {
          const destinationCoords = capitalProv.coords;
          const routePath = hexLine(province.coords, destinationCoords);

          const cargo = {
            food: Math.floor(province.stockpiles.food),
            wood: Math.floor(province.stockpiles.wood),
            stone: Math.floor(province.stockpiles.stone),
            iron: Math.floor(province.stockpiles.iron),
          };

          // Clear local province stockpiles as they are loaded into convoy
          province.stockpiles.food = 0;
          province.stockpiles.wood = 0;
          province.stockpiles.stone = 0;
          province.stockpiles.iron = 0;

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
            escort: null, // assigned dynamically if nearby army is present
            speed: 1, // hexes per day
            isRaided: false,
            raidedByArmyId: null,

            // Enriched fields for state transparency & UI representation
            rawCargo: cargo,
            progressIndex: 0,
            originProvinceName: province.name,
            status: 'ACTIVE',
            logs: [`Convoy loaded at ${province.name} with ${totalStockpile} units on day ${this.engine.clock.currentDay}.`]
          } as any;

          this.engine.convoys[convoyId] = newConvoy;
        }
      }
    });
  }

  /**
   * Part 9.1: Civilian Convoy Movement and Disruption Simulation
   */
  private simulateConvoysInTransit() {
    Object.values(this.engine.convoys).forEach((convoy: any) => {
      // Find current province
      const currentProvince = Object.values(this.engine.provinces).find(p => 
        p.coords.q === convoy.currentLocation.q && p.coords.r === convoy.currentLocation.r
      );

      // Check for blockage constraints or weather stopping for the day
      if (currentProvince) {
        if (currentProvince.isBlockaded) {
          convoy.status = 'DISRUPTED';
          convoy.logs.push(`Halted en route: Province ${currentProvince.name} is militarily blockaded!`);
          return; // skips movement
        }

        const weather = currentProvince.currentWeather;
        if (weather === 'BLIZZARD' || weather === 'THUNDERSTORM' || weather === 'FLOOD') {
          convoy.logs.push(`Halted en route due to severe weather (${weather}) in ${currentProvince.name}.`);
          return; // delayed
        }
      }

      // Check for military escort presence (any player army on same/adjacent tile)
      let escortArmyId: string | null = null;
      Object.values(this.engine.armies).forEach(army => {
        if (army.realmId === 'realm_1' && hexDistance(army.location, convoy.currentLocation) <= 1) {
          escortArmyId = army.id;
        }
      });
      convoy.escort = escortArmyId;

      // Interception risk by hostile armies (anyone else than player on the same tile)
      const hostileArmy = Object.values(this.engine.armies).find(army => 
        army.realmId !== 'realm_1' &&
        army.location.q === convoy.currentLocation.q &&
        army.location.r === convoy.currentLocation.r
      );

      if (hostileArmy && !convoy.isRaided) {
        if (!convoy.escort) {
          // Pillaged completely
          convoy.isRaided = true;
          convoy.status = 'SEVERED';
          convoy.raidedByArmyId = hostileArmy.id;
          convoy.logs.push(`PILLAGED! Intercepted by hostile army ${hostileArmy.name} in ${currentProvince?.name || 'unknown province'}! All items stolen.`);
          this.engine.alertSystem.queueAlert(`Pillage Alert: Hostile army ${hostileArmy.name} hijacked a trade convoy from ${convoy.originProvinceName}!`, 'CRITICAL');
          
          hostileArmy.loot = (hostileArmy.loot || 0) + (convoy.rawCargo?.food || 0) * 0.5 + 100;
          delete this.engine.convoys[convoy.id];
          return;
        } else {
          convoy.logs.push(`Guard engagement: Escort garrison repelled hostile raiding scouts from ${hostileArmy.name}.`);
        }
      }

      // Bandit raiding risk based on local unrest
      if (!convoy.escort && currentProvince && !convoy.isRaided) {
        const localUnrest = 100 - currentProvince.loyalty;
        const totalDist = convoy.path.length;
        const roadQual = Math.max(10, currentProvince.roadQuality);
        const banditRisk = (localUnrest * totalDist) / roadQual;

        // Daily rate trigger check (5% scaled by bandit density)
        if (this.engine.rng.next() < (banditRisk / 150) * 0.15) {
          convoy.isRaided = true;
          convoy.status = 'DISRUPTED';
          convoy.logs.push(`BANDITS! Outlaw highwaymen in ${currentProvince.name} raided the trade caravan, looting food and equipment!`);
          this.engine.alertSystem.queueAlert(`Banditry: Merchant logistics raided by highwaymen in the poorly guarded territory of ${currentProvince.name}!`, 'URGENT');
          
          // Halve cargo
          if (convoy.rawCargo) {
            convoy.rawCargo.food = Math.floor(convoy.rawCargo.food / 2);
            convoy.rawCargo.wood = Math.floor(convoy.rawCargo.wood / 2);
            convoy.rawCargo.stone = Math.floor(convoy.rawCargo.stone / 2);
            convoy.rawCargo.iron = Math.floor(convoy.rawCargo.iron / 2);
          }
        }
      }

      // Calculate path speed
      let dailyMoveStep = 1;
      if (currentProvince && currentProvince.roadQuality < 30) {
        dailyMoveStep = 0.5; // halved speed with bad road network
        convoy.logs.push(`Sluggish advancement due to unpaved mud roads in ${currentProvince.name}.`);
      }

      // Progress along route path
      convoy.progressIndex = (convoy.progressIndex || 0) + dailyMoveStep;
      const progressFloor = Math.floor(convoy.progressIndex);

      if (progressFloor < convoy.path.length) {
        convoy.currentLocation = convoy.path[progressFloor];
      } else {
        // Safe arrival at capital
        convoy.currentLocation = convoy.destination;
        convoy.status = 'ACTIVE';
        convoy.logs.push(`Successfully reached Capital gates. Unloading cargo...`);

        // Empty into state stores
        this.engine.resources.food += (convoy.rawCargo?.food || 0);
        this.engine.resources.wood += (convoy.rawCargo?.wood || 0);
        this.engine.resources.stone += (convoy.rawCargo?.stone || 0);
        this.engine.resources.iron += (convoy.rawCargo?.iron || 0);

        this.engine.alertSystem.queueAlert(`Supply Convoy has Safely Arrived! Received +${convoy.rawCargo?.food || 0} food and raw materials.`, 'NORMAL');

        // Remove from transit map
        delete this.engine.convoys[convoy.id];
      }
    });
  }

  /**
   * Part 9.2: Army Supply Level and Consumption Simulation
   */
  private processArmySupplyDepletionAndReplenish() {
    Object.values(this.engine.armies).forEach((army: any) => {
      // Find army location province
      const armyProvince = Object.values(this.engine.provinces).find(p => 
        p.coords.q === army.location.q && p.coords.r === army.location.r
      );

      const armySize = army.units?.reduce((sum: number, u: any) => sum + u.count, 0) || 1200;

      // Calculate daily supply decay
      let decay = 2 + (armySize / 1500) * 1.5;

      // Weather / Season scaling
      const season = this.engine.clock.currentSeason;
      if (season === 'WINTER') {
        decay *= 2.0; // winter triples food cost
      }

      // Terrain multiplier
      if (armyProvince) {
        if (armyProvince.terrain === 'DESERT') {
          decay *= 3.0; // desert logistics
        } else if (armyProvince.terrain === 'MOUNTAINS' || armyProvince.terrain === 'DEEP_FOREST') {
          decay *= 1.5;
        }
      }

      // Disease presence
      if (army.diseases && army.diseases.length > 0) {
        decay += 3.5; // medicine consumption
      }

      // Apply decend
      army.supplyLevel = Math.max(0, army.supplyLevel - decay);

      // --- Replenishment Sources ---
      let receivedSupplies = false;
      let supplyAmount = 0;

      // A. Adjacent to a civilian supply convoy
      const hasAdjacentConvoy = Object.values(this.engine.convoys).some((c: any) => 
        hexDistance(c.currentLocation, army.location) <= 1 && !c.isRaided
      );

      if (hasAdjacentConvoy) {
        supplyAmount += 15;
        receivedSupplies = true;
      }

      // B. Occupying a friendly settlement with a Granary
      if (armyProvince && armyProvince.ownerId === army.realmId) {
        const hasGranary = armyProvince.buildings?.some((b: any) => b.typeId === 'GRANARY');
        if (hasGranary) {
          supplyAmount += 12;
          receivedSupplies = true;
        }
      }

      // C. Foraging (Available in FORAGE stance, or when desperate, damages fertility, slows down)
      if (armyProvince && (army.stance === 'FORAGE' || (army.supplyLevel < 50 && army.stance !== 'MARCH'))) {
        supplyAmount += 10;
        receivedSupplies = true;

        // Damage fertility representing pillaging of crops
        armyProvince.fertility = Math.max(0, armyProvince.fertility - 1.2);
        
        // Slow down MP
        army.movementPoints = Math.max(0, army.movementPoints - 10);
      }

      // D. Naval Convoy support (coastal)
      const isCoastal = armyProvince && (armyProvince.terrain === 'COAST' || armyProvince.buildings?.some((b: any) => b.typeId === 'HARBOR'));
      if (isCoastal) {
        supplyAmount += 8;
        receivedSupplies = true;
      }

      if (receivedSupplies) {
        army.supplyLevel = Math.min(100, army.supplyLevel + supplyAmount);
      }

      // --- Attrition Penalty Consequences ---
      army.deserterRate = 0;

      if (army.supplyLevel >= 80) {
        // Peak form
      } else if (army.supplyLevel >= 60) {
        // Morale penalty
        army.morale = Math.max(5, army.morale - 1.5);
      } else if (army.supplyLevel >= 40) {
        // Attrition starts: 0.5% troop loss per day
        army.morale = Math.max(5, army.morale - 3);
        army.deserterRate = 0.5;
        army.units?.forEach((u: any) => {
          u.count = Math.max(0, Math.floor(u.count * 0.995));
        });
      } else if (army.supplyLevel >= 20) {
        // Desertion escalates: 1% troop loss per day
        army.morale = Math.max(0, army.morale - 5);
        army.deserterRate = 1.0;
        army.units?.forEach((u: any) => {
          u.count = Math.max(0, Math.floor(u.count * 0.99));
        });
      } else if (army.supplyLevel > 0) {
        // Mass desertion + high mutiny risk (2% loss per day)
        army.morale = 0;
        army.deserterRate = 2.0;
        army.units?.forEach((u: any) => {
          u.count = Math.max(0, Math.floor(u.count * 0.98));
        });

        if (this.engine.rng.next() < 0.1) {
          this.engine.alertSystem.queueAlert(`GARRISON MUTINY! ${army.name} is on the verge of open mutiny over critical starvation!`, 'CRITICAL');
        }
      } else {
        // Dissolution
        this.engine.alertSystem.queueAlert(`CATASTROPHIC DISSOLUTION! Army ${army.name} has completely dissolved due to 0% supplies!`, 'CRITICAL');
        delete this.engine.armies[army.id];
      }
    });
  }
}
