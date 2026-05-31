import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BookOpen, Sparkles, Heart, Activity, Users, Star, Landmark, HelpCircle, UserCheck, Shield } from 'lucide-react';

// ==========================================
// 1. TECHNOLOGY MODAL (Bento visualizer)
// ==========================================
export function TechnologyModal() {
  const { activeResearch, resources } = useGameStore() as any;
  const [selectedTechId, setSelectedTechId] = useState<string>('tech_crop_rotation');

  const gold = resources?.gold ?? 0;
  const techCategories = [
    { id: 'tech_crop_rotation', name: 'Heavy Ploughshares', time: '12 Ticks', desc: 'Serrated coulters to till deep northern soils. Increases global crop yield by 20%.', category: 'AGRI' },
    { id: 'tech_crossbow', name: 'Crossbow Arbalests', time: '18 Ticks', desc: 'Laminated steel staves with simple windlass cranks. Boosts archer unit attack by 15%.', category: 'MARSH' },
    { id: 'tech_concentric_keeps', name: 'Reinforced Keeps', time: '24 Ticks', desc: 'Thicker round walls preventing battering rams from easily shattering gates. Fortifications +1.', category: 'FORT' },
    { id: 'tech_double_entry', name: 'Double-Entry Ledger', time: '14 Ticks', desc: 'Venetian bookkeeping audits ensuring full transparency in regional customs yards. Gold income +15/day.', category: 'ECON' },
  ];

  const selectedTech = techCategories.find(t => t.id === selectedTechId) || techCategories[0];
  const isResearching = activeResearch === selectedTechId;

  const handleStartResearch = () => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'START_RESEARCH', payload: { techId: selectedTechId } },
      })
    );
    alert(`Research project commissioned: ${selectedTech.name}!`);
  };

  const handleCancelResearch = () => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'CANCEL_RESEARCH', payload: { techId: selectedTechId } },
      })
    );
    alert(`Research project postponed.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">High Library: Codex of Blueprints</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Sponsor scholarly studies & heavy engineering lines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tech inventory */}
        <div className="space-y-3">
          <span className="text-[10px] text-stone uppercase tracking-wider block font-bold font-mono">Uncharted Blueprints</span>
          <div className="grid grid-cols-1 gap-2.5">
            {techCategories.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTechId(t.id)}
                className={`text-left p-3.5 border rounded-xl transition-all flex items-center justify-between ${
                  selectedTechId === t.id ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
                }`}
              >
                <div>
                  <h4 className="font-serif text-sm font-bold text-parchment">{t.name}</h4>
                  <span className="text-[9px] bg-panel border px-1.5 py-0.5 rounded text-stone-light mt-1 font-mono tracking-wider uppercase inline-block">{t.category}</span>
                </div>
                <span className="text-[10px] text-stone-light font-mono">Est: {t.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tech detail panels */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-stone/15 pb-3">
              <span className="text-3xl">📚</span>
              <h3 className="font-serif text-md font-bold text-parchment mt-2">{selectedTech.name}</h3>
              <p className="text-[10px] text-accent uppercase font-mono tracking-wider font-semibold">{selectedTech.category} SYLLABUS</p>
            </div>

            <p className="text-xs text-stone-light leading-relaxed">
              {selectedTech.desc}
            </p>

            <div className="bg-ink p-3 rounded-lg border border-stone/10 text-xs text-stone-light space-y-1">
              <div>Estimated completion: <b className="text-parchment font-mono">{selectedTech.time}</b></div>
              <div>Scholars salary cost: <b className="text-gold font-mono">1.2 G/day</b></div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone/15 mt-4">
            {isResearching ? (
              <button
                onClick={handleCancelResearch}
                className="w-full py-2 bg-red-900/25 border border-red-500/60 hover:bg-red-500 text-white transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer"
              >
                Halt active study
              </button>
            ) : (
              <button
                onClick={handleStartResearch}
                className="w-full py-2 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer"
              >
                Sponsor Active Research Study
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. RELIGION MODAL (Roman Orthodoxy rites)
// ==========================================
export function ReligionModal() {
  const { resources } = useGameStore() as any;
  const [riteFocus, setRiteFocus] = useState<'INDULGENCE' | 'PILGRIMAGE' | 'EXCOMMUNICATE'>('INDULGENCE');

  const gold = resources?.gold ?? 0;
  const piety = resources?.piety ?? 120;

  const handleRite = () => {
    let costG = 0;
    let costP = 0;
    let actionType = 'PRAY';

    if (riteFocus === 'INDULGENCE') {
      if (gold < 150) return;
      costG = 150;
      actionType = 'DONATE';
    } else if (riteFocus === 'PILGRIMAGE') {
      if (gold < 70) return;
      costG = 70;
      actionType = 'PRAY';
    } else {
      if (piety < 150) return;
      costP = 150;
    }

    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'CHURCH_TITHE',
          payload: { type: actionType },
        },
      })
    );
    alert(`Holy Orthodoxy Rite sealed! Piety increased.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-black text-accent">Ecclesiastical Chapter-house</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">High Pontiff alignment, relics, indulgences & solemn rites</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rites list selectors */}
        <div className="space-y-3">
          <span className="text-[10px] text-stone uppercase font-mono block font-bold tracking-widest select-none">Ecclesiastical Rites</span>
          <div className="space-y-2">
            {/* Indulgences */}
            <button
              onClick={() => setRiteFocus('INDULGENCE')}
              className={`w-full text-left p-3.5 border rounded-xl transition-all ${
                riteFocus === 'INDULGENCE' ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
              }`}
            >
              <h4 className="font-serif text-sm font-bold text-parchment">Purchase Indulgent Scrolls</h4>
              <p className="text-[10px] text-stone-light mt-0.5">Sponsor church abbey roofs for gold. (+50 Piety)</p>
            </button>

            {/* Pilgrimage */}
            <button
              onClick={() => setRiteFocus('PILGRIMAGE')}
              className={`w-full text-left p-3.5 border rounded-xl transition-all ${
                riteFocus === 'PILGRIMAGE' ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
              }`}
            >
              <h4 className="font-serif text-sm font-bold text-parchment">St. Jude Relic Pilgrim Rites</h4>
              <p className="text-[10px] text-stone-light mt-0.5">Barefoot trek to localized cathedral relics. (+20 Piety)</p>
            </button>

            {/* Papal dispensary */}
            <button
              onClick={() => setRiteFocus('EXCOMMUNICATE')}
              className={`w-full text-left p-3.5 border rounded-xl transition-all ${
                riteFocus === 'EXCOMMUNICATE' ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
              }`}
            >
              <h4 className="font-serif text-sm font-bold text-parchment">Request Competitor Excommunication</h4>
              <p className="text-[10px] text-stone-light mt-0.5">Denounce neighbor sovereigns with Papal Bull seals.</p>
            </button>
          </div>
        </div>

        {/* Selected rite actions console */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-stone/15 pb-3">
              <span className="text-3xl">⛪</span>
              <h3 className="font-serif text-md font-bold text-parchment mt-2">
                {riteFocus === 'INDULGENCE' && 'Contract Alms Indulgences'}
                {riteFocus === 'PILGRIMAGE' && 'Pilgrimage to Sacred Spires'}
                {riteFocus === 'EXCOMMUNICATE' && 'Papal Curse Declarations'}
              </h3>
            </div>

            <p className="text-xs text-stone-light leading-relaxed">
              {riteFocus === 'INDULGENCE' && 'Remit dynastic sin levels. Sponsoring monastic expansion directly cements Papal Orthodoxy alignment, boosting crown authority.'}
              {riteFocus === 'PILGRIMAGE' && 'Send heirs and sovereigns barefoot into severe paths. Restores base sanity, reduces court plot suspicion ratios.'}
              {riteFocus === 'EXCOMMUNICATE' && 'Strip rival sovereigns of holy legitimacy. Declares their lands open for claim conquests with zero renown losses.'}
            </p>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span>Required Tithe Cost</span>
                <span className="text-gold font-bold">
                  {riteFocus === 'INDULGENCE' && '🪙 150 Gold'}
                  {riteFocus === 'PILGRIMAGE' && '🪙 70 Gold'}
                  {riteFocus === 'EXCOMMUNICATE' && '★ 150 Piety'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRite}
            disabled={riteFocus === 'INDULGENCE' ? gold < 150 : riteFocus === 'PILGRIMAGE' ? gold < 70 : piety < 150}
            className={`w-full mt-6 py-2.5 uppercase tracking-wider text-[11px] font-sans font-extrabold rounded-lg transition-all cursor-pointer ${
              (riteFocus === 'INDULGENCE' && gold >= 150) || (riteFocus === 'PILGRIMAGE' && gold >= 70) || (riteFocus === 'EXCOMMUNICATE' && piety >= 150)
                ? 'bg-accent text-ink border border-accent hover:bg-accent/90 shadow-md'
                : 'bg-ink-light border-stone/15 text-stone-light/35 cursor-not-allowed'
            }`}
          >
            Settle Sacred Covenants
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. CHRONICLE MODAL (Sovereign Timeline)
// ==========================================
export function ChronicleModal() {
  const { chronicle } = useGameStore();

  const mockTimeline = chronicle && chronicle.length > 0 ? chronicle : [
    { year: 1205, day: 1, text: 'The Lord Sovereign assumed high sovereignty crown in the grand sanctuary.', type: 'CRITICAL' },
    { year: 1205, day: 12, text: 'Erected local fortress timber palisades to buffer bandit archers.', type: 'NORMAL' },
    { year: 1205, day: 45, text: 'Sovereign treaty with Swabia signed under mutual oathes.', type: 'NORMAL' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-black text-accent">The Golden Scroll of Antiquities</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Chronicles of your house's eternal deeds and conquest lines</p>
      </div>

      <div className="border border-stone bg-[#1A1512] p-5 rounded-2xl relative shadow-md max-h-[380px] overflow-y-auto space-y-4">
        {mockTimeline.map((item, idx) => (
          <div key={idx} className="border-l border-stone-light/30 pl-4 relative">
            <span className="w-2 h-2 rounded-full bg-accent absolute -left-1 top-1.5 border border-stone-light animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[9px] text-accent tracking-widest font-extrabold uppercase select-none">
                Anno Domini {item.year ?? 1205} — Day {item.day ?? 1}
              </span>
              <p className="text-xs text-stone-light font-sans leading-relaxed">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. CRISIS MODAL (Disasters Relief)
// ==========================================
export function CrisisModal() {
  const { resources } = useGameStore();
  const gold = resources?.gold ?? 0;

  const handleMitigate = (type: string) => {
    if (gold < 150) return;
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: { text: `Sponsored high emergency relief: ${type}. Food handouts dispatched.`, type: 'URGENT' },
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'SPEND_GOLD', payload: { amount: 150 } },
      })
    );
    alert(`Mitigation package authorized! Resources and relief sent.`);
  };

  return (
    <div className="space-y-6 animate-pulse hover:animate-none">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-extrabold text-red-400">Emergency Disasters Mitigator</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Riot pacification, crop blight & plague mitigation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-stone bg-ink-lighter p-5 rounded-xl space-y-3.5">
          <span className="text-[10px] text-stone uppercase tracking-widest font-mono font-bold block">Active Threats In County</span>
          <div className="space-y-2.5">
            <div className="bg-ink p-3 rounded-lg border border-red-500/20 text-xs">
              <b className="text-rose-400 font-serif block">💀 Bubonic Contagion Contrapass</b>
              <p className="text-[10.5px] text-stone mb-2 leading-relaxed mt-0.5">Contagion risk at 25% in capital hamlets. Limits passive peasant manpower replenishments by half.</p>
              <button
                disabled={gold < 150}
                onClick={() => handleMitigate('Bubonic Quarantine')}
                className="py-1 px-3 bg-red-900 border border-red-500 text-[9.5px] font-sans font-bold uppercase rounded cursor-pointer transition-all"
              >
                Isolate Hamlets (-150 Gold)
              </button>
            </div>

            <div className="bg-ink p-3 rounded-lg border border-red-500/20 text-xs">
              <b className="text-rose-400 font-serif block">🛒 Peasant Bread Riots</b>
              <p className="text-[10.5px] text-stone mb-2 leading-relaxed mt-0.5">Grain crop shortfalls trigger tax rebellions in low-loyalty areas. Elevates coup risk.</p>
              <button
                disabled={gold < 150}
                onClick={() => handleMitigate('Bread Silo Distributions')}
                className="py-1 px-3 bg-red-900 border border-red-500 text-[9.5px] font-sans font-bold uppercase rounded cursor-pointer transition-all"
              >
                Distribute Wheat (-150 Gold)
              </button>
            </div>
          </div>
        </div>

        <div className="border border-stone bg-[#1E1111]/40 p-5 rounded-xl flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] text-stone uppercase tracking-widest font-mono font-bold block">Disaster Relief Protocols</span>
            <p className="text-xs text-stone-light leading-relaxed">
              Disasters arise randomly during winter ticks or severe siege bottlenecks. Active mitigation packages immediately quell unrest multipliers before dynamic peasant groups take up arms as physical rebel cohorts on the tactical map.
            </p>
          </div>
          <p className="text-xs text-stone mt-4 leading-normal italic bg-ink p-3 rounded border border-stone/10">
            "Better a dry loaf in court silence than a grand feast inside castle walls besieged by one's own starving serfs."
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. COUNCIL MODAL (Ministers Deployment)
// ==========================================
export function CouncilModal() {
  const { characters } = useGameStore();
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('advisor_1');

  const advisors = Object.values(characters || {}).filter(c => c.id.startsWith('advisor_') || c.id === 'clara_valerian');
  const selectedAdvisor = characters?.[selectedAdvisorId] || advisors[0];

  const handleCoordinateAdvisors = (mission: 'COLLECT_TAXES' | 'FOSTER_RELATIONS' | 'TRAIN_MILITIA') => {
    if (!selectedAdvisor) return;

    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'COUNCIL_ASSIGNMENT',
          payload: {
            advisorId: selectedAdvisor.id,
            mission: mission,
          },
        },
      })
    );
    alert(`Advisor delegated to strategic mission: ${mission}!`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">High Dynastic Privy Council</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Deploy council ministers to active map operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Council listing */}
        <div className="border border-stone bg-ink-lighter p-3 rounded-xl max-h-[380px] overflow-y-auto">
          <span className="text-[10px] text-stone uppercase tracking-wider block mb-2 font-bold font-mono">Privy Seats</span>
          <div className="space-y-2">
            {advisors.map((adv) => {
              const isSelected = selectedAdvisorId === adv.id;
              return (
                <button
                  key={adv.id}
                  onClick={() => setSelectedAdvisorId(adv.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    isSelected ? 'border-accent bg-accent/5 font-semibold' : 'border-stone/20 bg-ink hover:border-stone-light'
                  }`}
                >
                  <span className="font-serif block text-parchment text-xs">{adv.firstName} {adv.lastName}</span>
                  <p className="text-[10px] text-stone-light mt-0.5">{adv.position?.name || 'Vassal Advisor'}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advisor Details */}
        <div className="md:col-span-2 border border-stone bg-ink-lighter p-5 rounded-xl flex flex-col justify-between">
          {selectedAdvisor ? (
            <div className="space-y-4">
              <div className="border-b border-stone/15 pb-3">
                <span className="text-3xl">👥</span>
                <h3 className="font-serif text-lg font-bold text-parchment mt-2">{selectedAdvisor.firstName} {selectedAdvisor.lastName}</h3>
                <span className="text-[10px] bg-accent/15 border border-accent/20 px-2 py-0.5 rounded text-accent mt-1 inline-block uppercase font-mono">{selectedAdvisor.position?.name || 'Vassal Minister'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                <div className="bg-ink border p-1 rounded-md">
                  <div className="text-[8px] text-stone uppercase">Diplomacy</div>
                  <span className="text-parchment">{selectedAdvisor.diplomacy}</span>
                </div>
                <div className="bg-ink border p-1 rounded-md">
                  <div className="text-[8px] text-stone uppercase">Martial</div>
                  <span className="text-parchment">{selectedAdvisor.martial}</span>
                </div>
                <div className="bg-ink border p-1 rounded-md">
                  <div className="text-[8px] text-stone uppercase">Stewards</div>
                  <span className="text-parchment">{selectedAdvisor.stewardship}</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-stone/15">
                <span className="text-[10px] text-stone uppercase tracking-widest font-mono font-bold block">Assign Active Operations</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => handleCoordinateAdvisors('COLLECT_TAXES')}
                    className="py-2 bg-ink border border-stone hover:bg-stone hover:text-gold text-parchment transition-all rounded font-bold uppercase text-[9.5px] cursor-pointer"
                  >
                    Collect Taxes
                  </button>
                  <button
                    onClick={() => handleCoordinateAdvisors('FOSTER_RELATIONS')}
                    className="py-2 bg-ink border border-stone hover:bg-stone hover:text-gold text-parchment transition-all rounded font-bold uppercase text-[9.5px] cursor-pointer"
                  >
                    Foster Alliances
                  </button>
                  <button
                    onClick={() => handleCoordinateAdvisors('TRAIN_MILITIA')}
                    className="py-2 bg-ink border border-stone hover:bg-stone hover:text-gold text-parchment transition-all rounded font-bold uppercase text-[9.5px] cursor-pointer"
                  >
                    Muster Militia
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 italic font-serif text-stone-light">Select an advisor to assign tasks.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. ESTATE MODAL (Estate Power Balance)
// ==========================================
export function EstateModal() {
  const [privilege, setPrivilege] = useState<'CLERGY' | 'NOBILITY' | 'MERCHANT'>('CLERGY');

  const handleGrantPrivilege = () => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: { text: `Granted dynamic estate charters of privilege to the ${privilege}. Estate alignment shifts.`, type: 'NORMAL' },
        },
      })
    );
    alert(`Estate privilege charter stamped! Balance of power shift initiated.`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">High Chancellery Estates Board</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Balance the demands of Nobles, Clergy, and Merchants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 text-center text-xs font-mono font-semibold">
        {/* Clergy estate card */}
        <div className="border border-stone p-4 rounded-xl bg-ink-lighter space-y-2">
          <span className="text-2xl">⛪</span>
          <h4 className="font-serif font-black text-parchment">Holy Clergy</h4>
          <span className="text-[10px] text-amber-500 font-bold block">★ 42% Influence</span>
          <div className="text-[9px] text-stone-light">Loyalty: <strong className="text-emerald-400">75%</strong></div>
        </div>

        {/* Nobility estate card */}
        <div className="border border-stone p-4 rounded-xl bg-ink-lighter space-y-2">
          <span className="text-2xl">🛡️</span>
          <h4 className="font-serif font-black text-parchment">Gentry Nobility</h4>
          <span className="text-[10px] text-red-400 font-bold block">★ 35% Influence</span>
          <div className="text-[9px] text-stone-light">Loyalty: <strong className="text-rose-400">38%</strong></div>
        </div>

        {/* Merchant estate card */}
        <div className="border border-stone p-4 rounded-xl bg-ink-lighter space-y-2">
          <span className="text-2xl">🪙</span>
          <h4 className="font-serif font-black text-parchment">Guild Merchants</h4>
          <span className="text-[10px] text-emerald-400 font-bold block">★ 23% Influence</span>
          <div className="text-[9px] text-stone-light">Loyalty: <strong className="text-emerald-400">60%</strong></div>
        </div>
      </div>

      <div className="border border-stone bg-ink-lighter p-5 rounded-xl flex flex-col justify-between">
        <div className="space-y-3.5">
          <span className="text-[11px] text-stone uppercase tracking-widest font-mono font-bold block">Erect Estate Privilege Charters</span>
          <div className="grid grid-cols-3 gap-2 bg-panel p-1 border rounded-lg border-stone/30">
            {(['CLERGY', 'NOBILITY', 'MERCHANT'] as const).map((est) => (
              <button
                key={est}
                onClick={() => setPrivilege(est)}
                className={`py-1.5 text-[9.5px] font-sans font-bold uppercase rounded-md cursor-pointer transition-all ${
                  privilege === est ? 'bg-ink text-accent border border-stone/20 shadow-xs' : 'text-stone-light hover:text-parchment'
                }`}
              >
                {est} Privileges
              </button>
            ))}
          </div>

          <div className="bg-ink border border-neutral-700/40 p-4.5 rounded-lg text-xs leading-relaxed text-stone-light font-sans">
            {privilege === 'CLERGY' && (
              <div>
                <strong className="text-accent font-serif block mb-1">Ecclesiastical Land Charter Devout:</strong>
                Sponsor monastery wine yards & tithe collections. Grants <b className="text-emerald-400 font-mono">+1.5 Piety daily</b>, but triggers a <b className="text-rose-400 font-mono">15% tax deduction</b> block.
              </div>
            )}
            {privilege === 'NOBILITY' && (
              <div>
                <strong className="text-accent font-serif block mb-1">Scutage Knight Conscription Exempt:</strong>
                Excuse castle barons from immediate scutage taxes. Raises <b className="text-emerald-400 font-mono">+25% standing army Levy enlist sizes</b>, but drops daily income by <b className="text-rose-400 font-mono">-18 Gold coins</b>.
              </div>
            )}
            {privilege === 'MERCHANT' && (
              <div>
                <strong className="text-accent font-serif block mb-1">Monopoly Guild Shipping Protection:</strong>
                Grant exclusive timber harbor shipping rights to Venetian consortiums. Yields a massive <b className="text-emerald-400 font-mono">+35 gold/day</b>, but drops peasent guild loyalties by <b className="text-rose-400 font-mono">-15%</b>.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleGrantPrivilege}
          className="w-full mt-6 py-2.5 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer flex items-center justify-center gap-1"
        >
          <Landmark className="w-4 h-4 shadow-sm" /> Stamp House Privileges
        </button>
      </div>
    </div>
  );
}
