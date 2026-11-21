/**
 * Chronicle.ts
 *
 * Type definitions for the Chronicle system.
 * The live implementation lives in ChronicleSystem (GameLoop.ts);
 * these types provide the contract used across the rest of the codebase.
 */

export type ChronicleType = 'CRITICAL' | 'URGENT' | 'NORMAL' | 'FLAVOR';

export interface ChronicleEntry {
  id: string;
  year: number;
  day: number;
  text: string;
  type: ChronicleType;
}

/** Maximum entries retained in memory before oldest are evicted. */
export const CHRONICLE_MAX_ENTRIES = 1000;
