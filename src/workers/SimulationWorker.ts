import { GameLoop } from '../core/engine/GameLoop';

let timer: ReturnType<typeof setInterval> | null = null;
let isPaused = true;
let speed = 1;
const BASE_TICK_RATE = 800; // ms

// Initialize the GameLoop in the worker
const gameLoop = new GameLoop(Date.now());

self.onmessage = (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT_CUSTOM_GAME':
      gameLoop.initializeCustomGame(payload);
      // Send an immediate tick message back to main thread so the store resolves right away
      try {
        self.postMessage({ type: 'TICK', payload: structuredClone(gameLoop.getSnapshot()) });
      } catch {
        self.postMessage({ type: 'TICK', payload: JSON.parse(JSON.stringify(gameLoop.getSnapshot())) });
      }
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
      speed = payload;
      if (!isPaused) {
        stopLoop();
        startLoop();
      }
      break;
    case 'ACTION':
      // Receive actions from the player UI to update the state
      gameLoop.handleAction(payload);
      // Send an immediate tick back to player UI to show changes in real-time
      try {
        self.postMessage({ type: 'TICK', payload: structuredClone(gameLoop.getSnapshot()) });
      } catch {
        self.postMessage({ type: 'TICK', payload: JSON.parse(JSON.stringify(gameLoop.getSnapshot())) });
      }
      break;
  }
};

function startLoop() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (isPaused) return;

    // Run the robust simulation tick
    const snapshot = gameLoop.tick();

    // Use structuredClone to deep copy the game state to the main thread safely
    // Fallback to JSON.parse(JSON.stringify) just in case, though structuredClone is standard
    let safeSnapshot;
    try {
      safeSnapshot = structuredClone(snapshot);
    } catch {
      safeSnapshot = JSON.parse(JSON.stringify(snapshot));
    }

    self.postMessage({ type: 'TICK', payload: safeSnapshot });
  }, BASE_TICK_RATE / speed);
}

function stopLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

