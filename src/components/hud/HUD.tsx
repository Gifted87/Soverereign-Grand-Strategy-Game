import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Settings } from 'lucide-react';

export function HUD() {
  const { currentDay, currentYear, currentSeason, resources, activeMenuTab, setMenuTab, openModal, playerCharacter } = useGameStore() as any;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        openModal('GAME_MENU');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  const dynastyName = playerCharacter ? playerCharacter.lastName : 'Valedor';
  const charName = playerCharacter ? playerCharacter.firstName : 'John';

  const menuTabs = [
    { id: 'REALM', label: 'Realm' },
    { id: 'MILITARY_MENU', label: 'Military' },
    { id: 'DIPLOMACY_MENU', label: 'Diplomacy' },
    { id: 'COURT_MENU', label: 'Court' },
    { id: 'RELIGION_MENU', label: 'Religion' },
    { id: 'TECH_MENU', label: 'Tech' },
  ];

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-ink/90 backdrop-blur-md border-b border-stone/30 shrink-0 select-none relative z-20">
      <div className="flex items-center gap-6 h-full">
        <div className="flex items-center gap-3 border-r border-stone/20 pr-6 h-full py-2">
          {/* Player Banner */}
          <div className="w-8 h-8 rounded-[7px] bg-accent border border-accent flex items-center justify-center relative shadow-[0_2px_12px_rgba(217,119,87,0.35)] shrink-0">
             <span className="text-white font-serif text-lg leading-none">♔</span>
          </div>
          <div>
            <div className="text-parchment font-serif font-semibold tracking-wide leading-tight text-sm drop-shadow-sm">House {dynastyName}</div>
            <div className="text-stone-light text-[8px] font-sans uppercase tracking-[0.16em]">Sovereign of Aurelia ({charName})</div>
          </div>
        </div>

        {/* Menu Tabs */}
        <nav className="flex items-center bg-panel border border-stone p-1 rounded-lg">
           {menuTabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setMenuTab(tab.id as any)}
                className={`px-3.5 py-1 text-[11px] font-sans tracking-wider uppercase transition-all rounded-[6px] font-medium cursor-pointer ${
                   activeMenuTab === tab.id 
                    ? 'bg-ink-light text-parchment border border-stone/25 shadow-sm' 
                    : 'text-stone-light hover:text-parchment border border-transparent'
                }`}
              >
                {tab.label}
              </button>
           ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        {/* Resource Bar - Styled as a clean card container */}
        <div 
          onClick={() => openModal('BUDGET')}
          className="flex items-center gap-3.5 bg-ink-light px-3.5 py-1.5 border border-stone rounded-lg hover:border-accent/40 cursor-pointer transition-all shadow-sm"
        >
          <div className="flex items-center gap-1" title="Gold">
            <span className="text-sm">🪙</span>
            <span className="font-mono text-xs text-parchment font-semibold">{resources?.gold || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="Food Stockpile">
            <span className="text-sm">🌾</span>
            <span className="font-mono text-xs text-parchment font-semibold">{resources?.food || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="Manpower">
            <span className="text-sm">⚔️</span>
            <span className="font-mono text-xs text-parchment font-semibold">{resources?.manpower || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="Prestige">
            <span className="text-sm">👑</span>
            <span className="font-mono text-xs text-parchment font-semibold">{resources?.prestige || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-stone/20 pl-6 h-full py-2">
          {/* Settings Game Menu button */}
          <button 
            onClick={() => openModal('GAME_MENU')}
            className="text-stone-light hover:text-gold transition-all duration-200 flex items-center justify-center p-1.5 rounded-md hover:bg-stone/10 cursor-pointer"
            title="Sovereign Directives (Esc)"
          >
            <Settings className="w-5 h-5 hover:rotate-45 transition-transform duration-300" />
          </button>

          {/* Notification Alert Bell */}
          <button className="relative text-stone-light hover:text-accent transition-colors flex items-center justify-center p-1 rounded-md cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-danger text-white text-[9px] flex items-center justify-center rounded-full font-bold">3</span>
          </button>

          {/* Date & Seasonal Clock Displays */}
          <div className="text-right flex flex-col justify-center leading-tight">
             <div className="text-[9px] text-stone-light font-sans uppercase tracking-wider font-semibold">{currentSeason}</div>
             <div className="text-parchment font-serif text-xs font-medium">Day {currentDay}, Y. {currentYear}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
