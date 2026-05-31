import { useGameStore } from '../../store/gameStore';
import { Sparkles, HelpingHand, Sprout } from 'lucide-react';

export function ReligionPanel() {
  const { characters, resources, playerCharacter } = useGameStore() as any;

  const playerChar = characters?.['player'];
  const gold = resources?.gold ?? 0;
  const dynastyName = playerCharacter ? playerCharacter.lastName : 'Valedor';

  const handleReligiousTithing = (titheType: 'PRAY' | 'DONATE') => {
    window.dispatchEvent(new CustomEvent('simulation_action', {
      detail: {
        type: 'CHURCH_TITHE',
        payload: {
          type: titheType
        }
      }
    }));
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-ink text-parchment p-6 gap-6 h-full overflow-hidden" id="religion-panel-root">
      {/* LEFT COLUMN: Cathedral Info */}
      <div className="w-full md:w-85 flex flex-col gap-4 shrink-0" id="religion-creed">
        <div className="border border-stone bg-ink-lighter p-5 rounded-xl shadow-sm space-y-4">
          <div className="text-center pb-3 border-b border-stone/15">
            <span className="text-[10px] text-stone-light uppercase font-mono tracking-wider">State Clergy</span>
            <h2 className="text-2xl font-serif text-accent font-bold tracking-wide mt-1">St. Jude Cathedral</h2>
            <span className="text-[10px] bg-panel border border-stone/30 px-2.5 py-0.5 rounded-full text-stone-light font-medium uppercase inline-block mt-2">Roman Rite Orthodoxy</span>
          </div>

          <div className="space-y-2 text-xs text-stone-light">
            <div className="flex justify-between"><span>Liturgy Dialect</span><span className="text-parchment font-semibold">Ecclesiastical Latin</span></div>
            <div className="flex justify-between"><span>Ordained Deacons</span><span className="text-parchment font-semibold">12</span></div>
            <div className="flex justify-between"><span>Cathedral Piety Modifier</span><span className="text-emerald-400 font-bold">+15% Per Annum</span></div>
          </div>
        </div>

        <div className="border border-stone bg-ink-lighter p-4 rounded-xl flex-1 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-stone-light uppercase tracking-widest mb-3 border-b border-stone/15 pb-1 flex items-center gap-1.5 font-bold">
              <Sprout className="w-4 h-4" /> Divine Favour
            </h3>
            <p className="text-xs text-stone-light leading-relaxed">
              Purity in faith wards off darker scourges. Deep piety metrics can prevent crop failures and lower peasant unrest durations when diseases strike.
            </p>
          </div>
          <div className="mt-4 p-3.5 bg-ink/50 border border-stone/15 rounded-lg text-xs text-stone-light leading-relaxed">
            <span className="font-semibold text-accent block mb-1">📖 Holy Relic:</span>
            {dynastyName} holds the splintered holy shroud of St. Jude, radiating divine courage to all defenders besieging the city's walls.
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Liturgy/Tithing Actions */}
      <div className="flex-1 border border-stone bg-ink-lighter p-6 rounded-2xl flex flex-col overflow-hidden shadow-sm" id="religion-liturgies">
        <div className="border-b border-stone/15 pb-3 mb-5 shrink-0">
          <h2 className="text-2xl font-serif text-parchment font-bold tracking-wide flex items-center gap-2">
            ⛪ The Cathedral Altar
          </h2>
          <p className="text-xs text-stone-light font-mono mt-0.5">Sponsor local religious deeds to increase state prestige and clergy favor ratings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Prayers */}
          <div className="border border-stone/30 bg-ink-dense p-5 rounded-xl flex flex-col justify-between hover:border-stone-light/25 transition-all shadow-xs">
            <div className="space-y-3">
              <span className="text-3xl inline-block bg-ink-light p-1.5 rounded-lg border border-stone/10">🕊️</span>
              <h4 className="text-lg font-bold font-serif text-parchment">Solemn Contrition Prayers</h4>
              <p className="text-xs text-stone-light leading-relaxed">
                Proclaim days of prayer and quiet dedication at {dynastyName} parishes. Elevates national renown and sovereign prestige metrics, costs nothing.
              </p>
            </div>
            <button
              onClick={() => handleReligiousTithing('PRAY')}
              className="w-full mt-6 py-2.5 uppercase tracking-wider text-[10.5px] font-sans font-bold cursor-pointer transition-all bg-ink border border-stone hover:bg-stone hover:text-gold text-parchment rounded-lg flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Proclaim Sovereign Prayers
            </button>
          </div>

          {/* Action 2: Donations */}
          <div className="border border-stone/30 bg-ink-dense p-5 rounded-xl flex flex-col justify-between hover:border-stone-light/25 transition-all shadow-xs">
            <div className="space-y-3">
              <span className="text-3xl inline-block bg-ink-light p-1.5 rounded-lg border border-stone/10">⛪</span>
              <h4 className="text-lg font-bold font-serif text-parchment">Cathedral Stained Glass Tithe</h4>
              <p className="text-xs text-stone-light leading-relaxed">
                Directly endow the cathedral treasury with gold bars to repair damage and fund stained glass layouts. Raises Piety and Dynasty Prestige dramatically (-300 Gold).
              </p>
            </div>
            <button
              disabled={gold < 300}
              onClick={() => handleReligiousTithing('DONATE')}
              className={`w-full mt-6 py-2.5 uppercase tracking-wider text-[10.5px] font-sans font-bold cursor-pointer transition-all rounded-lg flex items-center justify-center gap-1.5 ${
                gold >= 300
                  ? 'bg-accent text-ink border border-accent hover:bg-accent/90 shadow-md font-extrabold'
                  : 'bg-ink-light border-stone/15 text-stone-light/35 cursor-not-allowed'
              }`}
            >
              <HelpingHand className="w-4 h-4" /> Donate Alms (-300 G)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
