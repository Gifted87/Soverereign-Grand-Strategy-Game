import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Shield, Plus, Minus, Swords, Coins, 
  BookOpen, Heart, Flame, Landmark, Sparkles, Compass, Check, Users 
} from 'lucide-react';

const COAT_OF_ARMS_SYMBOLS = [
  { id: 'oak_tree', label: 'Oak Tree', icon: '🌳', desc: 'Symbol of endurance and static strength' },
  { id: 'lion', label: 'Lion Rampant', icon: '🦁', desc: 'Badge of high martial valiancy and royalty' },
  { id: 'crown', label: 'Imperial Crown', icon: '👑', desc: 'Denotes direct claim to sovereign domains' },
  { id: 'sword', label: 'Shattered Sword', icon: '⚔️', desc: 'Shows ancestral blood oaths of vengeance' },
  { id: 'cross', label: 'Holy Cross', icon: '✝️', desc: 'Denotes unwavering zeal and divine warrant' },
  { id: 'boar', label: 'Wild Boar', icon: '🐗', desc: 'Ferocity in territorial defense and feasts' },
  { id: 'grape', label: 'Gilded Chalice', icon: '🍷', desc: 'Emblem of prosperity, culture, and high lineage' }
];

const COA_COLORS = [
  { id: 'green', label: 'Forest Green', hex: 'bg-emerald-800 text-emerald-100 border-emerald-950' },
  { id: 'red', label: 'Crimson Blood', hex: 'bg-red-800 text-red-100 border-red-950' },
  { id: 'blue', label: 'Royal Blue', hex: 'bg-blue-800 text-blue-100 border-blue-950' },
  { id: 'gold', label: 'Sovereign Gold', hex: 'bg-amber-600 text-amber-950 border-amber-850' },
  { id: 'silver', label: 'Ancestral Silver', hex: 'bg-zinc-600 text-zinc-100 border-zinc-800' },
  { id: 'purple', label: 'Imperial Purple', hex: 'bg-purple-800 text-purple-100 border-purple-950' },
  { id: 'charcoal', label: 'Obsidian Black', hex: 'bg-zinc-900 text-zinc-100 border-black' }
];

const BIRTH_PROVINCES = [
  {
    id: 'prov_1',
    name: 'Valedor Heartlands',
    cultureId: 'valedorian',
    cultureName: 'Valedorian',
    languages: ['Low Aurelian', 'High Imperial'],
    terrain: 'RIVER_VALLEY',
    heritageBonus: '+2 Diplomacy. Broad grain river basin.',
    statsBonus: { diplomacy: 2 },
    desc: 'The fertile river basin of Valedor has birthed dynasties of immense legitimacy and agrarian power.'
  },
  {
    id: 'prov_2',
    name: 'Sarn Free City',
    cultureId: 'sarnic',
    cultureName: 'Sarnic',
    languages: ['Sarnic', 'Low Aurelian'],
    terrain: 'COAST',
    heritageBonus: '+2 Stewardship. Wealthy banks and maritime ports.',
    statsBonus: { stewardship: 2 },
    desc: 'Battered by warm delta winds, the port republic of Sarn excels in mercantile credit and toll collection.'
  },
  {
    id: 'prov_3',
    name: 'High Marches',
    cultureId: 'marcher',
    cultureName: 'Marcher',
    languages: ['Marcher', 'Gaelic'],
    terrain: 'MOUNTAINS',
    heritageBonus: '+2 Piety. Mountain frontier fortresses.',
    statsBonus: { learning: 1, martial: 1 },
    desc: 'The towering crag-fortresses of the High Marches guard strategic passes into Aurelia\'s mountain spine.'
  },
  {
    id: 'prov_4',
    name: 'Cathedral Basin',
    cultureId: 'theocratic',
    cultureName: 'Theocratic',
    languages: ['High Imperial', 'Low Aurelian'],
    terrain: 'HILLS',
    heritageBonus: '+2 Intrigue. Holy monastic estates.',
    statsBonus: { intrigue: 2 },
    desc: 'A sacred enclave where sovereign bishops govern vast monastic lands, and daggers guard holy relics.'
  },
  {
    id: 'prov_5',
    name: 'Salt Steppes',
    cultureId: 'nomadic',
    cultureName: 'Nomadic',
    languages: ['Steppe Cult', 'Low Aurelian'],
    terrain: 'PLAINS',
    heritageBonus: '+2 Martial. Masterful horse breeding.',
    statsBonus: { martial: 2 },
    desc: 'The harsh salt flats and arid grasslands dominated by proud mobile horse confederations.'
  }
];

