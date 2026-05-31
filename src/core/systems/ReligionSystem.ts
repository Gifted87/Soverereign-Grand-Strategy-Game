import type { GameLoop } from '../engine/GameLoop';

export class ReligionSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processPietyModifications();
    this.processDevotionAndClergyInfluence();
  }

  private processPietyModifications() {
    const currentDay = this.engine.clock.currentDay;

    Object.values(this.engine.characters).forEach(character => {
      if (!character.isAlive) return;

      // Piety fluctuates slightly over time depending on traits or positions
      let deltaPiety = 0.05; // standard slow gain

      if (character.learning > 12) {
        deltaPiety += 0.05;
      }
      if (character.culture === 'Latin') {
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

      character.piety = Math.min(1000, Math.max(0, character.piety + deltaPiety));

      // 1. Excommunication triggers for extremely low piety characters
      if (character.piety < 5 && character.religion === 'christianity' && !character.traits.includes('Excommunicated' as any)) {
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
          `ECCLESIASTICAL wrath! ${character.firstName} has been solemnly excommunicated by the Pontiff! All other devout lords break bread no longer.`,
          'CRITICAL'
        );
      }
    });
  }

  private processDevotionAndClergyInfluence() {
    const currentDay = this.engine.clock.currentDay;

    // Influence clergy growth in provinces
    Object.values(this.engine.provinces).forEach(province => {
      if (province.population.clergy > 0) {
        // Clergy slightly boosts province loyalty if loyal to owner, or decreases if owner is excommunicated!
        const owner = this.engine.characters[province.ownerId];
        const isOwnerExcommunicated = owner?.traits.includes('Excommunicated' as any);

        if (isOwnerExcommunicated) {
          province.loyalty = Math.max(0, province.loyalty - 0.2); // Clergy preaches against excommunicated lord
        } else {
          province.loyalty = Math.min(100, province.loyalty + 0.05); // Divine pacification
        }
      }
    });
  }
}
