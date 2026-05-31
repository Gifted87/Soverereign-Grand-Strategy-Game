import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { clsx } from 'clsx';
import { RightSidebarTab } from '../store/slices/uiSlice';
import { ForceComparisonBar } from './charts';

export function RightSidebar() {
  const { 
    rightSidebarTab, 
    setRightSidebarTab, 
    isPaused, 
    armies, 
    convoys, 
    provinces,
    characters: rawCharacters,
    updateCharacterOpinion,
    spendGold,
    addChronicle,
    resources,
    plots,
    chronicle,
    sieges
  } = useGameStore() as any;

  const characters = (rawCharacters || {}) as Record<string, any>;
  const gold = resources?.gold ?? 0;

  const [selectedRoleType, setSelectedRoleType] = useState('ADVISOR_CHANCELLOR');
  const [lastSummoned, setLastSummoned] = useState<{ name: string, title?: string } | null>(null);
  const [selectedOriginId, setSelectedOriginId] = useState('');

  const tabs: { id: RightSidebarTab, label: string }[] = [
    { id: 'MILITARY', label: 'WAR' },
    { id: 'DIPLOMACY', label: 'DIP' },
    { id: 'EVENTS', label: 'EVT' },
    { id: 'INTEL', label: 'INT' },
    { id: 'COURT', label: 'CRT' }
  ];

  // Helper functions for troop types
  const isInfantryType = (type: string) => {
    return [
      'LEVY_SPEARMEN', 
      'MILITIA_SWORDSMEN', 
      'PROFESSIONAL_INFANTRY', 
      'ELITE_HOUSECARLS', 
      'SHIELD_WALL_INFANTRY'
    ].includes(type);
  };

  const isCavalryType = (type: string) => {
    return [
      'LIGHT_CAVALRY', 
      'MEDIUM_CAVALRY', 
      'HEAVY_CAVALRY_KNIGHTS', 
      'HORSE_ARCHERS', 
      'CATAPHRACTS',
      'HOLY_ORDER_KNIGHTS'
    ].includes(type);
  };

  const isRangedType = (type: string) => {
    return [
      'PEASANT_ARCHERS', 
      'LONGBOWMEN', 
      'CROSSBOWMEN'
    ].includes(type);
  };

  // Dynamically calculate and sum player and enemy forces across all active armies and regional fortifications
  const calculateForces = () => {
    let playerInf = 0;
    let playerCav = 0;
    let playerArc = 0;

    let enemyInf = 0;
    let enemyCav = 0;
    let enemyArc = 0;

    // 1. Accumulate totals from active armies on the map
    Object.values(armies || {}).forEach((army: any) => {
      const isPlayer = army.realmId === 'realm_1';
      (army.units || []).forEach((u: any) => {
        const cnt = u.count || 0;
        if (isInfantryType(u.type)) {
          if (isPlayer) playerInf += cnt; else enemyInf += cnt;
        } else if (isCavalryType(u.type)) {
          if (isPlayer) playerCav += cnt; else enemyCav += cnt;
        } else if (isRangedType(u.type)) {
          if (isPlayer) playerArc += cnt; else enemyArc += cnt;
        } else {
          // Fallback properties
          if (u.isMounted) {
            if (isPlayer) playerCav += cnt; else enemyCav += cnt;
          } else if (u.isRanged) {
            if (isPlayer) playerArc += cnt; else enemyArc += cnt;
          } else {
            if (isPlayer) playerInf += cnt; else enemyInf += cnt;
          }
        }
      });
    });

    // 2. Accumulate regional defensive garrisons for fortified holdings and settlements
    Object.values(provinces || {}).forEach((p: any) => {
      const isPlayer = p.ownerId !== 'enemy_lord'; // Enemy owns Valerian Keep (prov_4) and occupies others if besieged
      const pop = p.population?.total || 5000;
      const fort = p.fortificationLevel || 1;
      
      // Dynamic garrison sizes proportional to population and wall tiers
      const baseGarrison = Math.floor((pop * 0.08) + (fort * 350));
      
      const inf = Math.floor(baseGarrison * 0.65);
      const arc = Math.floor(baseGarrison * 0.25);
      const cav = Math.floor(baseGarrison * 0.10);

      if (isPlayer) {
        playerInf += inf;
        playerArc += arc;
        playerCav += cav;
      } else {
        enemyInf += inf;
        enemyArc += arc;
        enemyCav += cav;
      }
    });

    // Elegant fallback safeguards to preserve living realm defaults if arrays are clear
    if (playerInf === 0) playerInf = 5200;
    if (enemyInf === 0) enemyInf = 4800;
    if (playerCav === 0) playerCav = 800;
    if (enemyCav === 0) enemyCav = 1200;
    if (playerArc === 0) playerArc = 1500;
    if (enemyArc === 0) enemyArc = 900;

    return [
      { name: 'Infantry', player: playerInf, enemy: enemyInf },
      { name: 'Cavalry', player: playerCav, enemy: enemyCav },
      { name: 'Archers', player: playerArc, enemy: enemyArc },
    ];
  };

  const milData = calculateForces();

  return (
    <aside className="w-80 bg-ink-light border-l border-stone flex flex-col shrink-0 overflow-hidden select-none">
      <div className="flex border-b border-stone/20 bg-ink p-2 justify-center shrink-0">
        <div className="tabs-pill bg-panel border border-stone p-1 rounded-lg flex gap-1 w-full justify-between">
          {tabs.map(tab => (
            <button 
               key={tab.id}
               onClick={() => setRightSidebarTab(tab.id)}
               className={clsx(
                 "flex-1 py-1 text-[10px] font-sans uppercase tracking-[0.1em] transition-all rounded-[6px] cursor-pointer text-center font-medium",
                 rightSidebarTab === tab.id 
                   ? "bg-ink-light text-parchment border border-stone/20 shadow-sm font-semibold" 
                   : "text-stone-light hover:text-parchment border border-transparent"
               )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-stone/30 relative">
        {rightSidebarTab === 'MILITARY' && (
          <div className="space-y-4">
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2">Force Comparison</div>
             <ForceComparisonBar data={milData} />

              <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/20 pb-1.5 mb-2 mt-6">Active Forces</div>
             {Object.values(armies).filter((a: any) => a.realmId === 'realm_1').map((army: any) => {
                const lowSupply = army.supplyLevel < 60;
                const criticalSupply = army.supplyLevel < 40;
                return (
                   <div key={army.id} className={clsx(
                     "border p-3.5 flex flex-col gap-2 cursor-pointer transition-all rounded-lg my-2 shadow-sm",
                     criticalSupply 
                       ? "border-danger bg-danger/5 hover:bg-danger/10" 
                       : lowSupply 
                         ? "border-amber-600/30 bg-amber-500/5 hover:bg-amber-500/10" 
                         : "border-stone bg-ink-lighter hover:border-stone-light/45"
                   )}>
                     <div className="flex justify-between items-center">
                       <span className="font-serif text-sm text-parchment font-semibold">{army.name}</span>
                       <span className="text-[10px] text-stone-light font-mono font-medium">{army.morale}% Morale</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-stone-light">{(army as any).units?.length || 0} Regiments</span>
                       <span className={clsx("font-mono font-bold text-xs", criticalSupply ? "text-danger" : lowSupply ? "text-amber-500" : "text-emerald-400")}>
                         {Math.floor(army.supplyLevel)}% Supply
                       </span>
                     </div>
                     <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono leading-none pt-2 border-t border-stone/15">
                       <span className="bg-panel border border-stone/40 text-stone-light px-1.5 py-0.5 rounded-md uppercase font-medium">{army.stance}</span>
                       {criticalSupply && (
                         <span className="bg-rose-950/40 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded-md animate-pulse">DESERTION ATTRITION</span>
                       )}
                       {!criticalSupply && lowSupply && (
                         <span className="bg-amber-950/45 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded-md">LOW SUPPLY</span>
                       )}
                       {army.deserterRate > 0 && (
                         <span className="text-rose-400 font-bold">-{army.deserterRate}% troop/day</span>
                       )}
                     </div>
                   </div>
                );
             })}
             {Object.values(armies).filter((a: any) => a.realmId === 'realm_1').length === 0 && (
                <div className="text-center text-sm italic text-stone/50 py-4 font-sans">No armies raised.</div>
             )}

             {/* Part 9.1 & 9.2: Logistics & Supply Chain Section */}
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/20 pb-1.5 mb-2 mt-8">Logistics & Supply Convoys</div>
             
             <div className="space-y-3">
               {Object.values(convoys || {}).map((convoy: any) => {
                 const pct = Math.min(100, Math.floor((convoy.progressIndex / convoy.path.length) * 100));
                 return (
                   <div key={convoy.id} className="border border-stone bg-ink-lighter p-3.5 rounded-lg space-y-3 shadow-sm">
                     <div className="flex justify-between items-center text-xs">
                       <span className="font-semibold text-parchment font-serif">Caravan from {convoy.originProvinceName}</span>
                       <span className={clsx(
                         "text-[9px] px-2 py-0.5 font-sans font-semibold uppercase rounded-md border",
                         convoy.status === 'ACTIVE' ? "text-emerald-400 bg-emerald-950/40 border-emerald-900" : "text-amber-400 bg-amber-950/40 border-amber-900 animate-pulse"
                       )}>
                         {convoy.status}
                       </span>
                     </div>

                     {/* Cargo row */}
                     <div className="flex items-center gap-1.5 text-[11px] font-mono justify-between text-parchment bg-ink/70 border border-stone/15 px-2 py-1.5 rounded-lg">
                       <span title="Food">🌾 {convoy.rawCargo?.food || 0}</span>
                       <span title="Wood">🪵 {convoy.rawCargo?.wood || 0}</span>
                       <span title="Stone">🪨 {convoy.rawCargo?.stone || 0}</span>
                       <span title="Iron">⚙️ {convoy.rawCargo?.iron || 0}</span>
                     </div>

                     {/* Progress bar */}
                     <div className="space-y-1">
                       <div className="flex justify-between text-[9px] font-mono text-stone-light">
                         <span>Route Progress</span>
                         <span className="font-bold text-parchment">{pct}%</span>
                       </div>
                       <div className="w-full bg-panel border border-stone/10 h-2 rounded-full overflow-hidden">
                         <div className="bg-linear-to-r from-accent to-parchment h-full transition-all duration-300 rounded-full" style={{ width: `${pct}%` }}></div>
                       </div>
                     </div>

                     <div className="text-[10px] font-mono text-stone flex justify-between items-center bg-panel border border-stone/25 px-2 py-1 rounded-md">
                       <span>{convoy.escort ? "🛡️ Escorted Guard" : "⚠️ Raw Bandit Risk"}</span>
                       <span className="font-bold text-parchment">Speed: {convoy.speed || 1} hex/d</span>
                     </div>

                     {convoy.logs && convoy.logs.length > 0 && (
                       <div className="text-[9px] font-mono text-stone-light italic opacity-90 leading-snug border-t border-stone/10 pt-1.5 line-clamp-2">
                         {convoy.logs[convoy.logs.length - 1]}
                       </div>
                     )}
                   </div>
                 );
               })}

               {Object.values(convoys || {}).length === 0 && (
                 <div className="text-center text-xs italic text-stone/40 py-6 border border-dashed border-stone/20 rounded-lg font-sans">
                   No active transport caravans. Stocks gather in sub-provinces.
                 </div>
               )}
             </div>

             {/* Action Dispatch Tool - Styled as a premium bento card */}
             <div className="border border-stone bg-ink-lighter p-4 rounded-lg space-y-3 mt-6 shadow-sm">
               <div className="text-[11px] font-bold tracking-wider text-accent uppercase font-mono">Dispatch Emergency Shipment</div>
               <div className="text-[10px] text-stone-light leading-relaxed font-sans">
                 Summon an emergency supply convoy from a region to inject critical food & materials into Capital stocks.
               </div>
               
               <div className="flex gap-2 pt-1.5">
                 <select 
                   value={selectedOriginId} 
                   onChange={e => setSelectedOriginId(e.target.value)}
                   className="flex-1 text-[11px] bg-ink border border-stone/30 text-parchment p-1.5 rounded-md focus:outline-none focus:border-accent font-sans"
                 >
                   <option value="">-- Select Region --</option>
                   {Object.values(provinces).filter((p: any) => p.ownerId === 'player' && p.id !== 'prov_1').map((p: any) => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
                 <button
                   disabled={!selectedOriginId}
                   onClick={() => {
                     if (!selectedOriginId) return;
                     window.dispatchEvent(new CustomEvent('simulation_action', {
                       detail: {
                         type: 'DISPATCH_MANUAL_CONVOY',
                         payload: { originId: selectedOriginId, food: 75, wood: 45, stone: 30, iron: 25 }
                       }
                     }));
                     setSelectedOriginId('');
                   }}
                   className={clsx(
                     "px-3.5 py-1.5 text-[10px] font-sans uppercase font-bold tracking-wider rounded-md transition-all border shrink-0",
                     selectedOriginId 
                       ? "bg-accent text-ink border-accent hover:bg-accent/90 hover:shadow-[0_2px_10px_rgba(217,119,87,0.3)] cursor-pointer" 
                       : "bg-panel border-stone/20 text-stone-light/40 cursor-not-allowed"
                   )}
                 >
                   Send
                 </button>
               </div>
             </div>
             
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-8">Sieges</div>
             <div className="hidden"></div>
              {(() => {
                const activeSiegesList: any[] = [];
                const siegeKeys = new Set();

                // 1. Accumulate active siege structures
                Object.values(sieges || {}).forEach((siege: any) => {
                  siegeKeys.add(siege.id);
                  activeSiegesList.push({
                    id: siege.id,
                    settlementName: siege.settlementId,
                    progress: siege.progressPercent ?? 35,
                    currentPhase: siege.currentPhase || 'INVESTMENT',
                    siegerId: siege.siegerId,
                    supplyStatus: siege.supplyStatus || 'FULL',
                    diseaseRisk: siege.diseaseRisk || 0
                  });
                });

                // 2. Accumulate besieged provinces as reliable fallback
                Object.entries(provinces || {}).forEach(([pId, province]: [string, any]) => {
                  if (province.isBesieged && !siegeKeys.has(pId)) {
                    activeSiegesList.push({
                      id: pId,
                      settlementName: province.name,
                      progress: province.siegeProgress ?? 40,
                      currentPhase: 'INVESTMENT',
                      siegerId: 'army_2', // Valerian Host
                      supplyStatus: 'STRAINED',
                      diseaseRisk: 15
                    });
                  }
                });

                if (activeSiegesList.length === 0) {
                  return (
                    <div className="text-center text-sm italic text-stone/40 py-6 border border-dashed border-stone/20 rounded-lg font-sans">
                      Peace in the realm. No active sieges.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 mt-3">
                    {activeSiegesList.map((s: any) => {
                      const province = Object.values(provinces || {}).find(
                        (p: any) => p.settlements?.includes(s.settlementName) || p.id === s.id || p.name === s.settlementName
                      ) as any;
                      const displayName = province ? province.name : s.settlementName;
                      const besiegingArmy = armies[s.siegerId] || Object.values(armies || {}).find((a: any) => a.realmId === 'enemy') as any;
                      const besiegerName = besiegingArmy ? besiegingArmy.name : 'Valerian Host';

                      return (
                        <div key={s.id} className="border border-stone bg-ink-lighter p-3.5 rounded-lg space-y-2.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-serif text-xs text-parchment font-semibold">Siege of {displayName}</span>
                            <span className="text-[8px] font-sans px-1.5 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded-md font-bold uppercase animate-pulse">
                              {s.currentPhase}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-stone-light">
                              <span>Breach Progress</span>
                              <span className="font-bold text-rose-400">{s.progress}%</span>
                            </div>
                            <div className="w-full bg-panel border border-stone/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-rose-600 h-full transition-all duration-300 rounded-full" 
                                style={{ width: `${s.progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between text-[9px] font-mono text-stone-light pt-1.5 border-t border-stone/15">
                            <span>Besieger:</span>
                            <span className="text-parchment font-medium">{besiegerName}</span>
                          </div>
                          
                          <div className="flex justify-between text-[9px] font-mono text-stone-light">
                            <span>Supply Status:</span>
                            <span className="font-semibold text-amber-500 uppercase">{s.supplyStatus}</span>
                          </div>

                          {s.diseaseRisk > 0 && (
                            <div className="text-[9px] text-purple-400 font-mono flex items-center justify-between gap-1 leading-none mt-1">
                              <span>☠️ Camp Disease Risk:</span>
                              <span className="font-bold">{s.diseaseRisk}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
          </div>
        )}

        {rightSidebarTab === 'EVENTS' && (
          <div className="space-y-4">
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2">Pending Decisions</div>
             
             <div 
                 className="border border-gold/30 bg-gold/5 p-3 relative group hover:border-gold/60 cursor-pointer transition-colors"
                 onClick={() => useGameStore.getState().openModal('EVENT', { title: 'A Call for Aid', description: 'The border lords of Kareth request structural reinforcements against potential mountain raids.' })}
             >
                 <div className="absolute top-0 right-0 bg-gold text-ink text-[10px] uppercase tracking-widest px-2 py-0.5 font-bold">New</div>
                 <div className="text-parchment font-serif text-lg mb-1">A Call for Aid</div>
                 <div className="text-stone-light text-xs font-sans leading-relaxed line-clamp-2">
                     The border lords of Kareth request structural reinforcements against potential mountain raids.
                 </div>
                 <div className="mt-3 text-[10px] uppercase tracking-widest text-gold text-right opacity-0 group-hover:opacity-100 transition-opacity">
                     Review Issue →
                 </div>
             </div>
          </div>
        )}

        {rightSidebarTab === 'DIPLOMACY' && (() => {
          const foreignRulers = Object.values(characters).filter((c: any) => c.id.startsWith('foreign_'));

          return (
            <div className="space-y-4">
              <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/20 pb-1.5 mb-2">Known Rulers</div>
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {foreignRulers.map(r => {
                  const rOpinion = r.opinion?.['player'] ?? -30;
                  const relationshipStatus = rOpinion <= -30 ? 'HOSTILE' : rOpinion >= 25 ? 'ALLIED' : 'NEUTRAL';
                  const statusColors = 
                    relationshipStatus === 'HOSTILE' ? 'text-rose-400 bg-rose-950/40 border-rose-900/40' :
                    relationshipStatus === 'ALLIED' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' :
                    'text-amber-400 bg-amber-950/40 border-amber-900/40';

                  return (
                    <div key={r.id} className="border border-stone bg-ink-lighter p-3.5 flex items-center justify-between cursor-pointer hover:border-stone-light/45 rounded-lg transition-all shadow-sm">
                      <div className="flex gap-2.5 items-center">
                        <div className="w-8 h-8 rounded-full bg-stone overflow-hidden border border-stone/30">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${r.firstName}&backgroundColor=c0cbdc`} 
                            alt={r.firstName} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <div className="text-xs font-serif text-parchment font-semibold">{r.firstName} {r.lastName}</div>
                          <div className="text-[9px] text-stone-light uppercase font-mono">{r.title?.name || 'Sovereign'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className={`text-[8px] font-bold border rounded-md px-1.5 py-0.5 font-sans ${statusColors}`}>
                          {relationshipStatus}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${rOpinion >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {rOpinion >= 0 ? `+${rOpinion}` : rOpinion}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {foreignRulers.length === 0 && (
                  <div className="text-center font-serif text-sm italic text-stone-light/40 py-8">
                    No foreign rulers discovered yet.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        
        {rightSidebarTab === 'INTEL' && (
          <div className="space-y-4">
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2">Sponsor Espionage</div>
             <div className="grid grid-cols-1 gap-2">
               <button 
                 onClick={() => {
                   if (gold < 200) {
                     alert("Insufficient treasury reserves. Fund spynetwork requires 200 Gold.");
                     return;
                   }
                   window.dispatchEvent(new CustomEvent('simulation_action', {
                     detail: { type: 'LAUNCH_PLOT', payload: { type: 'SPY_INFILTRATE', cost: 200 } }
                   }));
                 }}
                 className="flex flex-col text-left p-2.5 bg-ink/40 border border-stone/30 hover:border-purple-500/50 hover:bg-purple-950/10 rounded group transition cursor-pointer"
               >
                 <div className="flex justify-between w-full">
                   <span className="font-serif text-xs font-semibold text-parchment group-hover:text-purple-300">Infiltrate Secrets</span>
                   <span className="text-[9px] font-mono font-bold text-purple-400">200 Gold</span>
                 </div>
                 <p className="text-[10px] text-stone-light/60 mt-0.5">Launches surveillance to steal foreign documents and gather active intel reports.</p>
               </button>

               <button 
                 onClick={() => {
                   if (gold < 300) {
                     alert("Insufficient treasury reserves. Sovereign deeds require 300 Gold.");
                     return;
                   }
                   window.dispatchEvent(new CustomEvent('simulation_action', {
                     detail: { type: 'LAUNCH_PLOT', payload: { type: 'CLAIM_FORGERY', cost: 300 } }
                   }));
                 }}
                 className="flex flex-col text-left p-2.5 bg-ink/40 border border-stone/30 hover:border-purple-500/50 hover:bg-purple-950/10 rounded group transition cursor-pointer"
               >
                 <div className="flex justify-between w-full">
                   <span className="font-serif text-xs font-semibold text-parchment group-hover:text-purple-300">Fabricate sovereign claim</span>
                   <span className="text-[9px] font-mono font-bold text-purple-400">300 Gold</span>
                 </div>
                 <p className="text-[10px] text-stone-light/60 mt-0.5">Forges deed rolls to claim de jure control of Valerian fiefs.</p>
               </button>

               <button 
                 onClick={() => {
                   if (gold < 500) {
                     alert("Insufficient treasury reserves. Assassins guild requires 500 Gold.");
                     return;
                   }
                   window.dispatchEvent(new CustomEvent('simulation_action', {
                     detail: { type: 'LAUNCH_PLOT', payload: { type: 'ASSASSINATION', cost: 500 } }
                   }));
                 }}
                 className="flex flex-col text-left p-2.5 bg-ink/40 border border-stone/30 hover:border-purple-500/50 hover:bg-purple-950/10 rounded group transition cursor-pointer"
               >
                 <div className="flex justify-between w-full">
                   <span className="font-serif text-xs font-semibold text-parchment group-hover:text-purple-300">Poisoned Chalice</span>
                   <span className="text-[9px] font-mono font-bold text-purple-400">500 Gold</span>
                 </div>
                 <p className="text-[10px] text-stone-light/60 mt-0.5">A high-stakes conspiracy to assassinate Lord Valerius with extreme risk.</p>
               </button>
             </div>

             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-6">Active Missions</div>
             {(() => {
               const activeMissions = Object.values(plots || {}).filter((p: any) => p.initiatorId === 'player' || p.isExposed);
               
               if (activeMissions.length === 0) {
                 return (
                   <div className="text-center text-xs italic text-stone/40 py-6 border border-dashed border-stone/20 rounded font-sans">
                     No active spy operations.
                   </div>
                 );
               }

               return (
                 <div className="space-y-2.5">
                   {activeMissions.map((p: any) => {
                     const isPlayerPlot = p.initiatorId === 'player' || p.id.startsWith('plot_player');
                     const pTitle = p.type === 'SPY_INFILTRATE' ? 'Infiltrate Valerian Keep' : p.type === 'CLAIM_FORGERY' ? 'Fabricate Sovereign Deeds' : 'Poisoned Chalice Conspiracy';
                     const progress = p.progressPercent ?? 0;
                     
                     if (isPlayerPlot) {
                       return (
                         <div key={p.id} className="border border-purple-500/30 bg-purple-950/10 p-3 rounded flex flex-col gap-1.5 shadow-sm">
                           <div className="flex justify-between items-center">
                             <span className="font-serif text-xs text-purple-300 font-semibold">{pTitle}</span>
                             <span className="text-[9px] text-purple-400 font-mono font-bold">{progress}% Progress</span>
                           </div>
                           <div className="w-full h-1 bg-ink rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                           </div>
                           <div className="flex justify-between text-[9px] font-mono text-stone-light">
                             <span>Conspirator: Silas the Shadow</span>
                             <span className="text-[8px] px-1 bg-purple-950/60 rounded text-purple-300 border border-purple-500/20 uppercase font-semibold">SPYMASTER</span>
                           </div>
                         </div>
                       );
                     } else {
                       // Exposed enemy conspiracy!
                       return (
                         <div key={p.id} className="border border-red-500/30 bg-red-950/10 p-3 rounded flex flex-col gap-1.5 shadow-sm">
                           <div className="flex justify-between items-center">
                             <span className="font-serif text-xs text-red-400 font-bold">⚠️ OVERT THREAT: {p.type === 'ASSASSINATION' ? 'Assassination Plot' : 'Claims Conspiracy'}</span>
                             <span className="text-[9px] text-red-400 font-mono font-bold">{progress}% Progress</span>
                           </div>
                           <div className="w-full h-1 bg-ink rounded-full overflow-hidden">
                             <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                           </div>
                           <div className="flex justify-between text-[9px] font-mono text-stone-light">
                             <span>Initiator: Lord Valerius</span>
                             <span className="text-[8px] px-1 bg-red-950/60 rounded text-red-300 border border-red-500/20 uppercase font-semibold">EXPOSED</span>
                           </div>
                         </div>
                       );
                     }
                   })}
                 </div>
               );
             })()}
             
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-6">Intel Reports & Rumors</div>
             <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1 pb-2">
               {(() => {
                 const reports: string[] = [];

                 // Process exposed plots or assassin events from chronicle
                 (chronicle || []).forEach((entry: any) => {
                   const txt = entry.text.toLowerCase();
                   if (txt.includes('plot') || txt.includes('spy') || txt.includes('infiltrate') || txt.includes('arrest') || txt.includes('foully') || txt.includes('decretum')) {
                     reports.push(`[Day ${entry.day}] "${entry.text}"`);
                   }
                 });

                 // State-based triggers
                 if (gold < 300) {
                     reports.push(`"The treasury is exhausted; rumors say the realm cannot sustain prolonged campaigns."`);
                 } else if (gold > 1500) {
                     reports.push(`"Speculator rumor: The sovereign treasury stands incredibly fortified with gold reserves."`);
                 }

                 const enemyArmy = Object.values(armies || {}).find((a: any) => a.realmId === 'enemy' || a.id === 'army_2') as any;
                 if (enemyArmy) {
                   if ((enemyArmy.supplyLevel ?? 100) < 60) {
                       reports.push(`"Informers report the Valerian host campaigns with depleted bread provisions."`);
                   } else {
                       reports.push(`"Scouts shadow high iron deliveries heading towards Valerian fort garrisons."`);
                   }
                 }

                 const lowOpinionChar = Object.values(characters || {}).find((c: any) => !c.isPlayer && (c.opinion?.['player'] ?? 0) < -30) as any;
                 if (lowOpinionChar) {
                     reports.push(`"Dungeon spies overhear vassals drinking toasts to ${lowOpinionChar.firstName}'s sovereign ambitions."`);
                 }

                 // Fallbacks
                 if (reports.length === 0) {
                    reports.push(`"Rumors suggest Duke Berold's treasury runs thin after heavy mercenary hires."`);
                    reports.push(`"Envoy whisper: Duke of Kareth is reinforcing high passes with palisades."`);
                 }

                 return reports.slice(-6).reverse().map((report, idx) => (
                   <div key={idx} className="p-2 border border-stone/15 bg-ink-lighter text-stone-light text-[10px] leading-relaxed italic rounded shadow-sm">
                     {report}
                   </div>
                 ));
               })()}
             </div>
          </div>
        )}
        {false && rightSidebarTab === 'INTEL' && (
          <div className="space-y-4">
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2">Active Missions</div>
             <div className="border border-purple-500/30 bg-purple-900/10 p-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <span className="font-serif text-sm text-purple-300">Infiltrate Valerian Keep</span>
                    <span className="text-[10px] text-stone-light font-mono">65% Progress</span>
                </div>
                <div className="w-full h-1 bg-ink">
                    <div className="h-full bg-purple-500" style={{ width: '65%' }}></div>
                </div>
                <div className="text-xs text-stone-light mt-1">Agent: Silas the Shadow</div>
             </div>
             
             <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-6">Intel Reports</div>
             <div className="text-stone-light text-xs italic">"Rumors suggest Duke Berold's treasury runs thin..."</div>
             <div className="text-stone-light text-xs italic">"Troop movements spotted near the eastern pass."</div>
          </div>
        )}        {rightSidebarTab === 'COURT' && (() => {
          const playerChar = characters['player']; // ID of player is 'player'

          const vassals = Object.values(characters).filter((c: any) => 
            !c.isPlayer && 
            !c.id.startsWith('foreign_') && 
            c.id !== 'enemy_lord' &&
            c.id !== 'advisor_chancellor' &&
            c.id !== 'advisor_marshal' &&
            c.id !== 'advisor_spymaster' &&
            c.id !== 'advisor_treasurer' &&
            c.id !== 'advisor_priest' &&
            c.isAlive
          );

          const handleSway = (vassalId: string, name: string) => {
            if (!spendGold || !updateCharacterOpinion || !addChronicle) return;
            const cost = 150;
            if (gold < cost) {
              alert(`Insufficient treasury to sponsor an embassy. (Requires ${cost} Gold)`);
              return;
            }
            if (spendGold(cost)) {
              const increase = Math.floor(Math.random() * 15) + 10; // +10 to +25 opinion
              updateCharacterOpinion(vassalId, increase);
              addChronicle(`Sent an embassy to sway ${name}. Opinion raised by +${increase}.`, 'NORMAL');
            }
          };

          const handleImprison = (vassalId: string, name: string, currentOpinion: number) => {
            if (!spendGold || !updateCharacterOpinion || !addChronicle) return;
            const cost = 100;
            if (gold < cost) {
              alert(`Insufficient treasury to mobilize arrest squads. (Requires ${cost} Gold)`);
              return;
            }
            const baseSuccessChance = Math.max(10, Math.min(95, 50 - currentOpinion));
            const roll = Math.random() * 100;

            if (spendGold(cost)) {
              if (roll <= baseSuccessChance) {
                updateCharacterOpinion(vassalId, -30);
                addChronicle(`Successfully imprisoned ${name} in the dungeons!`, 'NORMAL');
                alert(`Success! ${name} was arrested and thrown into your dungeons. Success chance was ${baseSuccessChance.toFixed(0)}%.`);
              } else {
                updateCharacterOpinion(vassalId, -40);
                addChronicle(`Attempted to arrest ${name} but the target fled!`, 'NORMAL');
                alert(`Failed arrest! ${name} escaped the guards and remains free. Status: Threat elevated.`);
              }
            }
          };

          const handleBanish = (vassalId: string, name: string) => {
            if (!spendGold || !updateCharacterOpinion || !addChronicle) return;
            const cost = 200;
            if (gold < cost) {
              alert(`Not enough gold to banish. (Requires ${cost} Gold)`);
              return;
            }
            if (spendGold(cost)) {
              updateCharacterOpinion(vassalId, -100);
              addChronicle(`Banished ${name} from the realm! estates reclaimed.`, 'NORMAL');
              alert(`Court decree: ${name} has been stripped of land and sent into permanent wilderness exile.`);
            }
          };

          return (
            <div className="space-y-4">
              {/* Ruler Header Card */}
              {playerChar && (
                <div className="bg-ink p-3 border border-gold/30 rounded-sm relative overflow-hidden mb-2">
                  <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] uppercase tracking-widest px-1.5 py-0.5 border-l border-b border-gold/25 font-bold">
                    Sovereign
                  </div>
                  <div className="text-stone-light text-[9px] uppercase tracking-wider font-sans">Active Dynasty Head</div>
                  <div className="text-gold font-serif text-base font-bold">{playerChar.firstName} {playerChar.lastName}</div>
                  <div className="flex gap-4 mt-2 text-[10px] text-stone-light font-data">
                    <span>DIP: {playerChar.diplomacy}</span>
                    <span>MAR: {playerChar.martial}</span>
                    <span>STW: {playerChar.stewardship}</span>
                  </div>
                </div>
              )}

              {/* Summon/Generate NPC Panel */}
              <div className="bg-ink-lighter border border-stone/30 p-2.5 rounded-sm">
                <div className="text-[10px] uppercase tracking-widest text-gold font-sans font-semibold mb-2 flex justify-between items-center">
                  <span>Summon NPC On-Demand</span>
                  <span className="text-[8px] font-mono text-stone-light bg-stone/15 px-1 rounded-sm uppercase">scout</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-[8px] text-stone-light uppercase tracking-wider block mb-1">NPC Class & Specialty</label>
                    <select 
                      value={selectedRoleType} 
                      onChange={(e) => {
                        setSelectedRoleType(e.target.value);
                        setLastSummoned(null);
                      }}
                      className="w-full bg-ink text-xs text-parchment border border-stone/30 rounded-sm p-1 focus:border-gold/50 focus:outline-none cursor-pointer"
                    >
                      <optgroup label="🤝 Vassal Lord Roster" className="bg-ink-dense text-[10px]">
                        <option value="VASSAL_LOYAL_VETERAN">The Loyal Veteran (-Marshal Baron-)</option>
                        <option value="VASSAL_AMBITIOUS_NEPHEW">The Ambitious Nephew (-Marquis Successor-)</option>
                        <option value="VASSAL_PIOUS_BISHOP">The Pious Bishop (-Provincial Bishop-)</option>
                        <option value="VASSAL_GREEDY_MERCHANT">The Greedy Merchant (-Steward Baron-)</option>
                        <option value="VASSAL_XENOPHOBIC_BARON">The Xenophobic Baron (-Warden Baron-)</option>
                        <option value="VASSAL_COWARD_LORD">The Coward Lord (-Coward Baron-)</option>
                        <option value="VASSAL_BELOVED_LOCAL">The Beloved Local (-Peasants Sovereign-)</option>
                        <option value="VASSAL_SCHEMER">The Schemer (-Baron Schemer-)</option>
                        <option value="VASSAL_DRUNKARD">The Drunkard (-Merry Baron-)</option>
                      </optgroup>
                      <optgroup label="👑 Foreign Sovereign Rulers" className="bg-ink-dense text-[10px]">
                        <option value="FOREIGN_EXPANSIONIST">The Expansionist King (Sovereign King)</option>
                        <option value="FOREIGN_ISOLATIONIST">The Isolationist (Sovereign Earl)</option>
                        <option value="FOREIGN_HOLY_CRUSADER">The Holy Crusader (Grand Crusader)</option>
                        <option value="FOREIGN_SCHEMER">The Schemer Queen/Grandee (Duchess Sovereign)</option>
                        <option value="FOREIGN_MERCANTILE">The Mercantile Republic (Merchant Doge)</option>
                        <option value="FOREIGN_BARBARIAN">The Barbarian Chieftain (Grand Chieftain)</option>
                        <option value="FOREIGN_REBEL">The Vassal Rebel King (Exiled Sovereign)</option>
                        <option value="FOREIGN_PUPPET">The Puppet Ruler (Titular King)</option>
                      </optgroup>
                      <optgroup label="🏰 Court Council Advisors" className="bg-ink-dense text-[10px]">
                        <option value="ADVISOR_CHANCELLOR">Chancellor (Diplomacy Specialist)</option>
                        <option value="ADVISOR_MARSHAL">Marshal (Military Specialist)</option>
                        <option value="ADVISOR_SPYMASTER">Spymaster (Intelligence Specialist)</option>
                        <option value="ADVISOR_TREASURER">Treasurer / Master of Coin</option>
                        <option value="ADVISOR_PRIEST">Court Priest / Spiritual Advisor</option>
                      </optgroup>
                      <optgroup label="🧬 Dynasts & Family" className="bg-ink-dense text-[10px]">
                        <option value="FAMILY_SPOUSE">Royal Dynasty Spouse (Sovereign Consort)</option>
                        <option value="FAMILY_HEIR">Heir Apparent (Prince Heir)</option>
                        <option value="FAMILY_CHILD">Young Dynastic Children</option>
                        <option value="FAMILY_SIBLING">Sibling / Cousin Companion</option>
                      </optgroup>
                      <optgroup label="⛪ Holy Clergy NPCs" className="bg-ink-dense text-[10px]">
                        <option value="CLERGY_HIGH_PRIEST">High Priest / Pope Equivalent</option>
                        <option value="CLERGY_BISHOP">Local Bishops / Clergy</option>
                        <option value="CLERGY_MONK">Wandering Monks / Hermit Mystics</option>
                      </optgroup>
                      <optgroup label="💰 Merchant & Trade Guilds" className="bg-ink-dense text-[10px]">
                        <option value="MERCHANT_GUILD_MASTER">Local Guild Master</option>
                        <option value="MERCHANT_BANKER">Banker / Moneylender</option>
                        <option value="MERCHANT_MASTER">Master Merchant (City-Level)</option>
                      </optgroup>
                      <optgroup label="⚔️ Officers of Arms & Military" className="bg-ink-dense text-[10px]">
                        <option value="MILITARY_GENERAL">Strategic General / Commander</option>
                        <option value="MILITARY_MERCENARY_CAPTAIN">Mercenary Captain / Condottiere</option>
                        <option value="MILITARY_BANDIT_CHIEF">Forest Bandit Chief</option>
                      </optgroup>
                      <optgroup label="🌾 Peasant Emergence" className="bg-ink-dense text-[10px]">
                        <option value="PEASANT_BLACKSMITH">Blacksmith with a Grudge</option>
                        <option value="PEASANT_SURVIVOR_FACTION_LEADER">Survivor Faction Leader</option>
                        <option value="PEASANT_PLAGUE_DOCTOR">Plague Doctor</option>
                        <option value="PEASANT_FOLK_HERO">Folk Outlaw Hero (Robin Hood)</option>
                        <option value="PEASANT_PROPHET">Peasant Cult Prophet</option>
                      </optgroup>
                      <optgroup label="🎭 Special Event Triggered NPCs" className="bg-ink-dense text-[10px]">
                        <option value="SPECIAL_WANDERING_KNIGHT">The Wandering Knight Visitor</option>
                        <option value="SPECIAL_FOREIGN_AMBASSADOR">The Foreign Envoy Ambassador</option>
                        <option value="SPECIAL_PILGRIM_ARMY">The Pilgrim Army Commander</option>
                        <option value="SPECIAL_EXILED_HEIR">The Exiled Realm Heir</option>
                        <option value="SPECIAL_COURT_JESTER">The Court Jester / Bard</option>
                        <option value="SPECIAL_PLAGUE_CARRIER">The Plague Carrier / Traveler</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => {
                      const cost = 200;
                      if (gold < cost) {
                        alert(`Requires ${cost} Gold to host court summons.`);
                        return;
                      }
                      
                      // Spend gold
                      if (spendGold) spendGold(cost);
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: {
                          type: 'SPEND_GOLD',
                          payload: { amount: cost }
                        }
                      }));
                      
                      // Generate NPC
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: {
                          type: 'GENERATE_NPC',
                          payload: {
                            roleType: selectedRoleType,
                            overrides: {
                              lastName: (selectedRoleType.startsWith('FAMILY') && playerChar) ? playerChar.lastName : undefined,
                              dynastyId: (selectedRoleType.startsWith('FAMILY') && playerChar) ? playerChar.dynastyId : undefined
                            }
                          }
                        }
                      }));

                      // Show last summoned notification
                      setLastSummoned({
                        name: selectedRoleType.split('_').pop() || 'Courtier',
                        title: selectedRoleType.replace(/_/g, ' ')
                      });
                    }}
                    className="w-full py-1.5 text-[10px] uppercase tracking-widest text-ink bg-gold hover:bg-gold-light border border-gold-light/45 rounded-sm font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Summon (200 Gold)</span>
                  </button>

                  {lastSummoned && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 p-2 rounded-sm text-[10px] font-sans leading-relaxed mt-2">
                      <div className="font-bold uppercase tracking-wider text-[8px] text-emerald-300">Summoning Confirmed</div>
                      <div>The dynamic <span className="font-semibold text-parchment">{lastSummoned.title}</span> has been spawned on-demand with realistic attributes and names! Check the roster below:</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Council Advisors Display */}
              <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2">Council</div>
              <div className="space-y-2">
                {[
                  { title: 'Chancellor', key: 'advisor_chancellor', defaultName: 'Lord Vane', defaultStat: 'Dip: 14', getStat: (c: any) => `Dip: ${c?.diplomacy ?? 14}` },
                  { title: 'Marshal', key: 'advisor_marshal', defaultName: 'Sir Kaelen', defaultStat: 'Mar: 18', getStat: (c: any) => `Mar: ${c?.martial ?? 18}` },
                  { title: 'Spymaster', key: 'advisor_spymaster', defaultName: 'Silas', defaultStat: 'Int: 16', getStat: (c: any) => `Int: ${c?.intrigue ?? 16}` },
                  { title: 'Treasurer', key: 'advisor_treasurer', defaultName: 'Master Thade', defaultStat: 'Stw: 12', getStat: (c: any) => `Stw: ${c?.stewardship ?? 12}` },
                  { title: 'Spiritual Advisor', key: 'advisor_priest', defaultName: 'Father Martin', defaultStat: 'Lrn: 15', getStat: (c: any) => `Lrn: ${c?.learning ?? 15}` },
                ].map(advisor => {
                  const dbChar = characters[advisor.key];
                  const dName = dbChar ? `${dbChar.firstName} ${dbChar.lastName}` : advisor.defaultName;
                  const dStat = dbChar ? advisor.getStat(dbChar) : advisor.defaultStat;
                  return (
                    <div key={advisor.title} className="flex items-center justify-between border-b border-stone/10 pb-1.5">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-gold/80">{advisor.title}</div>
                        <div className="text-xs font-serif text-parchment">{dName}</div>
                      </div>
                      <div className="text-[10px] font-mono text-stone-light bg-ink border border-stone/30 px-1 rounded-sm">{dStat}</div>
                    </div>
                  );
                })}
              </div>

              {/* Vassal Roster Display */}
              <div className="text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-4">Vassal Roster</div>
              
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {vassals.map(v => {
                  const opinion = v.opinion?.['player'] ?? 0;
                  const isHostile = opinion <= -30;
                  const isFriendly = opinion >= 30;
                  const fullName = `${v.firstName} ${v.lastName}`;

                  return (
                    <div key={v.id} className="border border-stone/30 bg-ink-lighter p-2.5 rounded-sm relative flex flex-col gap-1.5 hover:border-stone/50 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-gold font-serif font-bold">{fullName}</div>
                          <div className="text-[9px] text-stone-light uppercase font-sans mt-0.5">Title: {v.title?.name || 'Baron'}</div>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold border ${
                          isFriendly 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' 
                            : isHostile 
                              ? 'bg-rose-950/40 text-rose-400 border-rose-900' 
                              : 'bg-stone text-stone-light border-stone/40'
                        }`}>
                          {opinion >= 0 ? `+${opinion}` : opinion} Opinion
                        </div>
                      </div>

                      {/* Display Ambitions and traits */}
                      <p className="text-[10px] text-stone-light font-sans italic leading-relaxed">
                        "Desires {v.ambition || 'court favors'}"
                      </p>

                      <div className="flex gap-1 flex-wrap">
                        {v.traits?.map(t => (
                          <span key={t.id} className="text-[8px] uppercase tracking-wider bg-ink px-1 rounded-sm border border-stone/20 text-stone-light scale-95 origin-left">
                            {t.name}
                          </span>
                        ))}
                      </div>

                      {/* Dynamic Interactivity Actions */}
                      <div className="flex gap-1 mt-1.5 border-t border-stone/10 pt-2 shrink-0">
                        <button
                          onClick={() => handleSway(v.id, fullName)}
                          className="flex-1 py-1 text-[9px] uppercase tracking-wider bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-sm transition-all"
                          title="Sway Vassal (opinion improvement. Cost: 150 gold)"
                        >
                          Sway
                        </button>
                        <button
                          onClick={() => handleImprison(v.id, fullName, opinion)}
                          className="flex-1 py-1 text-[9px] uppercase tracking-wider bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-900/35 rounded-sm transition-all"
                          title="Arrest into dungeons (Success scales off negative opinion. Cost: 100 gold)"
                        >
                          Arrest
                        </button>
                        <button
                          onClick={() => handleBanish(v.id, fullName)}
                          className="flex-1 py-1 text-[9px] uppercase tracking-wider bg-stone/20 hover:bg-stone/40 text-stone-light border border-stone-light/20 rounded-sm transition-all"
                          title="Exile estates (reclaims loyalty. Cost: 200 gold)"
                        >
                          Exile
                        </button>
                      </div>
                    </div>
                  );
                })}

                {vassals.length === 0 && (
                  <div className="text-center font-serif text-sm italic text-stone-light/40 py-8">
                    No active vassals. Complete the New Game Wizard to start!
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