const AMBITION_OPTIONS = [
  { id: 'POWER', label: 'Unchecked Power', icon: Swords, desc: 'Conquer rival holdings, crush foreign resistance, and vassalize the surrounding liegemen.' },
  { id: 'WEALTH', label: 'Hoarded Wealth', icon: Coins, desc: 'Squeeze taxes from merchants and builders to accumulate a pristine treasury of gold.' },
  { id: 'LEGACY', label: 'Eternal Dynasty', icon: (props: any) => <Users className="w-5 h-5" />, desc: 'Focus on producing high-fertility healthy heirs, marriages, and high renown.' },
  { id: 'REVENGE', label: 'Sovereign Ruin', icon: Flame, desc: 'Completely depose and break Duke Berold of Sarn to avenge historical slights.' },
  { id: 'PIETY', label: 'Holy Ascension', icon: Sparkles, desc: 'Maintain grand cathedrals, secure clergy favor, and die with high religious renown.' },
  { id: 'FREEDOM', label: 'Peasant Liberty', icon: Compass, desc: 'Reduce feudal levies, keep regional loyalty high, and abolish tyrannical land taxes.' }
];

const TRAIT_OPTIONS = [
  { id: 'BRAVE', name: 'Brave', desc: 'Fearless on the field. +2 Martial, +1 Diplomacy, -1 Intrigue.', stats: { martial: 2, diplomacy: 1, intrigue: -1 } },
  { id: 'DILIGENT', name: 'Diligent', desc: 'Works night and day. +1 to Stewardship, Learning, Martial, and Diplomacy.', stats: { stewardship: 1, learning: 1, martial: 1, diplomacy: 1 } },
  { id: 'PATIENT', name: 'Patient', desc: 'Waits for perfect moments. +2 Learning, +1 Stewardship, +1 Intrigue.', stats: { learning: 2, stewardship: 1, intrigue: 1 } },
  { id: 'JUST', name: 'Just', desc: 'Deeply values structural laws. +2 Stewardship, +1 Learning, -2 Intrigue.', stats: { stewardship: 2, learning: 1, intrigue: -2 } },
  { id: 'HONEST', name: 'Honest', desc: 'Mouthpiece of plain truth. +1 Diplomacy, -3 Intrigue.', stats: { diplomacy: 1, intrigue: -3 } },
  { id: 'KIND', name: 'Kind', desc: 'Feels sympathy for commoners. +2 Diplomacy, -1 Intrigue.', stats: { diplomacy: 2, intrigue: -1 } },
  { id: 'AMBITIOUS', name: 'Ambitious', desc: 'Desires absolute ranks. +1 to ALL stats but increases religious tension.', stats: { diplomacy: 1, martial: 1, stewardship: 1, intrigue: 1, learning: 1 } },
  { id: 'ZEALOUS', name: 'Zealous', desc: 'Soldier of the faith. +20 starting Piety, +1 Martial, -1 Diplomacy.', stats: { martial: 1, diplomacy: -1 } }
];

