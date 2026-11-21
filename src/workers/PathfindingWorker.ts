/**
 * PathfindingWorker.ts
 *
 * Web Worker: A* hex pathfinding for army and convoy movement.
 * Replaces the trivial [start, end] stub with true terrain-aware routing.
 *
 * Input:  { start: HexCoord, end: HexCoord, provinceMap: SerializedProvinceMap, season: Season }
 * Output: { path: HexCoord[] }   ← ordered list of hexes from start (exclusive) to end (inclusive)
 */

// ── Type mirrors (can't import from main thread in a worker) ─────────────

interface HexCoord {
  q: number;
  r: number;
  s: number;
}

type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
type TerrainType = string;

interface SerializedProvince {
  coords: HexCoord;
  terrain: TerrainType;
  roadQuality: number;  // 0–100
  isBesieged?: boolean;
  currentWeather?: string;
}

interface PathfindingInput {
  start: HexCoord;
  end: HexCoord;
  /** Flat array of province descriptors for the movement cost lookup */
  provinceMap: SerializedProvince[];
  season: Season;
  /** If true, impassable hexes produce MAX_COST but never fully block (retreating armies) */
  allowImpassable?: boolean;
}

// ── Hex helpers ───────────────────────────────────────────────────────────

const HEX_DIRECTIONS: HexCoord[] = [
  { q:  1, r:  0, s: -1 },
  { q: -1, r:  0, s:  1 },
  { q:  0, r:  1, s: -1 },
  { q:  0, r: -1, s:  1 },
  { q:  1, r: -1, s:  0 },
  { q: -1, r:  1, s:  0 },
];

function hexKey(h: HexCoord): string {
  return `${h.q},${h.r}`;
}

function hexNeighbors(h: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(d => ({ q: h.q + d.q, r: h.r + d.r, s: h.s + d.s }));
}

function hexDistance(a: HexCoord, b: HexCoord): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// ── Terrain movement costs ─────────────────────────────────────────────────
// Mirrors TERRAIN_DEFINITIONS in src/core/models/Terrain.ts

const BASE_TERRAIN_COST: Record<string, number> = {
  PLAINS:       15,
  HILLS:        18,
  MOUNTAINS:    30,
  FOREST:       20,
  DEEP_FOREST:  25,
  WETLAND:      22,
  RIVER_VALLEY: 18,
  DESERT:       25,
  TUNDRA:       20,
  COASTAL:      15,
  OCEAN:        999, // impassable by land
};

const IMPASSABLE_COST = 999;
const MAX_PRACTICAL_COST = 100; // anything >= this blocks movement in normal mode

/**
 * Get movement cost for entering a hex, accounting for season and weather.
 */
function movementCost(prov: SerializedProvince | undefined, season: Season): number {
  if (!prov) return IMPASSABLE_COST;

  let cost = BASE_TERRAIN_COST[prov.terrain] ?? 20;

  // Season overrides
  if (prov.terrain === 'MOUNTAINS' && season === 'WINTER') cost = 100;
  if (prov.terrain === 'RIVER_VALLEY' && season === 'SPRING') cost = 100; // floods
  if (prov.terrain === 'RIVER_VALLEY' && season === 'WINTER') cost = 15;  // frozen
  if (prov.terrain === 'TUNDRA' && season === 'WINTER') cost = 25;

  // Weather penalties
  if (prov.currentWeather === 'BLIZZARD' || prov.currentWeather === 'THUNDERSTORM') cost += 15;

  // Road quality discount (road 100 → -10 cost)
  const roadDiscount = Math.floor((prov.roadQuality ?? 0) * 0.1);
  cost = Math.max(5, cost - roadDiscount);

  return cost;
}

// ── A* ────────────────────────────────────────────────────────────────────

interface AStarNode {
  hex: HexCoord;
  g: number;   // actual cost from start
  f: number;   // g + heuristic
  parent: AStarNode | null;
}

function reconstructPath(node: AStarNode): HexCoord[] {
  const path: HexCoord[] = [];
  let cur: AStarNode | null = node;
  while (cur !== null) {
    path.unshift(cur.hex);
    cur = cur.parent;
  }
  // Drop the start hex (caller already knows it)
  path.shift();
  return path;
}

function aStar(
  start: HexCoord,
  end: HexCoord,
  provinceIndex: Map<string, SerializedProvince>,
  season: Season,
  allowImpassable: boolean
): HexCoord[] {
  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  const gScore = new Map<string, number>();

  const startNode: AStarNode = { hex: start, g: 0, f: hexDistance(start, end), parent: null };
  openSet.push(startNode);
  gScore.set(hexKey(start), 0);

  // Simple sorted-insert min-heap via linear scan (adequate for map sizes < 2000 hexes)
  while (openSet.length > 0) {
    // Pop node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const ck = hexKey(current.hex);

    if (current.hex.q === end.q && current.hex.r === end.r) {
      return reconstructPath(current);
    }

    closedSet.add(ck);

    for (const neighbor of hexNeighbors(current.hex)) {
      const nk = hexKey(neighbor);
      if (closedSet.has(nk)) continue;

      const prov = provinceIndex.get(nk);
      const cost = movementCost(prov, season);

      // Block impassable unless allowImpassable flag is set
      if (!allowImpassable && cost >= MAX_PRACTICAL_COST) continue;
      const effectiveCost = allowImpassable ? Math.min(cost, 50) : cost;

      const tentativeG = current.g + effectiveCost;
      const existing = gScore.get(nk);

      if (existing !== undefined && tentativeG >= existing) continue;

      gScore.set(nk, tentativeG);
      const h = hexDistance(neighbor, end) * 15; // heuristic: optimistic plains cost
      const node: AStarNode = { hex: neighbor, g: tentativeG, f: tentativeG + h, parent: current };

      // Replace or insert
      const idx = openSet.findIndex(n => hexKey(n.hex) === nk);
      if (idx >= 0) {
        openSet[idx] = node;
      } else {
        openSet.push(node);
      }
    }
  }

  // No path found — return direct line as fallback
  return [end];
}

// ── Worker message handler ────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const { type, payload, jobId } = e.data;

  if (type === 'CALCULATE_PATH') {
    const { start, end, provinceMap, season, allowImpassable } = payload as PathfindingInput;

    // Build a key-indexed map for O(1) lookups
    const provinceIndex = new Map<string, SerializedProvince>();
    for (const prov of (provinceMap ?? [])) {
      provinceIndex.set(hexKey(prov.coords), prov);
    }

    const path = aStar(start, end, provinceIndex, season ?? 'SUMMER', allowImpassable ?? false);

    self.postMessage({ type: 'PATH_RESULT', jobId, path });
  }
};
