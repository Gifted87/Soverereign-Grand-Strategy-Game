import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getGameSaves, deleteGameSave, loadGameSave, SaveSlot } from '../utils/save';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Shield, Trash2, Play, Users, Landmark, Coins, Heart, Clock } from 'lucide-react';

const COA_COLORS: Record<string, string> = {
  green: 'bg-emerald-800 text-emerald-100 border-emerald-950',
  red: 'bg-red-800 text-red-100 border-red-950',
  blue: 'bg-blue-800 text-blue-100 border-blue-950',
  gold: 'bg-amber-600 text-amber-900 border-amber-700',
  silver: 'bg-zinc-600 text-zinc-100 border-zinc-800',
  purple: 'bg-purple-800 text-purple-100 border-purple-950',
  charcoal: 'bg-zinc-900 text-zinc-100 border-black'
};

const COA_SYMBOLS: Record<string, string> = {
  oak_tree: '🌳',
  lion: '🦁',
  crown: '👑',
  sword: '⚔️',
  cross: '✝️',
  boar: '🐗',
  grape: '🍷'
};

const SCENARIO_LABELS: Record<string, string> = {
  MINOR_LORD: 'Minor Lord (Saxon Claimant)',
  WARLORD: 'Warlord (Iron Host)',
  MERCHANT_PRINCE: 'Merchant Prince (Silver Fleet)',
  REBEL: 'Rebel (Peasant Outlaws)',
  CRUSADER: 'Crusader (Shield of Peaks)'
};

