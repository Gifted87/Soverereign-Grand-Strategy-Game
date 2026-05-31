import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import SimulationWorker from '../workers/SimulationWorker?worker';

export function useGameLoop() {
  const { isPaused, speed, updateFromSnapshot } = useGameStore();
  const workerRef = useRef<Worker | null>(null);
  const updateRef = useRef(updateFromSnapshot);

  // Keep latest snapshot update function
  useEffect(() => {
    updateRef.current = updateFromSnapshot;
  }, [updateFromSnapshot]);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new SimulationWorker();
    
    // Check if there's a custom initial game setup configured
    const setup = useGameStore.getState().startingSetup;
    if (setup) {
      if (setup.isLoad && setup.snapshot) {
        workerRef.current.postMessage({ type: 'ACTION', payload: { type: 'LOAD_GAME_SAVE', payload: setup.snapshot } });
      } else {
        workerRef.current.postMessage({ type: 'INIT_CUSTOM_GAME', payload: setup });
      }
    }
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK') {
        updateRef.current(e.data.payload);
      }
    };

    // Forward events dispatched from the main thread
    const handleSimulationAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'ACTION', payload: customEvent.detail });
      }
    };
    window.addEventListener('simulation_action', handleSimulationAction);

    return () => {
      workerRef.current?.terminate();
      window.removeEventListener('simulation_action', handleSimulationAction);
    };
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      if (isPaused) {
        workerRef.current.postMessage({ type: 'PAUSE' });
      } else {
        workerRef.current.postMessage({ type: 'PLAY' });
      }
      workerRef.current.postMessage({ type: 'SET_SPEED', payload: speed });
    }
  }, [isPaused, speed]);
}
