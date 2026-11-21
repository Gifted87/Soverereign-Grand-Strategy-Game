/**
 * EnvironmentSystem Entry Point
 *
 * Orchestrates all environmental sub-systems.
 */

import type { GameLoop } from '../engine/GameLoop';
import { Tier1ProvinceSystem } from './systems/Tier1ProvinceSystem';
import { Tier2GeographicSystem } from './systems/Tier2GeographicSystem';
import { Tier3NetworkSystem } from './systems/Tier3NetworkSystem';
import { Tier4GlobalSystem } from './systems/Tier4GlobalSystem';
import { FeedbackLoopSystem } from './systems/FeedbackLoopSystem';
import { EnvironmentNPCBridge } from './systems/EnvironmentNPCBridge';

export class EnvironmentSystem {
  private tier1: Tier1ProvinceSystem;
  private tier2: Tier2GeographicSystem;
  private tier3: Tier3NetworkSystem;
  private tier4: Tier4GlobalSystem;
  public feedback: FeedbackLoopSystem;
  public npcBridge: EnvironmentNPCBridge;

  constructor(private gameLoop: GameLoop) {
    this.feedback = new FeedbackLoopSystem(gameLoop);
    this.tier1 = new Tier1ProvinceSystem(gameLoop);
    this.tier2 = new Tier2GeographicSystem(gameLoop);
    this.tier3 = new Tier3NetworkSystem(gameLoop);
    this.tier4 = new Tier4GlobalSystem(gameLoop);
    this.npcBridge = new EnvironmentNPCBridge(gameLoop, this.feedback);
  }

  initialize() {
    this.tier1.initialize();
  }

  tickTier1() {
    this.tier1.tick();
  }

  tickTier2() {
    this.tier2.tick();
  }

  tickTier3() {
    this.tier3.tick();
  }

  tickTier4() {
    this.tier4.tick();
  }

  tickFeedbackLoops() {
    this.feedback.tick();
  }
}
