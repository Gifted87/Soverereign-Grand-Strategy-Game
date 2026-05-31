import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { clsx } from "clsx";
import { DemographicsPieChart } from './charts';
import { TERRAIN_DEFINITIONS } from '../core/models/Terrain';
import { BUILDING_TYPES, BUILDING_TYPES_LIST } from '../data/building-types';
import { 
  Flame, 
  Trees, 
  Mountain, 
  Coins, 
  Footprints, 
  Shield, 
  Wheat, 
  Compass, 
  Droplet, 
  Hammer, 
  Check, 
  Activity,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';

export function LeftSidebar() {
  const { provinces, selectedProvinceId, selectProvince, spendGold, resources, aureliaSimState } = useGameStore() as any;
  const [sidebarTab, setSidebarTab] = useState<'OVERVIEW' | 'BUILDINGS'>('OVERVIEW');
  const [buildingCategoryFilter, setBuildingCategoryFilter] = useState<'ECONOMIC' | 'MILITARY' | 'ADMINISTRATIVE' | 'RELIGIOUS' | 'INFRASTRUCTURE'>('ECONOMIC');

  const prov = selectedProvinceId ? provinces[selectedProvinceId] : null;

  if (prov) {
    // fallback empty sim state
    const sim = aureliaSimState || {
      sarnBank: { playerDeposit: 0, activeLoan: 0, investedVentureAmount: 0, daysToVentureResolve: 0, accumulatedInterests: 0 },
      valedorToll: { tariffLevel: 'STANDARD', smugglingActivity: 12, tollGoldCollected: 0 },
      highMarches: { beaconLevel: 2, patrolsActive: false, mountainDefenseBonus: 25 },
      saltSteppes: { hordeFriendship: 55, tradeAgreement: false, convoysEscorted: 0 },
      cathedralBasin: { endowmentsCount: 0, pilgrimTaxRate: 'MEDIUM', dailyHolyTithe: 0 },
      entities: [],
      settlementHierarchies: {}
    };

    const hierarchies = sim.settlementHierarchies || {};

    const demData = prov.population ? [
      { name: 'Serfs', value: prov.population.serfs },
      { name: 'Merchants', value: prov.population.merchants },
      { name: 'Clergy', value: prov.population.clergy },
      { name: 'Nobles', value: prov.population.nobles },
    ] : [];

    const tDef = TERRAIN_DEFINITIONS[prov.terrain] || TERRAIN_DEFINITIONS['PLAINS'];

    // Action Handlers
    const handlePaveRoad = () => {
      if (prov.roadQuality >= 100) return;
      if (spendGold && spendGold(200)) {
        window.dispatchEvent(new CustomEvent('simulation_action', {
          detail: { type: 'CONSTRUCT_ROAD', payload: { provinceId: prov.id } }
        }));
      }
    };

    const handleClearForest = () => {
      if (spendGold && spendGold(150)) {
        window.dispatchEvent(new CustomEvent('simulation_action', {
          detail: { type: 'CLEAR_LAND', payload: { provinceId: prov.id } }
        }));
      }
    };

    const handleBurnForest = () => {
      window.dispatchEvent(new CustomEvent('simulation_action', {
        detail: { type: 'BURN_FOREST', payload: { provinceId: prov.id } }
      }));
    };

    const handleBuildBridge = () => {
      if (spendGold && spendGold(300)) {
        window.dispatchEvent(new CustomEvent('simulation_action', {
          detail: { type: 'BUILD_BRIDGE_CROSSING', payload: { provinceId: prov.id } }
        }));
      }
    };

    return (
      <aside className="w-85 bg-ink-light border-r border-stone flex flex-col shrink-0 relative z-10 select-none overflow-hidden" id="left-sidebar-panel">
        {/* Header following the sidebar header / topbar-badge style */}
        <div className="p-4 border-b border-stone bg-ink flex flex-col" id="province-header-section">
          <div className="flex items-center justify-between mb-1" id="province-title-row">
             <h2 className="text-lg font-serif text-accent tracking-wide font-semibold">{prov.name}</h2>
             <button id="close-province-btn" onClick={() => selectProvince(null)} className="w-6 h-6 rounded-md bg-panel border border-stone text-stone-light hover:text-parchment flex items-center justify-center font-mono text-sm leading-none transition-all cursor-pointer">&times;</button>
          </div>
          <div className="text-[10px] text-stone-light uppercase font-sans tracking-widest flex justify-between" id="province-subtitle-row">
             <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block animate-pulse"></span>
                {tDef.name}
             </span>
             <span className="bg-panel border border-stone/30 px-1.5 py-0.5 rounded-[4px] text-[8px] font-mono leading-none">{prov.biome}</span>
          </div>
        </div>

        {/* Tab Headers styled as tabs-pill / tab-pill from Claude UI kit */}
        <div className="flex border-b border-stone/20 bg-ink p-2 justify-center shrink-0" id="province-tab-bar">
          <div className="tabs-pill bg-panel border border-stone/40 p-1 rounded-lg flex gap-1">
            <button
              id="tab-btn-overview"
              onClick={() => setSidebarTab('OVERVIEW')}
              className={clsx(
                "px-4 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-[6px] transition-all cursor-pointer font-medium",
                sidebarTab === 'OVERVIEW'
                  ? "bg-ink text-parchment border border-stone/25 shadow-sm font-semibold"
                  : "text-stone-light hover:text-parchment border border-transparent"
              )}
            >
              Overview
            </button>
            <button
              id="tab-btn-buildings"
              onClick={() => setSidebarTab('BUILDINGS')}
              className={clsx(
                "px-4 py-1.5 text-[11px] font-sans uppercase tracking-wider rounded-[6px] transition-all cursor-pointer font-medium",
                sidebarTab === 'BUILDINGS'
                  ? "bg-ink text-parchment border border-stone/25 shadow-sm font-semibold"
                  : "text-stone-light hover:text-parchment border border-transparent"
              )}
            >
              Buildings {(prov.constructionQueue?.length ?? 0) > 0 ? `(${prov.constructionQueue?.length})` : ''}
            </button>
          </div>
        </div>

        {sidebarTab === 'OVERVIEW' ? (
          /* Scrollable Contents (OVERVIEW) */
          <div className="p-4 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-stone/30" id="overview-tab-content">
            
            {/* SOVEREIGNTY BANNER */}
            {prov.stability !== undefined && (
              <div className="border border-gold/45 bg-[#120d06]/75 p-3 rounded-md space-y-2 relative overflow-hidden" id="sovereignty-banner">
                {/* Visual background gradient glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-3">
                  <div className="text-3xl filter drop-shadow bg-amber-950/20 border border-gold/20 p-2 rounded-md font-sans select-none leading-none">
                    {prov.emblem || '👑'}
                  </div>
                  <div>
                    <div className="text-[9px] text-gold uppercase tracking-widest leading-none font-bold">
                      {prov.type?.replace('_', ' ') || 'SOVEREIGN REALM'}
                    </div>
                    <div className="text-sm font-serif font-bold text-parchment mt-1">
                      {prov.name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-stone/20 pt-2 font-mono">
                  <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm">
                    <div className="text-[8px] text-stone uppercase tracking-widest leading-none mb-1">Stability</div>
                    <div className="text-parchment font-bold" style={{ color: `hsl(${prov.stability}, 80%, 65%)` }}>
                      {prov.stability}%
                    </div>
                  </div>
                  <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm">
                    <div className="text-[8px] text-stone uppercase tracking-widest leading-none mb-1">Coffer</div>
                    <div className="text-emerald-400 font-bold">
                      {prov.treasury}🪙
                    </div>
                  </div>
                  <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm">
                    <div className="text-[8px] text-stone uppercase tracking-widest leading-none mb-1">Levies</div>
                    <div className="text-accent font-bold">
                      {prov.militaryPower?.toLocaleString()} ⚔️
                    </div>
                  </div>
                </div>

                {prov.vassalCount !== undefined && prov.vassalCount > 0 && (
                  <div className="text-[9px] text-stone-light flex justify-between items-center bg-ink-dense px-2 py-1 rounded border border-stone/10">
                    <span>Feudal Tributary Sworn Vassals:</span>
                    <span className="text-gold font-bold">{prov.vassalCount} Realms</span>
                  </div>
                )}

                {prov.allianceId && (
                  <div className="text-[9px] text-emerald-400 flex justify-between items-center bg-emerald-950/20 px-2 py-1 rounded border border-emerald-800/20">
                    <span>🌐 Active Defensive Alliance Pact</span>
                    <span className="font-bold uppercase text-[8px] tracking-wider animate-pulse">Protected</span>
                  </div>
                )}
              </div>
            )}

            {/* TERRAIN ANALYSIS MODULE */}
            <div className="border border-stone/20 bg-ink p-3 rounded-md shadow-sm" id="terrain-analysis-box">
              <div className="text-[10px] text-gold uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-stone/30 pb-1">
                <Compass className="h-3 w-3" />
                <span>Terrain Spectra Info</span>
              </div>
              <p className="text-xs text-stone-light leading-relaxed mb-3 italic">
                "{tDef.description}"
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm flex items-center gap-1.5">
                  <Footprints className="h-3.5 w-3.5 text-stone-light" />
                  <div>
                    <div className="text-[9px] text-stone uppercase tracking-widest">Speed cost</div>
                    <span className="text-parchment font-semibold">{tDef.movementCost} MP</span>
                    <span className="text-stone font-sans text-[8px] pl-1">({tDef.speedAdjustment})</span>
                  </div>
                </div>

                <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-600/80" />
                  <div>
                    <div className="text-[9px] text-stone uppercase tracking-widest">Def Bonus</div>
                    <span className="text-gold font-semibold">+{tDef.defenseBonus}%</span>
                  </div>
                </div>

                <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm flex items-center gap-1.5">
                  <Wheat className="h-3.5 w-3.5 text-yellow-600/80" />
                  <div>
                    <div className="text-[9px] text-stone uppercase tracking-widest">Crop Yield</div>
                    <span className="text-parchment font-semibold">x{tDef.agricultureModifier.toFixed(1)}</span>
                  </div>
                </div>

                <div className="bg-ink-dense p-1.5 border border-stone/10 rounded-sm flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-600/80" />
                  <div>
                    <div className="text-[9px] text-stone uppercase tracking-widest">Cavalry Pot</div>
                    <span className="text-parchment font-semibold">x{tDef.cavalryModifier.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Special rules list */}
              <div className="space-y-1 mt-2.5">
                <div className="text-[9px] text-stone uppercase tracking-wider mb-1 font-mono">Special Rules & Conditions:</div>
                {tDef.specialRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-1 text-[10px] text-stone-light">
                    <span className="text-gold mt-0.5">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
                {prov.currentWeather && prov.currentWeather !== 'CLEAR' && (
                  <div className="flex items-start gap-1 text-[10px] text-amber-500 font-mono mt-1.5 border-t border-stone/10 pt-1.5">
                    <span className="text-amber-500">•</span>
                    <span>Active Weather Alert: {prov.currentWeather} adds movement penalties!</span>
                  </div>
                )}
              </div>
            </div>

            {/* ROAD QUALITY & SYSTEM INTEGRATION */}
            <div className="border border-stone/20 bg-ink p-3 rounded-md" id="road-quality-box">
              <div className="text-[10px] text-gold uppercase tracking-widest mb-1.5 flex justify-between items-center border-b border-stone/30 pb-1">
                <span className="flex items-center gap-1">
                  <Hammer className="h-3 w-3" />
                  <span>Road Transport Quality</span>
                </span>
                <span className="text-parchment font-mono">{prov.roadQuality || 0}%</span>
              </div>
              
              <div className="h-2 w-full bg-ink-dense border border-stone/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gold transition-all duration-300" style={{ width: `${prov.roadQuality || 0}%` }} />
              </div>
              
              <p className="text-[10px] text-stone leading-relaxed mb-3">
                Better road network structures offset deep movement speed penalties of hills, swamps, forests, and frozen lands.
              </p>

              <button 
                id="construct-highway-btn"
                onClick={handlePaveRoad}
                disabled={prov.roadQuality >= 100 || (resources?.gold || 0) < 200}
                className={clsx(
                  "w-full py-1.5 px-3 rounded-sm border uppercase text-[10px] font-sans tracking-wider font-bold transition-colors cursor-pointer",
                  prov.roadQuality >= 100 
                    ? "border-stone/20 text-stone bg-ink-dense cursor-not-allowed"
                    : (resources?.gold || 0) < 200
                      ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                      : "border-gold/50 bg-stone/20 hover:bg-gold hover:text-ink text-gold"
                )}
              >
                {prov.roadQuality >= 100 ? "Max Highway Quality" : "Construct Royal Highway (-200 Gold)"}
              </button>
            </div>

            {/* GEOLOGICAL & LAND ENGINEERING */}
            <div className="border border-stone/20 bg-ink p-3 rounded-md space-y-2" id="land-engineering-box">
              <div className="text-[10px] text-gold uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-stone/30 pb-1">
                <Activity className="h-3 w-3 animate-pulse" />
                <span>Engineering Operations</span>
              </div>

              {/* If Forest or Deep Forest */}
              {(prov.terrain === 'DEEP_FOREST' || prov.terrain === 'FOREST') && (
                <div className="space-y-2">
                  <p className="text-[10px] text-stone leading-relaxed">
                    Clear dense timberland permanently to prepare superb plains fields for maximum grain output.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      id="manual-clearcut-btn"
                      onClick={handleClearForest}
                      disabled={(resources?.gold || 0) < 150}
                      className={clsx(
                        "w-full py-1.5 px-2 rounded-sm border text-[10px] uppercase font-bold tracking-wider cursor-pointer",
                        (resources?.gold || 0) < 150
                          ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                          : "border-gold/50 bg-stone/10 hover:bg-gold/80 hover:text-ink text-gold"
                      )}
                    >
                      🚜 Manual Clearcut (-150 Gold)
                    </button>
                    <button
                      id="set-wildfire-btn"
                      onClick={handleBurnForest}
                      className="w-full py-1.5 px-2 rounded-sm border border-red-500/50 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                    >
                      🔥 Set Wildfire Spark! (Free, -15 Loyalty)
                    </button>
                  </div>
                </div>
              )}

              {/* If River Crossing */}
              {prov.terrain === 'RIVER_VALLEY' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-stone leading-relaxed">
                    Rivers block transport without bridges, especially during severe spring flooding. Spanning it overcomes seasonal flow obstacles forever.
                  </p>
                  <button
                    id="build-stone-bridge-btn"
                    onClick={handleBuildBridge}
                    disabled={prov.roadQuality >= 100 || (resources?.gold || 0) < 300}
                    className={clsx(
                      "w-full py-2 px-3 rounded-sm border uppercase text-[10px] tracking-wider font-bold cursor-pointer",
                      prov.roadQuality >= 100
                        ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-400 cursor-not-allowed"
                        : (resources?.gold || 0) < 300
                          ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                          : "border-gold bg-stone/35 hover:bg-gold hover:text-ink text-gold"
                    )}
                  >
                    {prov.roadQuality >= 100 ? "🌉 Stone Bridge Erected" : "🌉 Construct Stone Bridge (-300 Gold)"}
                  </button>
                </div>
              )}

              {/* If Plains */}
              {prov.terrain === 'PLAINS' && (
                <p className="text-[10px] text-emerald-400 italic font-mono flex items-center gap-1 justify-center py-2">
                  <Check className="h-3.5 w-3.5" /> High agriculture plains require no clearings.
                </p>
              )}

              {/* If Mountains */}
              {prov.terrain === 'MOUNTAINS' && (
                <p className="text-[10px] text-amber-500 italic font-mono flex items-center gap-1 justify-center py-2">
                  ⛏️ Active Mines harvesting Gold & Iron daily.
                </p>
              )}
            </div>

            {/* ACTIVE WILDFIRES INDICATOR */}
            {prov.hasWildfire && (
              <div className="border border-red-500/50 bg-red-950/25 p-3 rounded-md animate-pulse" id="wildfire-alarm-box">
                <div className="text-[10px] text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1 border-b border-red-500/20 pb-1 font-bold">
                  <Flame className="h-4 w-4 text-red-500 animate-bounce" />
                  <span>ACTIVE WILDFIRE OUTBREAK!</span>
                </div>
                <p className="text-[10px] text-red-200 leading-relaxed font-mono">
                  Raging blazes are engulfing structures and timberland! Spreads rapidly to drier neighbor regions. Restores to flat plains after {Math.max(1, 3 - (prov.wildfireDuration || 0))} days of intense burning.
                </p>
              </div>
            )}

            {/* ACTIVE DISEASE CONTROL MODULE */}
            {prov.disease && (
              <div className="border border-purple-500/45 bg-purple-950/20 p-3 rounded-md space-y-2" id="disease-control-box">
                <div className="text-[10px] text-purple-400 uppercase tracking-widest mb-1 flex justify-between items-center border-b border-purple-500/20 pb-1 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block animate-ping"></span>
                    <span>Scourge: {prov.disease.diseaseId === 'PLAGUE' ? 'The Black Death' : prov.disease.diseaseId.replace('_', ' ')}</span>
                  </span>
                  <span className="text-purple-300 font-mono font-semibold">{prov.disease.infectedCount.toLocaleString()} Sick</span>
                </div>
                
                <p className="text-[9px] text-stone-light leading-relaxed">
                  Spreads rapidly. Triggers daily mortality & up to 90% commerce tax collapse.
                </p>

                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                  <button
                    id="quarantine-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { type: 'QUARANTINE_PROVINCE', payload: { provinceId: prov.id } }
                      }));
                    }}
                    className={clsx(
                      "py-1 px-0.5 rounded-sm border uppercase font-mono font-semibold transition-all cursor-pointer text-center",
                      prov.quarantined 
                        ? "border-amber-500 bg-amber-950/50 text-amber-500 hover:bg-amber-500 hover:text-ink-dense"
                        : "border-stone/20 bg-ink-dense text-stone-light hover:border-gold hover:text-gold"
                    )}
                    title="Lock down travel checkpoints. Stops boundary spread but halts merchant taxes."
                  >
                    🚧 {prov.quarantined ? 'Sealed' : 'Quarantine'}
                  </button>

                  <button
                    id="burn-infected-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { type: 'BURN_INFECTED_AREAS', payload: { provinceId: prov.id } }
                      }));
                    }}
                    className="py-1 px-0.5 rounded-sm border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-white uppercase font-mono font-semibold transition-all cursor-pointer text-center"
                    title="Draconian burning of infected quarters. Halves infections but reduces peasant workforce and loyalty."
                  >
                    🔥 Burn Qtr
                  </button>

                  <button
                    id="call-physician-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { type: 'CALL_PHYSICIAN', payload: { provinceId: prov.id } }
                      }));
                    }}
                    disabled={(resources?.gold || 0) < 150}
                    className={clsx(
                      "py-1 px-0.5 rounded-sm border uppercase font-mono font-semibold transition-all cursor-pointer text-center",
                      (resources?.gold || 0) < 150
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-emerald-500/30 bg-emerald-950/25 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                    )}
                    title="Hire royal physician specialists. Reduces disease severity by 30 immediately (-150 Gold)."
                  >
                    🩺 Doctor (-150g)
                  </button>

                  <button
                    id="pray-for-heaven-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { type: 'PRAY_FOR_HEAVEN', payload: { provinceId: prov.id } }
                      }));
                    }}
                    className="py-1 px-0.5 rounded-sm border border-purple-500/30 bg-purple-950/25 text-purple-400 hover:bg-purple-500 hover:text-white uppercase font-mono font-semibold transition-all cursor-pointer text-center"
                    title="Solemn prayers of repentance. Restores loyalty, but congregation doubles spread."
                  >
                    🙏 Lay Pray
                  </button>
                </div>
              </div>
            )}

            {/* DEMOGRAPHICS CONTAINER */}
            <div id="demographics-box">
              <div className="flex justify-between text-xs text-stone-light uppercase tracking-widest mb-1.5 border-b border-stone/30 pb-1">
                <span>Population</span>
                <span className="text-parchment font-semibold">{prov.population?.total || 0}</span>
              </div>
              {demData.length > 0 && <DemographicsPieChart data={demData} />}
              <div className="flex h-3 w-full bg-ink mt-2 rounded-sm overflow-hidden">
                 <div className="h-full bg-amber-700/80" style={{ width: '85%' }} title="Serfs" />
                 <div className="h-full bg-stone" style={{ width: '10%' }} title="Merchants" />
                 <div className="h-full bg-purple-900" style={{ width: '3%' }} title="Clergy" />
                 <div className="h-full bg-gold/80" style={{ width: '2%' }} title="Nobles" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-stone/10 py-3" id="loyalty-mood-summary">
               <div>
                  <div className="text-[10px] text-stone-light uppercase tracking-widest mb-1">Loyalty</div>
                  <div className="text-lg font-serif font-semibold" style={{ color: `hsl(${prov.loyalty}, 70%, 50%)` }}>{prov.loyalty}%</div>
               </div>
               <div>
                  <div className="text-[10px] text-stone-light uppercase tracking-widest mb-1">Mood</div>
                  <div className="text-sm font-sans font-semibold text-parchment uppercase mt-1">{prov.population?.mood || 'Content'}</div>
               </div>
            </div>

            {/* VALEDOR TOLL CONTROL (CROWN REGIONAL INTERACTION TARGET) */}
            {prov.id === 'prov_1' && sim.valedorToll && (
              <div className="border border-gold/45 bg-[#120d06]/75 p-3 rounded-md space-y-2" id="valedor-toll-box">
                <div className="text-[10px] text-gold uppercase tracking-widest mb-1.5 flex items-center justify-between border-b border-stone/30 pb-1">
                  <span>🌊 Valedor Crown River tolls</span>
                  <span className="text-[8px] bg-stone/20 font-mono px-1 rounded text-gold">ACTIVE</span>
                </div>
                <p className="text-[9.5px] text-stone-light leading-relaxed">
                  The River Crown allows Valedor to collect tolls on merchant ships passing from upriver. Low tariffs boost public state loyalty; extortionate levels fill the coffer but encourage massive merchant smuggling.
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {['LOW', 'STANDARD', 'EXTORTIONATE'].map((lvl) => (
                    <button
                      id={`tariff-${lvl}-btn`}
                      key={lvl}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('simulation_action', {
                          detail: { 
                            type: 'AURELIA_SIM_ACTION', 
                            payload: { type: 'SET_TARIFF_LEVEL', payload: { level: lvl } }
                          }
                        }));
                      }}
                      className={clsx(
                        "py-1 text-[9px] uppercase font-mono font-bold transition-all cursor-pointer text-center rounded-sm border",
                        sim.valedorToll.tariffLevel === lvl
                          ? "border-gold bg-gold/20 text-gold"
                          : "border-stone/20 bg-ink-dense text-stone hover:text-white"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono pt-1 text-stone-light">
                  <span>Smuggling Activity:</span>
                  <span className={clsx(sim.valedorToll.smugglingActivity > 40 ? "text-red-400" : "text-emerald-400")}>
                    {sim.valedorToll.smugglingActivity}%
                  </span>
                </div>
              </div>
            )}

            {/* GRAND SARN MERCHANT BANK ACTIONS (CROWN REGIONAL INTERACTION TARGET) */}
            {prov.id === 'prov_35' && sim.sarnBank && (
              <div className="border border-emerald-500/40 bg-[#08120d]/50 p-3 rounded-md space-y-2.5" id="sarn-bank-box">
                <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center justify-between border-b border-emerald-900/40 pb-1 font-bold">
                  <span>⛵ Sarn Merchant Bank Guilds</span>
                  <span className="text-[8.5px] text-emerald-300 font-mono">RESERVES</span>
                </div>
                <p className="text-[9.5px] text-stone-light leading-relaxed">
                  Deposit royal gold at Sarn’s compound rate of 4% per 15 days, borrow up to 1000 gold pieces, or invest in dynamic maritime merchant venturer expeditions.
                </p>
                
                <div className="bg-ink-dense p-2 rounded border border-stone/10 space-y-1.5 text-[9px] font-mono">
                  <div className="flex justify-between text-stone-light">
                    <span>Gold Deposits:</span>
                    <span className="text-emerald-400 font-bold">{sim.sarnBank.playerDeposit}🪙</span>
                  </div>
                  <div className="flex justify-between text-stone-light">
                    <span>Outstanding Loans:</span>
                    <span className={clsx(sim.sarnBank.activeLoan > 0 ? "text-red-400 font-bold animate-pulse" : "text-stone-light")}>
                      {sim.sarnBank.activeLoan}🪙
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <button
                    id="bank-deposit-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { 
                          type: 'AURELIA_SIM_ACTION', 
                          payload: { type: 'DEPOSIT_GOLD', payload: { amount: 250 } }
                        }
                      }));
                    }}
                    disabled={(resources?.gold || 0) < 250}
                    className={clsx(
                      "py-1 cursor-pointer rounded-sm border transition-colors uppercase font-semibold text-center",
                      (resources?.gold || 0) < 250
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-emerald-800 bg-emerald-950/20 hover:bg-emerald-500 hover:text-black text-emerald-400"
                    )}
                  >
                    Deposit 250g
                  </button>
                  <button
                    id="bank-withdraw-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { 
                          type: 'AURELIA_SIM_ACTION', 
                          payload: { type: 'WITHDRAW_GOLD', payload: { amount: 250 } }
                        }
                      }));
                    }}
                    disabled={sim.sarnBank.playerDeposit < 250}
                    className={clsx(
                      "py-1 cursor-pointer rounded-sm border transition-colors uppercase font-semibold text-center",
                      sim.sarnBank.playerDeposit < 250
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-emerald-800 bg-emerald-950/20 hover:bg-emerald-500 hover:text-black text-emerald-400"
                    )}
                  >
                    Withdraw 250g
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <button
                    id="bank-loan-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { 
                          type: 'AURELIA_SIM_ACTION', 
                          payload: { type: 'TAKE_LOAN', payload: {} }
                        }
                      }));
                    }}
                    disabled={sim.sarnBank.activeLoan > 0}
                    className={clsx(
                      "py-1 cursor-pointer rounded-sm border transition-colors uppercase font-semibold text-center",
                      sim.sarnBank.activeLoan > 0
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-red-905 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400"
                    )}
                  >
                    Contract Loan (1k)
                  </button>
                  <button
                    id="bank-repay-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { 
                          type: 'AURELIA_SIM_ACTION', 
                          payload: { type: 'REPAY_LOAN', payload: {} }
                        }
                      }));
                    }}
                    disabled={sim.sarnBank.activeLoan === 0 || (resources?.gold || 0) < sim.sarnBank.activeLoan}
                    className={clsx(
                      "py-1 cursor-pointer rounded-sm border transition-colors uppercase font-semibold text-center",
                      sim.sarnBank.activeLoan === 0 || (resources?.gold || 0) < sim.sarnBank.activeLoan
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-red-905 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400"
                    )}
                  >
                    Repay Loan ({sim.sarnBank.activeLoan}g)
                  </button>
                </div>

                <div className="border-t border-emerald-900/20 pt-2 text-[9px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-stone-light font-sans font-medium">Spice Fleet Venture:</span>
                    <span className="text-[9.5px] font-bold text-emerald-400 font-mono">
                      {sim.sarnBank.investedVentureAmount > 0 
                        ? `⛵ Sailing (${sim.sarnBank.daysToVentureResolve}d)`
                        : 'Unfunded'
                      }
                    </span>
                  </div>
                  <button
                    id="bank-launch-venture-btn"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('simulation_action', {
                        detail: { 
                          type: 'AURELIA_SIM_ACTION', 
                          payload: { type: 'LAUNCH_VENTURE', payload: {} }
                        }
                      }));
                    }}
                    disabled={sim.sarnBank.investedVentureAmount > 0 || (resources?.gold || 0) < 500}
                    className={clsx(
                      "w-full py-1 cursor-pointer rounded-sm border uppercase text-center font-bold text-[9px]",
                      sim.sarnBank.investedVentureAmount > 0 || (resources?.gold || 0) < 500
                        ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                        : "border-amber-700 bg-amber-950/20 hover:bg-amber-500 hover:text-black text-amber-500"
                    )}
                  >
                    Launch Spice Expedition (-500g)
                  </button>
                </div>
              </div>
            )}

            {/* HIGH MARCHES BEACON SIGNAL REBUILD ACTIONS */}
            {(prov.id === 'prov_10' || prov.id === 'prov_13') && sim.highMarches && (
              <div className="border border-amber-500/40 bg-amber-950/10 p-3 rounded-md space-y-2" id="beacons-upgrade-box">
                <div className="text-[10px] text-amber-400 uppercase tracking-widest flex items-center justify-between border-b border-stone/30 pb-1">
                  <span>🏔️ High Marches Beacon defense</span>
                  <span className="text-[8px] font-mono px-1 bg-amber-900 text-amber-300">LEVEL {sim.highMarches.beaconLevel}/5</span>
                </div>
                <p className="text-[9.5px] text-stone-light leading-relaxed">
                  Signal fire beacons alert the valleys instantly if mountain reivers raid. Upgrading stone keep beacontowers expands permanent local mountain defense attributes.
                </p>
                <button
                  id="beacons-upgrade-btn"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('simulation_action', {
                      detail: { 
                        type: 'AURELIA_SIM_ACTION', 
                        payload: { type: 'REINFORCE_BEACONS', payload: {} }
                      }
                    }));
                  }}
                  disabled={sim.highMarches.beaconLevel >= 5 || (resources?.gold || 0) < 250 || (resources?.stone || 0) < 200}
                  className={clsx(
                    "w-full py-1.5 cursor-pointer rounded-sm border uppercase text-[9.5px] text-center font-bold",
                    sim.highMarches.beaconLevel >= 5 || (resources?.gold || 0) < 250 || (resources?.stone || 0) < 200
                      ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                      : "border-amber-500 bg-stone/20 hover:bg-amber-500 hover:text-ink text-amber-400"
                  )}
                >
                  {sim.highMarches.beaconLevel >= 5 
                    ? "Max Beacon Level Rebuilt" 
                    : "Reinforce Mountain Beacons (-250g | -200 Stone)"
                  }
                </button>
                <div className="text-[9px] font-mono text-stone pl-0.5">
                  Current Shield Mountain Defense Bonus: +{sim.highMarches.mountainDefenseBonus}%
                </div>
              </div>
            )}

            {/* DYNAMIC SETTLEMENT HIERARCHY PIPELINE */}
            <div className="border-t border-stone/20 pt-4" id="settlement-pipeline-box">
              <div className="text-[10px] text-gold uppercase tracking-widest mb-3 flex items-center gap-1 border-b border-stone/30 pb-1">
                <Shield className="h-3 w-3" />
                <span>Regional Settlement Pipeline</span>
              </div>
              <p className="text-[9.5px] text-stone-light leading-relaxed mb-3">
                Feudal resource pipeline flow: Hamlets harvest natural grain & materials, villages mill resources, towns trade merchandise, and fortifications gather tax gold.
              </p>
              
              <div className="space-y-2.5">
                {(hierarchies[prov.id] || []).map((node: any) => (
                  <div key={node.id} className="bg-ink-dense border border-stone/10 p-2 rounded flex justify-between items-center text-[10px]" id={`set-node-${node.id}`}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-parchment">
                        <span>{node.type === 'FORTIFIED_CITY' ? '🏰' : (node.type === 'MARKET_TOWN' ? '⚖️' : (node.type === 'VILLAGE' ? '🌾' : '🏡'))}</span>
                        <span>{node.name}</span>
                      </div>
                      <div className="text-[8px] text-stone font-mono uppercase tracking-wider mt-0.5">
                        {node.type.replace('_', ' ')} • Pop: {node.population.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gold font-bold font-mono">
                        {node.type === 'HAMLET' ? `+${node.lastYield || Math.floor(node.population * 0.05)} Grain` : (node.type === 'VILLAGE' ? `+${node.lastYield || Math.floor(node.population * 0.03)} Fibre` : `+${node.lastYield || Math.floor(node.population * 0.01)}🪙 Tax`)}
                      </div>
                      <div className="text-[8px] text-stone font-mono">Eff: {node.efficiency}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Scrollable Contents (BUILDINGS) */
          <div className="p-4 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-stone/30" id="buildings-tab-content">
            {/* 1. CONSTRUCTION QUEUE (if any) */}
            {prov.constructionQueue && prov.constructionQueue.length > 0 && (
              <div className="border border-gold/30 bg-gold/5 p-3 rounded-md space-y-3" id="active-constructions-box">
                <h3 className="text-xs text-gold uppercase tracking-widest font-bold border-b border-gold/20 pb-1 flex justify-between items-center">
                  <span>Under Construction</span>
                  <span className="text-[9px] px-1 text-gold bg-gold/10 font-mono font-normal">Active</span>
                </h3>
                <div className="space-y-4">
                  {prov.constructionQueue.map((item, idx) => {
                    const bType = BUILDING_TYPES[item.typeId];
                    if (!bType) return null;
                    const progress = ((item.totalDays - item.daysLeft) / item.totalDays) * 100;
                    return (
                      <div key={idx} className="space-y-1 text-xs" id={`queued-${item.typeId}`}>
                        <div className="flex justify-between font-serif font-bold text-parchment">
                          <span>{bType.name}</span>
                          <span className="font-mono text-[10px] text-stone-light">{item.daysLeft} days left</span>
                        </div>
                        <div className="h-1.5 w-full bg-ink border border-stone/20 rounded-full overflow-hidden">
                          <div className="h-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-light">
                          <span>{bType.category}</span>
                          <button
                            id={`cancel-btn-${item.typeId}`}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('simulation_action', {
                                detail: { type: 'CANCEL_CONSTRUCTION', payload: { provinceId: prov.id, index: idx } }
                              }));
                            }}
                            className="text-red-400 hover:text-red-300 uppercase tracking-wider font-bold underline transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. COMPLETED BUILDINGS */}
            <div className="space-y-2" id="completed-buildings-box">
              <h3 className="text-xs text-stone-light uppercase tracking-widest font-bold border-b border-stone/20 pb-1">
                Completed Buildings ({prov.buildings?.length ?? 0})
              </h3>
              {prov.buildings && prov.buildings.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {prov.buildings.map((b) => {
                    const bType = BUILDING_TYPES[b.typeId];
                    if (!bType) return null;
                    return (
                      <div key={b.id || b.typeId} className="border border-stone/20 bg-ink p-2.5 rounded-md flex flex-col gap-1 hover:border-stone/45 transition-all" id={`completed-${b.typeId}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-serif font-bold text-sm text-parchment">{bType.name}</span>
                          <span className="text-[9px] font-mono text-stone bg-ink border border-stone/30 px-1 rounded-sm uppercase tracking-wider">
                            {bType.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-light italic font-sans">{bType.description}</p>
                        <div className="text-[10px] text-gold font-mono mt-1 border-t border-stone/10 pt-1">
                          ⚡ {bType.effectsDescription}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-light italic text-center py-6">
                  No civic structures established yet. Order constructions below to cultivate the land.
                </p>
              )}
            </div>

            {/* 3. CONSTRUCTION LIST */}
            <div className="space-y-3" id="fund-projects-box">
              <h3 className="text-xs text-stone-light uppercase tracking-widest font-bold border-b border-stone/20 pb-1">
                Fund Civic Projects
              </h3>

              {/* Category Segmented Controls - Styled as tabs-pill inline with UI Kit */}
              <div className="flex flex-wrap gap-1 bg-panel border border-stone p-1 rounded-lg">
                {(['ECONOMIC', 'MILITARY', 'ADMINISTRATIVE', 'RELIGIOUS', 'INFRASTRUCTURE'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setBuildingCategoryFilter(cat)}
                    className={clsx(
                      "px-2 py-1 text-[9px] font-sans uppercase tracking-[0.05em] rounded-md transition-all cursor-pointer font-medium",
                      buildingCategoryFilter === cat
                        ? "bg-ink-light text-parchment border border-stone/20 shadow-sm font-semibold"
                        : "text-stone-light hover:text-parchment border border-transparent"
                    )}
                  >
                    {cat.slice(0, 5)}
                  </button>
                ))}
              </div>

              {/* List of Building Types in selected category */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {BUILDING_TYPES_LIST.filter(b => b.category === buildingCategoryFilter).map(bType => {
                  const isAlreadyBuilt = prov.buildings?.some(b => b.typeId === bType.id);
                  const isAlreadyQueued = prov.constructionQueue?.some(q => q.typeId === bType.id);
                  
                  // Check Requirements
                  let reqFailedReason = '';
                  if (bType.requirements) {
                    if (bType.requirements.coastal && prov.terrain !== 'COAST') {
                      reqFailedReason = 'Coastal terrain required';
                    }
                    if (bType.requirements.river && prov.terrain !== 'RIVER_VALLEY' && !prov.name.toLowerCase().includes('river')) {
                      reqFailedReason = 'River access required';
                    }
                    if (bType.requirements.terrain && !bType.requirements.terrain.includes(prov.terrain)) {
                      reqFailedReason = `Requires: ${bType.requirements.terrain.join(', ')}`;
                    }
                  }

                  // Check Cost
                  const canAfford = resources &&
                    (resources.gold ?? 0) >= bType.cost.gold &&
                    (resources.wood ?? 2100) >= bType.cost.wood &&
                    (resources.stone ?? 400) >= bType.cost.stone &&
                    (resources.manpower ?? 1200) >= bType.cost.manpower;

                  return (
                    <div
                      key={bType.id}
                      className={clsx(
                        "p-2.5 border rounded-md flex flex-col gap-1.5 transition-all text-xs",
                        isAlreadyBuilt || isAlreadyQueued
                          ? "border-stone/15 bg-ink-dense/40 opacity-55"
                          : reqFailedReason
                            ? "border-rose-950/20 bg-rose-950/5 opacity-65"
                            : "border-stone/20 bg-ink hover:border-stone/40"
                      )}
                      id={`project-item-${bType.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-serif font-semibold text-parchment text-[13px]">
                          {bType.name}
                        </span>
                        <span className="text-[10px] font-mono text-stone-light">
                          ⌛ {bType.buildTimeDays}d
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-stone leading-relaxed">
                        {bType.description}
                      </p>

                      <div className="text-[10px] text-emerald-400 font-sans italic">
                        ★ {bType.effectsDescription}
                      </div>

                      {/* Cost and Actions */}
                      <div className="flex justify-between items-center border-t border-stone/10 pt-2 mt-1 shrink-0">
                        {/* Cost list */}
                        <div className="flex gap-2 text-[9px] font-mono text-stone-light">
                          {bType.cost.gold > 0 && <span className={clsx((resources?.gold ?? 0) >= bType.cost.gold ? 'text-gold' : 'text-red-400')}>{bType.cost.gold}g</span>}
                          {bType.cost.wood > 0 && <span className={clsx((resources?.wood ?? 0) >= bType.cost.wood ? 'text-parchment' : 'text-red-400')}>{bType.cost.wood}w</span>}
                          {bType.cost.stone > 0 && <span className={clsx((resources?.stone ?? 0) >= bType.cost.stone ? 'text-stone-light' : 'text-red-400')}>{bType.cost.stone}s</span>}
                          {bType.cost.manpower > 0 && <span className={clsx((resources?.manpower ?? 0) >= bType.cost.manpower ? 'text-sky' : 'text-red-400')}>{bType.cost.manpower}m</span>}
                        </div>

                        {/* Button */}
                        {isAlreadyBuilt ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-light border border-stone/30 px-1.5 py-0.5 rounded-sm bg-stone/5">
                            Constructed
                          </span>
                        ) : isAlreadyQueued ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-gold border border-gold/30 px-1.5 py-0.5 rounded-sm bg-gold/5 animate-pulse">
                            Queued
                          </span>
                        ) : reqFailedReason ? (
                          <span className="text-[9px] font-semibold text-red-400 uppercase tracking-widest bg-red-950/20 px-1.5 py-0.5 rounded-sm border border-red-900/40">
                            {reqFailedReason}
                          </span>
                        ) : (
                          <button
                            id={`commission-btn-${bType.id}`}
                            disabled={!canAfford}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('simulation_action', {
                                detail: { type: 'CONSTRUCT_BUILDING', payload: { provinceId: prov.id, typeId: bType.id } }
                              }));
                            }}
                            className={clsx(
                              "px-2.5 py-1 rounded-sm text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer",
                              canAfford
                                ? "bg-gold text-ink border border-gold hover:bg-gold-light"
                                : "border border-stone/20 bg-ink-dense text-stone-light cursor-not-allowed"
                            )}
                          >
                            Commission
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-stone/30 bg-ink-dense grid grid-cols-2 gap-2 mt-auto" id="province-footer-actions">
           <button 
             id="raise-levy-btn"
             onClick={() => {
               if (prov.population && prov.population.serfs > 600) {
                 window.dispatchEvent(new CustomEvent('simulation_action', {
                   detail: { type: 'RAISE_LEVY', payload: { provinceId: prov.id } }
                 }));
               }
             }}
             disabled={!prov.population || prov.population.serfs <= 600}
             className={clsx(
               "py-2 px-1 border uppercase text-[10px] tracking-widest transition-colors font-sans cursor-pointer font-bold rounded-sm text-center",
               !prov.population || prov.population.serfs <= 600
                 ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                 : "border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment"
             )}
             title="Draft 500 Spearmen serf soldiers. Drafting in planting seasons (Spring/Autumn) triggers deep peasant anger"
           >
              Raise Levy
           </button>
           <button 
             id="pave-roads-footer-btn"
             onClick={handlePaveRoad}
             disabled={prov.roadQuality >= 100 || (resources?.gold || 0) < 200}
             className={clsx(
               "py-2 px-1 border uppercase text-[10px] tracking-widest transition-colors font-sans cursor-pointer font-bold rounded-sm text-center",
               prov.roadQuality >= 100 || (resources?.gold || 0) < 200
                 ? "border-stone/10 bg-ink-dense text-stone cursor-not-allowed"
                 : "border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment"
             )}
             title="Pave regional network highway to speed up transport and battle logistics (-200 Gold)"
           >
              Roads (+30)
           </button>
        </div>
      </aside>
    );
  }

  // RealmSummaryPanel
  return (
    <aside className="w-80 bg-ink-light border-r border-stone/30 flex flex-col shrink-0" id="realm-summary-panel">
      <div className="p-4 border-b border-stone/30 text-center" id="realm-summary-header">
         <h2 className="text-xl font-serif text-parchment tracking-wide">The Grand Duchy</h2>
         <div className="text-[10px] text-stone-light uppercase font-sans tracking-widest">Realm Overview</div>
      </div>
      <div className="p-4 flex-1 space-y-6" id="realm-summary-stats">
         <div className="flex justify-between items-end border-b border-stone/30 pb-2">
            <span className="text-xs uppercase text-stone-light tracking-widest">Total Pop</span>
            <span className="text-lg font-serif text-parchment">
               {Object.values(provinces).reduce((acc: number, p: any) => acc + (p.population?.total || 0), 0).toLocaleString()}
            </span>
         </div>
         <div className="flex justify-between items-end border-b border-stone/30 pb-2">
            <span className="text-xs uppercase text-stone-light tracking-widest">Provinces</span>
            <span className="text-lg font-serif text-parchment">
               {Object.values(provinces).length}
            </span>
         </div>
         <div className="flex justify-between items-end border-b border-stone/30 pb-2">
            <span className="text-xs uppercase text-stone-light tracking-widest">Army Str</span>
            <span className="text-lg font-serif text-stone-light text-opacity-50 italic">
               Mustering
            </span>
         </div>
         <div className="flex justify-between items-end border-b border-stone/30 pb-2">
            <span className="text-xs uppercase text-stone-light tracking-widest">Treasury Net</span>
            <span className="text-lg font-serif text-gold">
               +12.5 <span className="text-[10px]">/DAY</span>
            </span>
         </div>
      </div>
      <div className="p-4 text-center text-xs text-stone-light italic bg-ink/50 border-t border-stone/30">
          Select a province on the map for details.
      </div>
    </aside>
  );
}
