/**
 * ReligionSystem.ts
 *
 * Drives the religious simulation mechanics.
 * Rewritten to use the new RELIGIONS data structure instead of hardcoded strings.
 * Integrates High Priest NPC actions (excommunication) with province piety state.
 */

import type { GameLoop } from '../engine/GameLoop';
import { getReligion } from '../../data/religion-data';
import { getActiveLaw } from '../../data/law-catalogue';

export class ReligionSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processPietyModifications();
    this.processDevotionAndClergyInfluence();
    this.processHeresySpread();
  }

  private processPietyModifications() {
    Object.values(this.engine.characters).forEach(character => {
      if (!character.isAlive) return;

      const religionDef = getReligion(character.religion);
      
      // Base piety drift depends on traits and the specific religion's pressure
      let deltaPiety = 0.05;

      if (character.learning > 12) {
        deltaPiety += 0.05;
      }
      if (character.culture === 'Latin' && character.religion === 'CATHOLICISM') {
        deltaPiety += 0.02; // Latin catechism training
      }

      // Add piety modifiers from built religious buildings in their domains
      Object.values(this.engine.provinces).forEach(prov => {
        if (prov.ownerId === character.id) {
          prov.buildings?.forEach((b: any) => {
            if (b.typeId === 'CHAPEL') deltaPiety += 0.02;
            if (b.typeId === 'CHURCH') deltaPiety += 0.06;
            if (b.typeId === 'CATHEDRAL') deltaPiety += 0.25;
            if (b.typeId === 'MONASTERY') deltaPiety += 0.10;
            if (b.typeId === 'HOLY_SHRINE') deltaPiety += 0.04;
            if (b.typeId === 'INQUISITION_TOWER') deltaPiety += 0.05;
          });
        }
      });

      // Church pressure drain (high priests expect devotion)
      deltaPiety -= (religionDef.churchPressureRate * 0.1);

      character.piety = Math.min(1000, Math.max(0, (character.piety || religionDef.baselinePiety) + deltaPiety));

      // Excommunication triggers if piety drops below 5 (and religion supports it)
      if (character.piety < 5 && religionDef.doctrines.hasExcommunication && !character.traits?.includes('Excommunicated' as any)) {
        if (!character.traits) character.traits = [];
        character.traits.push('Excommunicated' as any);
        
        // Massive opinion dip from all co-religionists
        Object.values(this.engine.characters).forEach(other => {
          if (other.religion === character.religion) {
            other.opinion[character.id] = (other.opinion[character.id] || 0) - 50;
          }
        });

        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          this.engine.clock.currentDay,
          `ECCLESIASTICAL wrath! ${character.firstName} has been solemnly excommunicated by the ${religionDef.highPriestTitle}! All other devout lords break bread no longer.`,
          'CRITICAL'
        );
      }
    });
  }

  private processDevotionAndClergyInfluence() {
    const activeReligionLaw = getActiveLaw('RELIGION');
    const isTolerance = activeReligionLaw?.id === 'RELIGIOUS_TOLERANCE';
    const isConformity = activeReligionLaw?.id === 'MANDATORY_RELIGIOUS_CONFORMITY';

    Object.values(this.engine.provinces).forEach(province => {
      // Unify province piety state (used by HighPriest action executor)
      // with character piety
      const owner = this.engine.characters[province.ownerId];
      if (!owner) return;

      if (province.population.clergy > 0) {
        const isOwnerExcommunicated = owner.traits?.includes('Excommunicated' as any);

        if (isOwnerExcommunicated) {
          province.loyalty = Math.max(0, province.loyalty - 0.2); // Clergy preaches against excommunicated lord
          
          // Pulls province piety down if owner is condemned
          if (province.stateVector) {
             province.stateVector.continuous['piety'] = Math.max(0, (province.stateVector.continuous['piety'] || 50) - 0.5);
          }
        } else {
          province.loyalty = Math.min(100, province.loyalty + 0.05); // Divine pacification
          
          // Pulls province piety up towards owner's piety
          if (province.stateVector) {
             const targetPiety = Math.min(100, owner.piety / 10); // scale 0-1000 down to 0-100
             const current = province.stateVector.continuous['piety'] || 50;
             if (current < targetPiety) province.stateVector.continuous['piety'] = current + 0.1;
          }
        }
      }

      // Legal effects
      if (isConformity) {
         if (province.stateVector) {
           province.stateVector.continuous['piety'] = Math.min(100, (province.stateVector.continuous['piety'] || 50) + 0.2);
         }
      }
    });
  }

  private processHeresySpread() {
    const currentDay = this.engine.clock.currentDay;
    if (currentDay % 30 !== 0) return; // Process monthly

    Object.values(this.engine.provinces).forEach(province => {
      const owner = this.engine.characters[province.ownerId];
      if (!owner) return;
      const religionDef = getReligion(owner.religion);

      // Low province piety = risk of heresy
      const provPiety = province.stateVector?.continuous['piety'] || 50;
      
      if (provPiety < 20 && religionDef.heresies.length > 0) {
         if (this.engine.rng.next() < 0.05) {
            const heresy = religionDef.heresies[Math.floor(this.engine.rng.next() * religionDef.heresies.length)];
            
            // Push heresy trait onto province
            if (province.stateVector && !province.stateVector.categorical['heresy_active']) {
              province.stateVector.categorical['heresy_active'] = heresy.id;
              
              this.engine.alertSystem.queueAlert(
                `Heresy! The dangerous doctrines of ${heresy.name} have taken root among the peasants of ${province.name}.`,
                'URGENT'
              );
            }
         }
      }
    });
  }
}
