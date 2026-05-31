import { useGameStore } from '../store/gameStore';

export interface SaveSlot {
  id: string;
  name: string;
  rulerName: string;
  dynastyName: string;
  day: number;
  year: number;
  season: string;
  situation: string;
  gold: number;
  prestige: number;
  charge: string;
  colors: string[];
  timestamp: string;
  snapshot: any;
  startingSetup: any;
}

const STORAGE_KEY = 'sovereign_saves';

export function getGameSaves(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to get game saves:', e);
    return [];
  }
}

export function deleteGameSave(id: string): void {
  try {
    const saves = getGameSaves();
    const updated = saves.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete game save:', e);
  }
}

export function saveGame(customSlotName: string): boolean {
  try {
    const state = useGameStore.getState() as any;
    
    // Find player info
    const playerChar = state.characters?.['player'] || Object.values(state.characters || {}).find((c: any) => c.isPlayer || c.id === 'player');
    const playerDyn = state.dynasties?.['dyn_player'] || Object.values(state.dynasties || {}).find((d: any) => d.id === 'dyn_player');
    
    const rulerName = playerChar ? `${playerChar.firstName} ${playerChar.lastName}` : 'Lord John';
    const dynastyName = playerDyn ? playerDyn.name : 'Valedor';
    
    // Heraldry
    const coaColors = playerDyn?.coatOfArms?.colors || ['green', 'silver'];
    const coaCharge = playerDyn?.coatOfArms?.charges?.[0] || 'oak_tree';

    // Game stats
    const day = state.currentDay ?? 1;
    const year = state.currentYear ?? 1142;
    const season = state.currentSeason ?? 'SPRING';
    const gold = state.resources?.gold ?? 1500;
    const prestige = state.resources?.prestige ?? 150;
    const situation = state.startingSetup?.startingSituation || 'MINOR_LORD';

    // Extract Snapshot Fields
    const snapshot = {
      currentDay: state.currentDay,
      currentYear: state.currentYear,
      currentSeason: state.currentSeason,
      currentEra: state.currentEra,
      provinces: state.provinces,
      armies: state.armies,
      characters: state.characters,
      dynasties: state.dynasties,
      battles: state.battles,
      sieges: state.sieges,
      factions: state.factions,
      plots: state.plots,
      religions: state.religions,
      treaties: state.treaties,
      treasury: state.treasury,
      resources: state.resources,
      activeResearch: state.activeResearch,
      unlockedTechs: state.unlockedTechs,
      convoys: state.convoys,
      chronicle: state.chronicle
    };

    const newSave: SaveSlot = {
      id: Math.random().toString(36).substring(2, 11),
      name: customSlotName || `Dynasty ${dynastyName} - Year ${year}`,
      rulerName,
      dynastyName,
      day,
      year,
      season,
      situation,
      gold,
      prestige,
      charge: coaCharge,
      colors: coaColors,
      timestamp: new Date().toISOString(),
      snapshot,
      startingSetup: state.startingSetup
    };

    const existingSaves = getGameSaves();
    existingSaves.unshift(newSave); // Add to beginning

    // Keep top 12 slots to avoid localStorage cap
    const trimmed = existingSaves.slice(0, 12);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    
    // Add a beautiful in-game chronicle entry logging the save operation
    if (state.addChronicle) {
      state.addChronicle(`Manuscript of state records faithfully preserved under seal of House ${dynastyName}.`, 'FLAVOR');
    }

    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
}

export function loadGameSave(save: SaveSlot, setStartingSetup: any, navigate: any): void {
  try {
    if (!save) return;
    
    // Set the game setup state which triggers custom loaded state restore when GameLoop boots
    setStartingSetup({
      isLoad: true,
      snapshot: save.snapshot,
      startingSituation: save.situation
    });
    
    navigate('/game');
  } catch (e) {
    console.error('Failed to load game save:', e);
  }
}
