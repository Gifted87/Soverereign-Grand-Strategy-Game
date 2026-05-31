import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Heart, Star, Compass, Award, Code, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export function Credits() {
  const navigate = useNavigate();

  const creditsChapters = [
    {
      title: 'High Scriptor & Strategy',
      icon: Award,
      members: [
        { name: 'Gemini AI Scriptor', description: 'Deep intelligence executing grand feudal simulation loops, dynamic scenario generation, and dynamic vassal behavioral patterns.' },
        { name: 'Antigravity Engineering Scribe', description: 'Compiled state transition vectors, routing matrices, and procedural medieval events.' }
      ]
    },
    {
      title: 'The Cartographer’s Guild',
      icon: Compass,
      members: [
        { name: 'Sovereign Canvas Systems', description: 'Architect of the dynamic map overlay grid, pathfinding algorithms, and interactive political boundaries.' }
      ]
    },
    {
      title: 'Engine Architecture & Slices',
      icon: Code,
      members: [
        { name: 'Zustand State Ledger', description: 'Robust transactional state-manager uniting military, intelligence, economy, and chronicle parameters.' },
        { name: 'Vite & React Scriptorium', description: 'Ultra-high-velocity runtime engine enabling hot-loading feudal modules at 60 ticks per frame.' },
        { name: 'Tailwind Design Tapestry', description: 'Loom compiled styling classes presenting royal gold typography, warm parchment slates, and Obsidian horizons.' }
      ]
    },
    {
      title: 'Scribes & Historical Epics',
      icon: BookOpen,
      members: [
        { name: 'The Codex Chronicle', description: 'Producers of standard historic scenarios, regional border descriptions, and chronicled lore occurrences.' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-ink text-parchment font-body flex flex-col border-[12px] border-ink-light selection:bg-gold selection:text-ink select-none relative overflow-y-auto pb-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="py-6 border-b border-stone/30 bg-ink-light flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-gold animate-pulse" />
          <div>
            <h1 className="font-header text-lg uppercase tracking-[0.25em] text-gold">Sovereign Chronicles</h1>
            <p className="text-[10px] uppercase font-sans tracking-widest text-stone-light">Chronicled Creators &amp; Codices</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 border border-stone/50 bg-ink px-4 py-2 text-xs font-sans uppercase tracking-widest text-stone-light hover:text-gold hover:border-gold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Main Menu
        </button>
      </header>

      {/* Interactive scrolling credits container */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 z-10 flex flex-col justify-start">
        
        {/* Title / Intro */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-wide text-gold">The Sovereign Scriptorium</h2>
          <p className="text-xs text-stone-light leading-relaxed">
            Sovereign Chronicles is procedural feudal statecraft woven with high neural strategics and robust canvas-scale simulation.
          </p>
          <div className="w-36 h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent mx-auto pt-1" />
        </div>

        {/* Chapters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {creditsChapters.map((chapter, blockIdx) => {
            const Icon = chapter.icon;
            return (
              <motion.div
                key={chapter.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: blockIdx * 0.1 }}
                className="bg-ink-light/50 border border-stone/20 p-5 rounded-lg space-y-4 shadow-md backdrop-blur-sm self-start"
              >
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone/15">
                  <Icon className="w-4 h-4 text-gold shrink-0" />
                  <h3 className="font-header text-xs uppercase tracking-wider font-bold text-gold">
                    {chapter.title}
                  </h3>
                </div>

                <div className="space-y-4">
                  {chapter.members.map((member) => (
                    <div key={member.name} className="space-y-1">
                      <h4 className="font-serif text-[14px] text-parchment font-semibold">
                        {member.name}
                      </h4>
                      <p className="text-[11px] text-stone-light leading-relaxed font-sans">
                        {member.description}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing decorative manuscript footer */}
        <div className="text-center mt-12 py-6 border-t border-stone/15 max-w-lg mx-auto space-y-3">
          <Star className="w-5 h-5 text-gold mx-auto animate-spin" style={{ animationDuration: '6s' }} />
          <p className="text-[10px] uppercase font-sans tracking-widest text-stone">
            All records, dynasties, and historical lineages are procedures generated securely.
          </p>
          <p className="text-[10px] font-mono text-stone-light">
            Sovereign Engine v1.1.2 — Built in partnership with Google Decisive Technologies
          </p>
        </div>

      </main>
    </div>
  );
}
