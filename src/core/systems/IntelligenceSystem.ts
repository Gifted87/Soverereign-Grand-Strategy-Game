/**
 * IntelligenceSystem.ts
 *
 * Simulates espionage, plots, and intrigue.
 * Connects directly to NPC Spymaster actions (ASSIGN_ASSASSINATION, FRAME, etc.).
 * Processes both plot advancement and exposure/execution.
 */

import type { GameLoop } from '../engine/GameLoop';
import { Plot } from '../models/Faction';
import { recalculateCharacterStats } from '../utils/npcGenerator';
import { nanoid } from 'nanoid';

export class IntelligenceSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processActivePlots();
  }

  /**
   * Called by Spymaster action executor when an NPC decides to start a plot.
   */
  public registerNewPlot(
    type: Plot['type'],
    initiatorId: string,
    targetId: string,
    initialProgress = 0
  ) {
    const plotId = `plot_${nanoid()}`;
    const newPlot: Plot = {
      id: plotId,
      type,
      initiatorId,
      targetId,
      agentIds: [],
      progressPercent: initialProgress,
      exposureRisk: 2.0, // base daily risk
      potentialConsequences: [],
      isExposed: false,
      outcomeId: null
    };

    this.engine.plots[plotId] = newPlot;
  }

  private processActivePlots() {
    Object.entries(this.engine.plots).forEach(([plotId, plot]) => {
      const initiator = this.engine.characters[plot.initiatorId];
      const target = this.engine.characters[plot.targetId];

      // Clean up orphan plots
      if (!initiator || !initiator.isAlive || (target && !target.isAlive)) {
        delete this.engine.plots[plotId];
        return;
      }

      // 1. Advance Plot Progress based on intrigue skill
      const intrigueFactor = initiator.intrigue || 10;
      // Spymaster support bonus
      const spymaster = this.engine.characters[initiator.advisorIds?.spymaster ?? ''];
      const spyBonus = spymaster ? (spymaster.intrigue || 0) * 0.1 : 0;
      
      const dailyProgress = 1 + (intrigueFactor * 0.1) + spyBonus;
      plot.progressPercent = Math.min(100, plot.progressPercent + dailyProgress);

      // 2. Exposure check
      // Risk reduced by initiator intrigue, increased by target intrigue
      const targetIntrigue = target ? (target.intrigue || 10) : 10;
      const effectiveRisk = Math.max(0.1, plot.exposureRisk + (targetIntrigue - intrigueFactor) * 0.05);

      if (!plot.isExposed && this.engine.rng.next() * 100 < effectiveRisk) {
        plot.isExposed = true;
        
        // Only alert the player if they are the target, or their spymaster caught it
        if (target?.isPlayer || this.engine.rng.next() < 0.2) {
          this.engine.alertSystem.queueAlert(
            `PLOT EXPOSED! Spies report that ${initiator.firstName} is plotting a ${plot.type} attack against ${target ? target.firstName : 'the Realm'}!`,
            'CRITICAL'
          );
        }
        
        // Opinion penalty on exposure
        if (target) {
          target.opinion[initiator.id] = (target.opinion[initiator.id] || 0) - 50;
          target.suspicion[initiator.id] = (target.suspicion[initiator.id] || 0) + 80;
        }
      }

      // 3. Execution on 100% progress
      if (plot.progressPercent >= 100) {
        this.executePlotOutcome(plot);
        this.engine.eventBus.publish('PLOT_EXECUTED', { plotId, plot });
        delete this.engine.plots[plotId];
      }
    });
  }

  private executePlotOutcome(plot: Plot) {
    const initiator = this.engine.characters[plot.initiatorId];
    const target = this.engine.characters[plot.targetId];

    if (!initiator) return;

    const year = this.engine.clock.currentYear;
    const day = this.engine.clock.currentDay;

    switch (plot.type) {
      case 'ASSASSINATION':
        if (target) {
          target.health = 0;
          target.causeOfDeath = "Poisoned Chalice";
          target.isAlive = false;
          target.deathDate = day;

          this.engine.chronicleSystem.add(
            year, day,
            `${target.firstName} ${target.lastName} has been foully murdered! Cause of Death: Poison.`,
            'CRITICAL'
          );
        }
        break;

      case 'CLAIM_FORGERY':
        if (target && target.primaryTitle) {
          this.engine.chronicleSystem.add(
            year, day,
            `${initiator.firstName} has fabricated an ancestral claim of sovereign lordship over ${target.primaryTitle.name}!`,
            'URGENT'
          );
          
          initiator.heldTitles.push({
            id: `claim_${nanoid()}`,
            name: `Fabricated Claim: ${target.primaryTitle.name}`
          });
          
          if (!initiator.casusBelli) initiator.casusBelli = [];
          initiator.casusBelli.push(target.primaryTitle.id);
          
          target.opinion[initiator.id] = (target.opinion[initiator.id] || 0) - 100;
        }
        break;

      case 'SPY_INFILTRATE':
        if (target) {
          this.engine.chronicleSystem.add(
            year, day,
            `Agents of ${initiator.firstName} successfully infiltrated the council chambers of ${target.firstName}.`,
            'NORMAL'
          );
          // Mechanical effect: grants intel visibility level increase (implemented in InterAgentInfluence)
          initiator.intelLevel = (initiator.intelLevel || {});
          initiator.intelLevel[target.id] = Math.min(3, (initiator.intelLevel[target.id] || 0) + 1);
        }
        break;

      case 'DISCOVER_SECRETS':
        if (target) {
          let secretRevealed = false;
          if (target.secretTrait) {
            this.engine.chronicleSystem.add(
              year, day,
              `Agents uncovered ${target.firstName}'s darkest secret: they are ${target.secretTrait.name}!`,
              'URGENT'
            );
            if (!target.traits) target.traits = [];
            target.traits.push(target.secretTrait);
            recalculateCharacterStats(target as any);
            target.secretTrait = null;
            secretRevealed = true;
          } else if (target.loverIds && target.loverIds.length > 0) {
            const lover = this.engine.characters[target.loverIds[0]];
            if (lover) {
              this.engine.chronicleSystem.add(
                year, day,
                `Agents uncovered that ${target.firstName} is having a secret affair with ${lover.firstName}!`,
                'URGENT'
              );
              secretRevealed = true;
            }
          }

          if (!secretRevealed) {
            this.engine.chronicleSystem.add(
              year, day,
              `Agents found no significant secrets in ${target.firstName}'s court.`,
              'NORMAL'
            );
          }
        }
        break;

      case 'FABRICATE_SCANDAL':
      case 'FRAME':
        if (target) {
          this.engine.chronicleSystem.add(
            year, day,
            `Vicious rumors and forged letters have destroyed the reputation of ${target.firstName}.`,
            'URGENT'
          );
          target.prestige = Math.max(0, (target.prestige || 0) - 50);
          target.piety = Math.max(0, (target.piety || 0) - 30);
          
          // All vassals lose opinion
          Object.values(this.engine.characters).forEach(c => {
            if (c.liegeId === target.id) {
              c.opinion[target.id] = (c.opinion[target.id] || 0) - 20;
            }
          });
        }
        break;

      case 'BLACKMAIL':
        if (target) {
          this.engine.chronicleSystem.add(
            year, day,
            `${initiator.firstName} has successfully blackmailed ${target.firstName} with compromising evidence.`,
            'NORMAL'
          );
          // Forces target's loyalty up through fear, but tanks opinion
          target.loyaltyToLiege = Math.min(100, (target.loyaltyToLiege || 50) + 40);
          target.opinion[initiator.id] = (target.opinion[initiator.id] || 0) - 80;
        }
        break;

      default:
        break;
    }
  }
}
