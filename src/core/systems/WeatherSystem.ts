import type { GameLoop } from '../engine/GameLoop';
import { WeatherState } from '../models/Climate';
import { BiomeType } from '../../data/terrain-types';

export class WeatherSystem {
  constructor(private engine: GameLoop) {}
  
  tick() {
    const season = this.engine.clock.currentSeason;
    const year = this.engine.clock.currentYear;
    const currentDay = this.engine.clock.currentDay;
    const isSpring = season === 'SPRING';
    const isSummer = season === 'SUMMER';
    const isAutumn = season === 'AUTUMN';
    const isWinter = season === 'WINTER';

    // 1. Roll for a new spontaneous regional storm cell
    let regionalStormType: WeatherState | null = null;
    let regionalStormOriginId: string | null = null;
    if (this.engine.rng.next() < 0.04) { // 4% chance per day
      if (isWinter) {
        regionalStormType = 'BLIZZARD';
      } else if (isSummer) {
        regionalStormType = 'THUNDERSTORM';
      } else {
        regionalStormType = 'HEAVY_RAIN';
      }
      const keys = Object.keys(this.engine.provinces);
      if (keys.length > 0) {
        regionalStormOriginId = keys[Math.floor(this.engine.rng.next() * keys.length)];
      }
    }

    // 2. Process each province's daily weather state
    Object.values(this.engine.provinces).forEach(province => {
      // Setup tracking variables if they don't exist
      province.heavyRainDays = province.heavyRainDays || 0;
      province.droughtDays = province.droughtDays || 0;
      province.clearDays = province.clearDays || 0;
      province.blizzardDays = province.blizzardDays || 0;

      // Storm propagation check
      let stormPropagated = false;
      if (regionalStormType && regionalStormOriginId) {
        if (province.id === regionalStormOriginId) {
          province.currentWeather = regionalStormType;
          stormPropagated = true;
          this.engine.alertSystem.queueAlert(`A severe ${regionalStormType.toLowerCase().replace('_', ' ')} cell formed in ${province.name}!`, 'URGENT');
        } else if (province.neighbors.includes(regionalStormOriginId) && this.engine.rng.next() < 0.35) { // 35% chance to spread
          province.currentWeather = regionalStormType;
          stormPropagated = true;
        }
      }

      // If no storm was propagated to this province today, roll for weather shifting
      // Individual provinces have weather inertia (85% chance to stay the same)
      const rollShift = this.engine.rng.next();
      if (!stormPropagated && rollShift < 0.20) {
        const biome = province.biome;
        const elevation = province.elevation; // 0-100
        const isCoastal = province.terrain === 'COAST';

        // Base distributions of possible weather
        let weights: { state: WeatherState; weight: number }[] = [];

        // Distribute weather types based on season and biome
        if (isWinter) {
          if (biome === BiomeType.ARCTIC || biome === BiomeType.BOREAL) {
            weights = [
              { state: 'BLIZZARD', weight: 40 + (elevation * 0.3) },
              { state: 'LIGHT_SNOW', weight: 35 },
              { state: 'FOG', weight: 15 },
              { state: 'CLEAR', weight: 10 },
            ];
          } else if (biome === BiomeType.MEDITERRANEAN || biome === BiomeType.ARID) {
            weights = [
              { state: 'CLEAR', weight: 60 },
              { state: 'OVERCAST', weight: 20 },
              { state: 'LIGHT_RAIN', weight: 15 },
              { state: 'FOG', weight: 5 },
            ];
          } else { // TEMPERATE, STEPPE, etc.
            weights = [
              { state: 'LIGHT_SNOW', weight: 30 + (elevation * 0.2) },
              { state: 'CLEAR', weight: 25 },
              { state: 'OVERCAST', weight: 25 },
              { state: 'BLIZZARD', weight: 10 + (elevation * 0.1) },
              { state: 'FOG', weight: 10 },
            ];
          }
        } else if (isSummer) {
          if (biome === BiomeType.ARID || biome === BiomeType.STEPPE) {
            weights = [
              { state: 'DROUGHT', weight: 45 },
              { state: 'HEATWAVE', weight: 35 },
              { state: 'CLEAR', weight: 15 },
              { state: 'THUNDERSTORM', weight: 5 },
            ];
          } else if (biome === BiomeType.TROPICAL) {
            weights = [
              { state: 'HEAVY_RAIN', weight: 40 },
              { state: 'THUNDERSTORM', weight: 30 },
              { state: 'CLEAR', weight: 15 },
              { state: 'OVERCAST', weight: 15 },
            ];
          } else { // TEMPERATE, MEDITERRANEAN, etc.
            weights = [
              { state: 'CLEAR', weight: 55 - (isCoastal ? 10 : 0) },
              { state: 'HEATWAVE', weight: 15 + (biome === BiomeType.MEDITERRANEAN ? 10 : 0) },
              { state: 'DROUGHT', weight: 10 },
              { state: 'LIGHT_RAIN', weight: 10 + (isCoastal ? 10 : 0) },
              { state: 'THUNDERSTORM', weight: 10 },
            ];
          }
        } else if (isSpring || isAutumn) {
          // Transitional periods (rains/fog/storms)
          if (biome === BiomeType.ARCTIC) {
            weights = [
              { state: 'LIGHT_SNOW', weight: 40 },
              { state: 'BLIZZARD', weight: 15 },
              { state: 'FOG', weight: 25 },
              { state: 'CLEAR', weight: 20 },
            ];
          } else if (biome === BiomeType.ARID) {
            weights = [
              { state: 'CLEAR', weight: 70 },
              { state: 'OVERCAST', weight: 20 },
              { state: 'LIGHT_RAIN', weight: 10 },
            ];
          } else {
            // Moist temperate climates
            weights = [
              { state: 'LIGHT_RAIN', weight: 30 + (isCoastal ? 15 : 0) },
              { state: 'OVERCAST', weight: 25 },
              { state: 'CLEAR', weight: 25 },
              { state: 'FOG', weight: 12 },
              { state: 'THUNDERSTORM', weight: 8 },
            ];
          }
        }

        // Adjust for coastal humidity if applicable
        if (isCoastal && !isWinter) {
          weights.forEach(w => {
            if (w.state === 'LIGHT_RAIN' || w.state === 'HEAVY_RAIN' || w.state === 'FOG') {
              w.weight *= 1.4;
            }
          });
        }

        // Adjust for mountain cold if applicable
        if (elevation > 60) {
          weights.forEach(w => {
            if (w.state === 'BLIZZARD' || w.state === 'LIGHT_SNOW' || w.state === 'FOG') {
              w.weight *= 1.5;
            }
            if (w.state === 'HEATWAVE' || w.state === 'DROUGHT') {
              w.weight *= 0.3;
            }
          });
        }

        // Select item according to relative weights
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        let currentWeightSum = 0;
        const selectorRoll = this.engine.rng.next() * totalWeight;
        let chosenWeather: WeatherState = 'CLEAR';

        for (const w of weights) {
          currentWeightSum += w.weight;
          if (selectorRoll <= currentWeightSum) {
            chosenWeather = w.state;
            break;
          }
        }

        province.currentWeather = chosenWeather;
      }

      // Update counters for the weather effects cascade
      const cur = province.currentWeather;

      if (cur === 'HEAVY_RAIN' || cur === 'THUNDERSTORM') {
        province.heavyRainDays!++;
        province.droughtDays = 0;
        province.clearDays = 0;
        province.blizzardDays = 0;
      } else if (cur === 'DROUGHT') {
        province.droughtDays!++;
        province.heavyRainDays = 0;
        province.clearDays = 0;
        province.blizzardDays = 0;
      } else if (cur === 'BLIZZARD') {
        province.blizzardDays!++;
        province.heavyRainDays = 0;
        province.droughtDays = 0;
        province.clearDays = 0;
      } else if (cur === 'CLEAR') {
        province.clearDays!++;
        province.blizzardDays = 0;
        province.heavyRainDays = 0;
        // Drought can develop if clear + drought accumulate together
        if (province.droughtDays && province.droughtDays > 0) {
          province.droughtDays!++;
        }
      } else {
        province.heavyRainDays = 0;
        province.blizzardDays = 0;
      }

      // 3. Effects Cascade Trigger Checks
      
      // CASCADE A: Heavy rain / storm x 5 days -> FLOOD surges!
      if (province.heavyRainDays! >= 5) {
        province.heavyRainDays = 0;
        province.floodRisk = Math.min(100, (province.floodRisk || 0) + 40);
        
        if (province.floodRisk >= 80) {
          province.currentWeather = 'FLOOD';
          province.floodRisk = 10;
          province.ruined = true; // Flod bogs down infrastructure
          this.engine.alertSystem.queueAlert(`The soils saturation has triggered a devastating FLOOD in ${province.name}! Crops drowned, roads washed out.`, 'CRITICAL');
          this.engine.chronicleSystem.add(year, currentDay, `Raging torrents overflowed the riverbed channels in ${province.name}, drowning agricultural fields.`, 'URGENT');
        } else {
          this.engine.alertSystem.queueAlert(`Heavy torrential rains have placed ${province.name} on extreme FLOOD warning. Risk: ${province.floodRisk}%`, 'URGENT');
        }
      }

      // CASCADE B: Drought x 30 days -> Famine risk surges
      if (province.droughtDays! >= 30) {
        province.droughtDays = 0;
        province.population.health = Math.max(10, province.population.health - 25);
        province.loyalty = Math.max(20, province.loyalty - 15);
        this.engine.alertSystem.queueAlert(`Severe drought in ${province.name} has exhausted local wells! Famine stalks the local peasantry.`, 'CRITICAL');
        this.engine.chronicleSystem.add(year, currentDay, `Famine and starvation grip ${province.name} as a dry drought enters its second month.`, 'URGENT');
      }

      // CASCADE C: Blizzard x 3 days -> Frostbite in army stationed here
      if (province.blizzardDays! >= 3) {
        province.blizzardDays = 0;
        // Slay soldiers in armies residing here due to extreme frostbite
        Object.values(this.engine.armies).forEach(army => {
          const armyProv = Object.values(this.engine.provinces).find(p => p.coords.q === army.location.q && p.coords.r === army.location.r);
          if (armyProv && armyProv.id === province.id) {
            army.morale = Math.max(10, army.morale - 15);
            army.units.forEach(unit => {
              const physicalLosses = Math.floor(unit.count * 0.08); // 8% lost to freezing temperatures
              unit.count = Math.max(0, unit.count - physicalLosses);
            });
            this.engine.alertSystem.queueAlert(`Armies stationed in the blizzard of ${province.name} have suffered extensive frostbite casualties!`, 'CRITICAL');
          }
        });
      }

      // CASCADE D: Clear + Drought -> Wildfire Threat
      if (cur === 'CLEAR' && province.droughtDays! > 10) {
        // High risk of spontaneous wildfire
        if (this.engine.rng.next() < 0.08) {
          province.hasWildfire = true;
          province.wildfireDuration = 1;
          province.droughtDays = 0;
          this.engine.alertSystem.queueAlert(`A spontaneous wildfire has broken out in the parched fields of ${province.name}!`, 'CRITICAL');
          this.engine.chronicleSystem.add(year, currentDay, `Forest brush fires spark and spread in ${province.name} due to severe heat and dry conditions.`, 'URGENT');
        }
      }
    });
  }
}