const SCENARIOS = [
  {
    id: 'MINOR_LORD',
    title: 'Minor Lord (The Crown Claimant)',
    icon: Landmark,
    startingGold: 1500,
    difficulty: 'Easy / Moderate',
    pros: 'Peaceful borders, 1,500 gold, starting serfs loyalty is high.',
    cons: 'Small army, sneaky vassals Robert and Geoffrey are plotting.',
    desc: 'You inherit the humble fields of Valedor. Build up your economic infrastructure, keep the loyalties, and establish your legitimacy gradually.'
  },
  {
    id: 'WARLORD',
    title: 'Warlord (The Iron Host)',
    icon: Swords,
    startingGold: 100,
    difficulty: 'Hard / Aggressive',
    pros: 'Powerful cohort of 1,600 highly trained elite campaign knights.',
    cons: 'Starting treasury is extremely dry. Large upkeep deficit. Hostile borders.',
    desc: 'No time to count coppers. Gather your veterans, march on Duke Berold of Sarn, and seize neighboring baronies before bankruptcy triggers a civil mutiny!'
  },
  {
    id: 'MERCHANT_PRINCE',
    title: 'Merchant Prince (The Silver Fleet)',
    icon: Coins,
    difficulty: 'Easy / Wealthy',
    pros: 'A staggering 6,000 starting gold and a passive trade return of +180 per month.',
    cons: 'Weak standing army of only 150 recruits. Vulnerable to siege.',
    desc: 'Govern the wealthy coastal harbor of Sarn. Hire mercenary hosts to fight your skirmishes while you buy off hostile counts and build grand keep structures.'
  },
  {
    id: 'REBEL',
    title: 'Rebel (Outlaws of the Basin)',
    icon: Flame,
    difficulty: 'Very Hard / Extreme',
    pros: 'Leads 1,800 zealous rebel peasant mobs and defectors ready to die for you.',
    cons: 'You own zero castles! Homeless. Hostile starting liege is searching for you.',
    desc: 'Falsely stripped of your title, you start in open revolt inside Valedor. Throw the castle gates open, conquer a permanent holding, and rewrite the laws!'
  },
  {
    id: 'CRUSADER',
    title: 'Crusader (Shield of the Peaks)',
    icon: Sparkles,
    difficulty: 'Hard / Religious Tension',
    pros: 'Controls the holy mountain citadel of High Marches with 800 zealous Templars.',
    cons: 'Foreign language and culture lead to low local peasant loyalty (30%).',
    desc: 'Arriving in foreign mountains with 2,000 crusader gold, you must convert local heretics, quell constant rural unrest, and hold the sacred mountain passes.'
  }
];

