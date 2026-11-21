/**
 * NpcMemorySystem.ts
 *
 * Manages NPC memory records: recording events, enforcing capacity limits,
 * and applying per-tick intensity decay.
 * Based on sovereign_npc_simulation.md Section 8.
 */

import { nanoid } from 'nanoid';
import type {
  NpcStateVector,
  MemoryRecord,
  MemoryEventType,
  MemoryValence,
} from '../models/NpcStateVector';
import { MEMORY_CAPACITY } from '../models/NpcStateVector';

// ─── Decay Rates by valence (intensity points lost per tick) ───────────────
// Section 8.3: traumatic → 0.05/tick, unresolved → 0.1/tick, resolved → 1.0/tick

const DECAY_RATES: Record<MemoryValence, number> = {
  POSITIVE:  0.5,
  NEUTRAL:   0.3,
  NEGATIVE:  0.1,
  TRAUMATIC: 0.05,
};

// ─── Record a new memory event ─────────────────────────────────────────────

export function recordMemory(
  sv: NpcStateVector,
  eventType: MemoryEventType,
  actorId: string,
  currentTick: number,
  intensity: number,
  valence: MemoryValence,
  description: string,
  generational = false
): void {
  const record: MemoryRecord = {
    id: nanoid(),
    eventType,
    actorId,
    tickTimestamp: currentTick,
    intensity: Math.min(100, Math.max(0, intensity)),
    emotionalValence: valence,
    hasFaded: false,
    generational,
    description,
  };

  const capacity = MEMORY_CAPACITY[sv.tier];

  if (sv.memories.length >= capacity) {
    // Evict: remove the oldest lowest-intensity non-generational memory
    const evictIdx = findEvictionCandidate(sv.memories);
    if (evictIdx >= 0) {
      sv.memories.splice(evictIdx, 1);
    } else {
      // All are generational — evict oldest by timestamp
      sv.memories.sort((a, b) => a.tickTimestamp - b.tickTimestamp);
      sv.memories.shift();
    }
  }

  sv.memories.push(record);
}

/** Find the index of the best candidate for eviction: lowest intensity, non-generational, oldest. */
function findEvictionCandidate(memories: MemoryRecord[]): number {
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < memories.length; i++) {
    const m = memories[i];
    if (m.generational) continue; // never evict generational memories
    // Score: lower intensity = better candidate; break ties with older timestamp
    const score = m.intensity * 10000 + m.tickTimestamp;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

// ─── Decay memories each tick ──────────────────────────────────────────────

export function decayMemories(sv: NpcStateVector): void {
  for (const mem of sv.memories) {
    const rate = DECAY_RATES[mem.emotionalValence];
    mem.intensity = Math.max(0, mem.intensity - rate);
    if (mem.intensity < 1) {
      mem.hasFaded = true;
    }
  }

  // Prune fully faded, non-generational memories to keep memory arrays lean
  sv.memories = sv.memories.filter(m => !m.hasFaded || m.generational);
}

// ─── Transfer generational memories to an heir ────────────────────────────
// Section 8.4: generational memories passed at 60% original intensity.

export function transferGenerationalMemories(
  from: NpcStateVector,
  to: NpcStateVector,
  currentTick: number
): void {
  const generational = from.memories.filter(m => m.generational);

  for (const mem of generational) {
    recordMemory(
      to,
      mem.eventType,
      mem.actorId,
      currentTick,
      mem.intensity * 0.6,
      mem.emotionalValence,
      `[Inherited] ${mem.description}`,
      true
    );
  }
}

// ─── Query helpers ─────────────────────────────────────────────────────────

/** Return accumulated grudge intensity toward an actor id (sum of NEGATIVE/TRAUMATIC memories). */
export function getGrudgeIntensity(sv: NpcStateVector, actorId: string): number {
  return sv.memories
    .filter(m => m.actorId === actorId && (m.emotionalValence === 'NEGATIVE' || m.emotionalValence === 'TRAUMATIC'))
    .reduce((sum, m) => sum + m.intensity, 0);
}

/** Return the most recent memory of a given type, or null. */
export function getMostRecentMemory(
  sv: NpcStateVector,
  eventType: MemoryEventType
): MemoryRecord | null {
  const matches = sv.memories
    .filter(m => m.eventType === eventType)
    .sort((a, b) => b.tickTimestamp - a.tickTimestamp);
  return matches[0] ?? null;
}
