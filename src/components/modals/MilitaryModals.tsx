import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { UnitType } from '../../data/unit-types';
import { Shield, Sword, Eye, Sliders, Skull, Coins, AlertCircle, Sparkles, Navigation, Bomb } from 'lucide-react';

// ==========================================
// 1. ARMY MODAL (Assemble custom military divisions)
// ==========================================
export function ArmyModal() {
  const { armies, resources } = useGameStore();
  const [selectedArmyId, setSelectedArmyId] = useState<string>('army_1');
  const [recruitCount, setRecruitCount] = useState<number>(100);

  const playerArmies = Object.values(armies || {}).filter(a => a.realmId === 'realm_1');
  const selectedArmy = armies[selectedArmyId] || playerArmies[0];

  const handleRecruit = (type: string) => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'RECRUIT_REGIMENT',
          payload: {
            armyId: selectedArmyId,
            type: type,
            count: recruitCount,
          },
        },
      })
    );
  };

  const recruitableOptions = [
    { id: UnitType.PROFESSIONAL_INFANTRY, name: 'Armored Footmen', desc: 'Serrated shields & poleaxes.', costGold: 1.5, costManpower: 1 },
    { id: UnitType.LONGBOWMEN, name: 'Yeoman Archers', desc: 'Precision bows from local pine forests.', costGold: 1.0, costManpower: 0.8 },
    { id: UnitType.HEAVY_CAVALRY_KNIGHTS, name: 'Valerian Knights', desc: 'Fierce elite cavelier charge.', costGold: 3.0, costManpower: 2 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">War Council: Division Assembly</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Customize regiments & rosters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Army List */}
        <div className="border border-stone bg-ink-lighter p-3 rounded-xl max-h-[380px] overflow-y-auto">
          <span className="text-[10px] text-stone uppercase tracking-wider block mb-2 font-bold font-mono">My Standing Banners</span>
          <div className="space-y-2">
            {playerArmies.map((army) => {
              const isSelected = selectedArmyId === army.id;
              const totalMen = army.units?.reduce((acc, u) => acc + u.count, 0) || 0;
              return (
                <button
                  key={army.id}
                  onClick={() => setSelectedArmyId(army.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-serif text-xs font-bold text-parchment truncate">{army.name}</span>
                    <span className="text-[8px] border border-stone-light/35 px-1 rounded bg-panel font-mono">{army.stance}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-light">
                    <span>{totalMen} Soldiers</span>
                    <span className="text-emerald-400 font-mono">{army.morale}% Morale</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Army details & Custom recruitment hall */}
        <div className="md:col-span-2 space-y-4">
          {selectedArmy ? (
            <div className="border border-stone bg-ink-lighter p-5 rounded-2xl space-y-4">
              <div className="border-b border-stone/15 pb-3">
                <h3 className="text-lg font-serif font-bold text-parchment">{selectedArmy.name}</h3>
                <p className="text-[10px] text-stone-light font-mono">Location Coordinates: Q: {selectedArmy.location.q}, R: {selectedArmy.location.r} | Discipline: {selectedArmy.discipline}%</p>
              </div>

              {/* Roster list */}
              <h4 className="text-[10px] uppercase font-mono text-stone-light tracking-wider font-bold">Active Elements</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {selectedArmy.units && selectedArmy.units.length > 0 ? (
                  selectedArmy.units.map((unit) => (
                    <div key={unit.id} className="bg-ink border border-stone/15 p-2 rounded-lg flex justify-between items-center text-xs">
                      <span className="font-bold text-parchment capitalize">{unit.type.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="font-mono text-stone-light">{unit.count} Men | Strength: {unit.strength}%</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-stone-light italic block text-center py-4 bg-ink/30 rounded-lg">No tactical elements assigned yet. Compose squads below.</span>
                )}
              </div>

              {/* Slider for recruiting */}
              <div className="bg-ink border border-stone/15 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-stone-light uppercase">Draft Cadre Size:</span>
                  <span className="text-accent font-bold">{recruitCount} Men</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={recruitCount}
                  onChange={(e) => setRecruitCount(parseInt(e.target.value))}
                  className="w-full accent-accent bg-ink-light h-1.5 rounded-full outline-none"
                />

                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {recruitableOptions.map((opt) => {
                    const totalGoldCost = Math.floor(recruitCount * opt.costGold);
                    const totalManpowerCost = Math.floor(recruitCount * opt.costManpower);
                    const isAffordable = (resources?.gold || 0) >= totalGoldCost && (resources?.manpower || 0) >= totalManpowerCost;

                    return (
                      <div key={opt.id} className="border border-stone/20 bg-ink p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-stone/45">
                        <div className="truncate pr-4">
                          <span className="font-serif block font-semibold text-parchment">{opt.name}</span>
                          <span className="text-[10px] text-stone-light truncate block">{opt.desc}</span>
                        </div>
                        <button
                          disabled={!isAffordable}
                          onClick={() => handleRecruit(opt.id)}
                          className={`py-1.5 px-3 uppercase text-[9px] font-sans font-bold rounded-lg transition-all cursor-pointer ${
                            isAffordable
                              ? 'bg-accent text-ink border border-accent hover:bg-accent/90 shadow-md font-extrabold'
                              : 'bg-ink-dense text-stone-light/35 border border-stone/10 cursor-not-allowed'
                          }`}
                        >
                          Draft (-{totalGoldCost} G, -{totalManpowerCost} m)
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-stone-light font-serif italic">
              Select or deploy a division block on the map to customise elements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. BATTLE MODAL (Tactical Combat Overview)
// ==========================================
export function BattleModal() {
  const [activeTab, setActiveTab] = useState<'MAP' | 'LOGS'>('MAP');

  const mockEncounter = {
    attacker: 'House Valerian (Grand Host)',
    defender: 'Barony of Westland (Rebel League)',
    attackerMorale: 84,
    defenderMorale: 42,
    attackerCasualties: 850,
    defenderCasualties: 1940,
    weather: 'SEVERE_FOG',
    terrain: 'FORESTED_HILLS',
    phase: 'VELOCITY_FLANK_CHARGE',
    logs: [
      { tick: 1, text: 'Vanguard skirmish initiated. Longbow arrow fire harasses defenders.' },
      { tick: 2, text: 'Severe fog sets in! Archer effectiveness cut by 40%.' },
      { tick: 3, text: 'Valerian Knights execute heavy charge on defensive lines.' },
      { tick: 4, text: 'Barony center shieldwall begins to buckle under pressure.' },
      { tick: 5, text: 'Tactical flank retreat launched by Westland host.' },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Active Tactical Battle Board</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Real-time shock combat telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Forces comparison */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-serif text-sm text-stone-light uppercase tracking-wider border-b border-stone/15 pb-1 flex items-center gap-1.5 font-bold">
              <Skull className="w-4 h-4 text-rose-500 animate-pulse" /> Live Belligerents status
            </h3>

            {/* Attacker side */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-parchment">{mockEncounter.attacker}</span>
                <span className="font-mono text-emerald-400 font-bold">{mockEncounter.attackerMorale}% Morale</span>
              </div>
              <div className="h-2 w-full bg-ink rounded-full overflow-hidden border border-stone/10">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mockEncounter.attackerMorale}%` }} />
              </div>
              <div className="text-[10px] text-stone-light flex justify-between">
                <span>Inflicted Casualties: <b className="text-rose-400 font-mono font-bold">+{mockEncounter.defenderCasualties}</b></span>
                <span>My Casualties: <b className="text-parchment font-mono">{mockEncounter.attackerCasualties}</b></span>
              </div>
            </div>

            {/* Defender side */}
            <div className="space-y-1 text-xs pt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-red-300">{mockEncounter.defender}</span>
                <span className="font-mono text-rose-400 font-bold">{mockEncounter.defenderMorale}% Morale</span>
              </div>
              <div className="h-2 w-full bg-ink rounded-full overflow-hidden border border-stone/10">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${mockEncounter.defenderMorale}%` }} />
              </div>
              <div className="text-[10px] text-stone-light flex justify-between">
                <span>Inflicted Casualties: <b className="text-emerald-400 font-mono font-bold">+{mockEncounter.attackerCasualties}</b></span>
                <span>Enemy Casualties: <b className="text-parchment font-mono">{mockEncounter.defenderCasualties}</b></span>
              </div>
            </div>
          </div>

          <div className="bg-ink border border-stone/15 p-3 rounded-lg text-[11px] leading-relaxed text-stone-light mt-4">
            <span className="text-gold font-bold block mb-1">🌤️ Tactical Terrain & Climate Factor:</span>
            Severe Fog reduces arrow trajectory accuracy. Forested Hills grant defensive units a +20% Shield defence modifier.
          </div>
        </div>

        {/* Tactical board log entries */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex bg-panel p-1 rounded-lg border border-stone mb-4">
              <button
                onClick={() => setActiveTab('MAP')}
                className={`flex-1 py-1 text-[10px] tracking-wider uppercase font-bold rounded transition-all cursor-pointer ${
                  activeTab === 'MAP' ? 'bg-ink border border-stone/20 text-accent' : 'text-stone-light'
                }`}
              >
                Shock formation
              </button>
              <button
                onClick={() => setActiveTab('LOGS')}
                className={`flex-1 py-1 text-[10px] tracking-wider uppercase font-bold rounded transition-all cursor-pointer ${
                  activeTab === 'LOGS' ? 'bg-ink border border-stone/20 text-accent' : 'text-stone-light'
                }`}
              >
                Battle Chronicles
              </button>
            </div>

            {activeTab === 'MAP' ? (
              <div className="py-8 text-center space-y-4">
                {/* Visualizer card representing grid formations */}
                <div className="flex justify-center items-center gap-6">
                  <div className="w-16 h-16 rounded-xl border border-emerald-500/30 bg-emerald-900/5 flex flex-col items-center justify-center">
                    <span className="text-xl">🛡️🛡️</span>
                    <span className="text-[9px] font-mono mt-1 text-emerald-400 block font-semibold">VALERIAN</span>
                  </div>
                  <span className="text-rose-500 font-bold text-lg animate-pulse">⚔️</span>
                  <div className="w-16 h-16 rounded-xl border border-rose-500/30 bg-rose-900/5 flex flex-col items-center justify-center">
                    <span className="text-xl">🛡️</span>
                    <span className="text-[9px] font-mono mt-1 text-rose-400 block font-semibold">REBEL</span>
                  </div>
                </div>
                <div className="text-xs text-stone-light leading-relaxed max-w-xs mx-auto italic">
                  "Valerian Knights are engaging the flank. Morale cascade points forecast a conclusive victory in less than 2 ticks."
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                {mockEncounter.logs.map((log) => (
                  <div key={log.tick} className="border-l-2 border-accent pl-3 text-xs leading-relaxed text-stone-light">
                    <span className="font-mono text-[10px] text-accent font-bold block">Tick {log.tick} — Encounter Action:</span>
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('simulation_action', {
                  detail: { type: 'ADD_CHRONICLE', payload: { text: 'Ordered the General Staff to reinforce active combat fronts.', type: 'NORMAL' } },
                })
              );
            }}
            className="w-full mt-4 py-2 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            <Sword className="w-4 h-4 shadow-sm" /> Send Reinforcement Orders
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. RAZE MODAL (Sack, Salt, Raze elements)
// ==========================================
export function RazeModal() {
  const { provinces, selectedProvinceId } = useGameStore();
  const prov = selectedProvinceId ? provinces[selectedProvinceId] : null;

  const handleCommand = (commandType: 'SACK' | 'SALT' | 'BURN') => {
    if (!prov) return;

    if (commandType === 'BURN') {
      window.dispatchEvent(
        new CustomEvent('simulation_action', {
          detail: { type: 'BURN_FOREST', payload: { provinceId: prov.id } },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('simulation_action', {
          detail: {
            type: 'ADD_CHRONICLE',
            payload: {
              text: `Enacted brutal scorched-earth orders to ${commandType} the province of ${prov.name}. All fields ruined.`,
              type: 'CRITICAL',
            },
          },
        })
      );
    }
    alert(`Brutal Scorched-Earth command enacted: ${commandType}!`);
  };

  if (!prov) {
    return (
      <div className="text-center py-10 font-serif italic text-stone-light">
        <AlertCircle className="w-10 h-10 mx-auto opacity-35 mb-2" />
        Please select a province on the primary tactical map before opening scorched-earth options.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-black text-rose-400">Scorched-Earth Command Panel</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Assault, sack, and demolish captured structures</p>
      </div>

      <div className="border border-red-500/30 bg-red-950/20 p-4.5 rounded-xl flex gap-3.5 items-start">
        <Skull className="w-6 h-6 text-red-500 shrink-0 mt-0.5 animate-bounce" />
        <div className="text-xs text-red-300 leading-relaxed">
          <strong className="block mb-1 font-serif uppercase tracking-wider text-rose-300">Warlord Decree Notice:</strong>
          These commands represent irreversible military atrocities. Sacking provinces permanently depletes passive tax bases, burns precious timber supplies, and triggers profound local peasant hostility.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillage */}
        <div className="border border-stone bg-ink-lighter p-4.5 rounded-xl flex flex-col justify-between hover:border-stone-light transition-all">
          <div className="space-y-3">
            <span className="text-2xl">💰</span>
            <h3 className="font-serif text-sm font-bold text-parchment">Pillage Granaries</h3>
            <p className="text-[11px] text-stone-light leading-relaxed">
              Assault civilian silos. Strip local peasants of seed crops to feed campaigning armies (+600 Food reserve, drops loyalty by 35 points immediately).
            </p>
          </div>
          <button
            onClick={() => handleCommand('SACK')}
            className="w-full mt-5 py-2 uppercase py-1.5 bg-red-900/10 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all text-[9.5px] font-sans font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            Enact Pillage
          </button>
        </div>

        {/* Salt */}
        <div className="border border-stone bg-ink-lighter p-4.5 rounded-xl flex flex-col justify-between hover:border-stone-light transition-all">
          <div className="space-y-3">
            <span className="text-2xl">🧂</span>
            <h3 className="font-serif text-sm font-bold text-parchment">Salt Farmlands</h3>
            <p className="text-[11px] text-stone-light leading-relaxed">
              Pour lime and ocean salt into active plain soil, triggering absolute agricultural collapse. Renders region uncultivable forever, preventing any future crops.
            </p>
          </div>
          <button
            onClick={() => handleCommand('SALT')}
            className="w-full mt-5 py-2 uppercase py-1.5 bg-red-900/10 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all text-[9.5px] font-sans font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            Enact Salt Fields
          </button>
        </div>

        {/* Burn */}
        <div className="border border-stone bg-ink-lighter p-4.5 rounded-xl flex flex-col justify-between hover:border-stone-light transition-all">
          <div className="space-y-3">
            <span className="text-2xl">🔥</span>
            <h3 className="font-serif text-sm font-bold text-parchment">Burn Castle Curtains</h3>
            <p className="text-[11px] text-stone-light leading-relaxed">
              Sack fortifications completely. Raze local barracks, keep walls, and gates to stone dust, removing defensive bonuses for future sieges.
            </p>
          </div>
          <button
            onClick={() => handleCommand('BURN')}
            className="w-full mt-5 py-2 uppercase py-1.5 bg-red-900/10 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all text-[9.5px] font-sans font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            Enact Fire Sack
          </button>
        </div>
      </div>
    </div>
  );
}
