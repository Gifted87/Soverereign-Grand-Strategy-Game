import type { GameLoop } from '../engine/GameLoop';
import { DiseaseState } from '../models/Disease';

export interface DiseaseConfig {
  id: string;
  name: string;
  baseMortality: number; // overall percentage expected deaths
  spreadRate: number; // daily multiplier of infections
  baseDurationDays: number;
  effectDescription: string;
  revoltFactor: number;
  productivityHit: number;
}

export const DISEASE_CONFIGS: Record<string, DiseaseConfig> = {
  'PLAGUE': {
    id: 'PLAGUE',
    name: 'The Black Death (Plague)',
    baseMortality: 0.45, // 30–60% mortality
    spreadRate: 1.14,
    baseDurationDays: 360, // 6–24 months
    effectDescription: 'Massive population loss, economic collapse, high panic',
    revoltFactor: 1.8,
    productivityHit: 0.8 // -80% production
  },
  'CAMP_FEVER': {
    id: 'CAMP_FEVER',
    name: 'Camp Fever / Dysentery',
    baseMortality: 0.10, // 5–15% mortality
    spreadRate: 1.08,
    baseDurationDays: 60, // 1–3 months
    effectDescription: 'Saps army strength and morale, worsens in sieges',
    revoltFactor: 1.1,
    productivityHit: 0.3 // -30% production
  },
  'FAMINE_SICKNESS': {
    id: 'FAMINE_SICKNESS',
    name: 'Famine Sickness / Malnutrition',
    baseMortality: 0.18, // 10–25% mortality
    spreadRate: 1.05,
    baseDurationDays: 90, // tied directly to drought/crop failures
    effectDescription: 'Productivity halved, double peasant revolt risks',
    revoltFactor: 2.0, // revolt risk x2
    productivityHit: 0.5 // productivity -50%
  },
  'HORSE_PLAGUE': {
    id: 'HORSE_PLAGUE',
    name: 'Great Equine Murrain (Horse Plague)',
    baseMortality: 0.30, // 20–40% horse mortality
    spreadRate: 1.07,
    baseDurationDays: 30, // 1 month
    effectDescription: 'Decimates cavalry army mounts, saps rapid communications',
    revoltFactor: 1.0,
    productivityHit: 0.1
  },
  'POX': {
    id: 'POX',
    name: 'The Great Pox',
    baseMortality: 0.06, // 3–10% mortality
    spreadRate: 1.09,
    baseDurationDays: 120, // 2–6 months
    effectDescription: 'Extremely disfiguring disease, highly contagious along trade lanes',
    revoltFactor: 1.2,
    productivityHit: 0.2
  }
};

export class DiseaseSystem { 
  constructor(private engine: GameLoop) {} 
  
