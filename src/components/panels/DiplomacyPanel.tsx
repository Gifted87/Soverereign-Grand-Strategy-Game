import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Send, Scroll, Sparkles, AlertCircle } from 'lucide-react';

export function DiplomacyPanel() {
  const { characters, resources } = useGameStore();
  const [selectedRulerId, setSelectedRulerId] = useState<string>('');

  const foreignRulers = Object.values(characters || {}).filter(c => c.id.startsWith('foreign_'));
  const selectedRuler = characters[selectedRulerId] || foreignRulers[0];

  const handleDiplomaticAction = (charId: string, actionType: 'GIFT' | 'INSULT' | 'ALLIANCE') => {
    window.dispatchEvent(new CustomEvent('simulation_action', {
      detail: {
        type: 'DIPLOMAT_MISSION',
        payload: {
          charId: charId,
          actionType: actionType
        }
      }
    }));
  };

  const getOpinionLabel = (opinion: number) => {
    if (opinion <= -30) return { label: 'HOSTILE', color: 'text-rose-400 bg-rose-950/40 border-rose-900/40' };
    if (opinion >= 25) return { label: 'ALLIED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' };
    return { label: 'NEUTRAL', color: 'text-amber-400 bg-amber-950/40 border-amber-900/40' };
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-ink text-parchment p-6 gap-6 h-full overflow-hidden" id="diplomacy-panel-root">
      {/* LEFT COLUMN: Known Sovereigns */}
      <div className="w-full md:w-85 flex flex-col gap-4 shrink-0" id="diplomacy-sovereigns-list">
        <div className="border border-stone bg-ink-lighter p-4 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          <h3 className="font-serif text-lg text-accent font-semibold mb-3 border-b border-stone/15 pb-2 flex items-center gap-2">
            <Scroll className="w-5 h-5" /> Known Sovereigns
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {foreignRulers.map(ruler => {
              const opinionVal = ruler.opinion?.['player'] ?? -30;
              const meta = getOpinionLabel(opinionVal);
              const isSelected = selectedRuler?.id === ruler.id;

              return (
                <button
                  key={ruler.id}
                  onClick={() => setSelectedRulerId(ruler.id)}
                  className={`w-full text-left p-3 border rounded-xl transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-md'
                      : 'border-stone/40 bg-ink-dense hover:border-stone-light/45'
                  }`}
                >
                  <div className="flex gap-2.5 items-center">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${ruler.firstName}&backgroundColor=c0cbdc`} 
                      alt={ruler.firstName} 
                      className="w-10 h-10 rounded-full bg-stone shadow-inner border border-stone/20"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-serif font-bold text-parchment">{ruler.firstName} {ruler.lastName}</div>
                      <div className="text-[9px] text-stone-light uppercase font-mono">{ruler.title?.name || 'Vassal Duke'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[8px] font-bold border rounded-md px-1.5 py-0.5 tracking-wider mb-1 ${meta.color}`}>
                      {meta.label}
                    </div>
                    <span className={`text-xs font-mono font-bold ${opinionVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {opinionVal >= 0 ? `+${opinionVal}` : opinionVal}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Diplomatic Statistics */}
        <div className="border border-stone bg-ink-lighter p-4 rounded-xl shadow-sm text-xs space-y-2 text-stone-light">
          <h4 className="font-serif uppercase tracking-widest text-[10px] text-accent mb-2 font-bold select-none border-b border-stone/15 pb-1">Honor & Renown</h4>
          <div className="flex justify-between font-mono"><span>Dynasty Renown</span><span className="text-parchment font-bold">★ {resources?.prestige || 0}</span></div>
          <div className="flex justify-between font-mono"><span>Discovered Realms</span><span className="text-parchment font-bold">{foreignRulers.length}</span></div>
        </div>
      </div>

      {/* RIGHT COLUMN: Selected Ruler Details & Interactivity */}
      <div className="flex-1 border border-stone bg-ink-lighter p-6 rounded-2xl flex flex-col overflow-hidden shadow-sm" id="diplomacy-realm-controls">
        {selectedRuler ? (
          (() => {
            const op = selectedRuler.opinion?.['player'] ?? -30;
            const opMeta = getOpinionLabel(op);
            const isAffordableGift = (resources?.gold || 0) >= 250;
            const isAffordableAlliance = (resources?.prestige || 0) >= 40 && op >= 40;

            return (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header card with dicebear avatar */}
                <div className="flex items-start gap-4 border-b border-stone/15 pb-4.5 mb-6 shrink-0 justify-between">
                  <div className="flex gap-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedRuler.firstName}&backgroundColor=c0cbdc`} 
                      alt={selectedRuler.firstName} 
                      className="w-16 h-16 rounded-xl bg-stone shadow-md border-2 border-stone"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="text-2xl font-serif font-black text-parchment">{selectedRuler.firstName} {selectedRuler.lastName}</h2>
                      <p className="text-xs text-accent font-mono tracking-widest uppercase">{selectedRuler.title?.name || 'Sovereign Rulers'}</p>
                      <div className="flex gap-3 text-xs text-stone-light mt-1 font-sans">
                        <span>Age: <b className="text-parchment">{selectedRuler.age}</b></span>
                        <span>Culture: <b className="text-parchment capitalize">{selectedRuler.culture || 'Frankish'}</b></span>
                        <span>Religion: <b className="text-parchment capitalize">{selectedRuler.religion || 'Catholic'}</b></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-stone-light uppercase font-mono tracking-wider mb-1">State Trust</div>
                    <span className={`text-2xl font-serif font-bold ${op >= 0 ? 'text-emerald-400' : 'text-danger'}`}>
                      {op >= 0 ? `+${op}` : op}
                    </span>
                  </div>
                </div>

                {/* Traits & Bio stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-stone/10 bg-ink-dense p-4 rounded-xl shadow-inner space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-stone-light border-b border-stone/15 pb-1 font-semibold">Specialization Traits</h4>
                    <div className="space-y-2">
                      <div className="bg-ink p-2 rounded-lg border border-stone/15 text-xs text-stone-light leading-relaxed">
                        <span className="font-bold text-accent capitalize block mb-0.5">{selectedRuler.ambition || 'Power Seekers'} Ambition</span>
                        Tracks expansion opportunities closely, prioritizing raw defensive alignments or border land acquisitions.
                      </div>
                    </div>
                  </div>

                  <div className="border border-stone/10 bg-ink-dense p-4 rounded-xl shadow-inner space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-stone-light border-b border-stone/15 pb-1 font-semibold">Court Attitude</h4>
                    <div className="space-y-2 text-xs leading-relaxed text-stone-light">
                      <div className="flex justify-between"><span>Intimidated</span><span className="text-danger font-bold">No</span></div>
                      <div className="flex justify-between"><span>Active Treaties</span><span className="text-stone">None Established</span></div>
                      <div className="flex justify-between"><span>Relations Status</span><span className={`font-mono text-[10px] uppercase font-bold ${opMeta.color} px-1.5 rounded-sm`}>{opMeta.label}</span></div>
                    </div>
                  </div>
                </div>

                {/* Grand Interventions Buttons */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  <h3 className="font-serif text-sm uppercase tracking-widest text-[#d97757] font-semibold flex items-center gap-1.5 border-b border-stone/10 pb-1.5">
                    <Sparkles className="w-4 h-4" /> Dispatch Ambassadors
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
                    {/* Action Gift */}
                    <div className="border border-stone bg-ink/30 p-4 rounded-xl flex flex-col justify-between hover:border-stone-light/35 transition-all shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold text-parchment font-serif mb-1">State Chest</h4>
                        <p className="text-[10px] text-stone-light leading-relaxed mb-3">Ship gold goblets and luxury silk tapestries (-250 Gold). Raised the target sovereign's favor rating.</p>
                      </div>
                      <button
                        disabled={!isAffordableGift}
                        onClick={() => handleDiplomaticAction(selectedRuler.id, 'GIFT')}
                        className={`w-full py-2 uppercase tracking-wider text-[9px] font-sans font-bold cursor-pointer transition-all rounded-[6px] ${
                          isAffordableGift 
                            ? 'bg-gold text-ink font-extrabold hover:bg-gold/90' 
                            : 'bg-ink-dense text-stone-light/35 border border-stone/10 cursor-not-allowed'
                        }`}
                      >
                        Gift Chest (-250 G)
                      </button>
                    </div>

                    {/* Action Insult */}
                    <div className="border border-stone bg-ink/30 p-4 rounded-xl flex flex-col justify-between hover:border-stone-light/35 transition-all shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold text-rose-300 font-serif mb-1">Send Public Scold</h4>
                        <p className="text-[10px] text-stone-light leading-relaxed mb-3">Denounce their regional holding claims publicly at the High Court. Sours opinion (-25 points).</p>
                      </div>
                      <button
                        onClick={() => handleDiplomaticAction(selectedRuler.id, 'INSULT')}
                        className="w-full py-2 uppercase tracking-wider text-[9px] font-sans font-bold cursor-pointer bg-danger text-white hover:bg-danger/90 rounded-[6px]"
                      >
                        Issue Denounce
                      </button>
                    </div>

                    {/* Action Alliance */}
                    <div className="border border-stone bg-ink/30 p-4 rounded-xl flex flex-col justify-between hover:border-stone-light/35 transition-all shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300 font-serif mb-1">Form Alliance</h4>
                        <p className="text-[10px] text-stone-light leading-relaxed mb-3">Propose a binding mutual defense pact. Requires at least 40 trust units. Costs 40 Prestige.</p>
                      </div>
                      <button
                        disabled={!isAffordableAlliance}
                        onClick={() => handleDiplomaticAction(selectedRuler.id, 'ALLIANCE')}
                        className={`w-full py-2 uppercase tracking-wider text-[9px] font-sans font-bold cursor-pointer transition-all rounded-[6px] ${
                          isAffordableAlliance 
                            ? 'bg-accent text-ink font-bold hover:bg-accent/90' 
                            : 'bg-ink-dense text-stone-light/35 border border-stone/10 cursor-not-allowed'
                        }`}
                      >
                        Form Covenant (-40 P)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="text-center py-24 text-stone-light/40 italic font-serif flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 opacity-45" />
            No active sovereign ruler selected. Discover realms or assign agents to contact border neighbors.
          </div>
        )}
      </div>
    </div>
  );
}
