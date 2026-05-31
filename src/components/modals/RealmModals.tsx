import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BUILDING_TYPES } from '../../data/building-types';
import { Shield, Hammer, AlignJustify, HelpCircle, Landmark, Award, BookOpen, Map, Check, RefreshCw } from 'lucide-react';

// ==========================================
// 1. SETTLEMENT MODAL (Upgrades hamlets to cities)
// ==========================================
export function SettlementModal() {
  const { provinces, selectedProvinceId, resources } = useGameStore();
  const [selectedHoldId, setSelectedHoldId] = useState<string>(selectedProvinceId || 'prov_1');

  const prov = provinces[selectedHoldId] || Object.values(provinces)[0];
  const gold = resources?.gold ?? 0;

  const handleUpgradeFortress = () => {
    if (!prov || gold < 200) return;
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'CONSTRUCT_BUILDING',
          payload: { provinceId: prov.id, typeId: 'KEEP_CONCENTRIC_WALLS' }, // Concrete build!
        },
      })
    );
    alert(`Fortress fortification project commissioned!`);
  };

  const handleConstructMarket = () => {
    if (!prov || gold < 100) return;
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'CONSTRUCT_BUILDING',
          payload: { provinceId: prov.id, typeId: 'MARKETPLACE' }, // Standard build!
        },
      })
    );
    alert(`Civic marketplace construction commissioned!`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Sovereign Fiefdom Manor-House</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Upgrade regional holdings from hamlets to cities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* District list selection */}
        <div className="border border-stone bg-ink-lighter p-3 rounded-xl max-h-[380px] overflow-y-auto">
          <span className="text-[10px] text-stone uppercase tracking-wider block mb-2 font-bold font-mono">My Regional Holdings</span>
          <div className="space-y-2">
            {Object.values(provinces).map((p) => {
              const isSelected = selectedHoldId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedHoldId(p.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected ? 'border-accent bg-accent/5 font-semibold' : 'border-stone/20 bg-ink hover:border-stone-light'
                  }`}
                >
                  <span className="font-serif block text-parchment text-xs">{p.name}</span>
                  <div className="flex justify-between items-center text-[9px] text-stone-light mt-1 font-mono uppercase">
                    <span>{p.terrain}</span>
                    <span className="text-emerald-400">Pop: {p.population?.total || 5000}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Holding console */}
        <div className="md:col-span-2 border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          {prov ? (
            <div className="space-y-4">
              <div className="border-b border-stone/15 pb-3">
                <span className="text-xs text-stone font-mono uppercase tracking-widest block mb-0.5">District holding detail</span>
                <h3 className="text-xl font-serif font-bold text-parchment">{prov.name}</h3>
                <p className="text-[10px] text-stone-light font-mono uppercase">Biome: {prov.biome} | Fortifications Level: {prov.fortificationLevel ?? 1}</p>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 gap-4 text-xs text-stone-light font-mono">
                <div className="bg-ink p-3 rounded-lg border border-stone/10 leading-relaxed">
                  <span className="text-[9px] uppercase font-mono block mb-1 font-bold text-accent">Demographic stats</span>
                  <div>• Peak Loyalty: <b className="text-emerald-400">{prov.loyalty}%</b></div>
                  <div>• Serf Laborers: <b className="text-parchment">{prov.population?.serfs || 0} men</b></div>
                </div>
                <div className="bg-ink p-3 rounded-lg border border-stone/10 leading-relaxed">
                  <span className="text-[9px] uppercase font-mono block mb-1 font-bold text-accent">Logistics stats</span>
                  <div>• Highway Quality: <b className="text-parchment">{prov.roadQuality}%</b></div>
                  <div>• Def Advantage: <b className="text-gold">+{prov.fortificationLevel * 10}% bonus</b></div>
                </div>
              </div>

              {/* Completed improvements */}
              <div>
                <span className="text-[10px] text-stone uppercase tracking-wider block font-bold font-mono mb-2">Established Structures</span>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase text-stone-light">
                  {prov.buildings && prov.buildings.length > 0 ? (
                    prov.buildings.map((b, idx) => (
                      <span key={idx} className="bg-ink border border-neutral-700/60 px-2 py-1 rounded">
                        🏢 {b.typeId.replace(/_/g, ' ')}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-stone-light/40 py-2">No completed masonry projects. Direct resources below.</span>
                  )}
                </div>
              </div>

              {/* Upgrade triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone/15">
                <button
                  disabled={gold < 200}
                  onClick={handleUpgradeFortress}
                  className="py-2.5 px-3 bg-ink hover:bg-stone hover:text-gold border border-stone-light text-parchment rounded-lg transition-all text-[10px] font-sans font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" /> Upgrade Keep Wall (-200 G)
                </button>
                <button
                  disabled={gold < 100}
                  onClick={handleConstructMarket}
                  className="py-2.5 px-3 bg-ink hover:bg-stone hover:text-gold border border-stone-light text-parchment rounded-lg transition-all text-[10px] font-sans font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                >
                  <Hammer className="w-3.5 h-3.5" /> Erect Marketplace (-100 G)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 italic font-serif text-stone-light">Select a hold element.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. LAWS MODAL (Adjust levies, tax brackets)
// ==========================================
export function LawsModal() {
  const [taxLevel, setTaxLevel] = useState<'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'DRACONIAN'>('MODERATE');
  const [draftLevy, setDraftLevy] = useState<'VOLUNTARY' | 'STANDARD' | 'GRAND'>('STANDARD');
  const [crownAuthority, setCrownAuthority] = useState<'VASSAL_CHARTER' | 'HIGH_PREFECTS' | 'ABSOLUTE'>('HIGH_PREFECTS');

  const handleApplyLaws = () => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: {
            text: `Sealed new royal statutes: Taxes set to ${taxLevel}, Army Levies to ${draftLevy}, and authority level to ${crownAuthority}.`,
            type: 'CRITICAL',
          },
        },
      })
    );
    alert(`Royal legislative decrees adjusted! Sovereign statutes are active.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-extrabold text-accent">High Legislative Council</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Sovereign taxation brackets, mobilization drafts & state authority</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-stone bg-ink-lighter p-5 rounded-xl space-y-4">
          {/* Peasant taxes */}
          <div className="space-y-2">
            <span className="text-[10px] text-stone uppercase font-mono block font-bold tracking-widest select-none">Peasant Taxation Brackets</span>
            <div className="grid grid-cols-5 gap-1 bg-panel border p-0.5 rounded-lg border-stone/30">
              {(['NONE', 'LIGHT', 'MODERATE', 'SEVERE', 'DRACONIAN'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setTaxLevel(level)}
                  className={`py-1 text-[8.5px] font-sans font-bold uppercase rounded cursor-pointer ${
                    taxLevel === level ? 'bg-ink text-accent border border-stone/20 shadow-sm' : 'text-stone-light'
                  }`}
                >
                  {level.slice(0, 4)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-light font-mono italic">
              {taxLevel === 'NONE' && 'Taxes: Exempt | Peasant Loyalty change: +4% per day | Treasury: -25 gold/day'}
              {taxLevel === 'LIGHT' && 'Taxes: 12% yield | Peasant Loyalty change: +1.5% per day | Treasury: -10 gold/day'}
              {taxLevel === 'MODERATE' && 'Taxes: Standard 25% yield | Peasant Loyalty change: neutral | Treasury: +0 gold/day'}
              {taxLevel === 'SEVERE' && 'Taxes: High 45% yield | Peasant Loyalty change: -2.3% per day | Treasury: +25 gold/day'}
              {taxLevel === 'DRACONIAN' && 'Taxes: Extreme 75% | Peasant Loyalty change: -5.5% per day | Treasury: +60 gold/day'}
            </p>
          </div>

          {/* Draft conscription */}
          <div className="space-y-2 pt-2 gap-1.5 flex flex-col">
            <span className="text-[10px] text-stone uppercase font-mono block font-bold tracking-widest select-none">Militia Conscription Laws</span>
            <div className="grid grid-cols-3 gap-1.5 bg-panel border p-0.5 rounded-lg border-stone/30">
              {(['VOLUNTARY', 'STANDARD', 'GRAND'] as const).map((levy) => (
                <button
                  key={levy}
                  onClick={() => setDraftLevy(levy)}
                  className={`py-1 text-[9px] font-sans font-bold uppercase rounded cursor-pointer ${
                    draftLevy === levy ? 'bg-ink text-accent border border-stone/20 shadow-sm' : 'text-stone-light'
                  }`}
                >
                  {levy}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-light font-mono italic leading-relaxed">
              {draftLevy === 'VOLUNTARY' && 'Manpower yield: -30% lower | Levy replenishment speed: +25% | Morale: +15%'}
              {draftLevy === 'STANDARD' && 'Standard military draft laws on peasent reserves. Baseline metrics apply.'}
              {draftLevy === 'GRAND' && 'Peasent draft ratios increased by 50%. Limits agricultural farming output by 20%.'}
            </p>
          </div>
        </div>

        {/* Crown authority column */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <span className="text-[10px] text-stone uppercase font-mono block font-bold tracking-widest select-none">Crown Sovereignty Authority</span>
            <div className="grid grid-cols-1 gap-2.5">
              {(['VASSAL_CHARTER', 'HIGH_PREFECTS', 'ABSOLUTE'] as const).map((auth) => (
                <button
                  key={auth}
                  onClick={() => setCrownAuthority(auth)}
                  className={`p-3 text-left border rounded-xl transition-all flex items-center justify-between text-xs ${
                    crownAuthority === auth ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink'
                  }`}
                >
                  <div>
                    <span className="font-serif block font-bold text-parchment">
                      {auth === 'VASSAL_CHARTER' && 'Autonomous Vassal Sovereign Rules'}
                      {auth === 'HIGH_PREFECTS' && 'Delegated High Prefectures'}
                      {auth === 'ABSOLUTE' && 'Absolute Autocratic Autocracy'}
                    </span>
                    <span className="text-[10px] text-stone-light leading-relaxed block mt-0.5">
                      {auth === 'VASSAL_CHARTER' && 'Grants deep estate land charters. Vassal coup chance is 0%.'}
                      {auth === 'HIGH_PREFECTS' && 'Balanced county governance. Daily income +10 gold.'}
                      {auth === 'ABSOLUTE' && 'The sovereign will is total. Taxes yield +35%, but estate unrest increases.'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyLaws}
            className="w-full mt-6 py-2.5 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            <Landmark className="w-4 h-4 shadow-sm" /> Seal Royal Decrees
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. WORLD MAP MODAL (Macro tactical lens)
// ==========================================
export function WorldMapModal() {
  const { provinces } = useGameStore();

  // Group and compute metrics dynamically
  const continents = Object.values(provinces).reduce((acc, p) => {
    const cont = p.continent || 'Aurelia';
    if (!acc[cont]) {
      acc[cont] = {
        name: cont,
        provinceCount: 0,
        totalPopulation: 0,
        majorGoods: new Set<string>()
      };
    }
    acc[cont].provinceCount += 1;
    acc[cont].totalPopulation += p.population?.total || 5000;
    if (p.resources && p.resources[0]) {
      acc[cont].majorGoods.add(p.resources[0].good);
    }
    return acc;
  }, {} as Record<string, { name: string; provinceCount: number; totalPopulation: number; majorGoods: Set<string> }>);

  const continentList = Object.values(continents);

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-black text-accent">Tri-Continental Political Spheres</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Demographics and economic structures of Aurelia, Vareth, and Nythara</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border border-stone bg-ink p-4 rounded-2xl flex flex-col justify-center items-center shadow-inner relative min-h-[250px]">
          {/* Vector Map representation */}
          <svg viewBox="0 0 400 240" className="w-full max-h-[220px]">
            {/* Aurelia projection circle */}
            <circle cx="100" cy="120" r="48" fill="rgba(217, 169, 87, 0.12)" stroke="rgba(217, 169, 87, 0.5)" strokeWidth="1.5" />
            <text x="100" y="115" fill="#D9A957" fontSize="10" fontFamily="serif" textAnchor="middle" fontWeight="bold">Aurelia</text>
            <text x="100" y="130" fill="#a89a81" fontSize="7.5" fontFamily="sans-serif" textAnchor="middle">
              {((continents['Aurelia']?.totalPopulation || 140000000) / 1000000).toFixed(1)}M souls
            </text>

            {/* Vareth projection circle */}
            <circle cx="300" cy="90" r="44" fill="rgba(196, 97, 106, 0.1)" stroke="rgba(196, 97, 106, 0.45)" strokeWidth="1.5" />
            <text x="300" y="85" fill="#C4616A" fontSize="10" fontFamily="serif" textAnchor="middle" fontWeight="bold">Vareth</text>
            <text x="300" y="100" fill="#a89a81" fontSize="7.5" fontFamily="sans-serif" textAnchor="middle">
              {((continents['Vareth']?.totalPopulation || 120000000) / 1000000).toFixed(1)}M souls
            </text>

            {/* Nythara projection circle */}
            <circle cx="200" cy="165" r="50" fill="rgba(109, 184, 138, 0.12)" stroke="rgba(109, 184, 138, 0.5)" strokeWidth="1.5" />
            <text x="200" y="160" fill="#6DB88A" fontSize="10" fontFamily="serif" textAnchor="middle" fontWeight="black">Nythara</text>
            <text x="200" y="175" fill="#a89a81" fontSize="7.5" fontFamily="sans-serif" textAnchor="middle">
              {((continents['Nythara']?.totalPopulation || 160000000) / 1000000).toFixed(1)}M souls
            </text>

            {/* Dynastic intercontinental trade pathways */}
            <path d="M 148 120 Q 200 130 200 115" stroke="rgba(217, 169, 87, 0.2)" fill="none" strokeWidth="1" strokeDasharray="3,3" />
            <path d="M 200 115 Q 250 100 256 90" stroke="rgba(196, 97, 106, 0.2)" fill="none" strokeWidth="1" strokeDasharray="3,3" />
            <path d="M 100 168 Q 150 200 200 165" stroke="rgba(109, 184, 138, 0.2)" fill="none" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
          <span className="text-[8px] font-mono text-stone-light/50 absolute bottom-3 right-3 select-none uppercase font-bold">Intercontinental Connectivity • Trade Routes</span>
        </div>

        {/* Dynamic Continents lists */}
        <div className="border border-stone bg-ink-lighter p-4.5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-parchment font-semibold border-b border-stone/15 pb-1 mb-2.5 flex items-center gap-1.5">
              <Map className="w-4 h-4 text-accent" /> Active Continents
            </h3>

            <div className="space-y-2.5 text-xs text-stone-light max-h-[290px] overflow-y-auto pr-1">
              {continentList.map(cont => {
                let badgeColor = "text-[#D9A957]";
                if (cont.name === 'Vareth') badgeColor = "text-[#C4616A]";
                if (cont.name === 'Nythara') badgeColor = "text-[#6DB88A]";

                return (
                  <div key={cont.name} className="bg-ink p-2.5 rounded border border-stone/10 font-sans leading-normal">
                    <div className="flex justify-between items-center">
                      <strong className={`${badgeColor} block text-[11px] font-serif`}>{cont.name}</strong>
                      <span className="text-[8px] font-mono bg-stone/10 px-1 rounded-sm text-stone-light">
                        {cont.provinceCount} Provinces
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-light/80 mt-1">
                      <div>Major Goods: <span className="text-white uppercase text-[9px]">{Array.from(cont.majorGoods).slice(0, 3).join(', ')}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-stone-light bg-ink/50 border border-stone/15 p-2 rounded leading-relaxed italic mt-4">
            Leverage sea-lanes to deploy intercontinental trade caravans and direct armies across our global records.
          </div>
        </div>
      </div>
    </div>
  );
}
