import type { GameLoop } from '../engine/GameLoop';
import { Plot } from '../models/Faction';
import { IntelReport } from '../models/Treaty';

export class IntelligenceSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processPlotsAndIntrigue();
  }

  private processPlotsAndIntrigue() {
    const currentDay = this.engine.clock.currentDay;

    // Generate random background plots to keep player engaged
    if (currentDay % 45 === 0 && Object.keys(this.engine.plots).length < 3) {
      this.generateIntriguePlot();
    }

    // Process active plots
    Object.entries(this.engine.plots).forEach(([plotId, plot]) => {
      const initiator = this.engine.characters[plot.initiatorId];
      const target = this.engine.characters[plot.targetId];

      if (!initiator || !initiator.isAlive || (target && !target.isAlive)) {
        // Abort orphan plots
        delete this.engine.plots[plotId];
        return;
      }

      // 1. Advance Plot Progress
      const intrigueFactor = initiator.intrigue || 10;
      plot.progressPercent = Math.min(100, plot.progressPercent + 2 + (intrigueFactor * 0.1));

      // 2. Exposure check
      if (!plot.isExposed && this.engine.rng.next() * 100 < plot.exposureRisk) {
        plot.isExposed = true;
        this.engine.alertSystem.queueAlert(
          `PLOT EXPOSED! Spies report that ${initiator.firstName} is plotting a ${plot.type} attack against ${target ? target.firstName : 'the Realm'}!`,
          'CRITICAL'
        );
      }

      // 3. Execution on 100% progress
      if (plot.progressPercent >= 100) {
        this.executePlotOutcome(plot);
        delete this.engine.plots[plotId];
      }
    });
  }

  private generateIntriguePlot() {
    const plotId = `plot_${Date.now()}`;
    const initiatorId = 'enemy_lord'; // Lord Valerius
    const targetId = 'player';        // Sovereign

    const plotTypes: Array<'ASSASSINATION' | 'CLAIM_FORGERY' | 'SPY_INFILTRATE'> = [
      'ASSASSINATION', 'CLAIM_FORGERY', 'SPY_INFILTRATE'
    ];
    const chosenType = plotTypes[Math.floor(this.engine.rng.next() * plotTypes.length)];

    const newPlot: Plot = {
      id: plotId,
      type: chosenType,
      initiatorId: initiatorId,
      targetId: targetId,
      agentIds: [],
      progressPercent: 0,
      exposureRisk: 1.5, // low daily risk
      potentialConsequences: [{ description: "Severed diplomatic relations" }],
      isExposed: false,
      outcomeId: null
    };

    this.engine.plots[plotId] = newPlot;
  }

  private executePlotOutcome(plot: Plot) {
    const initiator = this.engine.characters[plot.initiatorId];
    const target = this.engine.characters[plot.targetId];

    if (!initiator) return;

    if (plot.type === 'ASSASSINATION' && target) {
      target.health = 0; // Kills target!
      target.causeOfDeath = "Poisoned Chalice";
      target.isAlive = false;
      target.deathDate = this.engine.clock.currentDay;

      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        this.engine.clock.currentDay,
        `${target.firstName} ${target.lastName} has been foully murdered in their private quarters! Cause of Death: Poison.`,
        'CRITICAL'
      );
    } else if (plot.type === 'CLAIM_FORGERY' && target) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        this.engine.clock.currentDay,
        `Spurious deeds of ownership surfaced: ${initiator.firstName} fabricated an ancestral claim of sovereign lordship over your family domain!`,
        'URGENT'
      );
    } else if (plot.type === 'SPY_INFILTRATE' && target) {
      // Infiltrating secrets generates an Intel Report!
      const reportId = `report_${Date.now()}`;
      
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        this.engine.clock.currentDay,
        `Lord Valerius successfully infiltrated your court council chambers and seized sensitive military orders.`,
        'URGENT'
      );
    }
  }
}