export function LoadGame() {
  const navigate = useNavigate();
  const setStartingSetup = useGameStore((state: any) => state.setStartingSetup);
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load saves on mount
  useEffect(() => {
    setSaves(getGameSaves());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteGameSave(id);
    setSaves(getGameSaves());
    setDeleteConfirmId(null);
  };

  const handleLoad = (save: SaveSlot) => {
    loadGameSave(save, setStartingSetup, navigate);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Unknown age';
    }
  };

  return (
    <div className="min-h-screen bg-ink text-parchment font-body flex flex-col border-[12px] border-ink-light selection:bg-gold selection:text-ink select-none relative overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="py-6 border-b border-stone/30 bg-ink-light flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-gold animate-pulse" />
          <div>
            <h1 className="font-header text-lg uppercase tracking-[0.25em] text-gold">Sovereign Chronicles</h1>
            <p className="text-[10px] uppercase font-sans tracking-widest text-stone-light">Restore Dynastic Precedents</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 border border-stone/50 bg-ink px-4 py-2 text-xs font-sans uppercase tracking-widest text-stone-light hover:text-gold hover:border-gold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Main Menu
        </button>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 z-10 flex flex-col justify-start">
        <div className="mb-6">
          <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/20">Saved Sagas of the Realm</h2>
          <p className="text-xs text-stone-light mt-1">Select a stored chronicle segment to resume active feudal expansion and rule.</p>
        </div>

        {saves.length === 0 ? (
          <div className="flex-1 border border-dashed border-stone/30 rounded-xl p-12 text-center flex flex-col items-center justify-center bg-ink-light/50 max-w-2xl mx-auto w-full mt-8">
            <Shield className="w-16 h-16 text-stone/40 mb-4 stroke-[1]" />
            <h3 className="font-serif text-lg text-stone-light">Your Chronicle Stands Blank</h3>
            <p className="text-stone text-xs max-w-xs mt-2 leading-relaxed">
              No previous dynastic lineages are recorded on this device. Create a new noble household from the principal court menu, or load our pre-seeded imperial template to start playing immediately!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => navigate('/new-game')}
                className="border border-stone bg-ink-light hover:bg-[#201c18]/80 text-parchment hover:text-white px-5 py-2.5 text-xs font-sans uppercase tracking-widest rounded-sm transition-all font-bold cursor-pointer"
              >
                Forge New Lineage
              </button>
              <button
                onClick={() => {
                  setStartingSetup({
                    startingSituation: 'MINOR_LORD',
                    characterName: 'Berold',
                    dynastyName: 'Valerius',
                    difficulty: 'NORMAL'
                  });
                  navigate('/game');
                }}
                className="border border-gold/75 bg-gold/10 hover:bg-gold hover:text-ink text-gold px-5 py-2.5 text-xs font-sans uppercase tracking-widest rounded-sm transition-all font-bold cursor-pointer"
              >
                📜 Template Campaign: House Valerius
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {saves.map((save, idx) => {
                const primaryColorClass = COA_COLORS[save.colors?.[0]] || COA_COLORS['green'];
                const secondaryColorClass = COA_COLORS[save.colors?.[1]] || COA_COLORS['silver'];
                const chargeIcon = COA_SYMBOLS[save.charge] || '🌳';
                
                const isConfirmingDelete = deleteConfirmId === save.id;

                return (
                  <motion.div
                    key={save.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    onClick={() => !isConfirmingDelete && handleLoad(save)}
                    className="border border-stone/30 bg-ink-light/80 hover:bg-stone/10 hover:border-gold/50 cursor-pointer p-5 rounded-lg flex gap-4 items-stretch justify-between transition-all group relative overflow-hidden shadow-md"
                  >
                    {/* Coat of arms card view */}
                    <div className="w-16 shrink-0 flex flex-col items-center justify-center">
                      <div className="w-12 h-16 relative flex flex-col overflow-hidden border border-gold/75 rounded-t-xs rounded-b-[24px] shadow-sm bg-ink shrink-0 mr-1">
                        <div className={`w-full h-1/2 ${primaryColorClass.split(' ')[0]}`} />
                        <div className={`w-full h-1/2 ${secondaryColorClass.split(' ')[0]}`} />
                        <div className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none drop-shadow">
                          {chargeIcon}
                        </div>
                      </div>
                    </div>

                    {/* Meta stats */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-sans font-bold bg-dark px-2 py-0.5 border border-stone/15 rounded-sm text-gold uppercase tracking-wider">
                          {save.name}
                        </span>
                        <span className="text-[9px] font-mono text-stone italic flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDate(save.timestamp)}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg text-parchment leading-tight truncate group-hover:text-gold transition-colors">
                        House {save.dynastyName}
                      </h3>
                      <p className="text-xs text-stone-light font-sans mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        Ruler: <span className="text-parchment font-medium">{save.rulerName}</span>
                      </p>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-stone/10 text-[10px] uppercase font-sans tracking-wide text-stone">
                        <span className="truncate">Scene: <span className="text-parchment font-semibold">{SCENARIO_LABELS[save.situation] || save.situation}</span></span>
                        <span className="truncate text-right">Age: <span className="text-gold font-bold">Year {save.year}, Day {save.day}</span></span>
                        <span className="text-emerald-500 font-bold">Gold: 🪙 {save.gold}</span>
                        <span className="text-sky font-bold text-right">Renown: 👑 {save.prestige}</span>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="w-8 shrink-0 flex flex-col justify-between items-end border-l border-stone/15 pl-3">
                      {isConfirmingDelete ? (
                        <div className="absolute inset-0 bg-ink-light/95 border border-rose-900/40 p-4 flex flex-col items-center justify-center text-center z-20">
                          <p className="text-xs text-rose-400 font-serif mb-2">Abolish active Dynasty {save.dynastyName}?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleDelete(save.id, e)}
                              className="px-3 py-1 bg-red-900/80 hover:bg-red-800 text-parchment text-[9px] font-bold uppercase tracking-wider rounded border border-red-700/50 cursor-pointer"
                            >
                              Destroy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              className="px-3 py-1 bg-ink/90 hover:bg-stone/10 text-stone-light text-[9px] font-bold uppercase tracking-wider rounded border border-stone/30 cursor-pointer"
                            >
                              Keep
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(save.id);
                            }}
                            className="text-stone hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Abolish Save"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="bg-gold/15 text-gold border border-gold/40 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-sm transform group-hover:scale-115 transition-all">
                            <Play className="w-2.5 h-2.5 fill-gold ml-0.5 animate-pulse" />
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
