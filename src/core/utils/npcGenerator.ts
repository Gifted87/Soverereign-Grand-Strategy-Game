import { nanoid } from 'nanoid';
import { Character, Gender, Ambition, Trait } from '../models/Character';
import { TRAIT_DEFINITIONS } from '../../data/trait-definitions';

// Comprehensive name lists per culture/region for realistic medieval names
const MALE_FIRST_NAMES = [
  'William', 'Henry', 'Robert', 'Richard', 'Edward', 'Baldwin', 'Geoffrey', 'Roger', 'Thomas', 'Walter',
  'Hugh', 'Godefroy', 'Bohemond', 'Raymond', 'Tancred', 'Charles', 'Alvise', 'Gregory', 'John', 'Stephen',
  'Philip', 'Arthur', 'David', 'Edmund', 'Harold', 'Alfred', 'Wulfric', 'Eldred', 'Thaddeus', 'James',
  'Silas', 'Martin', 'Benedictus', 'Solomon', 'James', 'Robin', 'Guy', 'Eustace', 'Amalric', 'Balian',
  'Humphrey', 'Ranulf', 'Gamel', 'Godric', 'Wulfstan', 'Giles', 'Reginald', 'Osbert', 'Piers'
];

const FEMALE_FIRST_NAMES = [
  'Catherine', 'Matilda', 'Eleanor', 'Margaret', 'Isabella', 'Beatrice', 'Alice', 'Agnes', 'Joan', 'Constance',
  'Sybilla', 'Mary', 'Emma', 'Edith', 'Adela', 'Heloise', 'Cecilia', 'Ida', 'Gisela', 'Adelaide', 'Maud',
  'Hawise', 'Avice', 'Juliana', 'Mabel', 'Rohesia', 'Richolda', 'Aline', 'Petronilla', 'Hodierna'
];

const LAST_NAMES = [
  'Valedor', 'Valerius', 'Abernathy', 'Gallowglass', 'Blackwood', 'Garnier', 'Luther', 'Roma', 'Mason', 'Lombardy',
  'Hawk', 'FreeCompany', 'Outlaws', 'Montdidier', 'Canossa', 'Mocenigo', 'Lothbrok', 'Fell', 'Valois', 'Haverhill',
  'Cotswold', 'Bouillon', 'Clairvaux', 'Guildford', 'Gisors', 'Aethelgard', 'Gant', 'Bohun', 'Clare', 'Glanville',
  'Mowbray', 'Lacy', 'Warren', 'Bigod', 'Mortimer', 'Mandeville', 'Beauchamp', 'Verdon', 'Nevill', 'Percy'
];

const CULTURES = ['Saxon', 'Latin', 'Norse', 'Norman', 'Occitan', 'Frankish', 'Welsh', 'Gaelic'];
const RELIGIONS = ['christianity', 'paganism', 'heresy'];

// Helper to choose random item from array
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get random traits
function getRandomTraits(count: number, avoidIds: string[] = []): Trait[] {
  const keys = Object.keys(TRAIT_DEFINITIONS).filter(k => !avoidIds.includes(k));
  const selected: Trait[] = [];
  const selectedIds = new Set<string>();
  
  while (selected.length < count && selected.length < keys.length) {
    const k = randomChoice(keys);
    if (!selectedIds.has(k)) {
      selectedIds.add(k);
      const trait = TRAIT_DEFINITIONS[k];
      if (trait) {
        selected.push(trait);
      }
    }
  }
  return selected;
}