  tick() {
    const currentDay = this.engine.clock.currentDay;
    const year = this.engine.clock.currentYear;

    // 1. Spontaneous daily outbreaks in settlements based on density and unrest
    Object.values(this.engine.provinces).forEach(province => {
      // Small chance for a new disease to manifest
      if (!province.disease) {
        let roll = this.engine.rng.next();
        
        // Wet wetlands, hot arid zones, dirty crowded provinces increase risk
        let baseChance = 0.0001;
        if (province.terrain === 'WETLAND') baseChance += 0.0008; // Disease risk +20%
        if (province.population.total > 8000) baseChance += 0.0003;
        if (province.ruined) baseChance += 0.0005;

        // Seasons also influence
        const season = this.engine.clock.currentSeason;
        if (season === 'WINTER') baseChance += 0.0001; // cramped indoor warmth spreads pox/influenza

        // Sanitation infrastructure reduces disease chance dramatically
        let localHasAqueduct = false;
        let localHasBathhouse = false;
        let localHasSewage = false;

        province.buildings?.forEach((b: any) => {
          if (b.typeId === 'AQUEDUCT') localHasAqueduct = true;
          if (b.typeId === 'BATHHOUSE') localHasBathhouse = true;
          if (b.typeId === 'SEWAGE') localHasSewage = true;
        });

        if (localHasAqueduct) baseChance -= 0.0003;
        if (localHasBathhouse) baseChance -= 0.0002;
        if (localHasSewage) baseChance -= 0.0004;

        // Ground-level clamp to prevent negative disease probabilities
        baseChance = Math.max(0.00001, baseChance);

        if (roll < baseChance) {
          // Select disease type
          let chosenType = 'POX';
          const rand = this.engine.rng.next();
          if (province.terrain === 'WETLAND' && rand < 0.4) {
            chosenType = 'CAMP_FEVER'; // muddy waters
          } else if (province.droughtDays && province.droughtDays > 10 && rand < 0.5) {
            chosenType = 'FAMINE_SICKNESS'; // starvation
          } else if (rand < 0.15) {
            chosenType = 'PLAGUE'; // Rare devastating black death
          } else if (rand < 0.30) {
            chosenType = 'HORSE_PLAGUE';
          } else if (rand < 0.65) {
            chosenType = 'CAMP_FEVER';
          }

          province.disease = {
            diseaseId: chosenType,
            infectedCount: Math.floor(province.population.total * 0.01) + 10,
            severity: 65,
            startedAt: currentDay
          };

          this.engine.alertSystem.queueAlert(`A sudden outbreak of ${DISEASE_CONFIGS[chosenType].name} has struck the people of ${province.name}!`, 'URGENT');
          this.engine.chronicleSystem.add(year, currentDay, `Physicians in ${province.name} report an outbreak of ${DISEASE_CONFIGS[chosenType].name} among the commoners.`, 'URGENT');
        }
      }
    });

    // 2. Progression of infection in provinces (Modified SIR Model)
    Object.values(this.engine.provinces).forEach(province => {
      if (province.disease) {
        const pDisease = province.disease;
        const config = DISEASE_CONFIGS[pDisease.diseaseId] || DISEASE_CONFIGS['POX'];
        const totalPeople = province.population.total;

        if (totalPeople <= 0) {
          province.disease = null;
          return;
        }

        // Quarantine stops active interactions but locks down movement
        const isQuarantined = province.quarantined === true;
        const actualSpreadRate = isQuarantined ? 1.01 : config.spreadRate;

        // Update infection vector
        const newlyInfected = Math.floor(pDisease.infectedCount * (actualSpreadRate - 1));
        const limitInfected = Math.min(totalPeople, pDisease.infectedCount + newlyInfected);
        pDisease.infectedCount = limitInfected;

        // Daily Mortality
        const dailyMortalityRate = (config.baseMortality / config.baseDurationDays) * (pDisease.severity / 50);
        const sicknessDeaths = Math.floor(pDisease.infectedCount * dailyMortalityRate);

        // Subtract deaths proportionally from demographics
        if (sicknessDeaths > 0) {
          const ratio = sicknessDeaths / totalPeople;
          province.population.serfs = Math.max(0, Math.floor(province.population.serfs * (1 - ratio)));
          province.population.merchants = Math.max(0, Math.floor(province.population.merchants * (1 - ratio)));
          province.population.clergy = Math.max(0, Math.floor(province.population.clergy * (1 - ratio)));
          province.population.nobles = Math.max(0, Math.floor(province.population.nobles * (1 - ratio)));
          province.population.total = province.population.serfs + province.population.merchants + province.population.clergy + province.population.nobles;
          
          pDisease.infectedCount = Math.max(0, pDisease.infectedCount - sicknessDeaths);
        }

        // Subclinical effects on productivity & health values
        province.population.health = Math.max(0, Math.floor(100 - (pDisease.infectedCount / totalPeople) * 80));

        // Pox disfigurement risk on sovereign leaders
        if (pDisease.diseaseId === 'POX' && this.engine.rng.next() < 0.01) {
          const lordId = province.ownerId;
          const lord = this.engine.characters[lordId];
          if (lord && lord.isAlive && !lord.traits.some(t => t.id === 'disfigured' || t.name === 'Disfigured')) {
            lord.traits.push({
              id: 'disfigured',
              name: 'Disfigured',
              type: 'PHYSICAL',
              description: 'This individual bears horrific pitting scars from a terrible struggle with the Pox (-30 general opinion).',
              effects: { opinionModifier: -30, diplomacy: -2 }
            } as any);
            this.engine.alertSystem.queueAlert(`${lord.firstName} ${lord.lastName} of ${province.name} has been severely disfigured by the Pox!`, 'CRITICAL');
          }
        }

        // Natural decay or progression
        const activeDays = currentDay - pDisease.startedAt;
        let localHasMonastery = province.buildings?.some((b: any) => b.typeId === 'MONASTERY');

        if (activeDays > config.baseDurationDays) {
          pDisease.severity -= localHasMonastery ? 6 : 3; // Monastery infirmaries accelerate disease recovery rate limit
        } else if (localHasMonastery) {
          pDisease.severity -= 1.5; // active healing even during peak infection
          pDisease.infectedCount = Math.max(0, pDisease.infectedCount - Math.floor(pDisease.infectedCount * 0.05)); // 5% therapeutic recovery daily
        }

        if (pDisease.severity <= 0 || pDisease.infectedCount <= 2 || province.population.total <= 0) {
          province.disease = null; // Purged from settlement!
          this.engine.alertSystem.queueAlert(`Pestilence has officially receded in ${province.name}.`, 'NORMAL');
        }
      }
    });

    // 3. Movement or territorial spread across trade paths, neighbor nodes & moving armies
    if (currentDay % 3 === 0) {
      Object.values(this.engine.provinces).forEach(province => {
        if (province.disease && !province.quarantined) {
          const pDisease = province.disease;
          
          province.neighbors.forEach(nId => {
            const neighbor = this.engine.provinces[nId];
            if (neighbor && !neighbor.disease && !neighbor.quarantined) {
              
              // Base spread chance
              let spreadChance = 0.08;
              if (pDisease.diseaseId === 'PLAGUE') spreadChance = 0.16; // Plague spreads via trade/rats very fast
              
              // Merchant road trade multiplier
              if (province.roadQuality > 70 && neighbor.roadQuality > 70) spreadChance *= 1.5;

              if (this.engine.rng.next() < spreadChance) {
                neighbor.disease = {
                  diseaseId: pDisease.diseaseId,
                  infectedCount: 15,
                  severity: Math.max(10, pDisease.severity - 15),
                  startedAt: currentDay
                };
                this.engine.alertSystem.queueAlert(`Pestilence has crossed borders from ${province.name} into ${neighbor.name}!`, 'URGENT');
              }
            }
          });
        }
      });
    }

    // 4. Armies traveling through infected lands contracting and carrying diseases
    Object.values(this.engine.armies).forEach(army => {
      // Find current province
      const armyProvince = Object.values(this.engine.provinces).find(p => p.coords.q === army.location.q && p.coords.r === army.location.r);
      
      if (armyProvince) {
        if (armyProvince.disease && !armyProvince.quarantined) {
          const provDisease = armyProvince.disease.diseaseId;
          const alreadyHas = army.diseases.some(d => d.diseaseId === provDisease);
          
          if (!alreadyHas && this.engine.rng.next() < 0.20) { // 20% chance to infect army
            const newDiseaseState: DiseaseState = {
              diseaseId: provDisease,
              infectedCount: Math.floor(army.units.reduce((sum, u) => sum + u.count, 0) * 0.05) + 5,
              severity: 60,
              startedAt: currentDay
            };
            army.diseases.push(newDiseaseState);
            this.engine.alertSystem.queueAlert(`The ${army.name} has contracted ${DISEASE_CONFIGS[provDisease].name} while passing through ${armyProvince.name}!`, 'URGENT');
          }
        }

        // Moving armies carry and spread disease to clean provinces!
        if (army.diseases.length > 0 && !armyProvince.disease && !armyProvince.quarantined) {
          army.diseases.forEach(armyDisease => {
            if (this.engine.rng.next() < 0.25) { // 25% chance to spread army's sickness back into settlement
              armyProvince.disease = {
                diseaseId: armyDisease.diseaseId,
                infectedCount: 20,
                severity: armyDisease.severity - 5,
                startedAt: currentDay
              };
              this.engine.alertSystem.queueAlert(`The infected soldiers of ${army.name} have brought ${DISEASE_CONFIGS[armyDisease.diseaseId].name} into ${armyProvince.name}!`, 'CRITICAL');
            }
          });
        }
      }

      // Seditious effect of diseases in army troops (attrition, horse losses)
      if (army.diseases.length > 0) {
        army.diseases.forEach((dState, idx) => {
          const config = DISEASE_CONFIGS[dState.diseaseId] || DISEASE_CONFIGS['CAMP_FEVER'];
          
          // Sap army morale and strength
          army.morale = Math.max(10, army.morale - 4);
          
          if (dState.diseaseId === 'HORSE_PLAGUE') {
            // Slay horse mounts specifically (converts cavalry count to casualties)
            let horseLosses = 0;
            army.units.forEach(unit => {
              if (unit.isMounted) {
                const slainMounts = Math.floor(unit.count * 0.05); // 5% cavalry slaughtered daily by murrain
                unit.count = Math.max(0, unit.count - slainMounts);
                horseLosses += slainMounts;
              }
            });
            if (horseLosses > 0) {
              this.engine.alertSystem.queueAlert(`Equine plague (murrain) has slain ${horseLosses} horse mounts in the ${army.name}!`, 'URGENT');
            }
          } else {
            // General disease losses
            let casualties = 0;
            army.units.forEach(unit => {
              const losses = Math.floor(unit.count * 0.02); // 2% soldiers die daily of camp fever/pox/plague in field
              unit.count = Math.max(0, unit.count - losses);
              casualties += losses;
            });
          }

          // Natural resolution in army
          const activeDays = currentDay - dState.startedAt;
          if (activeDays > config.baseDurationDays / 2) {
            dState.severity -= 5;
          }
        });

        // Clear resolved army diseases
        army.diseases = army.diseases.filter(d => d.severity > 0);
      }
    });
  } 
}
