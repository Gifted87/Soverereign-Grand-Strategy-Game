import type { GameLoop } from '../engine/GameLoop';
import { BiomeType, TerrainType } from '../../data/terrain-types';
import { HexCoord, hexDistance } from '../../utils/geo';

export class WorldSystem {
  // Global wind direction rotating every 4 days
  currentWindDirection: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' = 'NORTH';

  constructor(private engine: GameLoop) {}

  tick() {
    const season = this.engine.clock.currentSeason;
    const isSpring = season === 'SPRING';
    const isSummer = season === 'SUMMER';
    const isAutumn = season === 'AUTUMN';
    const isWinter = season === 'WINTER';
    const currentDay = this.engine.clock.currentDay;
    const year = this.engine.clock.currentYear;

    // 1. Wind patterns shift periodically
    if (currentDay % 4 === 0) {
      const directions: ('NORTH' | 'SOUTH' | 'EAST' | 'WEST')[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
      this.currentWindDirection = directions[Math.floor(this.engine.rng.next() * directions.length)];
    }

    // 2. Perform seasonal cycles and geomorphic transitions for every province
    Object.values(this.engine.provinces).forEach(province => {
      // Setup tracking pointers to avoid undefined properties
      province.devastatedTimeLeft = province.devastatedTimeLeft || 0;
      province.wildfireDuration = province.wildfireDuration || 0;

      // Seasonal modifiers on fertility and demographics
      // A. SPRING (Planting)
      if (isSpring) {
        // High river valley flood risks from winter runoff
        if (province.terrain === 'RIVER_VALLEY') {
          province.floodRisk = Math.min(100, (province.floodRisk || 0) + 2.0);
          if (province.floodRisk > 85 && this.engine.rng.next() < 0.08) {
            province.floodRisk = 15;
            province.ruined = true;
            province.roadQuality = Math.max(10, province.roadQuality - 40);
            this.engine.alertSystem.queueAlert(`Spring runoff snowmelt flooded the bottleneck valley in ${province.name}!`, 'CRITICAL');
          }
        }
      }

      // B. AUTUMN (Harvesting)
      // If player raised levies too heavily in autumn (serfs < 2000), productivity collapses and famine warning fires
      if (isAutumn && province.population.serfs < 1800 && currentDay % 10 === 0) {
        province.population.health = Math.max(15, province.population.health - 8);
        province.loyalty = Math.max(10, province.loyalty - 12);
        this.engine.alertSystem.queueAlert(`Severe labor shortage during the autumn harvest of ${province.name}! Famine risk has surged!`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, currentDay, `Critical peasant deficit hindered harvesting of grains in ${province.name}, causing localized starvation.`, 'URGENT');
      }

      // C. Forest regrowth model
      if (province.forestCoverage > 0 && province.forestCoverage < 100 && !province.hasWildfire) {
        if (isSpring) {
          province.forestCoverage = Math.min(100, province.forestCoverage + 0.12);
        } else if (isWinter) {
          province.forestCoverage = Math.max(5, province.forestCoverage - 0.05);
        }
      }

      // D. Road quality decay from weather and mud
      let baseWear = 0.05;
      const isMudSeason = isSpring && (currentDay >= 60 && currentDay <= 100);
      
      if (isMudSeason) {
        // Mud season inflicts massive road decay
        province.roadQuality = Math.max(10, province.roadQuality - 0.40);
      } else if (province.currentWeather === 'BLIZZARD' || province.currentWeather === 'THUNDERSTORM' || province.currentWeather === 'FLOOD') {
        province.roadQuality = Math.max(10, province.roadQuality - 0.50);
      } else {
        // Gradually upkeep roads
        province.roadQuality = Math.min(100, province.roadQuality + 0.15);
      }

      // E. Recovery of physical devastations (salted soils & ruined buildings)
      if (province.salted) {
        if (this.engine.rng.next() < 0.0008) {
          province.salted = false;
          this.engine.alertSystem.queueAlert(`Soils of ${province.name} have cleansed of salt. Crops can grow again.`, 'FLAVOR');
        }
      }
      if (province.ruined) {
        if (!province.isBesieged && province.population.total > 500 && this.engine.rng.next() < 0.004) {
          province.ruined = false;
          this.engine.alertSystem.queueAlert(`The war-torn structures of ${province.name} have been rebuilt by the populace.`, 'FLAVOR');
        }
      }

      // F. Burned / devastated tag countdown recovery
      if (province.devastatedTimeLeft > 0) {
        province.devastatedTimeLeft--;
        if (province.devastatedTimeLeft === 0) {
          this.engine.alertSystem.queueAlert(`The ashes of ${province.name} have settled and soils recovered. Fertility penalties removed.`, 'NORMAL');
        }
      }

      // G. Spontaneous siege compartment fires
      if (province.isBesieged && this.engine.rng.next() < 0.015) { // 1.5% chance per day of fiery siege rounds
        province.hasWildfire = true;
        province.wildfireDuration = 1;
        this.engine.alertSystem.queueAlert(`Incendiary trebuchet rounds have sparked a roaring blaze inside the walls of ${province.name}!`, 'URGENT');
      }
    });

    // 3. Process Fire Simulation & Propagation Mechanics
    const spreadingProvinces: string[] = [];

    Object.values(this.engine.provinces).forEach(province => {
      if (province.hasWildfire) {
        province.wildfireDuration!++;
        
        // Attrition/Slaughter on local populations
        const fireSlain = Math.floor(province.population.total * 0.03) + 20; // 3% die of smoke or flame daily
        const lossRatio = Math.min(1.0, fireSlain / province.population.total);
        if (lossRatio > 0 && lossRatio < 1) {
          province.population.serfs = Math.max(0, Math.floor(province.population.serfs * (1 - lossRatio)));
          province.population.merchants = Math.max(0, Math.floor(province.population.merchants * (1 - lossRatio)));
          province.population.total = province.population.serfs + province.population.merchants + province.population.clergy + province.population.nobles;
        }

        // Damage infrastructure
        province.roadQuality = Math.max(5, province.roadQuality - 14);
        province.loyalty = Math.max(5, province.loyalty - 10);

        // Dry weather increases propagation risk
        const isAridDrought = province.currentWeather === 'DROUGHT' || season === 'SUMMER';
        let baseSpreadChance = isAridDrought ? 0.35 : 0.12;
        
        // Forests burn incredibly fast
        if (province.terrain === 'DEEP_FOREST' || province.terrain === 'FOREST') {
          baseSpreadChance *= 1.8;
        }

        // Roll for fire spread to neighbors in alignment with wind direction
        province.neighbors.forEach(nId => {
          const neighbor = this.engine.provinces[nId];
          if (neighbor && !neighbor.hasWildfire) {
            
            // Adjust spread probability based on the spatial wind alignment
            let windMultiplier = 1.0;
            const dy = neighbor.coords.r - province.coords.r;
            const dx = neighbor.coords.q - province.coords.q;

            if (this.currentWindDirection === 'NORTH' && dy < 0) windMultiplier = 2.0;
            else if (this.currentWindDirection === 'SOUTH' && dy > 0) windMultiplier = 2.0;
            else if (this.currentWindDirection === 'EAST' && dx > 0) windMultiplier = 2.0;
            else if (this.currentWindDirection === 'WEST' && dx < 0) windMultiplier = 2.0;
            else windMultiplier = 0.5; // Wind opposes/ignores spread direction

            let spreadChance = baseSpreadChance * windMultiplier;

            // River acting as a massive natural firebreak barrier
            if (neighbor.terrain === 'RIVER_VALLEY' || province.terrain === 'RIVER_VALLEY') {
              spreadChance *= 0.15; // 85% reduction in spread chance over rivers!
            }

            if (this.engine.rng.next() < spreadChance) {
              spreadingProvinces.push(neighbor.id);
            }
          }
        });

        // H. Incineration limit: Forests consume fully in 3 days, convert to Plains
        if (province.wildfireDuration! >= 3) {
          province.hasWildfire = false;
          province.wildfireDuration = 0;
          province.devastatedTimeLeft = 120; // 120 days of burn recovery (fertility penalty)
          province.ruined = true;

          if (province.terrain === 'DEEP_FOREST' || province.terrain === 'FOREST') {
            province.terrain = 'PLAINS' as any;
            province.forestCoverage = 3;
            this.engine.alertSystem.queueAlert(`The wild forests of ${province.name} have fully burned to the ground, converting to bare charcoal plains.`, 'CRITICAL');
            this.engine.chronicleSystem.add(year, currentDay, `Ancient primal forests in ${province.name} burned completely, leaving behind barren clearing fields.`, 'URGENT');
          } else {
            this.engine.alertSystem.queueAlert(`The aggressive fires in ${province.name} have finally died out, leaving scorched ruins behind.`, 'NORMAL');
            this.engine.chronicleSystem.add(year, currentDay, `The destructive wildfires of ${province.name} subsided after sweeping agricultural sectors.`, 'NORMAL');
          }
        }
      }
    });

    // Apply spreads
    spreadingProvinces.forEach(id => {
      const p = this.engine.provinces[id];
      if (p) {
        p.hasWildfire = true;
        p.wildfireDuration = 1;
        this.engine.alertSystem.queueAlert(`Wildfires have spread across borders into ${p.name}!`, 'CRITICAL');
      }
    });
  }
}