export function generateDynamicNPC(roleType: string, overrides: Partial<Character> = {}): Character {
  const gender: Gender = overrides.gender || (Math.random() < 0.85 ? 'MALE' : 'FEMALE'); // Default historical focus for medieval rulers / military, but can be either
  const firstName = overrides.firstName || (gender === 'MALE' ? randomChoice(MALE_FIRST_NAMES) : randomChoice(FEMALE_FIRST_NAMES));
  const lastName = overrides.lastName || randomChoice(LAST_NAMES);
  const age = overrides.age || (20 + Math.floor(Math.random() * 45));
  const culture = overrides.culture || randomChoice(CULTURES);
  const religion = overrides.religion || 'christianity';

  const parsedId = overrides.id || (roleType.toUpperCase().startsWith('FOREIGN_') ? 'foreign_' + nanoid() : nanoid());

  const defaultCharacter: Character = {
    id: parsedId,
    firstName,
    lastName,
    dynastyId: overrides.dynastyId || 'dyn_' + nanoid(6),
    isPlayer: false,
    gender,
    age,
    health: 100,
    fertility: 80 - Math.max(0, age - 30),
    isPregnant: false,
    isAlive: true,
    causeOfDeath: null,
    deathDate: null,
    birthProvinceId: overrides.birthProvinceId || 'prov_' + (1 + Math.floor(Math.random() * 5)),
    religion,
    culture,
    languagesSpoken: [culture, 'Latin'],
    title: null,
    position: null,
    traits: [],
    virtues: [],
    flaws: [],
    secretTrait: null,
    fatherId: null,
    motherId: null,
    spouseId: null,
    childrenIds: [],
    siblingIds: [],
    loverIds: [],
    enemyIds: [],
    allyIds: [],
    mentorId: null,
    diplomacy: 10,
    martial: 10,
    stewardship: 10,
    intrigue: 10,
    learning: 10,
    piety: 50,
    ambition: 'POWER',
    opinion: {},
    suspicion: {},
    memories: [],
    traumaIds: [],
    primaryTitle: null,
    heldTitles: [],
    landedProvinceIds: [],
    goldHoldings: 100,
  };

  // Archetype & Role Specific Tuning
  const char = { ...defaultCharacter, ...overrides };

  switch (roleType.toUpperCase()) {
    // ----------------- FOREIGN RULERS -----------------
    case 'FOREIGN_EXPANSIONIST':
      char.title = { id: 'title_' + char.id, name: 'Sovereign King' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.martial = 15 + Math.floor(Math.random() * 5);
      char.diplomacy = 12 + Math.floor(Math.random() * 4);
      char.stewardship = 11 + Math.floor(Math.random() * 4);
      char.intrigue = 9 + Math.floor(Math.random() * 4);
      char.learning = 8 + Math.floor(Math.random() * 4);
      char.ambition = 'POWER';
      char.goldHoldings = 1500;
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: `Succeeded deceased dynamic lineage of ${char.lastName} to conquer neighboring fields.`, tick: 0 }];
      break;

    case 'FOREIGN_ISOLATIONIST':
      char.title = { id: 'title_' + char.id, name: 'Earl Defensio' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.martial = 12 + Math.floor(Math.random() * 4);
      char.stewardship = 16 + Math.floor(Math.random() * 4);
      char.diplomacy = 11 + Math.floor(Math.random() * 4);
      char.intrigue = 10 + Math.floor(Math.random() * 4);
      char.ambition = 'LEGACY';
      char.goldHoldings = 1800;
      char.traits = [TRAIT_DEFINITIONS['PATIENT'], TRAIT_DEFINITIONS['TEMPERATE']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Strengthened deep walls and borders to weather regional wars in isolation.', tick: 0 }];
      break;

    case 'FOREIGN_HOLY_CRUSADER':
      char.title = { id: 'title_' + char.id, name: 'Grand Crusader' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.martial = 14 + Math.floor(Math.random() * 5);
      char.learning = 13 + Math.floor(Math.random() * 4);
      char.piety = 300;
      char.ambition = 'PIETY';
      char.goldHoldings = 1200;
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['BRAVE']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Pledged ultimate crusader oaths to recover holy relics from regional pagans.', tick: 0 }];
      break;

    case 'FOREIGN_SCHEMER':
      char.title = { id: 'title_' + char.id, name: 'Duchess Sovereign' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.intrigue = 17 + Math.floor(Math.random() * 4);
      char.diplomacy = 14 + Math.floor(Math.random() * 4);
      char.stewardship = 12 + Math.floor(Math.random() * 3);
      char.ambition = 'REVENGE';
      char.goldHoldings = 1000;
      char.traits = [TRAIT_DEFINITIONS['DECEITFUL'], TRAIT_DEFINITIONS['PARANOID']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Wove an intricate web of court marriages, secrets, and shadow agents globally.', tick: 0 }];
      break;

    case 'FOREIGN_MERCANTILE':
      char.title = { id: 'title_' + char.id, name: 'Merchant Doge' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.stewardship = 18 + Math.floor(Math.random() * 3);
      char.diplomacy = 15 + Math.floor(Math.random() * 4);
      char.intrigue = 12 + Math.floor(Math.random() * 4);
      char.ambition = 'WEALTH';
      char.goldHoldings = 4000;
      char.traits = [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['TEMPERATE']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Took full stewardship over naval guilds to master long-distance luxury commerce.', tick: 0 }];
      break;

    case 'FOREIGN_BARBARIAN':
      char.title = { id: 'title_' + char.id, name: 'Grand Chieftain' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.martial = 18 + Math.floor(Math.random() * 3);
      char.intrigue = 11 + Math.floor(Math.random() * 4);
      char.diplomacy = 6 + Math.floor(Math.random() * 4);
      char.ambition = 'FREEDOM';
      char.goldHoldings = 600;
      char.traits = [TRAIT_DEFINITIONS['WRATHFUL'], TRAIT_DEFINITIONS['BRAVE']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Led massive coastal longships to pillage and extract heavy gold tributes.', tick: 0 }];
      break;

    case 'FOREIGN_REBEL':
      char.title = { id: 'title_' + char.id, name: 'Exiled Sovereign' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.martial = 13 + Math.floor(Math.random() * 4);
      char.intrigue = 13 + Math.floor(Math.random() * 4);
      char.ambition = 'REVENGE';
      char.goldHoldings = 900;
      char.traits = [TRAIT_DEFINITIONS['PARANOID'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Rebelled against ancient empires to secure structural local freedom at court.', tick: 0 }];
      break;

    case 'FOREIGN_PUPPET':
      char.title = { id: 'title_' + char.id, name: 'Titular King' };
      char.primaryTitle = char.title;
      char.heldTitles = [char.title];
      char.diplomacy = 11 + Math.floor(Math.random() * 3);
      char.martial = 6 + Math.floor(Math.random() * 5);
      char.stewardship = 6 + Math.floor(Math.random() * 5);
      char.ambition = 'LEGACY';
      char.goldHoldings = 1100;
      char.traits = [TRAIT_DEFINITIONS['LAZY'], TRAIT_DEFINITIONS['SLOW']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Placed on throne by shadow advisors to play a central legal proxy role.', tick: 0 }];
      break;

    // ----------------- COURT ADVISORS -----------------
    case 'ADVISOR_CHANCELLOR':
      char.position = { id: 'pos_chancellor', name: 'Chancellor' };
      char.diplomacy = 13 + Math.floor(Math.random() * 6);
      char.ambition = 'POWER';
      char.traits = [TRAIT_DEFINITIONS['HONEST'], TRAIT_DEFINITIONS['PATIENT']].filter(Boolean);
      break;

    case 'ADVISOR_MARSHAL':
      char.position = { id: 'pos_marshal', name: 'Marshal' };
      char.martial = 14 + Math.floor(Math.random() * 6);
      char.ambition = 'LEGACY';
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['WRATHFUL']].filter(Boolean);
      break;

    case 'ADVISOR_SPYMASTER':
      char.position = { id: 'pos_spymaster', name: 'Spymaster' };
      char.intrigue = 14 + Math.floor(Math.random() * 6);
      char.ambition = 'REVENGE';
      char.traits = [TRAIT_DEFINITIONS['DECEITFUL'], TRAIT_DEFINITIONS['PARANOID']].filter(Boolean);
      break;

    case 'ADVISOR_TREASURER':
      char.position = { id: 'pos_treasurer', name: 'Treasurer' };
      char.stewardship = 13 + Math.floor(Math.random() * 7);
      char.ambition = 'WEALTH';
      char.traits = [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['DILIGENT']].filter(Boolean);
      break;

    case 'ADVISOR_PRIEST':
      char.position = { id: 'pos_priest', name: 'Spiritual Advisor' };
      char.learning = 13 + Math.floor(Math.random() * 7);
      char.piety = 100;
      char.ambition = 'PIETY';
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['HUMBLE']].filter(Boolean);
      break;

    // ----------------- VASSAL ARCHETYPES -----------------
    case 'VASSAL_LOYAL_VETERAN':
      char.title = { id: 'title_' + char.id, name: 'Marshal Baron' };
      char.martial = 16 + Math.floor(Math.random() * 5);
      char.diplomacy = 12 + Math.floor(Math.random() * 3);
      char.age = 55 + Math.floor(Math.random() * 15); // Old veteran
      char.ambition = 'LEGACY';
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['HONEST']].filter(Boolean);
      char.opinion = { 'player': 50 }; // Very loyal by default
      char.memories = [{ id: 'mem_' + char.id + '_vet', description: 'Served with valor under player\'s ancestors during legendary shieldwall clashes.', tick: 0 }];
      break;

    case 'VASSAL_AMBITIOUS_NEPHEW':
      char.title = { id: 'title_' + char.id, name: 'Marquis Successor' };
      char.intrigue = 15 + Math.floor(Math.random() * 6);
      char.martial = 11 + Math.floor(Math.random() * 4);
      char.age = 19 + Math.floor(Math.random() * 8); // Young, greedy nephew
      char.ambition = 'POWER';
      char.traits = [TRAIT_DEFINITIONS['AMBITIOUS'], TRAIT_DEFINITIONS['DECEITFUL']].filter(Boolean);
      char.opinion = { 'player': -25 };
      char.memories = [{ id: 'mem_' + char.id + '_nephew', description: 'Constantly schemed behind tapestries to seize ancestral core titles.', tick: 0 }];
      break;

    case 'VASSAL_PIOUS_BISHOP':
      char.title = { id: 'title_' + char.id, name: 'Provincial Bishop' };
      char.learning = 15 + Math.floor(Math.random() * 5);
      char.piety = 250;
      char.ambition = 'PIETY';
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['TEMPERATE']].filter(Boolean);
      char.opinion = { 'player': 15 };
      char.memories = [{ id: 'mem_' + char.id + '_bishop', description: 'Preached grand sermons demanding safe regional church protections.', tick: 0 }];
      break;

    case 'VASSAL_GREEDY_MERCHANT':
      char.title = { id: 'title_' + char.id, name: 'Steward Baron' };
      char.stewardship = 17 + Math.floor(Math.random() * 5);
      char.ambition = 'WEALTH';
      char.traits = [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['DILIGENT']].filter(Boolean);
      char.opinion = { 'player': -10 };
      char.goldHoldings = 1200;
      char.memories = [{ id: 'mem_' + char.id + '_merchant', description: 'Skimmed local realm taxes to secretly subsidize merchant caravan guilds.', tick: 0 }];
      break;

    case 'VASSAL_XENOPHOBIC_BARON':
      char.title = { id: 'title_' + char.id, name: 'Warden Baron' };
      char.martial = 14 + Math.floor(Math.random() * 4);
      char.intrigue = 11 + Math.floor(Math.random() * 4);
      char.ambition = 'POWER';
      char.traits = [TRAIT_DEFINITIONS['PARANOID'], TRAIT_DEFINITIONS['SHY']].filter(Boolean);
      char.opinion = { 'player': -15 };
      char.memories = [{ id: 'mem_' + char.id + '_xeno', description: 'Opposed inter-faith foreign marriages to preserve local regional isolation.', tick: 0 }];
      break;

    case 'VASSAL_COWARD_LORD':
      char.title = { id: 'title_' + char.id, name: 'Coward Baron' };
      char.martial = 3 + Math.floor(Math.random() * 4); // cowardly stats
      char.stewardship = 12 + Math.floor(Math.random() * 5);
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['CRAVEN'], TRAIT_DEFINITIONS['LAZY']].filter(Boolean);
      char.opinion = { 'player': 0 };
      char.memories = [{ id: 'mem_' + char.id + '_coward', description: 'Hid behind stout castle walls and pointblank refused royal war levy orders.', tick: 0 }];
      break;

    case 'VASSAL_BELOVED_LOCAL':
      char.title = { id: 'title_' + char.id, name: 'Peasants Sovereign' };
      char.diplomacy = 16 + Math.floor(Math.random() * 5);
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['KIND'], TRAIT_DEFINITIONS['HUMBLE']].filter(Boolean);
      char.opinion = { 'player': 25 };
      char.memories = [{ id: 'mem_' + char.id + '_beloved', description: 'Beloved by field workers; warned the crown that high taxation triggers grand uprisings.', tick: 0 }];
      break;

    case 'VASSAL_SCHEMER':
      char.title = { id: 'title_' + char.id, name: 'Baron Schemer' };
      char.intrigue = 17 + Math.floor(Math.random() * 5);
      char.ambition = 'POWER';
      char.traits = [TRAIT_DEFINITIONS['DECEITFUL'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean);
      char.opinion = { 'player': -5 };
      char.memories = [{ id: 'mem_' + char.id + '_schemer', description: 'Forged territorial land claims and blackmailed local royal courts.', tick: 0 }];
      break;

    case 'VASSAL_DRUNKARD':
      char.title = { id: 'title_' + char.id, name: 'Merry Baron' };
      char.diplomacy = 11 + Math.floor(Math.random() * 5);
      char.stewardship = 4 + Math.floor(Math.random() * 5); // mismanaged stewardship
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['TRUSTING'], TRAIT_DEFINITIONS['LAZY']].filter(Boolean);
      char.opinion = { 'player': 30 }; // highly friendly but variable
      char.memories = [{ id: 'mem_' + char.id + '_drunk', description: 'Hosted grand halls, mismanaged local taxes, but remained highly popular.', tick: 0 }];
      break;

    // ----------------- HEIRS & FAMILY -----------------
    case 'FAMILY_SPOUSE':
      char.title = { id: 'title_' + char.id, name: 'Sovereign Consort' };
      char.diplomacy = 12 + Math.floor(Math.random() * 5);
      char.stewardship = 11 + Math.floor(Math.random() * 5);
      char.ambition = 'LEGACY';
      char.traits = [TRAIT_DEFINITIONS['KIND'], TRAIT_DEFINITIONS['TEMPERATE']].filter(Boolean);
      break;

    case 'FAMILY_HEIR':
      char.title = { id: 'title_' + char.id, name: 'Prince Heir' };
      char.age = 10 + Math.floor(Math.random() * 8); // Young heir
      char.diplomacy = 8 + Math.floor(Math.random() * 5);
      char.martial = 8 + Math.floor(Math.random() * 5);
      char.ambition = 'LEGACY';
      char.traits = [TRAIT_DEFINITIONS['QUICK'], TRAIT_DEFINITIONS['HONEST']].filter(Boolean);
      break;

    case 'FAMILY_CHILD':
      char.title = { id: 'title_' + char.id, name: 'Dynastic Infant' };
      char.age = 1 + Math.floor(Math.random() * 12);
      char.ambition = 'LEGACY';
      char.traits = getRandomTraits(2);
      break;

    case 'FAMILY_SIBLING':
      char.title = { id: 'title_' + char.id, name: 'Marquis Cousin' };
      char.age = char.age || (20 + Math.floor(Math.random() * 15));
      char.ambition = 'POWER';
      char.traits = getRandomTraits(2);
      break;

    // ----------------- CLERGY -----------------
    case 'CLERGY_HIGH_PRIEST':
      char.title = { id: 'title_' + char.id, name: 'High Priest Pope' };
      char.learning = 16 + Math.floor(Math.random() * 4);
      char.diplomacy = 14 + Math.floor(Math.random() * 4);
      char.piety = 400;
      char.ambition = 'PIETY';
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['PROUD']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_init', description: 'Acquired supreme command over global monastic cathedral hierarchy.', tick: 0 }];
      break;

    case 'CLERGY_BISHOP':
      char.title = { id: 'title_' + char.id, name: 'Local Bishop' };
      char.learning = 12 + Math.floor(Math.random() * 6);
      char.piety = 150;
      char.ambition = 'PIETY';
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['SCHOLAR']].filter(Boolean);
      break;

    case 'CLERGY_MONK':
      char.title = { id: 'title_' + char.id, name: 'Wandering Hermit Monk' };
      char.learning = 13 + Math.floor(Math.random() * 5);
      char.piety = 250;
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['MYSTIC'], TRAIT_DEFINITIONS['HUMBLE']].filter(Boolean);
      break;

    // ----------------- MERCHANTS -----------------
    case 'MERCHANT_GUILD_MASTER':
      char.title = { id: 'title_' + char.id, name: 'Guild Master' };
      char.stewardship = 15 + Math.floor(Math.random() * 5);
      char.diplomacy = 11 + Math.floor(Math.random() * 4);
      char.ambition = 'WEALTH';
      char.goldHoldings = 1000;
      char.traits = [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['DILIGENT']].filter(Boolean);
      break;

    case 'MERCHANT_BANKER':
      char.title = { id: 'title_' + char.id, name: 'Master Banker Lenders' };
      char.stewardship = 18 + Math.floor(Math.random() * 2);
      char.ambition = 'WEALTH';
      char.goldHoldings = 8000;
      char.traits = [TRAIT_DEFINITIONS['PATIENT'], TRAIT_DEFINITIONS['GREEDY']].filter(Boolean);
      break;

    case 'MERCHANT_MASTER':
      char.title = { id: 'title_' + char.id, name: 'Master Merchant' };
      char.stewardship = 14 + Math.floor(Math.random() * 5);
      char.goldHoldings = 1200;
      char.traits = [TRAIT_DEFINITIONS['GREEDY'], TRAIT_DEFINITIONS['TRUSTING']].filter(Boolean);
      break;

    // ----------------- MILITARY -----------------
    case 'MILITARY_GENERAL':
      char.title = { id: 'title_' + char.id, name: 'General' };
      char.martial = 15 + Math.floor(Math.random() * 5);
      char.ambition = 'POWER';
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['AMBITIOUS']].filter(Boolean);
      break;

    case 'MILITARY_MERCENARY_CAPTAIN':
      char.title = { id: 'title_' + char.id, name: 'Mercenary Captain' };
      char.martial = 16 + Math.floor(Math.random() * 4);
      char.ambition = 'WEALTH';
      char.goldHoldings = 2500;
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['ARBITRARY']].filter(Boolean);
      break;

    case 'MILITARY_BANDIT_CHIEF':
      char.title = { id: 'title_' + char.id, name: 'Forest Outlaw Chief' };
      char.martial = 13 + Math.floor(Math.random() * 5);
      char.intrigue = 14 + Math.floor(Math.random() * 4);
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['AGILE'], TRAIT_DEFINITIONS['DECEITFUL']].filter(Boolean);
      break;

    // ----------------- PEASANTS OR EMERGENCE -----------------
    case 'PEASANT_BLACKSMITH':
      char.title = { id: 'title_' + char.id, name: 'Grudging Smith' };
      char.martial = 14 + Math.floor(Math.random() * 4);
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['WRATHFUL'], TRAIT_DEFINITIONS['DILIGENT']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_rebel', description: 'Rebelled because castle knights requisitioned entire harvest crops.', tick: 0 }];
      break;

    case 'PEASANT_SURVIVOR_FACTION_LEADER':
      char.title = { id: 'title_' + char.id, name: 'Survivor Faction Leader' };
      char.intrigue = 13 + Math.floor(Math.random() * 5);
      char.diplomacy = 12 + Math.floor(Math.random() * 4);
      char.ambition = 'REVENGE';
      char.traits = [TRAIT_DEFINITIONS['PARANOID'], TRAIT_DEFINITIONS['PATIENT']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_survive', description: 'Survived a catastrophic village raid and emerged as a resistance cell organizer.', tick: 0 }];
      break;

    case 'PEASANT_PLAGUE_DOCTOR':
      char.title = { id: 'title_' + char.id, name: 'Plague Doctor' };
      char.learning = 13 + Math.floor(Math.random() * 4);
      char.intrigue = 12 + Math.floor(Math.random() * 4);
      char.traits = [TRAIT_DEFINITIONS['SCHOLAR'], TRAIT_DEFINITIONS['PATIENT']].filter(Boolean);
      break;

    case 'PEASANT_FOLK_HERO':
      char.title = { id: 'title_' + char.id, name: 'Folk Outlaw Hero' };
      char.martial = 15 + Math.floor(Math.random() * 4);
      char.diplomacy = 14 + Math.floor(Math.random() * 4);
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['KIND']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_hero', description: 'Stole food reserves from local royal storehouses to alleviate field famine.', tick: 0 }];
      break;

    case 'PEASANT_PROPHET':
      char.title = { id: 'title_' + char.id, name: 'Forest Prophet' };
      char.learning = 11 + Math.floor(Math.random() * 4);
      char.piety = 180;
      char.ambition = 'FREEDOM';
      char.traits = [TRAIT_DEFINITIONS['MYSTIC'], TRAIT_DEFINITIONS['ZEALOUS']].filter(Boolean);
      break;

    // ----------------- SPECIAL TRIGGERED EVENTS -----------------
    case 'SPECIAL_WANDERING_KNIGHT':
      char.title = { id: 'title_' + char.id, name: 'Wandery Knight' };
      char.martial = 14 + Math.floor(Math.random() * 5);
      char.traits = [TRAIT_DEFINITIONS['BRAVE'], TRAIT_DEFINITIONS['KIND']].filter(Boolean);
      break;

    case 'SPECIAL_FOREIGN_AMBASSADOR':
      char.title = { id: 'title_' + char.id, name: 'Envoy Ambassador' };
      char.diplomacy = 14 + Math.floor(Math.random() * 5);
      char.traits = [TRAIT_DEFINITIONS['HONEST'], TRAIT_DEFINITIONS['TRUSTING']].filter(Boolean);
      break;

    case 'SPECIAL_PILGRIM_ARMY':
      char.title = { id: 'title_' + char.id, name: 'Pilgrim Army Commander' };
      char.martial = 12 + Math.floor(Math.random() * 4);
      char.piety = 220;
      char.traits = [TRAIT_DEFINITIONS['ZEALOUS'], TRAIT_DEFINITIONS['CRUEL']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_pilgrim', description: 'Demands right of free passage and provisions across the realm at swords point.', tick: 0 }];
      break;

    case 'SPECIAL_EXILED_HEIR':
      char.title = { id: 'title_' + char.id, name: 'Exiled Kingdom Heir' };
      char.diplomacy = 13 + Math.floor(Math.random() * 5);
      char.intrigue = 15 + Math.floor(Math.random() * 4);
      char.ambition = 'REVENGE';
      char.traits = [TRAIT_DEFINITIONS['AMBITIOUS'], TRAIT_DEFINITIONS['DECEITFUL']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_exile', description: 'Seeks armed shelter, safe sanctuary, and military support to reclaim their native provinces.', tick: 0 }];
      break;

    case 'SPECIAL_COURT_JESTER':
      char.title = { id: 'title_' + char.id, name: 'Court Jester Bard' };
      char.intrigue = 15 + Math.floor(Math.random() * 4);
      char.diplomacy = 12 + Math.floor(Math.random() * 4);
      char.traits = [TRAIT_DEFINITIONS['QUICK'], TRAIT_DEFINITIONS['DECEITFUL']].filter(Boolean);
      break;

    case 'SPECIAL_PLAGUE_CARRIER':
      char.title = { id: 'title_' + char.id, name: 'Diseased Traveler' };
      char.learning = 4 + Math.floor(Math.random() * 4);
      char.health = 40; // High sickness/plague vector
      char.traits = [TRAIT_DEFINITIONS['SLOW'], TRAIT_DEFINITIONS['SHY']].filter(Boolean);
      char.memories = [{ id: 'mem_' + char.id + '_pest', description: 'Triggers catastrophic epidemic spreads if not quickly caught or isolated.', tick: 0 }];
      break;

    default:
      // Fallback
      char.traits = getRandomTraits(2);
      break;
  }

  // Ensure stats fall within standard 1-20 limits (or slightly higher based on trait modifiers)
  char.diplomacy = Math.max(1, Math.min(25, char.diplomacy));
  char.martial = Math.max(1, Math.min(25, char.martial));
  char.stewardship = Math.max(1, Math.min(25, char.stewardship));
  char.intrigue = Math.max(1, Math.min(25, char.intrigue));
  char.learning = Math.max(1, Math.min(25, char.learning));

  // Populate random baseline opinion of the player
  if (!char.opinion) char.opinion = {};
  if (roleType.toUpperCase().startsWith('FOREIGN_')) {
    char.opinion['player'] = -50 + Math.floor(Math.random() * 80); // between -50 and +30
  } else if (!char.isPlayer) {
    char.opinion['player'] = -15 + Math.floor(Math.random() * 50); // between -15 and +35
  }

  return char;
}
