/**
 * EnvironmentEventEngine.ts
 *
 * Core stochastic event selection engine for the Sovereign environmental simulation.
 * Implements the three-layer weight formula described in Section 6:
 *   Layer 1 — Base Weight (geologic/climatic baseline)
 *   Layer 2 — State Multipliers (hard gates + logistic multipliers)
 *   Layer 3 — Gaussian noise perturbation (±5% T1, ±1% T4)
 *
 * This engine is tier-agnostic: it operates on any entity state object
 * and event definition that conforms to EnvironmentTypes.
 */

import type { EnvironmentEvent, EventTriggerCondition } from '../models/EnvironmentTypes';
import type { RandomSeed } from '../../engine/RandomSeed';

// ─────────────────────────────────────────────────────────────────────────────
// Box-Muller Gaussian sampler
// ─────────────────────────────────────────────────────────────────────────────
function gaussianNoise(rng: RandomSeed, stddev: number): number {
  // Box-Muller transform: two uniform samples → one Gaussian sample
  const u1 = Math.max(1e-10, rng.next());
  const u2 = rng.next();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stddev;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logistic curve multiplier
// Returns a value that rises steeply after the threshold.
// At value == threshold: returns 1.0 (neutral)
// At value == 100:       returns maxMultiplier
// ─────────────────────────────────────────────────────────────────────────────
function logisticMultiplier(value: number, threshold: number, maxMultiplier: number): number {
  if (value <= threshold) return 1.0;
  const t = (value - threshold) / (100 - threshold); // 0→1 above threshold
  return 1.0 + (maxMultiplier - 1.0) * (1 / (1 + Math.exp(-10 * (t - 0.5))));
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve a single trigger condition against entity state
// Returns 0 if hard gate fails, multiplier value otherwise
// ─────────────────────────────────────────────────────────────────────────────
function evaluateCondition(
  condition: EventTriggerCondition,
  entityState: Record<string, any>
): number {
  const raw = entityState[condition.field];
  if (raw === undefined) return 1.0; // Field not present → neutral

  let passed = false;
  const val = typeof raw === 'number' ? raw : 0;
  const threshold = typeof condition.value === 'number' ? condition.value : 0;

  switch (condition.op) {
    case '>':  passed = val > threshold; break;
    case '<':  passed = val < threshold; break;
    case '>=': passed = val >= threshold; break;
    case '<=': passed = val <= threshold; break;
    case '==':
      passed = typeof condition.value === 'string'
        ? raw === condition.value
        : Math.abs(val - threshold) < 0.001;
      break;
  }

  if (condition.isHardGate) {
    // Hard gate: if not met, event is impossible this tick
    return passed ? 1.0 : 0.0;
  }

  if (!passed) return 1.0; // Condition not met → neutral (no boost)

  // Use logistic curve for threshold-based multipliers
  const mult = condition.multiplier ?? 2.0;
  return logisticMultiplier(val, threshold, mult);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main engine class
// ─────────────────────────────────────────────────────────────────────────────

export class EnvironmentEventEngine {
  constructor(private rng: RandomSeed) {}

  /**
   * Compute the effective weight of a single event given the entity's current state.
   * Returns 0 if any hard gate condition fails.
   */
  computeWeight(event: EnvironmentEvent, entityState: Record<string, any>, tier: 1 | 2 | 3 | 4, currentDay: number): number {
    // Check cooldown
    if (currentDay - event.lastFiredDay < event.cooldownDays) return 0;

    let weight = event.baseWeight;

    // Layer 2: multiply all condition multipliers
    for (const condition of event.conditions) {
      const factor = evaluateCondition(condition, entityState);
      if (factor === 0) return 0; // Hard gate failed → short-circuit
      weight *= factor;
    }

    // Layer 3: Gaussian noise perturbation
    // ±5% for Tier 1 (high volatility), ±1% for Tier 4 (planetary inertia)
    const noiseStddev = tier === 1 ? 0.05 : tier === 2 ? 0.03 : tier === 3 ? 0.02 : 0.01;
    const noise = 1.0 + gaussianNoise(this.rng, noiseStddev);
    weight *= Math.max(0, noise);

    return weight;
  }

  /**
   * Select one event from a pool using weighted random sampling.
   * Returns null if the pool is empty or all weights are zero.
   */
  selectEvent(
    events: EnvironmentEvent[],
    entityState: Record<string, any>,
    tier: 1 | 2 | 3 | 4,
    currentDay: number
  ): EnvironmentEvent | null {
    const weights: number[] = [];
    let totalWeight = 0;

    for (const event of events) {
      const w = this.computeWeight(event, entityState, tier, currentDay);
      weights.push(w);
      totalWeight += w;
    }

    if (totalWeight <= 0) return null;

    const roll = this.rng.next() * totalWeight;
    let cumulative = 0;

    for (let i = 0; i < events.length; i++) {
      cumulative += weights[i];
      if (roll <= cumulative) {
        return events[i];
      }
    }

    return events[events.length - 1];
  }

  /**
   * Select up to N events from a pool, allowing multiple events per tick.
   * Used for T1 hexes which can experience multiple simultaneous events.
   */
  selectMultipleEvents(
    events: EnvironmentEvent[],
    entityState: Record<string, any>,
    tier: 1 | 2 | 3 | 4,
    currentDay: number,
    maxEvents: number = 2
  ): EnvironmentEvent[] {
    const results: EnvironmentEvent[] = [];
    const remaining = [...events];

    for (let i = 0; i < maxEvents && remaining.length > 0; i++) {
      const selected = this.selectEvent(remaining, entityState, tier, currentDay);
      if (!selected) break;

      results.push(selected);
      // Remove selected event from pool to avoid duplicates
      const idx = remaining.indexOf(selected);
      if (idx !== -1) remaining.splice(idx, 1);
    }

    return results;
  }
}
