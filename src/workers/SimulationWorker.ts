import { GameLoop } from '../core/engine/GameLoop';

let timer: ReturnType<typeof setTimeout> | null = null;
let isPaused = true;
let speed = 1;
let lastTime = performance.now();
let accumulator = 0;
const BASE_TICK_RATE = 800; // ms
const MAX_CATCHUP_TICKS = 10;
const RECORD_FIELDS = new Set([
  'provinces',
  'armies',
  'characters',
  'dynasties',
  'battles',
  'sieges',
  'factions',
  'plots',
  'religions',
  'treaties',
  'convoys',
  'tradeRoutes'
]);

let hasPostedFullSnapshot = false;
const topLevelSignatures = new Map<string, string>();
const recordSignatures = new Map<string, Map<string, string>>();

// Initialize the GameLoop in the worker
const gameLoop = new GameLoop(Date.now());

self.onmessage = (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT_CUSTOM_GAME':
      gameLoop.initializeCustomGame(payload);
      resetDeltaTracking();
      postSnapshot(gameLoop.getSnapshot());
      break;
    case 'PLAY':
      isPaused = false;
      startLoop();
      break;
    case 'PAUSE':
      isPaused = true;
      stopLoop();
      break;
    case 'SET_SPEED':
      speed = Math.max(0.1, Number(payload) || 1);
      if (!isPaused) {
        stopLoop();
        startLoop();
      }
      break;
    case 'ACTION':
      // Receive actions from the player UI to update the state
      gameLoop.handleAction(payload);
      if (payload?.type === 'LOAD_GAME_SAVE') {
        resetDeltaTracking();
      }
      postSnapshot(gameLoop.getSnapshot());
      break;
  }
};

function startLoop() {
  stopLoop();
  lastTime = performance.now();
  accumulator = 0;
  timer = setTimeout(runScheduledTick, getTickDelay());
}

function stopLoop() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function getTickDelay() {
  return Math.max(50, BASE_TICK_RATE / speed);
}

function postSnapshot(snapshot: ReturnType<GameLoop['tick']>) {
  const message = createSnapshotMessage(snapshot);
  try {
    self.postMessage(message);
  } catch {
    self.postMessage(JSON.parse(JSON.stringify(message)));
  }
}

function createSnapshotMessage(snapshot: ReturnType<GameLoop['getSnapshot']>) {
  if (!hasPostedFullSnapshot) {
    hasPostedFullSnapshot = true;
    refreshSnapshotSignatures(snapshot);
    return { type: 'TICK', payload: snapshot };
  }

  const changes: Record<string, any> = {};
  const deletions: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(snapshot)) {
    if (RECORD_FIELDS.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      const previous = recordSignatures.get(key) || new Map<string, string>();
      const next = new Map<string, string>();
      const changedEntries: Record<string, any> = {};

      for (const [entryId, entryValue] of Object.entries(value as Record<string, any>)) {
        const signature = JSON.stringify(entryValue);
        next.set(entryId, signature);
        if (previous.get(entryId) !== signature) {
          changedEntries[entryId] = entryValue;
        }
      }

      for (const entryId of previous.keys()) {
        if (!next.has(entryId)) {
          if (!deletions[key]) deletions[key] = [];
          deletions[key].push(entryId);
        }
      }

      if (Object.keys(changedEntries).length > 0) {
        changes[key] = changedEntries;
      }
      recordSignatures.set(key, next);
    } else {
      const signature = JSON.stringify(value);
      if (topLevelSignatures.get(key) !== signature) {
        changes[key] = value;
      }
      topLevelSignatures.set(key, signature);
    }
  }

  return {
    type: 'TICK_DELTA',
    payload: {
      __delta: true,
      changes,
      deletions
    }
  };
}

function refreshSnapshotSignatures(snapshot: ReturnType<GameLoop['getSnapshot']>) {
  topLevelSignatures.clear();
  recordSignatures.clear();

  for (const [key, value] of Object.entries(snapshot)) {
    if (RECORD_FIELDS.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = new Map<string, string>();
      for (const [entryId, entryValue] of Object.entries(value as Record<string, any>)) {
        entries.set(entryId, JSON.stringify(entryValue));
      }
      recordSignatures.set(key, entries);
    } else {
      topLevelSignatures.set(key, JSON.stringify(value));
    }
  }
}

function resetDeltaTracking() {
  hasPostedFullSnapshot = false;
  topLevelSignatures.clear();
  recordSignatures.clear();
}

function runScheduledTick() {
  timer = null;
  if (isPaused) return;

  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  accumulator += dt;
  const tickDelay = getTickDelay();

  // Prevent spiral of death on long pauses or heavy lag
  const maxAccumulator = tickDelay * MAX_CATCHUP_TICKS;
  if (accumulator > maxAccumulator) {
    accumulator = maxAccumulator;
  }

  let ticksPerformed = 0;
  let snapshot = null;

  while (accumulator >= tickDelay) {
    snapshot = gameLoop.tick();
    accumulator -= tickDelay;
    ticksPerformed++;
  }

  if (ticksPerformed > 0 && snapshot) {
    postSnapshot(snapshot);
  }

  if (!isPaused) {
    const nextDelay = Math.max(0, tickDelay - accumulator);
    timer = setTimeout(runScheduledTick, nextDelay);
  }
}
