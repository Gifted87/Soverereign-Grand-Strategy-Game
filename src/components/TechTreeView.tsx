import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { clsx } from "clsx";
import { TECHNOLOGIES_LIST, Technology } from '../data/technology-tree';
import { motion } from 'motion/react';
import { 
  Check, 
  Lock, 
  FlaskConical, 
  BookOpen, 
  Compass, 
  Hammer, 
  Shield, 
  Coins, 
  Wheat, 
  Flame,
  Activity,
  Award
} from 'lucide-react';

export function TechTreeView() {
  const { resources, activeResearch, unlockedTechs, spendGold } = useGameStore() as any;
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  // Group techs by Era
  const eras = [
    { id: 'DARK_AGES', label: 'Dark Ages', subtitle: 'Tier 1 – Survival', icon: Flame, color: 'text-orange-400 border-orange-500/30 bg-orange-950/10' },
    { id: 'FEUDAL', label: 'Feudal Era', subtitle: 'Tier 2 – Expansion', icon: Shield, color: 'text-amber-500 border-amber-500/30 bg-amber-950/10' },
    { id: 'HIGH_MEDIEVAL', label: 'High Medieval', subtitle: 'Tier 3 – Mastery', icon: Award, color: 'text-sky border-sky/30 bg-sky/10' },
    { id: 'LATE_MEDIEVAL', label: 'Late Medieval', subtitle: 'Tier 4 – Transition', icon: BookOpen, color: 'text-purple-400 border-purple-500/30 bg-purple-950/10' },
  ] as const;

  // Compute Active Science Buff Speed Mutliplier
  const activeUnlocks = unlockedTechs || ['crop_rotation'];
  const curResearch = activeResearch || null;

  const handleStartResearch = (tech: Technology) => {
    const hasGold = (resources?.gold || 0) >= tech.cost.gold;
    const hasManpower = (resources?.manpower || 0) >= tech.cost.manpower;

    if (hasGold && hasManpower) {
      window.dispatchEvent(new CustomEvent('simulation_action', {
        detail: { type: 'START_RESEARCH', payload: { techId: tech.id } }
      }));
    }
  };

  const handleCancelResearch = () => {
    window.dispatchEvent(new CustomEvent('simulation_action', {
      detail: { type: 'CANCEL_RESEARCH', payload: {} }
    }));
  };

  // Selected tech details
  const selectedTech = selectedTechId 
    ? TECHNOLOGIES_LIST.find(t => t.id === selectedTechId) 
    : TECHNOLOGIES_LIST[0];

  return (
    <div className="flex-1 flex flex-col bg-ink-dense text-parchment overflow-hidden border border-stone/20 select-none relative" id="tech-tree-wrapper">
      
      {/* Background Ambient Decorator */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(194,164,97,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Roster Header */}
      <div className="p-4 border-b border-stone/30 bg-ink-dense flex justify-between items-center shrink-0 z-10" id="tech-header-banner">
        <div>
          <h2 className="text-xl font-serif text-gold tracking-wide font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" />
            Royal Academy of Science
          </h2>
          <p className="text-[10px] text-stone-light uppercase font-sans tracking-widest mt-0.5">
            Finance royal treatises, decree crop rotations, and forge carbon steel.
          </p>
        </div>

        {/* Global Research Speed Indicator */}
        <div className="bg-ink-light border border-stone/30 px-3 py-1.5 rounded-md flex items-center gap-3 font-mono text-xs" id="royal-speed-box">
          <BookOpen className="h-4 w-4 text-purple-400 animate-pulse" />
          <div>
            <span className="text-stone block text-[8px] uppercase tracking-wider leading-none">Research Rate</span>
            <span className="text-purple-300 font-bold font-mono">
              1.0 Tage / Day
            </span>
          </div>
        </div>
      </div>

      {/* Middle Layout (Grid Left / Panel Right) */}
      <div className="flex-1 flex overflow-hidden z-10" id="tech-tree-body">
        
        {/* LEFT COLUMN: TECH TREE GRID */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-stone/30" id="tech-tree-grid-container">
          
          {/* Active Work In Progress Banner */}
          {curResearch && (
            <div className="border border-gold/50 bg-gold/5 p-4 rounded-md space-y-2 relative overflow-hidden" id="active-research-wip-card">
              <div className="absolute top-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-40 animate-pulse" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gold font-bold font-mono">Treatise in Progress</span>
                  <h3 className="text-lg font-serif font-bold text-parchment">
                    {TECHNOLOGIES_LIST.find(t => t.id === curResearch.techId)?.name || curResearch.techId}
                  </h3>
                </div>
                <button
                  onClick={handleCancelResearch}
                  className="px-2 py-0.5 border border-red-500/40 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-bold tracking-wider rounded-sm transition-all cursor-pointer"
                  id="cancel-treatise-btn"
                >
                  Cancel & Refund
                </button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1 mt-1">
                <div className="flex justify-between text-[10px] font-mono text-stone-light">
                  <span>Treatise completion rate</span>
                  <span>{curResearch.daysLeft} days remaining</span>
                </div>
                <div className="h-2 w-full bg-ink border border-stone/25 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gold transition-all duration-300 relative overflow-hidden" 
                    style={{ width: `${((curResearch.totalDays - curResearch.daysLeft) / curResearch.totalDays) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-3 w-[50%] skew-x-12" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Eras Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" id="tech-eras-row">
            {eras.map((era) => {
              const IconComp = era.icon;
              const eraTechs = TECHNOLOGIES_LIST.filter(t => t.era === era.id);

              return (
                <div key={era.id} className="space-y-4" id={`era-column-${era.id}`}>
                  {/* Era Header */}
                  <div className={clsx("p-3 border rounded-md flex flex-col gap-0.5", era.color)} id={`era-header-${era.id}`}>
                    <div className="flex items-center gap-2">
                      <IconComp className="h-4 w-4 shrink-0 text-gold" />
                      <span className="text-xs font-bold font-sans tracking-wider uppercase text-parchment">{era.label}</span>
                    </div>
                    <span className="text-[9px] text-stone-light uppercase font-mono tracking-widest">{era.subtitle}</span>
                  </div>

                  {/* Era tech lists */}
                  <div className="space-y-3" id={`era-list-${era.id}`}>
                    {eraTechs.map((tech) => {
                      const isCompleted = activeUnlocks.includes(tech.id);
                      const isResearching = curResearch?.techId === tech.id;
                      
                      // Check requirements
                      const meetsRequirements = !tech.requirements || 
                        tech.requirements.every((reqId: string) => activeUnlocks.includes(reqId));
                      
                      const isLocked = !isCompleted && !isResearching && !meetsRequirements;

                      return (
                        <div
                          key={tech.id}
                          onClick={() => setSelectedTechId(tech.id)}
                          className={clsx(
                            "p-3 border rounded-md cursor-pointer transition-all flex flex-col gap-1 text-xs select-none",
                            selectedTechId === tech.id
                              ? "border-gold bg-stone/10 shadow-[0_0_8px_rgba(194,164,97,0.15)]"
                              : isCompleted
                                ? "border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-500/50"
                                : isResearching
                                  ? "border-gold/50 bg-gold/5 animate-pulse"
                                  : isLocked
                                    ? "border-stone/10 bg-ink-dense/40 opacity-45 cursor-not-allowed"
                                    : "border-stone/20 bg-ink hover:border-stone/40"
                          )}
                          id={`tech-node-${tech.id}`}
                        >
                          <div className="flex justify-between items-start" id={`node-header-${tech.id}`}>
                            <span className={clsx(
                              "font-serif font-semibold tracking-wide text-[12px]",
                              isCompleted ? 'text-emerald-400' : 'text-parchment'
                            )}>
                              {tech.name}
                            </span>
                            {isCompleted ? (
                              <span className="p-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : isResearching ? (
                              <span className="h-2 w-2 rounded-full bg-gold inline-block animate-ping mt-1" />
                            ) : isLocked ? (
                              <Lock className="h-3 w-3 text-stone" />
                            ) : null}
                          </div>
                          
                          <p className="text-[10px] text-stone leading-relaxed font-sans line-clamp-2">
                            {tech.description}
                          </p>

                          {/* Requirement notes (if locked) */}
                          {isLocked && tech.requirements && (
                            <div className="text-[8px] font-mono text-red-400 uppercase tracking-wider mt-1 border-t border-rose-950/20 pt-1">
                              Prereq: {TECHNOLOGIES_LIST.find(t => t.id === tech.requirements?.[0])?.name || tech.requirements[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED TECH DETAILS */}
        {selectedTech && (
          <aside className="w-80 border-l border-stone/30 bg-ink/75 flex flex-col shrink-0 p-5 space-y-6 z-10" id="tech-details-sidebar">
            <div className="space-y-2" id="selected-tech-intro">
              <span className="text-[9px] uppercase tracking-widest text-gold font-bold font-mono">Treatise Analysis</span>
              <h3 className="text-xl font-serif font-bold text-parchment leading-tight">
                {selectedTech.name}
              </h3>
              <p className="text-xs text-stone-light leading-relaxed italic">
                "{selectedTech.description}"
              </p>
            </div>

            {/* Effects */}
            <div className="border border-stone/20 bg-ink-dense p-3 rounded-md space-y-1" id="selected-tech-effects">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block font-mono">Unlocked Scientific Effects:</span>
              <p className="text-xs text-emerald-300 leading-relaxed">
                {selectedTech.effectsDescription}
              </p>
              {selectedTech.unlockedBuildings && selectedTech.unlockedBuildings.length > 0 && (
                <div className="text-[10px] font-mono text-gold-light mt-1.5 border-t border-stone/15 pt-1.5 uppercase tracking-wider">
                  🔑 Unlocks Civic project: {selectedTech.unlockedBuildings.join(', ')}
                </div>
              )}
            </div>

            {/* Status Checklist / Action */}
            <div className="space-y-4" id="selected-tech-checklist-box">
              <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/20 pb-1 font-bold">
                Treasury Requirements
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-ink-dense p-2 border border-stone/10 rounded-sm">
                  <div className="text-[8px] text-stone uppercase tracking-widest">Gold cost</div>
                  <span className={clsx(
                    "font-bold font-mono",
                    (resources?.gold || 0) >= selectedTech.cost.gold ? 'text-gold' : 'text-red-400'
                  )}>
                    {selectedTech.cost.gold} gold
                  </span>
                  <span className="text-[8px] text-stone block">({Math.floor(resources?.gold || 0)} held)</span>
                </div>

                <div className="bg-ink-dense p-2 border border-stone/10 rounded-sm">
                  <div className="text-[8px] text-stone uppercase tracking-widest">Manpower required</div>
                  <span className={clsx(
                    "font-bold font-mono",
                    (resources?.manpower || 0) >= selectedTech.cost.manpower ? 'text-sky' : 'text-red-400'
                  )}>
                    {selectedTech.cost.manpower} mp
                  </span>
                  <span className="text-[8px] text-stone block">({resources?.manpower || 0} held)</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-stone-light">
                <span>Research Time:</span>
                <span className="font-mono font-bold text-parchment">⌛ {selectedTech.cost.days} days</span>
              </div>

              {/* Requirements block */}
              {selectedTech.requirements && (
                <div className="space-y-1">
                  <div className="text-[9px] text-stone uppercase tracking-wider font-mono">Required Prerequisite Treatises:</div>
                  {selectedTech.requirements.map(reqId => {
                    const reqTech = TECHNOLOGIES_LIST.find(t => t.id === reqId);
                    const isUnlocked = activeUnlocks.includes(reqId);
                    return (
                      <div key={reqId} className="flex items-center gap-1.5 text-xs text-stone-light">
                        <span className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          isUnlocked ? "bg-emerald-400" : "bg-red-500"
                        )} />
                        <span className={clsx(isUnlocked ? "text-stone-light line-through" : "text-stone font-bold")}>
                          {reqTech?.name || reqId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dynamic Action Buttons */}
              <div className="pt-2" id="tech-selection-action-btn">
                {activeUnlocks.includes(selectedTech.id) ? (
                  <div className="p-3 border border-emerald-500/20 bg-emerald-950/15 text-emerald-400 rounded-md text-center text-xs font-mono font-semibold" id="tech-researched-status">
                    ✓ TREATISE REGISTERED IN ARCHIVES
                  </div>
                ) : curResearch?.techId === selectedTech.id ? (
                  <div className="p-3 border border-gold/30 bg-gold/5 text-gold rounded-md text-center text-xs font-mono font-semibold animate-pulse" id="tech-researching-status">
                    ⚡ SCIENTIFIC INITIATORY UNDERWAY ({curResearch.daysLeft}d)
                  </div>
                ) : (() => {
                  const meetsRequirements = !selectedTech.requirements || 
                    selectedTech.requirements.every((reqId: string) => activeUnlocks.includes(reqId));
                  const canAfford = resources &&
                    (resources.gold ?? 0) >= selectedTech.cost.gold &&
                    (resources.manpower ?? 0) >= selectedTech.cost.manpower;

                  if (!meetsRequirements) {
                    return (
                      <button
                        disabled
                        className="w-full py-3 bg-ink-dense text-stone border border-stone/10 rounded-sm font-sans uppercase tracking-[0.1em] text-xs cursor-not-allowed text-center font-bold"
                        id="unmet-req-btn"
                      >
                        Prerequisite Academies Needed
                      </button>
                    );
                  }

                  if (curResearch) {
                    return (
                      <button
                        disabled
                        className="w-full py-3 bg-ink-dense text-stone border border-stone/10 rounded-sm font-sans uppercase tracking-[0.1em] text-xs cursor-not-allowed text-center font-bold"
                        id="already-researching-some-btn"
                        title="Your central academy is currently compiling another treatise."
                      >
                        Academy Occupied
                      </button>
                    );
                  }

                  return (
                    <button
                      id={`start-research-btn-${selectedTech.id}`}
                      disabled={!canAfford}
                      onClick={() => handleStartResearch(selectedTech)}
                      className={clsx(
                        "w-full py-3 rounded-sm font-sans uppercase tracking-[0.2em] text-xs cursor-pointer text-center font-bold transition-all",
                        canAfford
                          ? "bg-gold text-ink border border-gold hover:bg-gold-light shadow-md"
                          : "border border-stone/20 bg-ink-dense text-stone cursor-not-allowed"
                      )}
                    >
                      Commission Treatise
                    </button>
                  );
                })()}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