export function NewGame() {
  const navigate = useNavigate();
  const setStartingSetup = useGameStore(state => state.setStartingSetup);

  const [step, setStep] = useState<number>(1);
  const [characterName, setCharacterName] = useState('John');
  const [dynastyName, setDynastyName] = useState('Valedor');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');

  // Coat of arms
  const [coaColorPrimary, setCoaColorPrimary] = useState('green');
  const [coaColorSecondary, setCoaColorSecondary] = useState('silver');
  const [coaSymbol, setCoaSymbol] = useState('oak_tree');

  // Heritage / Birth path
  const [birthProvinceId, setBirthProvinceId] = useState('prov_1');

  // Character stats allocation (Starts at a base of 5, player allocates 20 points)
  const [stats, setStats] = useState({
    diplomacy: 5,
    martial: 5,
    stewardship: 5,
    intrigue: 5,
    learning: 5
  });
  const maxPoints = 20;

  const pointsUsed = (Object.values(stats) as number[]).reduce((a, b) => a + (b - 5), 0);
  const pointsLeft = maxPoints - pointsUsed;

  // Psychology/Traits/Ambitions
  const [ambition, setAmbition] = useState('POWER');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['BRAVE', 'DILIGENT']);

  // Starting situation
  const [startingSituation, setStartingSituation] = useState('MINOR_LORD');

  const handleStatChange = (stat: keyof typeof stats, amount: number) => {
    if (amount > 0 && pointsLeft <= 0) return;
    const currentVal = stats[stat];
    if (amount < 0 && currentVal <= 5) return;
    if (amount > 0 && currentVal >= 20) return;

    setStats(prev => ({
      ...prev,
      [stat]: prev[stat] + amount
    }));
  };

  const handleTraitToggle = (traitId: string) => {
    if (selectedTraits.includes(traitId)) {
      setSelectedTraits(prev => prev.filter(id => id !== traitId));
    } else {
      if (selectedTraits.length >= 2) return; // exactly 2 starting traits
      setSelectedTraits(prev => [...prev, traitId]);
    }
  };

  const currentBirthProvince = BIRTH_PROVINCES.find(bp => bp.id === birthProvinceId)!;
  const currentScenario = SCENARIOS.find(s => s.id === startingSituation)!;

  // Compute live traits-adjusted stats sum for character summary
  const getAdjustedStats = () => {
    const adjusted = { ...stats };
    // Adjust by birth province bonuses
    Object.entries(currentBirthProvince.statsBonus).forEach(([st, value]) => {
      adjusted[st as keyof typeof stats] = (adjusted[st as keyof typeof stats] || 5) + value;
    });
    // Adjust by starting trait modifiers
    selectedTraits.forEach(tId => {
      const tr = TRAIT_OPTIONS.find(t => t.id === tId);
      if (tr) {
        Object.entries(tr.stats).forEach(([st, value]) => {
          adjusted[st as keyof typeof stats] = (adjusted[st as keyof typeof stats] || 5) + value;
        });
      }
    });
    return adjusted;
  };

  const adjustedStats = getAdjustedStats();

  const handleLaunchGame = () => {
    let currentStats = { ...stats };
    if (pointsLeft > 0) {
      // Auto-distribute remaining points
      let remaining = pointsLeft;
      const statKeys = ['diplomacy', 'martial', 'stewardship', 'intrigue', 'learning'] as const;
      while (remaining > 0) {
        const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
        if (currentStats[randomStat] < 20) {
          currentStats[randomStat] += 1;
          remaining -= 1;
        }
      }
      setStats(currentStats);
    }

    if (selectedTraits.length !== 2) {
      alert("Please choose exactly 2 starting traits to forge your psychology.");
      return;
    }

    // Live calculate stats using currentStats to prevent state timing issues
    const currentBirthProvince = BIRTH_PROVINCES.find(bp => bp.id === birthProvinceId)!;
    const adjusted = { ...currentStats };
    // Adjust by birth province bonuses
    Object.entries(currentBirthProvince.statsBonus).forEach(([st, value]) => {
      adjusted[st as keyof typeof stats] = (adjusted[st as keyof typeof stats] || 5) + value;
    });
    // Adjust by starting trait modifiers
    selectedTraits.forEach(tId => {
      const tr = TRAIT_OPTIONS.find(t => t.id === tId);
      if (tr) {
        Object.entries(tr.stats).forEach(([st, value]) => {
          adjusted[st as keyof typeof stats] = (adjusted[st as keyof typeof stats] || 5) + value;
        });
      }
    });

    const payload = {
      characterName,
      dynastyName,
      gender,
      coatOfArms: {
        colors: [coaColorPrimary, coaColorSecondary],
        charges: [coaSymbol]
      },
      birthProvinceId,
      stats: adjusted,
      traits: selectedTraits,
      ambition,
      startingSituation
    };

    if (setStartingSetup) {
      setStartingSetup(payload);
    }
    // Speed-skip navigation to simulation active panel
    navigate('/game');
  };

  const primaryCOA = COA_COLORS.find(c => c.id === coaColorPrimary) || COA_COLORS[0];
  const secondaryCOA = COA_COLORS.find(c => c.id === coaColorSecondary) || COA_COLORS[1];
  const symbolCOA = COAT_OF_ARMS_SYMBOLS.find(s => s.id === coaSymbol) || COAT_OF_ARMS_SYMBOLS[0];

  return (
    <div className="min-h-screen bg-ink text-parchment font-body flex flex-col overflow-y-auto border-[12px] border-ink-light selection:bg-gold selection:text-ink select-none relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone/10 via-transparent to-transparent pointer-events-none" />

      {/* Decorative Header */}
      <header className="py-6 border-b border-stone/30 bg-ink-light flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-gold animate-pulse" />
          <div>
            <h1 className="font-header text-lg uppercase tracking-[0.3em] text-gold">Sovereign Chronicles</h1>
            <p className="text-[10px] uppercase font-sans tracking-widest text-stone-light">Grand Character Creator &amp; Scenario Builder</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 border border-stone/50 bg-ink px-4 py-2 text-xs font-sans uppercase tracking-widest text-stone-light hover:text-gold hover:border-gold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Main Menu
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-6 z-10 items-stretch">
        
        {/* Creation Form Panel */}
        <div className="flex-1 bg-ink-light border border-stone/30 p-6 flex flex-col justify-between rounded-lg relative overflow-hidden shadow-xl min-h-[580px]">
          <div>
            {/* Step Indicators */}
            <div className="flex items-center gap-2 mb-6 border-b border-stone/20 pb-4 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest transition-all rounded-sm border ${
                    step === s 
                      ? 'border-gold text-gold bg-stone/20 font-bold' 
                      : 'border-transparent text-stone hover:text-stone-light'
                  }`}
                >
                  <span className="font-data">{s}.</span>
                  {s === 1 && 'Dynasty'}
                  {s === 2 && 'Heritage'}
                  {s === 3 && 'Attributes'}
                  {s === 4 && 'Psychology'}
                  {s === 5 && 'Scenario'}
                </button>
              ))}
            </div>

            {/* Stepped Views */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/10">House &amp; Dynasty Name</h2>
                    <p className="text-xs text-stone-light mt-1">Sovereign rulers need an illustrious household and unique heraldry to project regional fear and respect.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gold mb-1.5 font-bold">Ruler Forename</label>
                      <input 
                        type="text" 
                        value={characterName} 
                        onChange={(e) => setCharacterName(e.target.value)} 
                        maxLength={18}
                        className="w-full bg-ink border border-stone/40 px-4 py-2.5 rounded-sm focus:outline-none focus:border-gold font-serif text-lg tracking-wide text-parchment" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gold mb-1.5 font-bold">House Surname (Dynasty)</label>
                      <input 
                        type="text" 
                        value={dynastyName} 
                        onChange={(e) => setDynastyName(e.target.value)} 
                        maxLength={18}
                        className="w-full bg-ink border border-stone/40 px-4 py-2.5 rounded-sm focus:outline-none focus:border-gold font-serif text-lg tracking-wide text-parchment" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-gold font-bold">Ruler Gender Preference</label>
                    <div className="flex gap-4">
                      {['MALE', 'FEMALE'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g as any)}
                          className={`flex-1 py-2 text-xs uppercase tracking-widest border transition-all ${
                            gender === g 
                              ? 'border-gold bg-gold/10 text-gold font-bold' 
                              : 'border-stone/30 bg-ink hover:border-stone-light text-stone-light'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Heraldry Editor */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-header text-sm text-gold tracking-wider uppercase">Coat-of-Arms Crest Shield</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Shield Colors */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-stone-light block mb-1">Primary Color</span>
                          <div className="flex flex-wrap gap-1.5">
                            {COA_COLORS.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setCoaColorPrimary(c.id)}
                                className={`w-7 h-7 rounded-full border-2 ${
                                  coaColorPrimary === c.id ? 'border-amber-500 scale-110' : 'border-stone/40 hover:scale-105'
                                } ${c.hex.split(' ')[0]}`}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-stone-light block mb-1">Secondary Color</span>
                          <div className="flex flex-wrap gap-1.5">
                            {COA_COLORS.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setCoaColorSecondary(c.id)}
                                className={`w-7 h-7 rounded-full border-2 ${
                                  coaColorSecondary === c.id ? 'border-amber-500 scale-110' : 'border-stone/40 hover:scale-105'
                                } ${c.hex.split(' ')[0]}`}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Shield Symbol Charges */}
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-stone-light block mb-1">Crest Symbol Charge</span>
                        <div className="grid grid-cols-4 gap-1 bg-ink p-1.5 border border-stone/30 rounded-sm">
                          {COAT_OF_ARMS_SYMBOLS.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setCoaSymbol(s.id)}
                              className={`py-2 text-xl hover:bg-stone/10 transition-colors border ${
                                coaSymbol === s.id ? 'border-gold bg-stone/20' : 'border-transparent'
                              }`}
                              title={`${s.label}: ${s.desc}`}
                            >
                              {s.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/10">Birth Province &amp; Cultural Heritage</h2>
                    <p className="text-xs text-stone-light mt-1">Your birth city decides your primary heritage culture, passive attribute bonuses, and foreign court languages spoken.</p>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {BIRTH_PROVINCES.map((bp) => (
                      <div
                        key={bp.id}
                        onClick={() => setBirthProvinceId(bp.id)}
                        className={`border p-3.5 flex items-start gap-4 cursor-pointer transition-all ${
                          birthProvinceId === bp.id
                            ? 'border-gold bg-gold/5'
                            : 'border-stone/30 bg-ink hover:border-stone-light'
                        }`}
                      >
                        <div className="w-12 h-12 shrink-0 bg-stone rounded-sm border border-stone-light/40 flex items-center justify-center text-xl font-header font-bold text-gold">
                          {bp.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-serif text-base text-gold">{bp.name} ({bp.terrain})</span>
                            <span className="text-[9px] uppercase font-sans tracking-widest bg-stone px-2 py-0.5 text-stone-light border border-stone/50">{bp.cultureName} Culture</span>
                          </div>
                          <p className="text-xs text-stone-light font-sans mt-1 leading-relaxed">{bp.desc}</p>
                          <div className="mt-2 flex gap-3 text-[10px] font-data text-gold">
                            <span className="bg-ink-light px-1.5 border border-stone/10">{bp.heritageBonus}</span>
                            <span className="bg-ink-light px-1.5 border border-stone/10">Languages: {bp.languages.join(', ')}</span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          birthProvinceId === bp.id ? 'border-gold text-gold bg-gold/10' : 'border-stone/50'
                        }`}>
                          {birthProvinceId === bp.id && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/10">Distribute Attribute Points</h2>
                    <p className="text-xs text-stone-light mt-1">Distribute exactly 20 stat points. These values combine with starting traits and family legacies to decide character power.</p>
                  </div>

                  <div className="bg-ink p-4 border border-stone/30 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-stone-light block">Sovereign Focus points left</span>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-2xl text-gold tracking-wider">{pointsLeft} <span className="text-xs text-stone-light">/ {maxPoints}</span></span>
                        {pointsLeft > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              let remaining = pointsLeft;
                              const statKeys = ['diplomacy', 'martial', 'stewardship', 'intrigue', 'learning'] as const;
                              const newStats = { ...stats };
                              while (remaining > 0) {
                                const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                                if (newStats[randomStat] < 20) {
                                  newStats[randomStat] += 1;
                                  remaining -= 1;
                                }
                              }
                              setStats(newStats);
                            }}
                            className="px-2.5 py-1 border border-gold/50 bg-gold/10 hover:bg-gold hover:text-ink text-gold text-[10px] uppercase tracking-wider rounded-sm transition-all font-bold cursor-pointer"
                          >
                            Auto-Distribute
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-stone-light text-right leading-relaxed max-w-xs font-sans">
                      All five domains of sovereignty decide how effectively your orders are executed across the realms.
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { key: 'diplomacy', label: 'Diplomacy', desc: 'Increases court vassal Opinions and charm event sways.', icon: '📜' },
                      { key: 'martial', label: 'Martial', desc: 'Accelerates cohort recruitment, battle morale, and army sizes.', icon: '🛡️' },
                      { key: 'stewardship', label: 'Stewardship', desc: 'Maximizes merchant taxes, grain productions, and gold profits.', icon: '💰' },
                      { key: 'intrigue', label: 'Intrigue', desc: 'Amplifies dynamic shadow plots and spymaster operations.', icon: '🗡️' },
                      { key: 'learning', label: 'Learning', desc: 'Strengthens medical recovery yields and cathedral faith.', icon: '📖' }
                    ].map((st) => (
                      <div key={st.key} className="flex items-center justify-between border-b border-stone/15 pb-3">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{st.icon}</span>
                            <span className="font-serif text-base text-gold">{st.label}</span>
                            <span className="text-xs font-data text-stone-light">({stats[st.key as keyof typeof stats]} Base)</span>
                          </div>
                          <p className="text-[11px] text-stone-light font-sans leading-relaxed mt-0.5">{st.desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleStatChange(st.key as any, -1)}
                            disabled={stats[st.key as keyof typeof stats] <= 5}
                            className="w-8 h-8 rounded-full border border-stone hover:border-gold hover:text-gold flex items-center justify-center bg-ink disabled:opacity-30 disabled:border-stone/20 disabled:hover:text-stone-light transition-all cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-lg font-data text-gold font-bold">
                            {stats[st.key as keyof typeof stats]}
                          </span>
                          <button
                            onClick={() => handleStatChange(st.key as any, 1)}
                            disabled={pointsLeft <= 0 || stats[st.key as keyof typeof stats] >= 20}
                            className="w-8 h-8 rounded-full border border-stone hover:border-gold hover:text-gold flex items-center justify-center bg-ink disabled:opacity-30 disabled:border-stone/20 disabled:hover:text-gold transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/10">Ambitions &amp; Psychological Traits</h2>
                    <p className="text-xs text-stone-light mt-1">Select your ultimate ambition and exactly 2 starting personality qualities to decide starting behaviors and opinions.</p>
                  </div>

                  {/* Ambition Row */}
                  <div className="space-y-2">
                    <h3 className="font-header text-[10px] uppercase tracking-widest text-gold font-bold pb-1 border-b border-stone/10">Dynamic Sovereign Ambition</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {AMBITION_OPTIONS.map((amb) => {
                        const Icon = amb.icon;
                        return (
                          <div
                            key={amb.id}
                            onClick={() => setAmbition(amb.id)}
                            className={`p-2 border rounded-sm cursor-pointer transition-all flex flex-col justify-between ${
                              ambition === amb.id
                                ? 'border-gold bg-gold/5 text-gold'
                                : 'border-stone/35 bg-ink text-stone hover:text-stone-light hover:border-stone-light'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="font-serif text-xs font-bold">{amb.label}</span>
                            </div>
                            <p className="text-[9px] font-sans text-stone-light leading-relaxed mt-1">{amb.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Personality Traits Row */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-1 border-b border-stone/10 mb-2">
                      <h3 className="font-header text-[10px] uppercase tracking-widest text-gold font-bold">Select Starting Traits (Pick Exactly 2)</h3>
                      <span className="text-xs font-data text-gold bg-stone px-2">{selectedTraits.length} / 2 Selected</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {TRAIT_OPTIONS.map((tr) => {
                        const isSelected = selectedTraits.includes(tr.id);
                        return (
                          <div
                            key={tr.id}
                            onClick={() => handleTraitToggle(tr.id)}
                            className={`p-2 border transition-all cursor-pointer flex justify-between gap-2 items-center ${
                              isSelected
                                ? 'border-gold bg-gold/5'
                                : 'border-stone/30 bg-ink hover:border-stone-light'
                            }`}
                          >
                            <div className="flex-1">
                              <span className="text-xs text-gold font-serif font-bold block">{tr.name}</span>
                              <span className="text-[10px] text-stone-light font-sans mt-0.5 leading-normal block">{tr.desc}</span>
                            </div>
                            <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-gold text-gold bg-gold/10' : 'border-stone/50'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="font-display text-2xl text-gold pb-1 border-b border-stone/10">Starting Situation Scenario</h2>
                    <p className="text-xs text-stone-light mt-1">Each scenario defines starting treasury balances, army sizes, vassal disputes, and regional loyalties.</p>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {SCENARIOS.map((sc) => {
                      const Icon = sc.icon;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setStartingSituation(sc.id)}
                          className={`border p-3 flex items-start gap-3 cursor-pointer transition-all ${
                            startingSituation === sc.id
                              ? 'border-gold bg-gold/5 shadow-inner'
                              : 'border-stone/30 bg-ink hover:border-stone-light'
                          }`}
                        >
                          <div className={`p-2.5 rounded-sm border shrink-0 ${
                            startingSituation === sc.id ? 'border-gold/50 bg-stone/20 text-gold' : 'border-stone/50 text-stone-light'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-serif text-gold block font-bold">{sc.title}</span>
                              <span className="text-[9px] font-data text-stone-light">Difficulty: {sc.difficulty}</span>
                            </div>
                            
                            <p className="text-xs text-stone-light mt-1 font-sans leading-relaxed">{sc.desc}</p>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] mt-2 font-sans">
                              <span className="text-emerald-500 font-bold">Pros: {sc.pros}</span>
                              <span className="text-rose-500 font-bold">Cons: {sc.cons}</span>
                            </div>
                          </div>

                          <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                            startingSituation === sc.id ? 'border-gold text-gold bg-gold/10' : 'border-stone/50'
                          }`}>
                            {startingSituation === sc.id && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stepper Buttons footer */}
          <div className="flex justify-between items-center border-t border-stone/20 pt-4 mt-6">
            <button
              onClick={() => step > 1 && setStep(s => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 border border-stone bg-ink px-4 py-2 text-xs font-sans uppercase tracking-widest text-stone hover:text-stone-light hover:border-stone-light disabled:opacity-35 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 border border-gold bg-stone/20 hover:bg-stone/35 text-gold px-5 py-2 text-xs font-sans uppercase tracking-widest transition-all cursor-pointer"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleLaunchGame}
                className="flex items-center gap-2 border-2 border-gold bg-gold hover:bg-gold/90 text-ink px-6 py-2.5 text-xs font-sans uppercase tracking-widest font-bold font-header transition-all shadow-lg animate-pulse"
              >
                Launch Dynasty <Sparkles className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* Live Dynasty Review Panel on Right */}
        <div className="w-full lg:w-80 bg-ink-light border border-stone/30 p-5 rounded-lg flex flex-col justify-between shrink-0 shadow-lg relative overflow-hidden">
          <div className="space-y-4">
            <div className="text-center pb-3 border-b border-stone/20">
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-light">Dynastic Scroll</span>
              <h2 className="font-header text-xl text-gold mt-1 font-bold">House {dynastyName}</h2>
              <span className="text-[11px] font-serif italic text-stone-light">Lead by Lord {characterName}</span>
            </div>

            {/* Shield Canvas Visualization */}
            <div className="my-4 flex justify-center">
              <div className="w-24 h-28 relative flex flex-col overflow-hidden border-2 border-gold rounded-t-xs rounded-b-[40px] shadow-lg">
                <div className={`w-full h-1/2 ${primaryCOA.hex.split(' ')[0]}`} />
                <div className={`w-full h-1/2 ${secondaryCOA.hex.split(' ')[0]}`} />
                <div className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none drop-shadow-md">
                  {symbolCOA.icon}
                </div>
              </div>
            </div>

            {/* Profile Lookups */}
            <div className="space-y-3 font-sans">
              <div className="border-b border-stone/10 pb-1.5 flex justify-between items-center text-xs">
                <span className="text-stone-light">Culture / Religion:</span>
                <span className="text-gold uppercase font-semibold text-[10px]">{currentBirthProvince.cultureName} / Christian</span>
              </div>
              <div className="border-b border-stone/10 pb-1.5 flex justify-between items-center text-xs">
                <span className="text-stone-light">Languages:</span>
                <span className="text-parchment text-[10px] font-bold">{currentBirthProvince.languages.join(', ')}</span>
              </div>
              <div className="border-b border-stone/10 pb-1.5 flex justify-between items-center text-xs">
                <span className="text-stone-light">Scenario:</span>
                <span className="text-gold uppercase tracking-wider text-[10px] font-bold">{startingSituation.replace('_', ' ')}</span>
              </div>
              <div className="border-b border-stone/10 pb-1.5 flex justify-between items-center text-xs">
                <span className="text-stone-light">Ambition:</span>
                <span className="text-blood font-semibold uppercase text-[10px]">{ambition}</span>
              </div>
            </div>

            {/* Display Stats review */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase tracking-widest text-gold font-bold block pb-1 border-b border-stone/15">Sovereign Properties</span>
              
              <div className="grid grid-cols-2 gap-1.5 font-sans">
                {[
                  { name: 'Diplomacy', key: 'diplomacy', color: 'text-sky' },
                  { name: 'Martial', key: 'martial', color: 'text-blood' },
                  { name: 'Stewardship', key: 'stewardship', color: 'text-emerald-500' },
                  { name: 'Intrigue', key: 'intrigue', color: 'text-purple-400' },
                  { name: 'Learning', key: 'learning', color: 'text-amber-500' }
                ].map((st) => (
                  <div key={st.key} className="bg-ink px-2 py-1 rounded-sm border border-stone/20 flex items-center justify-between">
                    <span className="text-[10px] text-stone-light truncate">{st.name}</span>
                    <span className={`text-xs font-bold font-data ${st.color}`}>
                      {adjustedStats[st.key as keyof typeof stats] || 5}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Display Traits review */}
            <div className="space-y-1 pt-2">
              <span className="text-[10px] uppercase tracking-widest text-gold font-bold block pb-1 border-b border-stone/15">Sovereign Traits</span>
              <div className="flex flex-wrap gap-1">
                {selectedTraits.map(tid => {
                  const tr = TRAIT_OPTIONS.find(t => t.id === tid);
                  return (
                    <span key={tid} className="bg-stone text-parchment border border-stone-light/30 px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm font-semibold">
                      {tr?.name}
                    </span>
                  );
                })}
                {selectedTraits.length === 0 && (
                  <span className="text-[10px] italic text-stone/50">No traits selected</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-stone/25 text-center font-data text-[10px] text-stone-light leading-normal">
            Every sovereign dynasty traces its path of ascent under blood, honor, and raw crowns. Build wisely.
          </div>
        </div>

      </div>
    </div>
  );
}
