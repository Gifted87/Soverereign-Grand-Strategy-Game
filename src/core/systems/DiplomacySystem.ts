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
      // Check if any character party is dead
      let partyDead = false;
      treaty.parties.forEach(pId => {
        const char = this.engine.characters[pId];
        if (char && char.isAlive === false) {
          partyDead = true;
        }
      });

      // Expiry check
      if (treaty.isActive !== false && ((treaty.expiryDate !== null && currentDay >= treaty.expiryDate) || partyDead)) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          this.engine.clock.currentDay,
          `The diplomatic ${treaty.type} pact involving ${treaty.parties.join(' and ')} has ended.`,
          'NORMAL'
        );
        delete this.engine.treaties[treatyId];
        return;
      }
      if (treaty.isActive === false) {
        delete this.engine.treaties[treatyId];
        return;
      }

      // Process monthly tributes for Vassals
      if (treaty.type === 'VASSALAGE' && currentDay % 30 === 0) {
        const liegeId = treaty.parties[0];
        const vassalId = treaty.parties[1];

        const liegeLord = this.engine.characters[liegeId];
        const vassalLord = this.engine.characters[vassalId];

        if (liegeLord && vassalLord) {
          // Dynamic tribute amount based on vassal wealth
          const tributeAmount = Math.floor(vassalLord.goldHoldings * 0.1); 
          if (tributeAmount > 0 && vassalLord.goldHoldings >= tributeAmount) {
            vassalLord.goldHoldings -= tributeAmount;
            liegeLord.goldHoldings += tributeAmount;
            
            // Sync with engine treasury if liege is player
            if (liegeLord.isPlayer) {
              this.engine.treasury.goldBalance += tributeAmount;
              this.engine.treasury.tributeIncome += tributeAmount;

              this.engine.alertSystem.queueAlert(
                `Received ${tributeAmount} gold tribute from vassal ${vassalLord.firstName}.`,
                'NORMAL'
              );
            }
          }
        }
      }
    });

    // Handle alliance opinions boost
    if (currentDay % 15 === 0) {
      Object.values(this.engine.treaties).forEach(treaty => {
        if (treaty.type === 'ALLIANCE') {
          // Boost opinion between lord entities of these alliances
          const charA = this.engine.characters[treaty.parties[0]];
          const charB = this.engine.characters[treaty.parties[1]];

          if (charA && charB) {
            if (charA.opinion && charA.opinion[charB.id] !== undefined) {
              charA.opinion[charB.id] = Math.min(100, charA.opinion[charB.id] + 1);
            } else if (charA.opinion) {
              charA.opinion[charB.id] = 10;
            }
            if (charB.opinion && charB.opinion[charA.id] !== undefined) {
              charB.opinion[charA.id] = Math.min(100, charB.opinion[charA.id] + 1);
            } else if (charB.opinion) {
              charB.opinion[charA.id] = 10;
            }
          }
        }
      });
    }
  }
}
