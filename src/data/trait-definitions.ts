import { Trait } from '../core/models/Character';

export const TRAIT_DEFINITIONS: Record<string, Trait> = {
  // PERSONALITY TRAITS
  BRAVE: {
    id: 'BRAVE',
    name: 'Brave',
    description: 'This character is fearless in the face of danger.',
    category: 'PERSONALITY',
    statModifiers: { martial: 2, diplomacy: 1, intrigue: -1 },
    behaviorWeights: [{ decisionType: 'WAR', weightModifier: 25 }],
    opposedTraits: ['CRAVEN'],
    isCongenital: false,
    isVisible: true
  },
  CRAVEN: {
    id: 'CRAVEN',
    name: 'Craven',
    description: 'This character is easily frightened and flees from physical danger.',
    category: 'PERSONALITY',
    statModifiers: { martial: -2, intrigue: 2 },
    behaviorWeights: [{ decisionType: 'WAR', weightModifier: -40 }],
    opposedTraits: ['BRAVE'],
    isCongenital: false,
    isVisible: true
  },
  AMBITIOUS: {
    id: 'AMBITIOUS',
    name: 'Ambitious',
    description: 'This character desires power, prestige, and titles above all else.',
    category: 'PERSONALITY',
    statModifiers: { diplomacy: 1, martial: 1, stewardship: 1, intrigue: 1, learning: 1, piety: -10 },
    behaviorWeights: [{ decisionType: 'USURP', weightModifier: 50 }, { decisionType: 'EXPAND', weightModifier: 30 }],
    opposedTraits: ['CONTENT'],
    isCongenital: false,
    isVisible: true
  },
  CONTENT: {
    id: 'CONTENT',
    name: 'Content',
    description: 'This character is happy with their station in life.',
    category: 'PERSONALITY',
    statModifiers: { piety: 10, intrigue: -1 },
    behaviorWeights: [{ decisionType: 'USURP', weightModifier: -50 }, { decisionType: 'EXPAND', weightModifier: -25 }],
    opposedTraits: ['AMBITIOUS'],
    isCongenital: false,
    isVisible: true
  },
  GREEDY: {
    id: 'GREEDY',
    name: 'Greedy',
    description: 'This character has an insatiable lust for gold.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: 2, diplomacy: -1 },
    behaviorWeights: [{ decisionType: 'TAX_INCREASE', weightModifier: 35 }],
    opposedTraits: ['CHARITABLE'],
    isCongenital: false,
    isVisible: true
  },
  CHARITABLE: {
    id: 'CHARITABLE',
    name: 'Charitable',
    description: 'This character values generosity and helping others over hoarding wealth.',
    category: 'PERSONALITY',
    statModifiers: { diplomacy: 2, piety: 5 },
    behaviorWeights: [{ decisionType: 'DONATE', weightModifier: 40 }],
    opposedTraits: ['GREEDY'],
    isCongenital: false,
    isVisible: true
  },
  JUST: {
    id: 'JUST',
    name: 'Just',
    description: 'This character values fairness and the law above all.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: 2, learning: 1, intrigue: -2 },
    behaviorWeights: [{ decisionType: 'EXECUTE_WITHOUT_REASON', weightModifier: -100 }],
    opposedTraits: ['ARBITRARY'],
    isCongenital: false,
    isVisible: true
  },
  ARBITRARY: {
    id: 'ARBITRARY',
    name: 'Arbitrary',
    description: 'This character acts on whims and has little respect for laws or custom.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 2, stewardship: -2 },
    behaviorWeights: [{ decisionType: 'EXECUTE_WITHOUT_REASON', weightModifier: 60 }],
    opposedTraits: ['JUST'],
    isCongenital: false,
    isVisible: true
  },
  HONEST: {
    id: 'HONEST',
    name: 'Honest',
    description: 'This character speaks the truth, regardless of the consequences.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: -3, diplomacy: 1 },
    behaviorWeights: [{ decisionType: 'SCHEME', weightModifier: -60 }],
    opposedTraits: ['DECEITFUL'],
    isCongenital: false,
    isVisible: true
  },
  DECEITFUL: {
    id: 'DECEITFUL',
    name: 'Deceitful',
    description: 'This character speaks in half-truths and untruths.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 3, diplomacy: -2 },
    behaviorWeights: [{ decisionType: 'SCHEME', weightModifier: 60 }],
    opposedTraits: ['HONEST'],
    isCongenital: false,
    isVisible: true
  },
  KIND: {
    id: 'KIND',
    name: 'Kind',
    description: 'This character is compassionate and feels for the plight of others.',
    category: 'PERSONALITY',
    statModifiers: { diplomacy: 2, intrigue: -1 },
    behaviorWeights: [{ decisionType: 'MERCY', weightModifier: 50 }],
    opposedTraits: ['CRUEL'],
    isCongenital: false,
    isVisible: true
  },
  CRUEL: {
    id: 'CRUEL',
    name: 'Cruel',
    description: 'This character takes active pleasure in the suffering of others.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 1, diplomacy: -2, martial: 1 },
    behaviorWeights: [{ decisionType: 'TORTURE', weightModifier: 70 }],
    opposedTraits: ['KIND'],
    isCongenital: false,
    isVisible: true
  },
  PATIENT: {
    id: 'PATIENT',
    name: 'Patient',
    description: 'This character waits for the perfect moment to strike or act.',
    category: 'PERSONALITY',
    statModifiers: { learning: 2, stewardship: 1, intrigue: 1 },
    behaviorWeights: [{ decisionType: 'WAIT', weightModifier: 40 }],
    opposedTraits: ['WRATHFUL'],
    isCongenital: false,
    isVisible: true
  },
  WRATHFUL: {
    id: 'WRATHFUL',
    name: 'Wrathful',
    description: 'This character is quick to anger and slow to forgive.',
    category: 'PERSONALITY',
    statModifiers: { martial: 2, diplomacy: -2, intrigue: -1 },
    behaviorWeights: [{ decisionType: 'DUEL', weightModifier: 60 }],
    opposedTraits: ['PATIENT'],
    isCongenital: false,
    isVisible: true
  },
  HUMBLE: {
    id: 'HUMBLE',
    name: 'Humble',
    description: 'This character keeps their achievements to themselves.',
    category: 'PERSONALITY',
    statModifiers: { piety: 15 },
    behaviorWeights: [{ decisionType: 'BOAST', weightModifier: -50 }],
    opposedTraits: ['PROUD'],
    isCongenital: false,
    isVisible: true
  },
  PROUD: {
    id: 'PROUD',
    name: 'Proud',
    description: 'This character demands respect and values their personal and house legacy.',
    category: 'PERSONALITY',
    statModifiers: { diplomacy: 1, piety: -5 },
    behaviorWeights: [{ decisionType: 'BOAST', weightModifier: 60 }],
    opposedTraits: ['HUMBLE'],
    isCongenital: false,
    isVisible: true
  },
  DILIGENT: {
    id: 'DILIGENT',
    name: 'Diligent',
    description: 'This character works tirelessly to see their goals accomplished.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: 1, learning: 1, diplomacy: 1, martial: 1 },
    behaviorWeights: [{ decisionType: 'DEVELOP', weightModifier: 40 }],
    opposedTraits: ['LAZY'],
    isCongenital: false,
    isVisible: true
  },
  LAZY: {
    id: 'LAZY',
    name: 'Lazy',
    description: 'This character avoids effort and delays important duties.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: -1, learning: -1, martial: -1, diplomacy: -1 },
    behaviorWeights: [{ decisionType: 'DEVELOP', weightModifier: -40 }],
    opposedTraits: ['DILIGENT'],
    isCongenital: false,
    isVisible: true
  },
  CHASTE: {
    id: 'CHASTE',
    name: 'Chaste',
    description: 'This character is dedicated to purity of body.',
    category: 'PERSONALITY',
    statModifiers: { piety: 10 },
    behaviorWeights: [{ decisionType: 'SEDUCE', weightModifier: -80 }],
    opposedTraits: ['LUSTFUL'],
    isCongenital: false,
    isVisible: true
  },
  LUSTFUL: {
    id: 'LUSTFUL',
    name: 'Lustful',
    description: 'This character has strong romantic and desires.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 1 },
    behaviorWeights: [{ decisionType: 'SEDUCE', weightModifier: 80 }],
    opposedTraits: ['CHASTE'],
    isCongenital: false,
    isVisible: true
  },
  TEMPERATE: {
    id: 'TEMPERATE',
    name: 'Temperate',
    description: 'This character acts with moderation in food, drink, and lifestyle.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: 2, learning: 1 },
    behaviorWeights: [{ decisionType: 'FEAST', weightModifier: -30 }],
    opposedTraits: ['GLUTTONOUS'],
    isCongenital: false,
    isVisible: true
  },
  GLUTTONOUS: {
    id: 'GLUTTONOUS',
    name: 'Gluttonous',
    description: 'This character overindulges in food and drink.',
    category: 'PERSONALITY',
    statModifiers: { stewardship: -2 },
    behaviorWeights: [{ decisionType: 'FEAST', weightModifier: 50 }],
    opposedTraits: ['TEMPERATE'],
    isCongenital: false,
    isVisible: true
  },
  PARANOID: {
    id: 'PARANOID',
    name: 'Paranoid',
    description: 'This character places no trust in anyone and suspects everyone.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 3, diplomacy: -2 },
    behaviorWeights: [{ decisionType: 'SPY', weightModifier: 40 }],
    opposedTraits: ['TRUSTING'],
    isCongenital: false,
    isVisible: true
  },
  TRUSTING: {
    id: 'TRUSTING',
    name: 'Trusting',
    description: 'This character sees the good in everyone, sometimes to a fault.',
    category: 'PERSONALITY',
    statModifiers: { diplomacy: 2, intrigue: -2 },
    behaviorWeights: [{ decisionType: 'SPY', weightModifier: -40 }],
    opposedTraits: ['PARANOID'],
    isCongenital: false,
    isVisible: true
  },

  // MENTAL & INTELLIGENCE TRAITS
  GENIUS: {
    id: 'GENIUS',
    name: 'Genius',
    description: 'An extraordinary intellect, excelling at all subjects.',
    category: 'MENTAL',
    statModifiers: { diplomacy: 5, martial: 5, stewardship: 5, intrigue: 5, learning: 5 },
    behaviorWeights: [{ decisionType: 'PLAN', weightModifier: 50 }],
    opposedTraits: ['SLOW', 'IMBECILE', 'INTELLIGENT', 'QUICK'],
    isCongenital: true,
    isVisible: true
  },
  INTELLIGENT: {
    id: 'INTELLIGENT',
    name: 'Intelligent',
    description: 'Highly capable mind, quick at learning new skills.',
    category: 'MENTAL',
    statModifiers: { diplomacy: 3, martial: 3, stewardship: 3, intrigue: 3, learning: 3 },
    behaviorWeights: [{ decisionType: 'PLAN', weightModifier: 30 }],
    opposedTraits: ['GENIUS', 'SLOW', 'IMBECILE', 'QUICK'],
    isCongenital: true,
    isVisible: true
  },
  QUICK: {
    id: 'QUICK',
    name: 'Quick',
    description: 'Witty and alert, faster than average minded.',
    category: 'MENTAL',
    statModifiers: { diplomacy: 1, martial: 1, stewardship: 1, intrigue: 1, learning: 1 },
    behaviorWeights: [{ decisionType: 'PLAN', weightModifier: 15 }],
    opposedTraits: ['GENIUS', 'INTELLIGENT', 'SLOW', 'IMBECILE'],
    isCongenital: true,
    isVisible: true
  },
  SLOW: {
    id: 'SLOW',
    name: 'Slow',
    description: 'A bit slow to understand things.',
    category: 'MENTAL',
    statModifiers: { diplomacy: -1, martial: -1, stewardship: -1, intrigue: -1, learning: -1 },
    behaviorWeights: [{ decisionType: 'PLAN', weightModifier: -20 }],
    opposedTraits: ['GENIUS', 'INTELLIGENT', 'QUICK', 'IMBECILE'],
    isCongenital: true,
    isVisible: true
  },
  IMBECILE: {
    id: 'IMBECILE',
    name: 'Imbecile',
    description: 'Extremely simple-minded, struggles with basic tasks.',
    category: 'MENTAL',
    statModifiers: { diplomacy: -5, martial: -5, stewardship: -5, intrigue: -5, learning: -5 },
    behaviorWeights: [{ decisionType: 'PLAN', weightModifier: -50 }],
    opposedTraits: ['GENIUS', 'INTELLIGENT', 'QUICK', 'SLOW'],
    isCongenital: true,
    isVisible: true
  },

  // PHYSICAL TRAITS
  STRONG: {
    id: 'STRONG',
    name: 'Strong',
    description: 'Possesses immense physical strength and vigor.',
    category: 'PHYSICAL',
    statModifiers: { martial: 3 },
    behaviorWeights: [{ decisionType: 'PHYSICAL_DUEL', weightModifier: 50 }],
    opposedTraits: ['WEAK'],
    isCongenital: true,
    isVisible: true
  },
  WEAK: {
    id: 'WEAK',
    name: 'Weak',
    description: 'Lacks physical strength and tires easily.',
    category: 'PHYSICAL',
    statModifiers: { martial: -3 },
    behaviorWeights: [{ decisionType: 'PHYSICAL_DUEL', weightModifier: -50 }],
    opposedTraits: ['STRONG'],
    isCongenital: true,
    isVisible: true
  },
  BEAUTIFUL: {
    id: 'BEAUTIFUL',
    name: 'Beautiful',
    description: 'Strikingly attractive, making a strong positive impression.',
    category: 'PHYSICAL',
    statModifiers: { diplomacy: 3 },
    behaviorWeights: [{ decisionType: 'SEDUCE', weightModifier: 30 }],
    opposedTraits: ['PLAIN', 'UGLY'],
    isCongenital: true,
    isVisible: true
  },
  PLAIN: {
    id: 'PLAIN',
    name: 'Plain',
    description: 'Average looking, entirely unremarkable.',
    category: 'PHYSICAL',
    statModifiers: {},
    behaviorWeights: [],
    opposedTraits: ['BEAUTIFUL', 'UGLY'],
    isCongenital: true,
    isVisible: true
  },
  UGLY: {
    id: 'UGLY',
    name: 'Ugly',
    description: 'Quite unattractive, often off-putting.',
    category: 'PHYSICAL',
    statModifiers: { diplomacy: -3 },
    behaviorWeights: [{ decisionType: 'SEDUCE', weightModifier: -30 }],
    opposedTraits: ['BEAUTIFUL', 'PLAIN'],
    isCongenital: true,
    isVisible: true
  },
  AGILE: {
    id: 'AGILE',
    name: 'Agile',
    description: 'Light and nimble on their feet.',
    category: 'PHYSICAL',
    statModifiers: { martial: 1, intrigue: 1 },
    behaviorWeights: [{ decisionType: 'ESCAPE', weightModifier: 25 }],
    opposedTraits: ['LAME'],
    isCongenital: true,
    isVisible: true
  },
  LAME: {
    id: 'LAME',
    name: 'Lame',
    description: 'Suffers from a limp, restricting rapid movement.',
    category: 'PHYSICAL',
    statModifiers: { martial: -2 },
    behaviorWeights: [{ decisionType: 'ESCAPE', weightModifier: -25 }],
    opposedTraits: ['AGILE'],
    isCongenital: true,
    isVisible: true
  },

  // HEALTH TRAITS
  HEALTHY: {
    id: 'HEALTHY',
    name: 'Healthy',
    description: 'Full of vitality and highly resistant to decay.',
    category: 'PHYSICAL',
    statModifiers: {},
    behaviorWeights: [],
    opposedTraits: ['SICKLY'],
    isCongenital: false,
    isVisible: true
  },
  SICKLY: {
    id: 'SICKLY',
    name: 'Sickly',
    description: 'Often suffers from minor ailments and has a weak disposition.',
    category: 'PHYSICAL',
    statModifiers: { martial: -1 },
    behaviorWeights: [],
    opposedTraits: ['HEALTHY'],
    isCongenital: true,
    isVisible: true
  },
  DRUNKARD: {
    id: 'DRUNKARD',
    name: 'Drunkard',
    description: 'Frequently inebriated and dependent on alcohol.',
    category: 'LIFESTYLE',
    statModifiers: { stewardship: -2, learning: -1, intrigue: -1 },
    behaviorWeights: [{ decisionType: 'FEAST', weightModifier: 40 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  DEPRESSED: {
    id: 'DEPRESSED',
    name: 'Depressed',
    description: 'Overtaken by profound sadness and lethargy.',
    category: 'STRESS',
    statModifiers: { diplomacy: -1, martial: -1, stewardship: -1, intrigue: -1, learning: -1 },
    behaviorWeights: [],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },

  // RELIGION / BELIEF EXTRA TRAITS
  ZEALOUS: {
    id: 'ZEALOUS',
    name: 'Zealous',
    description: 'Passionately devoted to their religious duties and hostile to infidels.',
    category: 'PERSONALITY',
    statModifiers: { piety: 20, martial: 1, diplomacy: -1 },
    behaviorWeights: [{ decisionType: 'HOLY_WAR', weightModifier: 50 }],
    opposedTraits: ['CYNICAL'],
    isCongenital: false,
    isVisible: true
  },
  CYNICAL: {
    id: 'CYNICAL',
    name: 'Cynical',
    description: 'Highly skeptical of dogmatic claims and institutional authority.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 2, piety: -20 },
    behaviorWeights: [{ decisionType: 'HOLY_WAR', weightModifier: -50 }],
    opposedTraits: ['ZEALOUS'],
    isCongenital: false,
    isVisible: true
  },
  HERETIC: {
    id: 'HERETIC',
    name: 'Heretic',
    description: 'Holds theological views labeled as dangerous corruptions by the religious orthodoxy.',
    category: 'PERSONALITY',
    statModifiers: { intrigue: 1, piety: -30 },
    behaviorWeights: [],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  SCHOLAR: {
    id: 'SCHOLAR',
    name: 'Scholar',
    description: 'Dedicated to the pursuit of secular and scientific knowledge.',
    category: 'LIFESTYLE',
    statModifiers: { learning: 3, stewardship: 1 },
    behaviorWeights: [{ decisionType: 'STUDY', weightModifier: 40 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  MYSTIC: {
    id: 'MYSTIC',
    name: 'Mystic',
    description: 'Prone to looking into occult portals and spiritual visions.',
    category: 'LIFESTYLE',
    statModifiers: { learning: 1, piety: 10, intrigue: 1 },
    behaviorWeights: [{ decisionType: 'RITUAL', weightModifier: 30 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },

  // SPECIAL / LIFESTYLE EDUCATION TRAITS
  BRAVE_WARRIOR: {
    id: 'BRAVE_WARRIOR',
    name: 'Brave Warrior',
    description: 'A respected battlefield veteran with multiple scars.',
    category: 'LIFESTYLE',
    statModifiers: { martial: 4 },
    behaviorWeights: [{ decisionType: 'WAR', weightModifier: 30 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  TACTICIAN: {
    id: 'TACTICIAN',
    name: 'Tactician',
    description: 'Capable of organizing master battle tactics and maneuvers.',
    category: 'LIFESTYLE',
    statModifiers: { martial: 3, learning: 1 },
    behaviorWeights: [{ decisionType: 'ATTACK_STRATEGY', weightModifier: 35 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  SCHEMER: {
    id: 'SCHEMER',
    name: 'Schemer',
    description: 'A highly dangerous political plotter with shadow alliances.',
    category: 'LIFESTYLE',
    statModifiers: { intrigue: 4 },
    behaviorWeights: [{ decisionType: 'PLOT', weightModifier: 40 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  ADMINISTRATOR: {
    id: 'ADMINISTRATOR',
    name: 'Administrator',
    description: 'Superb manager of lands, taxes, and domestic builders.',
    category: 'LIFESTYLE',
    statModifiers: { stewardship: 4 },
    behaviorWeights: [{ decisionType: 'BUILD', weightModifier: 30 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  GENEROUS_RULER: {
    id: 'GENEROUS_RULER',
    name: 'Generous Ruler',
    description: 'Provides immense support and grain distribution to the needy.',
    category: 'LIFESTYLE',
    statModifiers: { diplomacy: 3, stewardship: -1 },
    behaviorWeights: [{ decisionType: 'TAX_REDUCTION', weightModifier: 40 }],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  },
  TYRANT: {
    id: 'TYRANT',
    name: 'Tyrant',
    description: 'Derules using iron fist methods, instilling terror.',
    category: 'LIFESTYLE',
    statModifiers: { intrigue: 2, diplomacy: -4, martial: 1 },
    behaviorWeights: [{ decisionType: 'TYRANNY', weightModifier: 50 }],
    opposedTraits: ['BELOVED'],
    isCongenital: false,
    isVisible: true
  },
  BELOVED: {
    id: 'BELOVED',
    name: 'Beloved',
    description: 'Universally adored by vassal knights, clergy, and peasants.',
    category: 'LIFESTYLE',
    statModifiers: { diplomacy: 4 },
    behaviorWeights: [],
    opposedTraits: ['TYRANT'],
    isCongenital: false,
    isVisible: true
  },
  FEARED: {
    id: 'FEARED',
    name: 'Feared',
    description: 'Holds absolute subservience due to their terrifying reputation.',
    category: 'LIFESTYLE',
    statModifiers: { intrigue: 3, diplomacy: -2 },
    behaviorWeights: [],
    opposedTraits: [],
    isCongenital: false,
    isVisible: true
  }
};
