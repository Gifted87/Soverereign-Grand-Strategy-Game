import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { saveGame, getGameSaves, deleteGameSave, loadGameSave, SaveSlot } from '../../utils/save';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Volume2, VolumeX, Save, Trash2, LogOut, Play, 
  Check, Sliders, HardDrive, AlertTriangle 
} from 'lucide-react';

export function GameMenuModal() {
  const navigate = useNavigate();
  const closeModal = useGameStore((state: any) => state.closeModal);
  const { currentDay, currentYear, currentSeason, resources, startingSetup } = useGameStore();
  const setStartingSetup = useGameStore((state: any) => state.setStartingSetup);

  // Sound settings (mid-game sync)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(70);
  
  // Save options
  const [saveName, setSaveName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load state on mount
  useEffect(() => {
    try {
      const storedMute = localStorage.getItem('sovereign_sound_mute');
      if (storedMute) setSoundEnabled(storedMute === 'false' ? false : true);
      
      const storedVolume = localStorage.getItem('sovereign_music_vol');
      if (storedVolume) setMusicVolume(parseInt(storedVolume, 10));

      setSaves(getGameSaves());

      // Set default save name
      const state = useGameStore.getState() as any;
      const playerDyn = state.dynasties?.['dyn_player'] || Object.values(state.dynasties || {}).find((d: any) => d.id === 'dyn_player');
      const dynastyName = playerDyn ? playerDyn.name : 'Valedor';
      setSaveName(`House ${dynastyName} - Y${state.currentYear || 1142} D${state.currentDay || 250}`);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleMidiSoundToggle = () => {
    const updated = !soundEnabled;
    setSoundEnabled(updated);
    localStorage.setItem('sovereign_sound_mute', updated ? 'true' : 'false');
  };

  const handleMidiVolumeChange = (val: number) => {
    setMusicVolume(val);
    localStorage.setItem('sovereign_music_vol', val.toString());
  };

  const handleExecuteSave = () => {
    if (!saveName.trim()) return;
    const success = saveGame(saveName);
    if (success) {
      setSaveSuccess(true);
      setSaves(getGameSaves());
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleDeleteSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteGameSave(id);
    setSaves(getGameSaves());
    setDeleteConfirmId(null);
  };

  const handleLoadSave = (save: SaveSlot) => {
    loadGameSave(save, setStartingSetup, navigate);
    closeModal();
  };

  const handleExitToMenu = () => {
    closeModal();
    navigate('/');
  };

  return (
    <div className="space-y-6 text-parchment">
      {/* Title */}
      <div className="text-center pb-2 border-b border-stone/20">
        <h2 className="font-display text-2xl text-gold">Sovereign Directives</h2>
        <span className="text-[10px] text-stone-light uppercase tracking-widest block font-sans">Feudal Record Ledger &amp; Controls</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Save & Settings */}
        <div className="space-y-4">
          <div className="bg-ink-light/40 border border-stone/15 p-4 rounded-lg space-y-4">
            <h3 className="font-header text-[11px] uppercase tracking-wider text-gold flex items-center gap-2 font-bold pb-2 border-b border-stone/10">
              <Save className="w-4 h-4 text-gold" />
              Seal State Chronicles
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-sans tracking-wider text-stone-light">Save Slot Name</label>
              <input 
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={28}
                className="w-full bg-ink border border-stone/30 px-3 py-2 rounded text-sm focus:outline-none focus:border-gold font-sans text-parchment"
              />
              
              <div className="flex items-center justify-between pt-1">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-500 text-[10px] font-sans flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Save scroll sealed S.C.
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleExecuteSave}
                  className="px-4 py-2 bg-gold hover:bg-gold/90 text-ink text-xs font-sans uppercase tracking-widest font-bold rounded transition-all ml-auto cursor-pointer"
                >
                  Seal Save Scroll
                </button>
              </div>
            </div>
          </div>

          <div className="bg-ink-light/40 border border-stone/15 p-4 rounded-lg space-y-3">
            <h3 className="font-header text-[11px] uppercase tracking-wider text-gold flex items-center gap-2 font-bold pb-2 border-b border-stone/10">
              <Sliders className="w-4 h-4 text-gold" />
              Dynamic Audio Output
            </h3>
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif">Enable Sound Waves</span>
              <button 
                onClick={handleMidiSoundToggle}
                className={`p-1 rounded border ${soundEnabled ? 'border-gold text-gold bg-gold/5' : 'border-stone text-stone-light bg-ink'}`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-stone-light font-sans uppercase tracking-wider">
                <span>Music volume</span>
                <span>{soundEnabled ? `${musicVolume}%` : 'Disabled'}</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                disabled={!soundEnabled}
                value={musicVolume}
                onChange={(e) => handleMidiVolumeChange(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-stone/20 rounded accent-gold cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Saved Games list */}
        <div className="bg-ink-light/40 border border-stone/15 p-4 rounded-lg flex flex-col h-[280px]">
          <h3 className="font-header text-[11px] uppercase tracking-wider text-gold flex items-center gap-2 font-bold pb-2 border-b border-stone/10 shrink-0 mb-3">
            <HardDrive className="w-4 h-4 text-gold" />
            Restore Alternate Saga
          </h3>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-stone/30">
            {saves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Shield className="w-8 h-8 text-stone/30 mb-2 stroke-[1]" />
                <p className="text-[10px] text-stone">No alternative dynastic saga exists in state backup logs.</p>
              </div>
            ) : (
              saves.map((s) => {
                const isConfirmingDelete = deleteConfirmId === s.id;
                return (
                  <div 
                    key={s.id}
                    onClick={() => !isConfirmingDelete && handleLoadSave(s)}
                    className="p-2 border border-stone/25 hover:border-gold/30 bg-ink hover:bg-stone/5 rounded cursor-pointer transition-all flex items-center justify-between text-left relative group overflow-hidden"
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <span className="text-[10px] font-sans font-bold text-parchment block truncate group-hover:text-gold transition-colors">{s.name}</span>
                      <span className="text-[9px] text-stone block">Y{s.year} D{s.day} — 🪙 {s.gold}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 border-l border-stone/15 pl-2 z-10">
                      {isConfirmingDelete ? (
                        <div className="absolute inset-x-0 inset-y-0 bg-ink-light border border-red-900/50 flex items-center justify-center gap-2 z-20">
                          <span className="text-[9px] text-rose-400 font-serif">Abolish?</span>
                          <button
                            onClick={(e) => handleDeleteSave(s.id, e)}
                            className="bg-red-900 border border-red-700 hover:bg-red-800 text-parchment text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="bg-ink border border-stone/30 hover:bg-stone/10 text-stone-light text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(s.id);
                            }}
                            className="text-stone hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Abolish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="bg-gold/15 text-gold border border-gold/30 w-5 h-5 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                            <Play className="w-2 h-2 fill-gold ml-[1px]" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Footer: Exit & Close */}
      <div className="pt-4 border-t border-stone/20 flex justify-between items-center">
        <button
          onClick={handleExitToMenu}
          className="px-4 py-2 border border-rose-900/40 text-rose-400 hover:bg-rose-500/10 rounded flex items-center gap-2 text-xs font-sans uppercase tracking-widest transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Abandon Session
        </button>
        
        <button
          onClick={closeModal}
          className="px-5 py-2 border border-stone bg-ink hover:text-gold hover:border-gold rounded text-xs font-sans uppercase tracking-widest text-stone-light transition-all cursor-pointer"
        >
          Resume Rule
        </button>
      </div>
    </div>
  );
}
