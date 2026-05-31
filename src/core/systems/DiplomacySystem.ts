import type { GameLoop } from '../engine/GameLoop';
import { Treaty } from '../models/Treaty';

export class DiplomacySystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processOpinionsAndSuspicion();
    this.processTreatiesAndTributes();
  }

  private processOpinionsAndSuspicion() {
    const currentDay = this.engine.clock.currentDay;

    // Slowly drift character opinions and suspicion back to baseline levels
    Object.values(this.engine.characters).forEach(character => {
      // Opinion drift
      if (character.opinion) {
        Object.keys(character.opinion).forEach(targetId => {
          const currentOpinion = character.opinion[targetId];
          if (currentOpinion > 0) {
            character.opinion[targetId] = Math.max(0, currentOpinion - 0.05); // slow decay
          } else if (currentOpinion < 0) {
            // If they are mortal enemies, opinion remains stagnant
            const targetChar = this.engine.characters[targetId];
            const isEnemy = character.enemyIds.includes(targetId) || (targetChar && targetChar.enemyIds.includes(character.id));
            if (!isEnemy) {
              character.opinion[targetId] = Math.min(0, currentOpinion + 0.03); // slow forgiveness
            }
          }
        });
      }

      // Suspicion drift
      if (character.suspicion) {
        Object.keys(character.suspicion).forEach(targetId => {
          const currentSusp = character.suspicion[targetId];
          if (currentSusp > 0) {
            character.suspicion[targetId] = Math.max(0, currentSusp - 0.1); // suspicion recedes as times pass without plots
          }
        });
      }
    });
  }

  private processTreatiesAndTributes() {
    const currentDay = this.engine.clock.currentDay;

    // Tick active treaties
    Object.entries(this.engine.treaties).forEach(([treatyId, treaty]) => {
      // Expiry check
      if (treaty.expiryDate !== null && currentDay >= treaty.expiryDate) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          this.engine.clock.currentDay,
          `The diplomatic ${treaty.type} pact between ${treaty.parties.join(' and ')} has expired.`,
          'NORMAL'
        );
        delete this.engine.treaties[treatyId];
        return;
      }

      // Process monthly tributes for Vassals
      if (treaty.type === 'VASSALAGE' && currentDay % 30 === 0) {
        const liegeRealm = treaty.parties[0]; // say primary party is liege
        const vassalRealm = treaty.parties[1];

        // Find standard lord characters corresponding to these realms
        const liegeLord = Object.values(this.engine.characters).find(c => c.isPlayer); // say liege is player for simplicity
        const vassalLord = Object.values(this.engine.characters).find(c => c.id === 'enemy_lord');

        if (liegeLord && vassalLord) {
          const tributeAmount = 100;
          if (vassalLord.goldHoldings >= tributeAmount) {
            vassalLord.goldHoldings -= tributeAmount;
            liegeLord.goldHoldings += tributeAmount;
            
            // Sync with engine treasury
            this.engine.treasury.goldBalance += tributeAmount;
            this.engine.treasury.tributeIncome += tributeAmount;

            this.engine.alertSystem.queueAlert(
              `Received ${tributeAmount} gold tribute from vassal state.`,
              'NORMAL'
            );
          }
        }
      }
    });

    // Handle alliance opinions boost
    if (currentDay % 15 === 0) {
      Object.values(this.engine.treaties).forEach(treaty => {
        if (treaty.type === 'ALLIANCE') {
          // Boost opinion between lord entities of these alliances
          const charA = Object.values(this.engine.characters).find(c => c.isPlayer);
          const charB = Object.values(this.engine.characters).find(c => c.id === 'enemy_lord');

          if (charA && charB) {
            if (charA.opinion[charB.id] !== undefined) {
              charA.opinion[charB.id] = Math.min(100, charA.opinion[charB.id] + 1);
            } else {
              charA.opinion[charB.id] = 10;
            }
            if (charB.opinion[charA.id] !== undefined) {
              charB.opinion[charA.id] = Math.min(100, charB.opinion[charA.id] + 1);
            } else {
              charB.opinion[charA.id] = 10;
            }
          }
        }
      });
    }
  }
}
