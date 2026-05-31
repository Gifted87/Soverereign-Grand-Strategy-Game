import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { UnitType } from '../../data/unit-types';
import { Shield, Sword, Users, Coins, HelpCircle } from 'lucide-react';

export function MilitaryPanel() {
  const { armies, resources, playerCharacter } = useGameStore() as any;
  const [selectedArmyId, setSelectedArmyId] = useState<string>('army_1');

  const dynastyName = playerCharacter ? playerCharacter.lastName : 'Valedor';

  const playerArmies = Object.values(armies || {}).filter(a => (a as any).realmId === 'realm_1') as any[];
  const selectedArmy = (armies[selectedArmyId] || playerArmies[0]) as any;

  const handleRecruit = (type: string, count: number) => {
    window.dispatchEvent(new CustomEvent('simulation_action', {
      detail: {
        type: 'RECRUIT_REGIMENT',
        payload: {
          armyId: selectedArmyId,
          type: type,
          count: count
        }
      }
    }));
  };

  const getUnitIcon = (type: string) => {
    if (type.includes('CAVALRY') || type.includes('KNIGHTS')) return '🐴';
    if (type.includes('ARCHER') || type.includes('LONGBOWMEN') || type.includes('CROSSBOWMEN')) return '🏹';
    if (type.includes('SIEGE') || type.includes('TREBUCHET') || type.includes('MANGONEL')) return '🧱';
    return '🛡️';
  };

  const recruitableUnits = [
    {
      id: UnitType.PROFESSIONAL_INFANTRY,
      name: 'Armored Footmen',
      icon: '🛡️',
      description: 'Sturdy infantry with heavy mail coats and long spears. Drilled in shield-wall formations.',
      stats: 'Atk: 12 | Def: 15 | Spd: 4',
      cost: { gold: 150, manpower: 150 },
      count: 150
    },
    {
      id: UnitType.LONGBOWMEN,
      name: 'Yeoman Archers',
      icon: '🏹',
      description: 'Elite ranged marksmen capable of raining arrows from extreme distances.',
      stats: 'Atk: 16 | Def: 5 | Spd: 5',
      cost: { gold: 100, manpower: 120 },
      count: 150
    },
    {
      id: UnitType.HEAVY_CAVALRY_KNIGHTS,
      name: 'Valerian Knights',
      icon: '🐴',
      description: 'Lethal plate-mounted noble cavaliers meant to devastate routing flanks.',
      stats: 'Atk: 24 | Def: 20 | Spd: 9',
      cost: { gold: 300, manpower: 200 },
      count: 100
    },
    {
      id: UnitType.TREBUCHET,
      name: 'Royal Trebuchets',
      icon: '🧱',
      description: 'Heavy counterweight siege machine to crumble enemy castle curtains.',
      stats: 'Atk: 40 | Def: 1 | Spd: 1',
      cost: { gold: 450, manpower: 100 },
      count: 1
    }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-ink text-parchment p-6 gap-6 h-full overflow-hidden" id="military-panel-root">
      {/* LEFT COLUMN: Standing Armies */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0" id="military-standing-armies">
        <div className="border border-stone bg-ink-lighter p-4 rounded-xl shadow-sm">
          <h3 className="font-serif text-lg text-accent font-semibold mb-3 border-b border-stone/15 pb-2 flex items-center gap-2">
            <Sword className="w-5 h-5" /> Standing Forces
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {playerArmies.map(army => (
              <button
                key={army.id}
                onClick={() => setSelectedArmyId(army.id)}
                className={`w-full text-left p-3 border rounded-xl transition-all ${
                  selectedArmyId === army.id
                    ? 'border-accent bg-accent/5'
                    : 'border-stone/40 bg-ink-dense hover:border-stone-light/45'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-serif text-sm font-bold text-parchment">{army.name}</span>
                  <span className="text-[10px] text-stone-light font-mono font-medium">🛡️ {army.stance}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-stone-light">
                  <span>{army.units?.reduce((acc, u) => acc + u.count, 0) || 0} Men</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">{army.morale}% Morale</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Strategic Readiness */}
        <div className="border border-stone bg-ink-lighter p-4 rounded-xl flex-1 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-stone-light uppercase tracking-widest mb-3 border-b border-stone/15 pb-1 flex items-center gap-2">
              <Shield className="w-4 h-4" /> War Chest
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center py-2">
              <div className="bg-ink rounded-lg p-2.5 border border-stone/10">
                <div className="text-[10px] text-stone-light uppercase tracking-wider mb-1">Reserve Manpower</div>
                <div className="text-xl font-mono text-parchment font-bold">⚔️ {resources?.manpower || 0}</div>
              </div>
              <div className="bg-ink rounded-lg p-2.5 border border-stone/10">
                <div className="text-[10px] text-stone-light uppercase tracking-wider mb-1">Treasury Gold</div>
                <div className="text-xl font-mono text-gold font-bold">🪙 {resources?.gold || 0}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3.5 bg-ink/50 border border-stone/15 rounded-lg text-xs text-stone-light leading-relaxed">
            <span className="font-semibold text-accent block mb-1">💡 General Staff Advice:</span>
            Keep reserve manpower high to automatically replenish wounded elements in enemy skirmishes. Recruiting drains your core peasant labor.
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Selected Army Elements Roster */}
      <div className="flex-1 border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col overflow-hidden shadow-sm" id="military-army-roster">
        {selectedArmy ? (
          <>
            <div className="border-b border-stone/15 pb-3 mb-4 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-serif text-parchment font-bold tracking-wide">{selectedArmy.name}</h2>
                <p className="text-xs text-stone-light font-mono mt-0.5">Location: Hex (Q: {selectedArmy.location.q}, R: {selectedArmy.location.r}) | Status: {selectedArmy.stance}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-light block">Avg Discipline</span>
                <span className="text-lg font-mono font-bold text-parchment">{selectedArmy.discipline}%</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {selectedArmy.units && selectedArmy.units.length > 0 ? (
                selectedArmy.units.map((unit) => (
                  <div key={unit.id} className="border border-stone bg-ink/65 p-4 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex gap-3.5 items-center">
                      <div className="w-12 h-12 rounded-lg bg-ink-light border border-stone/40 flex items-center justify-center text-2xl relative shadow-inner">
                        {getUnitIcon(unit.type)}
                      </div>
                      <div>
                        <div className="font-serif text-sm font-bold text-parchment capitalize">
                          {unit.type.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-xs text-stone-light flex gap-3 mt-1">
                          <span>Soldiers: <b className="text-parchment font-semibold">{unit.count}</b></span>
                          <span>Formation: <b className="text-stone-light font-mono lowercase">{unit.formation}</b></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 font-mono text-xs">
                      <span className="text-emerald-400">⚡ {unit.strength}% Effectiveness</span>
                      <span className="text-stone-light">Morale: {unit.morale}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-stone-light/40 italic font-serif">
                  No armed elements assigned to this Vanguard. Use the Recruiting Hall on the right to draft soldiers.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-stone-light italic font-serif">
            Select a division or host on the left.
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Recruitment Office */}
      <div className="w-full md:w-96 border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col overflow-hidden shadow-sm" id="military-recruiter">
        <h3 className="font-serif text-lg text-accent font-semibold mb-3 border-b border-stone/15 pb-2 flex items-center gap-2 shrink-0">
          <Users className="w-5 h-5" /> Recruitment Office
        </h3>
        <p className="text-xs text-stone-light leading-relaxed mb-4 shrink-0">
          Commission seasoned mercenary squads or regular levies. Costs are subtracted immediately from House {dynastyName} coffers.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {recruitableUnits.map(unit => {
            const hasGold = (resources?.gold || 0) >= unit.cost.gold;
            const hasManpower = (resources?.manpower || 0) >= unit.cost.manpower;
            const canAfford = hasGold && hasManpower;

            return (
              <div key={unit.id} className="border border-stone/30 bg-ink-dense p-3.5 rounded-xl space-y-3 hover:border-stone-light/25 transition-all shadow-xs">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5">
                    <span className="text-xl inline-block bg-ink-light p-1 rounded-md border border-stone/15">{unit.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-parchment font-serif">{unit.name}</h4>
                      <p className="text-[10px] text-accent font-mono font-medium">{unit.stats}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono leading-none">
                    <span className={hasGold ? 'text-gold' : 'text-danger font-semibold'}>🪙 {unit.cost.gold}</span>
                    <span className={hasManpower ? 'text-stone-light' : 'text-danger font-semibold'}>⚔️ {unit.cost.manpower}</span>
                  </div>
                </div>
                <p className="text-[10px] text-stone-light leading-relaxed">
                  {unit.description}
                </p>
                <button
                  disabled={!canAfford}
                  onClick={() => handleRecruit(unit.id, unit.count)}
                  className={`w-full py-2 uppercase tracking-wider text-[10px] font-sans font-bold rounded-lg cursor-pointer transition-all ${
                    canAfford
                      ? 'bg-accent text-ink border border-accent hover:bg-accent/90 hover:shadow-md'
                      : 'bg-ink-light border border-stone/15 text-stone-light/35 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? `Draft Elements (+${unit.count})` : 'Insufficient Resources'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
