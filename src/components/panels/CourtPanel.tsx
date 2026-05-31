import { useGameStore } from '../../store/gameStore';
import { Award, Briefcase, Sparkles, UserCheck } from 'lucide-react';

export function CourtPanel() {
  const { characters, resources } = useGameStore();

  const playerChar = characters?.['player'];
  const gold = resources?.gold ?? 0;

  const handleCouncilMission = (advisorId: string, mission: string) => {
    window.dispatchEvent(new CustomEvent('simulation_action', {
      detail: {
        type: 'COUNCIL_ASSIGNMENT',
        payload: {
          advisorId,
          mission
        }
      }
    }));
  };

  const advisorsList = [
    {
      id: 'advisor_chancellor',
      role: 'Lord Chancellor',
      specialty: 'Diplomacy Specialist',
      stats: 'DIP: 16 | INT: 12',
      bonus: 'Fosters relations with provincial lords, raising Renown & prestige metrics directly.',
      mission: 'FOSTER_RELATIONS',
      missionLabel: 'Foster Relations (-100 G)',
      emoji: '📜'
    },
    {
      id: 'advisor_marshal',
      role: 'Lord Marshal',
      specialty: 'Military Specialist',
      stats: 'MAR: 18 | DIF: 14',
      bonus: 'Mobilizes strategic regional drafts to feed manpower reserve stockpiles.',
      mission: 'MUSTER_DRAFTS',
      missionLabel: 'Muster Drafts (-100 G)',
      emoji: '⚔️'
    },
    {
      id: 'advisor_treasurer',
      role: 'Lord Treasurer / Master of Coin',
      specialty: 'Stewardship Specialist',
      stats: 'STW: 19 | LRN: 11',
      bonus: 'Audits trade tariff documents, recovering uncollected tax revenues.',
      mission: 'COLLECT_TAXES',
      missionLabel: 'Collect Tariffs (-100 G)',
      emoji: '🪙'
    }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-ink text-parchment p-6 gap-6 h-full overflow-hidden" id="court-panel-root">
      {/* LEFT COLUMN: Dynasty & Sovereign Profile */}
      <div className="w-full md:w-85 flex flex-col gap-4 shrink-0" id="court-dynasty-profile">
        {playerChar && (
          <div className="border border-stone bg-ink-lighter p-5 rounded-xl shadow-sm space-y-4">
            <div className="text-center pb-3 border-b border-stone/15">
              <span className="text-[10px] text-stone-light uppercase font-mono tracking-wider">Dynasty Head</span>
              <h2 className="text-2xl font-serif text-accent font-bold tracking-wide mt-1">{playerChar.firstName} {playerChar.lastName}</h2>
              <span className="text-[10px] bg-panel border border-stone/30 px-2 py-0.5 rounded-full text-stone-light font-medium uppercase inline-block mt-2">Sovereign of {playerChar.lastName}</span>
            </div>

            <div className="space-y-2 text-xs text-stone-light">
              <div className="flex justify-between"><span>Age</span><span className="text-parchment font-bold">{playerChar.health > 0 ? playerChar.age : 'Deceased'} Years</span></div>
              <div className="flex justify-between"><span>Current Health</span><span className="text-emerald-400 font-bold">{playerChar.health}/100</span></div>
              <div className="flex justify-between col-span-2"><span>Piety Level</span><span className="text-accent font-bold">★ {playerChar.piety || 0}</span></div>
            </div>

            <div className="pt-3 border-t border-stone/15">
              <h4 className="text-[10px] uppercase font-mono text-stone-light tracking-wide mb-2.5">Sovereign Attribute Matrix</h4>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono font-bold">
                <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                  <div className="text-[8px] text-stone-light uppercase font-sans mb-0.5">Diplomacy</div>
                  <span className="text-parchment text-sm">{playerChar.diplomacy}</span>
                </div>
                <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                  <div className="text-[8px] text-stone-light uppercase font-sans mb-0.5">Martial</div>
                  <span className="text-parchment text-sm">{playerChar.martial}</span>
                </div>
                <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                  <div className="text-[8px] text-stone-light uppercase font-sans mb-0.5">Stewardship</div>
                  <span className="text-parchment text-sm">{playerChar.stewardship}</span>
                </div>
                <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                  <div className="text-[8px] text-stone-light uppercase font-sans mb-0.5">Intrigue</div>
                  <span className="text-parchment text-sm">{playerChar.intrigue}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-stone bg-ink-lighter p-4 rounded-xl flex-1 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-sm text-stone-light uppercase tracking-widest mb-3 border-b border-stone/15 pb-1 flex items-center gap-1.5 font-bold">
              <Award className="w-4 h-4" /> Royal Decrees
            </h3>
            <p className="text-xs text-stone-light leading-relaxed">
              Vassal lords require constant reassurance. Appointing expert specialists ensures higher tax gathering efficiency and limits uprising risks across neighboring fiefs.
            </p>
          </div>
          <div className="mt-4 p-3.5 bg-ink/50 border border-stone/15 rounded-lg text-xs text-stone-light leading-relaxed">
            <span className="font-semibold text-accent block mb-1">👑 Dynasty Line:</span>
            Your primary heir will automatically succeed to titles upon your demise. Maintaining loyal, wealthy counsel shields you from dark, unseen dagger plots.
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Royal Council advisors list */}
      <div className="flex-1 border border-stone bg-ink-lighter p-6 rounded-2xl flex flex-col overflow-hidden shadow-sm" id="court-council">
        <div className="border-b border-stone/15 pb-3 mb-4 shrink-0">
          <h2 className="text-2xl font-serif text-parchment font-bold tracking-wide flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-accent" /> The Royal Cabinet Council
          </h2>
          <p className="text-xs text-stone-light font-mono mt-0.5">Direct the crown specialists to perform target nation-building operations.</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {advisorsList.map((advisor) => {
            const hasGold = gold >= 100;

            return (
              <div key={advisor.id} className="border border-stone bg-ink-dense p-4 rounded-xl space-y-4 hover:border-stone-light/25 transition-all flex flex-col md:flex-row justify-between md:items-center shadow-xs md:gap-4">
                <div className="flex gap-4 items-start flex-1">
                  <div className="w-14 h-14 bg-ink border border-stone/30 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    {advisor.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold font-serif text-parchment">{advisor.role}</h4>
                      <span className="text-[9px] font-mono font-bold text-accent px-1.5 py-0.5 bg-accent/5 border border-accent/25 rounded-md uppercase">{advisor.specialty}</span>
                    </div>
                    <p className="text-[10px] text-stone-light mt-1.5 font-sans leading-relaxed">{advisor.bonus}</p>
                    <div className="text-[10px] text-stone-light font-mono font-bold mt-1 text-opacity-80">Attributes: {advisor.stats}</div>
                  </div>
                </div>

                <div className="shrink-0 md:w-52 text-right">
                  <button
                    disabled={!hasGold}
                    onClick={() => handleCouncilMission(advisor.id, advisor.mission)}
                    className={`w-full py-2 px-3 uppercase tracking-wider text-[10px] font-sans font-extrabold cursor-pointer transition-all rounded-lg flex items-center justify-center gap-1 border ${
                      hasGold
                        ? 'bg-ink border-stone hover:bg-stone hover:text-gold text-parchment'
                        : 'bg-ink-light border-stone/15 text-stone-light/35 cursor-not-allowed'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {advisor.missionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
