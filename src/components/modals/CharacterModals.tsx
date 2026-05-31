import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { User, Shield, Award, Heart, HelpCircle, Users, Sparkles, UserX, Crown, Scroll, HardHat } from 'lucide-react';

// ==========================================
// 1. CHARACTER MODAL (Dynasty & Stat Profile)
// ==========================================
export function CharacterModal() {
  const { characters, resources, playerCharacter } = useGameStore() as any;
  const [selectedCharId, setSelectedCharId] = useState<string>('player');

  const charList = Object.values(characters || {}) as any[];
  const selectedChar = (characters?.[selectedCharId] || characters?.['player']) as any;
  const dynastyName = playerCharacter ? playerCharacter.lastName : 'Valedor';

  if (!selectedChar) {
    return (
      <div className="text-center py-10 text-stone-light">
        <Scroll className="w-10 h-10 mx-auto opacity-30 mb-2" />
        <p>No lineage or courtiers found. Begin a game first.</p>
      </div>
    );
  }

  const handleImprison = (charId: string) => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'IMPRISON_CHARACTER', payload: { charId } },
      })
    );
  };

  const handleBanish = (charId: string) => {
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'BANISH_CHARACTER', payload: { charId } },
      })
    );
  };

  const getStatColor = (val: number) => {
    if (val >= 16) return 'text-emerald-400 font-bold';
    if (val <= 6) return 'text-rose-400';
    return 'text-parchment';
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">The Royal Court of {dynastyName}</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Dynasty Profiles & Courtiers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Courtier List */}
        <div className="border border-stone bg-ink-lighter p-3 rounded-xl max-h-[420px] overflow-y-auto">
          <span className="text-[10px] text-stone uppercase tracking-wider block mb-2 font-bold font-mono">Dramatis Personae</span>
          <div className="space-y-2">
            {charList.map((c) => {
              const isSelected = selectedChar.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCharId(c.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-serif block text-parchment truncate font-bold">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="text-[9px] text-stone-light uppercase font-mono tracking-wider block">
                      {c.isPlayer ? 'Sovereign' : c.id === 'heir_player' ? 'Heir Apparent' : c.position?.name || 'Courtier'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-light">Age: {c.age}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Profile Detailed Stats */}
        <div className="md:col-span-2 border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 border-b border-stone/15 pb-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-panel border-2 border-accent/25 flex items-center justify-center text-3xl font-serif shrink-0 shadow-md">
                {selectedChar.gender === 'MALE' ? '👨‍💼' : '👩‍💼'}
              </div>
              <div>
                <h3 className="text-xl font-serif font-black text-parchment">
                  {selectedChar.firstName} {selectedChar.lastName}
                </h3>
                <span className="text-[10px] bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-full inline-block text-accent font-medium mt-1 font-mono tracking-wider uppercase">
                  {selectedChar.isPlayer ? 'House Head' : 'Sovereign Vassal'}
                </span>
                <div className="text-[11px] text-stone mt-1.5 flex gap-3">
                  <span>Age: <strong className="text-parchment font-medium">{selectedChar.age}</strong></span>
                  <span>Health: <strong className="text-emerald-400 font-mono font-medium">{selectedChar.health}/100</strong></span>
                  <span>Ambition: <strong className="text-accent uppercase font-mono font-medium">{selectedChar.ambition || 'LEGACY'}</strong></span>
                </div>
              </div>
            </div>

            {/* Matrix of Attribute Values */}
            <h4 className="text-[10px] uppercase font-mono text-stone-light tracking-widest mb-2 font-bold z-10">Sovereign Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center text-xs font-mono font-bold mb-4">
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Diplomacy</div>
                <span className={getStatColor(selectedChar.diplomacy)}>{selectedChar.diplomacy}</span>
              </div>
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Martial</div>
                <span className={getStatColor(selectedChar.martial)}>{selectedChar.martial}</span>
              </div>
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Stewardship</div>
                <span className={getStatColor(selectedChar.stewardship)}>{selectedChar.stewardship}</span>
              </div>
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Intrigue</div>
                <span className={getStatColor(selectedChar.intrigue)}>{selectedChar.intrigue}</span>
              </div>
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Learning</div>
                <span className={getStatColor(selectedChar.learning ?? 10)}>{selectedChar.learning ?? 10}</span>
              </div>
              <div className="bg-ink border border-stone/10 p-2 rounded-lg">
                <div className="text-[8px] text-stone uppercase tracking-wider mb-0.5">Piety</div>
                <span className="text-amber-500">{selectedChar.piety ?? 0}</span>
              </div>
            </div>

            {/* Character Traits */}
            <h4 className="text-[10px] uppercase font-mono text-stone-light tracking-widest mb-2 font-bold">Inherent Traits</h4>
            <div className="space-y-2 mb-4">
              {selectedChar.traits && selectedChar.traits.length > 0 ? (
                selectedChar.traits.map((trait, idx) => (
                  <div key={idx} className="bg-ink/50 border border-stone/15 p-2 rounded-lg text-[11px] leading-relaxed">
                    <strong className="text-accent capitalize font-serif block mb-0.5">{trait.name}</strong>
                    <span className="text-stone-light">{trait.description}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-stone-light/50 italic font-medium block text-center py-2 bg-ink/30 rounded-lg">No active psychological trauma or unique physical traits.</span>
              )}
            </div>
          </div>

          {/* Core Intrigues / Actions */}
          {!selectedChar.isPlayer && (
            <div className="pt-3 border-t border-stone/15 flex gap-2">
              <button
                onClick={() => handleImprison(selectedChar.id)}
                className="flex-1 py-1.5 px-3 bg-red-950/20 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all rounded-md text-[10px] uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-1"
              >
                <UserX className="w-3.5 h-3.5" /> Thrown in Dungeon
              </button>
              <button
                onClick={() => handleBanish(selectedChar.id)}
                className="flex-1 py-1.5 px-3 bg-panel border border-stone text-stone-light hover:text-parchment hover:border-gold transition-all rounded-md text-[10px] uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-1"
              >
                <Award className="w-3.5 h-3.5" /> Exile from Duchy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. HEIR MODAL (Succession Management)
// ==========================================
export function HeirModal() {
  const { characters } = useGameStore() as any;
  const player = characters?.['player'];
  const heir = characters?.['heir_player'];
  const spouse = characters?.['spouse_player'];

  const [educationFocus, setEducationFocus] = useState<'CHIVALIC' | 'SCHOLARLY' | 'EPISCOPAL' | 'ADMIN'>('CHIVALIC');

  if (!player || !heir) {
    return (
      <div className="text-center py-10 text-stone-light font-serif italic">
        Select active campaign template before viewing lineage succession.
      </div>
    );
  }

  const educationDescriptions = {
    CHIVALIC: 'Focus on swordplay, siege leadership, and heavy armor discipline. (+3 Martial, +10% Army Morale)',
    SCHOLARLY: 'Focus on ecclesiastical chronicles, foreign tongues, and jurisprudence. (+3 Learning, +10% Tech speed)',
    EPISCOPAL: 'Focus on monastic devotions, theological disputations, and charity. (+3 Piety, +15% Clergy Estate influence)',
    ADMIN: 'Focus on manor bookkeeping, merchant tariffs, and timber audits. (+3 Stewardship, +15% Gold Tax yield)',
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Dynastic Descent & Succession</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Securing {player.lastName} Crown Continuity</p>
      </div>

      <div className="border border-stone bg-ink-lighter p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-1.5 text-xs text-stone uppercase tracking-widest font-bold">
          <Crown className="w-4 h-4 text-gold" />
          <span>Active Lineage (House {player.lastName})</span>
        </div>

        {/* Chronological Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Sovereign Box */}
          <div className="border border-stone bg-ink p-4 rounded-xl relative flex flex-col justify-between">
            <span className="text-[8px] font-mono text-gold bg-gold/15 px-1.5 py-0.5 rounded-md absolute -top-2 left-3 border border-gold/30">CURRENT RULER</span>
            <div className="text-center pt-1.5">
              <span className="text-3xl">👑</span>
              <h4 className="font-serif text-sm font-bold mt-2 text-parchment">{player.firstName} {player.lastName}</h4>
              <p className="text-[10px] text-stone-light font-sans mt-0.5">Sovereign of Aurelia (Age {player.age})</p>
            </div>
          </div>

          {/* Consort Box */}
          <div className="border border-stone bg-ink p-4 rounded-xl relative flex flex-col justify-between">
            <span className="text-[8px] font-mono text-pink-400 bg-pink-950/20 px-1.5 py-0.5 rounded-md absolute -top-2 left-3 border border-pink-900/40">DUCHESS CONSORT</span>
            <div className="text-center pt-1.5">
              <span className="text-3xl">💍</span>
              <h4 className="font-serif text-sm font-bold mt-2 text-parchment">{spouse?.firstName || 'Clara'} {spouse?.lastName || 'Valerian'}</h4>
              <p className="text-[10px] text-stone-light font-sans mt-0.5">Spouse Consort (Age {spouse?.age || 38})</p>
            </div>
          </div>

          {/* Heir Box */}
          <div className="border border-stone bg-gradient-to-b from-accent/15 to-ink border-accent/40 p-4 rounded-xl relative flex flex-col justify-between">
            <span className="text-[8px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-md absolute -top-2 left-3 border border-accent/25 animate-pulse">PRIMARY HEIR</span>
            <div className="text-center pt-1.5">
              <span className="text-3xl">🐎</span>
              <h4 className="font-serif text-sm font-bold mt-2 text-parchment">{heir.firstName} {heir.lastName}</h4>
              <p className="text-[10px] text-stone-light font-sans mt-0.5">Eldest Son & Heir (Age {heir.age})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Heir Tutorial & Educational focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-md text-accent font-semibold mb-2.5">Law of Primogeniture</h3>
            <p className="text-xs text-stone-light leading-relaxed mb-3">
              House {player.lastName} succession is governed strictly by agnatic royal lineage birthrights. Upon your death, the eldest son will claim all sovereign lands and treasury titles.
            </p>
            <p className="text-xs text-stone-light leading-relaxed">
              Ensure your heir retains high favor towards his House, otherwise aggressive pretender factions may launch succession coups immediately upon crowning.
            </p>
          </div>
          <div className="bg-ink border border-stone/15 p-3 rounded-lg text-xs mt-4">
            <span className="font-mono text-[10px] text-stone uppercase tracking-wider block mb-1">Active Heir Favor:</span>
            <div className="flex justify-between items-center bg-panel border border-stone p-1 rounded-md">
              <span className="text-emerald-400 font-mono font-bold pl-2">★ 90% Relational Favor</span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-sm">Highly Devoted</span>
            </div>
          </div>
        </div>

        {/* Education focus */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-md text-parchment font-semibold mb-2">Configure Succession Education</h3>
            <p className="text-xs text-stone-light leading-relaxed mb-4">
              Select the scientific or marshal field that tutors will focus on to shape the future Duke's attributes.
            </p>

            <div className="grid grid-cols-2 gap-2 bg-panel p-1 rounded-xl border border-stone mb-4">
              {['CHIVALIC', 'SCHOLARLY', 'EPISCOPAL', 'ADMIN'].map((focus) => (
                <button
                  key={focus}
                  onClick={() => setEducationFocus(focus as any)}
                  className={`py-1.5 text-[10px] font-sans tracking-wide uppercase font-bold rounded-lg transition-all cursor-pointer ${
                    educationFocus === focus
                      ? 'bg-ink border border-stone text-accent shadow-sm'
                      : 'text-stone-light hover:text-parchment'
                  }`}
                >
                  {focus}
                </button>
              ))}
            </div>

            <div className="bg-ink border border-stone/15 p-3 rounded-xl text-xs leading-relaxed text-stone-light">
              <span className="font-semibold text-accent block mb-1">Focus Syllabus:</span>
              {educationDescriptions[educationFocus]}
            </div>
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('simulation_action', {
                  detail: { type: 'ADD_CHRONICLE', payload: { text: `Assigned the heir apparent to rigorous ${educationFocus} tutoring courses.`, type: 'NORMAL' } },
                })
              );
            }}
            className="w-full mt-4 py-2 bg-accent text-ink hover:bg-accent/90 transition-all font-sans font-bold uppercase text-[10.5px] rounded-lg cursor-pointer"
          >
            Sponsor Tutor Curriculums
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. MARRIAGE MODAL (Royal Unions)
// ==========================================
export function MarriageModal() {
  const { resources } = useGameStore();
  const [selectedAllianceSuitId, setSelectedAllianceSuitId] = useState<string>('suit_1');
  const gold = resources?.gold ?? 0;

  const suitors = [
    {
      id: 'suit_1',
      name: 'Princess Helena of Aquitaine',
      dynasty: 'Capetian Dynasty',
      age: 21,
      renownBonus: 100,
      pietyBonus: 40,
      traict: '🌿 Robust / Fertile',
      dowryGold: 400,
      allegienceDescription: 'Binding treaty with Western Marches. Factions gain +20% stability.',
      bio: 'Famed for botanical mastery and court elegance. Her union offers significant agricultural grain ties.',
    },
    {
      id: 'suit_2',
      name: 'Freiin Sigrid of Swabia',
      dynasty: 'Hohenstaufen Dynasty',
      age: 26,
      renownBonus: 150,
      pietyBonus: 10,
      traict: '🛡️ Shield Maiden / Brave',
      dowryGold: 200,
      allegienceDescription: 'Strong defensive front. Standing army upkeep costs drop by 15%.',
      bio: 'Raised amidst border castles, she is a staunch militarist with strategic eyes and profound tactical focus.',
    },
    {
      id: 'suit_3',
      name: 'Lucia d\'Este of Venice',
      dynasty: 'House of Este',
      age: 19,
      renownBonus: 60,
      pietyBonus: 30,
      traict: '🪙 Wealthy Heiress / Steward',
      dowryGold: 800,
      allegienceDescription: 'Merchant league access. Boosts harbor trade tariff incomes by +25%.',
      bio: 'Heir to maritime commercial networks. Her marriage chest brings unmitigated gold bricks.',
    },
  ];

  const selectedSuit = suitors.find(s => s.id === selectedAllianceSuitId) || suitors[0];

  const handleSponsorMarriage = () => {
    if (gold < 150) return;
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: {
          type: 'ADD_CHRONICLE',
          payload: {
            text: `Formed a holy royal marriage alliance with ${selectedSuit.name} of ${selectedSuit.dynasty}, collecting a dynamic dowry chest.`,
            type: 'CRITICAL',
          },
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent('simulation_action', {
        detail: { type: 'SPEND_GOLD', payload: { amount: -selectedSuit.dowryGold + 150 } }, // Dowry offset costs!
      })
    );
    alert(`Dynastic alliance formed! Collected dowry of ${selectedSuit.dowryGold} Gold!`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone/20">
        <h2 className="text-2xl font-serif font-bold text-accent">Dynastic Royal Marriages</h2>
        <p className="text-xs text-stone-light font-mono mt-0.5">Forging Holy Bloodline Alliances</p>
      </div>

      <div className="p-4 bg-ink-light border border-stone rounded-xl leading-relaxed text-xs text-stone-light">
        <span className="font-bold text-accent block mb-1">📜 Chivalric Code of Alliance:</span>
        Noble marriages consolidate power lines across medieval barriers. Arranged unions net substantial wealth dowries, family alignment renown, and buffer defensive agreements.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suitors selection card */}
        <div className="space-y-3">
          <span className="text-[10px] text-stone uppercase tracking-widest block font-bold font-mono">Available Noble Suitors</span>
          {suitors.map((suit) => (
            <button
              key={suit.id}
              onClick={() => setSelectedAllianceSuitId(suit.id)}
              className={`w-full text-left p-4 border rounded-xl transition-all flex items-center justify-between ${
                selectedAllianceSuitId === suit.id ? 'border-accent bg-accent/5' : 'border-stone/20 bg-ink hover:border-stone-light'
              }`}
            >
              <div>
                <h4 className="font-serif text-sm font-bold text-parchment">{suit.name}</h4>
                <p className="text-[10px] text-stone-light font-mono">{suit.dynasty} | Age {suit.age}</p>
              </div>
              <span className="text-emerald-400 font-mono text-xs font-bold">💵 +{suit.dowryGold} Dowry</span>
            </button>
          ))}
        </div>

        {/* Selected suitor details */}
        <div className="border border-stone bg-ink-lighter p-5 rounded-xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="border-b border-stone/15 pb-3">
              <span className="text-3xl">🕊️</span>
              <h3 className="font-serif text-md font-bold text-parchment mt-2">{selectedSuit.name}</h3>
              <p className="text-[10px] text-accent font-mono uppercase tracking-widest font-medium">{selectedSuit.dynasty}</p>
            </div>

            <div className="space-y-2 text-xs text-stone-light">
              <p className="italic">"{selectedSuit.bio}"</p>
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span>Inherent Trait</span>
                <span className="text-emerald-400 font-bold">{selectedSuit.traict}</span>
              </div>
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span>Holy Renown Increment</span>
                <span className="text-gold font-bold">★ +{selectedSuit.renownBonus} Prestige</span>
              </div>
              <div className="flex justify-between border-t border-stone/10 pt-2 text-[11px]">
                <span>Contract Alliance Benefit</span>
                <span className="text-accent font-bold text-right">{selectedSuit.allegienceDescription}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone/15 mt-4 space-y-3.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-stone-light uppercase">Banquet Costs:</span>
              <span className={gold >= 150 ? 'text-gold font-bold' : 'text-danger font-bold'}>🪙 150 Gold</span>
            </div>
            <button
              onClick={handleSponsorMarriage}
              disabled={gold < 150}
              className={`w-full py-2.5 uppercase tracking-wider text-[11px] font-sans font-extrabold rounded-lg cursor-pointer transition-all ${
                gold >= 150
                  ? 'bg-accent text-ink border border-accent hover:bg-accent/90 shadow-md'
                  : 'bg-ink-light border-stone/15 text-stone-light/35 cursor-not-allowed'
              }`}
            >
              {gold >= 150 ? 'Form Covenant alliance' : 'Insufficient Treasury Funds'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
