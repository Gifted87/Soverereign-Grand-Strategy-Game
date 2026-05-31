export interface Technology {
  id: string;
  name: string;
  era: 'DARK_AGES' | 'FEUDAL' | 'HIGH_MEDIEVAL' | 'LATE_MEDIEVAL';
  tier: 1 | 2 | 3 | 4;
  description: string;
  cost: {
    gold: number;
    manpower: number;
    days: number;
  };
  requirements?: string[]; // parent tech ids
  effectsDescription: string;
  unlockedBuildings?: string[]; // list of building IDs this tech makes available
}

export const TECHNOLOGIES: Record<string, Technology> = {
  // ERA: DARK AGES - TIER 1 – SURVIVAL
  'iron_working': {
    id: 'iron_working',
    name: 'Iron Working',
    era: 'DARK_AGES',
    tier: 1,
    description: 'Unlocks advanced metallurgical heating and iron refining methods for raw military and agricultural utility.',
    cost: { gold: 100, manpower: 150, days: 10 },
    effectsDescription: 'Enables Iron Ingot processing. Boosts metal refining structure capacity.',
    unlockedBuildings: ['SMELTER']
  },
  'basic_fortification': {
    id: 'basic_fortification',
    name: 'Basic Fortification',
    era: 'DARK_AGES',
    tier: 1,
    description: 'Erecting simple dry-stone and timber-matted earth dams and palisades to withstand sudden raids.',
    cost: { gold: 80, manpower: 100, days: 8 },
    effectsDescription: 'Enables Wall Level 1. Slows enemy siege advance speeds.',
    unlockedBuildings: ['WALLS']
  },
  'crop_rotation': {
    id: 'crop_rotation',
    name: 'Crop Rotation',
    era: 'DARK_AGES',
    tier: 1,
    description: 'Implementing primitive sequence fallow fields and legumes rotation to prevent topsoil exhaustion.',
    cost: { gold: 120, manpower: 120, days: 12 },
    effectsDescription: '+15% all farm grain yields and speeds up peasant population growth rate.',
    unlockedBuildings: ['FARM']
  },
  'horse_domestication': {
    id: 'horse_domestication',
    name: 'Horse Domestication',
    era: 'DARK_AGES',
    tier: 1,
    description: 'Bending native heavy draft horses to master agrarian transport and early cavalry mobilization.',
    cost: { gold: 150, manpower: 130, days: 10 },
    effectsDescription: 'Allows recruitment of early cavalry. Increases tactical travel speed across plains.',
    unlockedBuildings: ['STABLE']
  },
  'tanning': {
    id: 'tanning',
    name: 'Tanning',
    era: 'DARK_AGES',
    tier: 1,
    description: 'Using natural oak bark acidic tanning solutions to cure durable cowskins and prepare lightweight leather jackets.',
    cost: { gold: 90, manpower: 80, days: 7 },
    effectsDescription: 'Allows recruitment of early infantry. Extends military unit defense limits.',
    unlockedBuildings: ['ARMORY']
  },

  // ERA: FEUDAL - TIER 2 – EXPANSION
  'feudal_law_system': {
    id: 'feudal_law_system',
    name: 'Feudal Law System',
    era: 'FEUDAL',
    tier: 2,
    description: 'Codifying vassal land tenure agreements, military service oaths, and regional ducal court sovereignty.',
    cost: { gold: 250, manpower: 150, days: 15 },
    requirements: ['crop_rotation'],
    effectsDescription: 'Enables Courthouse project. Accelerates local administrative unrest decay.',
    unlockedBuildings: ['COURTHOUSE']
  },
  'castle_architecture': {
    id: 'castle_architecture',
    name: 'Castle Architecture',
    era: 'FEUDAL',
    tier: 2,
    description: 'Assembling timber gateway structures and solid ashlar curtain walls with thick defensive lime mortars.',
    cost: { gold: 300, manpower: 250, days: 20 },
    requirements: ['basic_fortification'],
    effectsDescription: 'Enables Wall levels 2-3, fortified Gatehouses, and border lookout Watchtowers.',
    unlockedBuildings: ['GATEHOUSE', 'WATCHTOWER']
  },
  'commerce_networks': {
    id: 'commerce_networks',
    name: 'Commerce Networks',
    era: 'FEUDAL',
    tier: 2,
    description: 'Awarding charter trade rights to local merchants and creating paved local market stalls.',
    cost: { gold: 280, manpower: 180, days: 16 },
    requirements: ['crop_rotation'],
    effectsDescription: 'Enables regional Markets and permanent Masonry Bridges to eliminate spring flooding traffic bottlenecks.',
    unlockedBuildings: ['MARKET', 'BRIDGE']
  },
  'longbow_craft': {
    id: 'longbow_craft',
    name: 'Longbow Craft',
    era: 'FEUDAL',
    tier: 2,
    description: 'Sourcing single-piece yew timber and braiding long flex-flax strings for high projectile draw weights.',
    cost: { gold: 260, manpower: 220, days: 14 },
    requirements: ['tanning'],
    effectsDescription: 'Unlocks assembly of high-range Longbowmen and builds dedicated archery ranges.',
    unlockedBuildings: ['ARCHERY_RANGE']
  },
  'military_tactics_i': {
    id: 'military_tactics_i',
    name: 'Military Tactics I',
    era: 'FEUDAL',
    tier: 2,
    description: 'Coordinating peasant infantry levies under unified shieldwalls, spear schiltrons, and cavalry screens.',
    cost: { gold: 320, manpower: 300, days: 22 },
    requirements: ['horse_domestication'],
    effectsDescription: 'Speeds up army assembly. Unlocks Barracks and dedicated training grounds.',
    unlockedBuildings: ['BARRACKS', 'TRAINING_GROUNDS']
  },
  'church_organization': {
    id: 'church_organization',
    name: 'Church Organization',
    era: 'FEUDAL',
    tier: 2,
    description: 'Establishing parish bishoprics and small monastic cloisters under canon laws.',
    cost: { gold: 400, manpower: 200, days: 18 },
    requirements: ['crop_rotation'],
    effectsDescription: 'Unlocks Parish Churches, local Chapels, and monastic libraries.',
    unlockedBuildings: ['CHURCH', 'CHAPEL']
  },
  'written_administration': {
    id: 'written_administration',
    name: 'Written Administration',
    era: 'FEUDAL',
    tier: 2,
    description: 'Compiling parchment tax census ledgers, land surveys, and central chancellery administrative archives.',
    cost: { gold: 350, manpower: 150, days: 15 },
    requirements: ['crop_rotation'],
    effectsDescription: 'Permanently increases all realm tax collections by +10% through active management audits.'
  },

  // ERA: HIGH MEDIEVAL - TIER 3 – MASTERY
  'siege_engineering': {
    id: 'siege_engineering',
    name: 'Siege Engineering',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Assembling massive wooden counterweight frames capable of throwing giant boulders to shatter stone castles.',
    cost: { gold: 500, manpower: 350, days: 25 },
    requirements: ['castle_architecture'],
    effectsDescription: 'Enables high-power Siege workshops. Trebuchets deal +50% wall breaches.',
    unlockedBuildings: ['SIEGE_WORKSHOP']
  },
  'plate_armor': {
    id: 'plate_armor',
    name: 'Plate Armor',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Mastery of hammer-beaten steel chestplates and articulated limb guards to deflect dynamic crosswise blow shears.',
    cost: { gold: 600, manpower: 380, days: 28 },
    requirements: ['iron_working'],
    effectsDescription: 'Unlocks Heavy Cavalry Knight troop units. Reduces army casualty rates during active conflicts by 15%.'
  },
  'banking': {
    id: 'banking',
    name: 'Banking & Usury',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Chartering secure precious metal vaults and bill-of-exchange networks to advance commerce.',
    cost: { gold: 550, manpower: 180, days: 20 },
    requirements: ['commerce_networks'],
    effectsDescription: 'Enables fortified Treasury vaults, lowering monthly gold bleed and corruption effects by 40%.',
    unlockedBuildings: ['TREASURY']
  },
  'gunpowder_proto': {
    id: 'gunpowder_proto',
    name: 'Gunpowder (proto)',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Concocting high-potency sulfur, charcoal, and saltpeter blends to trigger stone-throwing bombard charges.',
    cost: { gold: 750, manpower: 400, days: 30 },
    requirements: ['iron_working'],
    effectsDescription: 'Triggers rare siege breach breakthroughs (+50% siege advancement speed).'
  },
  'university': {
    id: 'university',
    name: 'University Scholasticism',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Chartering central scholastic universities for deep theological, canon law, geometric, and scientific scrolls translation.',
    cost: { gold: 800, manpower: 300, days: 35 },
    requirements: ['church_organization'],
    effectsDescription: 'Provides an massive +40% technology research speed boost and unlocks bishop positions.',
    unlockedBuildings: ['CATHEDRAL']
  },
  'sanitation': {
    id: 'sanitation',
    name: 'Sanitation',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Masonry aqueducts, brick sewage tunnels, and heated thermal public baths to eliminate pestilence vectors.',
    cost: { gold: 650, manpower: 450, days: 24 },
    requirements: ['feudal_law_system'],
    effectsDescription: 'Enables Aqueducts, Bathhouses, and Sewage systems, reducing global epidemic infection risks by -25%.',
    unlockedBuildings: ['AQUEDUCT', 'BATHHOUSE', 'SEWAGE']
  },
  'naval_architecture': {
    id: 'naval_architecture',
    name: 'Naval Architecture',
    era: 'HIGH_MEDIEVAL',
    tier: 3,
    description: 'Building deep-water multi-deck timber hulls and square sails with stern rudders for high-sea transport.',
    cost: { gold: 700, manpower: 380, days: 22 },
    requirements: ['commerce_networks'],
    effectsDescription: 'Enables deep-water coastal harbor docking networks (+35% coastal commerce taxes).',
    unlockedBuildings: ['HARBOR']
  },

  // ERA: LATE MEDIEVAL - TIER 4 – TRANSITION
  'early_firearms': {
    id: 'early_firearms',
    name: 'Early Firearms',
    era: 'LATE_MEDIEVAL',
    tier: 4,
    description: 'Crafting cast-iron handheld Arquebus gun tubes with matchlock trigger ignitions.',
    cost: { gold: 900, manpower: 450, days: 40 },
    requirements: ['gunpowder_proto'],
    effectsDescription: 'Unlocks elite high-armor-piercing Arquebusier ranged troop units.'
  },
  'printing_press': {
    id: 'printing_press',
    name: 'Printing Press',
    era: 'LATE_MEDIEVAL',
    tier: 4,
    description: 'Assembling lead hand-movable typesetting blocks with oil-based ink to mass-produce royal blueprints.',
    cost: { gold: 1000, manpower: 250, days: 35 },
    requirements: ['written_administration'],
    effectsDescription: 'Doubles court propaganda and stability decree efficiency.'
  },
  'advanced_mathematics': {
    id: 'advanced_mathematics',
    name: 'Advanced Mathematics',
    era: 'LATE_MEDIEVAL',
    tier: 4,
    description: 'Trigonometric range coordinates and physics calculations to improve artillery parabolic trajectories.',
    cost: { gold: 850, manpower: 300, days: 30 },
    requirements: ['university'],
    effectsDescription: 'Significantly increases projectile range combat power and siege accuracy (+20%).'
  },
  'mercantile_law': {
    id: 'mercantile_law',
    name: 'Mercantile Law & Guilds',
    era: 'LATE_MEDIEVAL',
    tier: 4,
    description: 'Codifying global lex mercatoria regulations and chartering master guildhalls for international export wealth cycles.',
    cost: { gold: 950, manpower: 300, days: 32 },
    requirements: ['banking'],
    effectsDescription: 'Enables Craft Guildhalls. Vastly increases manufactured goods export value and tariff profits by +25%.',
    unlockedBuildings: ['GUILDHALL']
  }
};

export const TECHNOLOGIES_LIST = Object.values(TECHNOLOGIES);
