import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Scroll, Sparkles, Send, Skull, ShieldCheck, AlertCircle, RefreshCw, BarChart2, Coins } from 'lucide-react';

// ==========================================
// 1. DIPLOMACY MODAL (Treaty, Crown alignment)
// ==========================================
export function DiplomacyModal() {
  const { characters, resources } = useGameStore();
  const [selectedRulerId, setSelectedRulerId] = useState<string>('foreign_1');

  const foreignRulers = Object.values(characters || {}).filter(c => c.id.startsWith('foreign_'));
  const selectedRuler = characters?.[selectedRulerId] || foreignRulers[0];

  const handleDiplomaticAction = (actionType: 'GIFT' | 'INSULT' | 'ALLIANCE') => {
    if (!selectedRuler) return;
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'DIPLOMAT_MISSION',
          payload: {
            charId: selectedRuler.id,
            actionType: actionType,
          },
        },
      })
    );
    alert(`Diplomatic delegation dispatched!`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Grand Sovereign Chancery</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Sovereign pacts, covenants & declarations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sovereigns selection */}
        <div className="border border-stone bg-ink-lighter p-3 rounded-xl max-h-[400px] overflow-y-auto">
          <span className="text-[10px] text-stone uppercase tracking-wider block mb-2 font-bold font-mono">Affiliated Realms</span>
          <div className="space-y-2">
            {foreignRulers.map((r) => {
              const op = r.opinion?.['player'] ?? -30;
              const isSelected = selectedRuler?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRulerId(r.id)}
                  className={`w-full text-left p-2.5 border rounded-xl transition-all ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-serif block text-parchment font-bold text-xs truncate">{r.firstName} {r.lastName}</span>
                    <span className="text-[9px] text-stone-light font-sans">{r.title?.name || 'Vassal Duke'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] mt-1 text-mono">
                    <span className="text-stone-light">Opinion:</span>
                    <span className={op >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{op >= 0 ? `+${op}` : op}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Alignment Profile */}
        <div className="md:col-span-2 border border-stone bg-ink-lighter p-5 rounded-xl flex flex-col justify-between">
          {selectedRuler ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-stone/15 pb-4">
                <div className="w-12 h-12 rounded-lg bg-panel border border-stone/30 flex items-center justify-center text-2.5xl font-serif">
                  👑
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-parchment">{selectedRuler.firstName} {selectedRuler.lastName}</h3>
                  <p className="text-[10px] text-accent font-mono uppercase tracking-widest leading-none mt-1">{selectedRuler.title?.name || 'Sovereign'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-stone-light">
                <div className="bg-ink p-3 rounded-lg border border-stone/10">
                  <span className="text-[9px] text-stone uppercase font-mono block mb-1">State Demographics</span>
                  <div>Culture: <b className="text-parchment capitalize">{selectedRuler.culture || 'Frankish'}</b></div>
                  <div>Religion: <b className="text-parchment capitalize">{selectedRuler.religion || 'Catholic'}</b></div>
                </div>

                <div className="bg-ink p-3 rounded-lg border border-stone/10">
                  <span className="text-[9px] text-stone uppercase font-mono block mb-1">Attitude Profile</span>
                  <div>Ambition: <b className="text-accent uppercase font-mono">{selectedRuler.ambition || 'POWER'}</b></div>
                  <div>Opinion Index: <b className="text-emerald-300 font-mono">{selectedRuler.opinion?.['player'] ?? 0} points</b></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <button
                  disabled={(resources?.gold || 0) < 250}
                  onClick={() => handleDiplomaticAction('GIFT')}
                  className="py-2 px-2.5 border border-gold/40 hover:bg-gold hover:text-ink text-gold font-bold uppercase text-[9.5px] rounded-lg transition-all cursor-pointer text-center"
                >
                  Send Gift (-250 G)
                </button>
                <button
                  onClick={() => handleDiplomaticAction('INSULT')}
                  className="py-2 px-2.5 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-400 font-bold uppercase text-[9.5px] rounded-lg transition-all cursor-pointer text-center"
                >
                  Denounce Court
                </button>
                <button
                  disabled={(resources?.prestige || 0) < 40}
                  onClick={() => handleDiplomaticAction('ALLIANCE')}
                  className="py-2 px-2.5 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white text-emerald-400 font-bold uppercase text-[9.5px] rounded-lg transition-all cursor-pointer text-center"
                >
                  Form Alliance (-40 P)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 italic font-serif text-stone-light">
              We have not discovered any neighboring sovereign boundaries yet. Send spies to chart maps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. SPY MISSION MODAL (Covert Operations)
// ==========================================
export function SpyMissionModal() {
  const { resources } = useGameStore();
  const [selectedMission, setSelectedMission] = useState<'REBEL' | 'TREASURY' | 'ASSASSIN'>('REBEL');
  const gold = resources?.gold ?? 0;

  const missionConfigs = {
    REBEL: {
      name: 'Sow Peasant Dissatisfactions',
      desc: 'Sow treason pamphlets in tavern cellars. Elevates rebellion and uprising chance in border holds.',
      risk: '20% Risk of Infiltration Detection',
      reward: '+35% Border unrest levels',
      cost: 100,
    },
    TREASURY: {
      name: 'Infiltrate Crown Vaults',
      desc: 'Bribe cellar keepers and forge cargo lists. Snatch coin reserves back to our royal vaults.',
      risk: '50% Medium Capture Risk',
      reward: 'Directly steal +200-400 Gold bars',
      cost: 150,
    },
    ASSASSIN: {
      name: 'Assassinate Faction Spokesman',
      desc: 'Sponsor night dagger contracts. Decapitate local ringleaders to secure direct crown power.',
      risk: '85% Extreme Lethality Risk',
      reward: 'Banish hostile political advisors',
      cost: 350,
    },
  };

  const handleLaunchSpies = () => {
    const config = missionConfigs[selectedMission];
    if (gold < config.cost) return;

    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: {
            text: `Authorized covert operations command: ${config.name}. Agent dispatch reported progress.`,
            type: 'URGENT',
          },
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'SPEND_GOLD', payload: { amount: config.cost } },
      })
    );
    alert(`Covert mission dispatched! Agents are operating in darkness.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-black text-rose-400">Master of Whispers: Spy Cabinet</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Sponsor covert infiltration and daggers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missions Segmented lists */}
        <div className="space-y-3">
          <span className="text-[10px] text-stone uppercase tracking-widest block font-bold font-mono">Covert Dossiers</span>
          {(['REBEL', 'TREASURY', 'ASSASSIN'] as const).map((mKey) => (
            <button
              key={mKey}
              onClick={() => setSelectedMission(mKey)}
              className={`w-full text-left p-4 border rounded-xl transition-all flex items-center justify-between ${
                selectedMission === mKey ? 'border-amber-500 bg-amber-500/5' : 'border-stone/20 bg-ink hover:border-stone-light'
              }`}
            >
              <div>
                <h4 className="font-serif text-sm font-bold text-parchment">{missionConfigs[mKey].name}</h4>
                <span className="text-[10px] text-stone-light font-mono block mt-0.5">Operational Cost: {missionConfigs[mKey].cost} G</span>
              </div>
              <span className="text-red-400 text-[10px] uppercase font-mono font-bold">Launch Spy</span>
            </button>
          ))}
        </div>

        {/* Selected operative console */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="border-b border-stone/15 pb-3 flex justify-between items-start">
              <div>
                <span className="text-3xl">👥</span>
                <h3 className="font-serif text-md font-bold text-parchment mt-2">{missionConfigs[selectedMission].name}</h3>
              </div>
              <span className="text-[8px] bg-red-950/30 text-red-400 border border-red-900 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">CLANDESTINE</span>
            </div>

            <p className="text-xs text-stone-light leading-relaxed">
              {missionConfigs[selectedMission].desc}
            </p>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span className="text-stone-light">Commissions Cost</span>
                <span className="text-gold font-bold">🪙 {missionConfigs[selectedMission].cost} Gold</span>
              </div>
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span className="text-stone-light">Calculation Risk Value</span>
                <span className="text-rose-400 font-bold">{missionConfigs[selectedMission].risk}</span>
              </div>
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span className="text-stone-light">Potential Bounty Output</span>
                <span className="text-emerald-400 font-bold">{missionConfigs[selectedMission].reward}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLaunchSpies}
            disabled={gold < missionConfigs[selectedMission].cost}
            className={`w-full mt-6 py-2.5 uppercase tracking-wider text-[11px] font-sans font-extrabold rounded-lg cursor-pointer transition-all ${
              gold >= missionConfigs[selectedMission].cost
                ? 'bg-red-900 border border-red-500/80 hover:bg-red-800 text-white shadow-md'
                : 'bg-ink-light border-stone/15 text-stone-light/35 cursor-not-allowed'
            }`}
          >
            {gold >= missionConfigs[selectedMission].cost ? 'Approve Black-Banners Dispatch' : 'Vault reserves restricted'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. TRADE MODAL (Commodity Barter)
// ==========================================
export function TradeModal() {
  const { resources, playerCharacter } = useGameStore() as any;
  const [tariffLevel, setTariffLevel] = useState<'MINIMAL' | 'STANDARD' | 'MERCANTILE'>('STANDARD');

  const gold = resources?.gold ?? 0;
  const food = resources?.food ?? 0;
  const wood = resources?.wood ?? 0;
  const stone = resources?.stone ?? 0;
  const dynastyName = playerCharacter ? playerCharacter.lastName : 'Valedor';

  const handleExchange = (type: 'BUY_WOOD' | 'BUY_STONE' | 'SELL_FOOD') => {
    let actionGold = 0;
    let actionItem = '';

    if (type === 'BUY_WOOD') {
      if (gold < 100) return;
      actionGold = 100;
      actionItem = 'DISPATCH_MANUAL_CONVOY'; // Custom logic inside worker
    } else if (type === 'BUY_STONE') {
      if (gold < 150) return;
      actionGold = 150;
    } else {
      if (food < 200) return;
    }

    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: {
            text: `Mercantile exchange finalized: Completed barter trading for essential materials in ${dynastyName} market square.`,
            type: 'NORMAL',
          },
        },
      })
    );

    alert(`Barter transaction successfully completed! Resource stock adjusted.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Mercantile Custom House</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Commodity bartering, routes & harbor tariff charts</p>
      </div>

      {/* Stockpile Overview */}
      <div className="border border-stone bg-ink-lighter p-4 rounded-xl shadow-xs">
        <span className="text-[10px] text-stone font-mono block mb-2 uppercase font-bold">{dynastyName} Granaries & Storehouses</span>
        <div className="grid grid-cols-4 gap-3 text-center py-1 font-mono text-xs">
          <div className="bg-ink p-2 rounded-lg border border-stone/10">
            <div className="text-gold font-bold">🪙 Gold</div>
            <div>{gold}</div>
          </div>
          <div className="bg-ink p-2 rounded-lg border border-stone/10">
            <div className="text-amber-500 font-bold">🌾 Food</div>
            <div>{food}</div>
          </div>
          <div className="bg-ink p-2 rounded-lg border border-stone/10">
            <div className="text-yellow-600 font-bold">🪵 Wood</div>
            <div>{wood}</div>
          </div>
          <div className="bg-ink p-2 rounded-lg border border-stone/10">
            <div className="text-stone-light font-bold">🪨 Stone</div>
            <div>{stone}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Commodity exchange panel */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-accent uppercase tracking-widest border-b border-stone/15 pb-1 flex items-center gap-1.5 font-bold mb-3">
              <RefreshCw className="w-4 h-4" /> Custom Bartering
            </h3>

            <div className="space-y-3">
              {/* Buy Wood */}
              <div className="bg-ink border border-stone/10 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-parchment font-serif">Purchase Construction Lumber</span>
                  <p className="text-[10px] text-stone-light mt-0.5">Acquire +300 logs of cedar wood.</p>
                </div>
                <button
                  disabled={gold < 100}
                  onClick={() => handleExchange('BUY_WOOD')}
                  className={`py-1.5 px-3 uppercase text-[9.5px] font-sans font-extrabold rounded-md cursor-pointer ${
                    gold >= 100 ? 'bg-gold text-ink font-semibold' : 'bg-ink-dense text-stone-light/30 border border-stone/10'
                  }`}
                >
                  Buy (-100 G)
                </button>
              </div>

              {/* Buy Stone */}
              <div className="bg-ink border border-stone/10 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-parchment font-serif">Purchase Fortress Quarry Stone</span>
                  <p className="text-[10px] text-stone-light mt-0.5">Acquire +150 solid cut limestone slabs.</p>
                </div>
                <button
                  disabled={gold < 150}
                  onClick={() => handleExchange('BUY_STONE')}
                  className={`py-1.5 px-3 uppercase text-[9.5px] font-sans font-extrabold rounded-md cursor-pointer ${
                    gold >= 150 ? 'bg-gold text-ink font-semibold' : 'bg-ink-dense text-stone-light/30 border border-stone/10'
                  }`}
                >
                  Buy (-150 G)
                </button>
              </div>

              {/* Sell Food */}
              <div className="bg-ink border border-stone/10 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-parchment font-serif">Unload Surplus Grain Stock</span>
                  <p className="text-[10px] text-stone-light mt-0.5">Sell excess harvests in urban squares.</p>
                </div>
                <button
                  disabled={food < 200}
                  onClick={() => handleExchange('SELL_FOOD')}
                  className={`py-1.5 px-3 uppercase text-[9.5px] font-sans font-extrabold rounded-md cursor-pointer ${
                    food >= 200 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-ink-dense text-stone-light/30 border border-stone/10'
                  }`}
                >
                  Sell (+100 G)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trade routes & harbor tariff settings */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-parchment uppercase tracking-widest border-b border-stone/15 pb-1 flex items-center gap-1.5 font-bold mb-3">
              <BarChart2 className="w-4 h-4" /> Harbor Tariff Matrix
            </h3>

            <p className="text-xs text-stone-light leading-relaxed mb-4">
              Levy tariffs on foreign mercantile vessels entering your sovereign port. Higher tariffs enrich court gold yields, but severely alienate Merchant Estate loyalty lines.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-panel p-1 border border-stone rounded-xl">
              {(['MINIMAL', 'STANDARD', 'MERCANTILE'] as const).map((tKey) => (
                <button
                  key={tKey}
                  onClick={() => setTariffLevel(tKey)}
                  className={`py-1.5 text-[9.5px] font-sans tracking-wide uppercase font-bold rounded-lg cursor-pointer ${
                    tariffLevel === tKey ? 'bg-ink text-accent border border-stone/20' : 'text-stone-light hover:text-parchment'
                  }`}
                >
                  {tKey}
                </button>
              ))}
            </div>

            <div className="bg-ink border border-stone/15 p-3 rounded-xl mt-4 text-xs leading-relaxed text-stone-light">
              <span className="font-mono text-[10px] text-accent font-bold block mb-1">State Tariffs effects:</span>
              {tariffLevel === 'MINIMAL' && 'Taxes: -15.0 G/day | Merchant Estate Loyalty: +25% | Regional Food output: +10%'}
              {tariffLevel === 'STANDARD' && 'Balance level. No active trait modifiers or trade estate unrest.'}
              {tariffLevel === 'MERCANTILE' && 'Taxes: +35.0 G/day | Merchant Estate Loyalty: -20% | Local Goods prices: +15%'}
            </div>
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('simulation_action', {
                  detail: { type: 'ADD_CHRONICLE', payload: { text: `Adjusted global harbor tariffs to ${tariffLevel}. Merchant houses acknowledged.`, type: 'NORMAL' } },
                })
              );
            }}
            className="w-full mt-4 py-2 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
          >
            Validate Tariff Decrees
          </button>
        </div>
      </div>
    </div>
  );
}
