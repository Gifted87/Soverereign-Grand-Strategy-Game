/**
 * event-templates.ts
 *
 * Structured library of in-game events for the EventSystem.
 * Replaces the 6 hardcoded flavor strings in GameLoop.ts with a rich,
 * categorised template catalogue.
 *
 * Each template can be instantiated with context variables using
 * the interpolate() helper at the bottom of this file.
 */

import { GameEvent, EventType } from '../core/models/Event';

export interface EventTemplate {
  id: string;
  type: EventType | string;
  title: string;
  /** Supports {{variable}} placeholders interpolated at runtime */
  description: string;
  choices: Array<{
    label: string;
    action: string;
    amount?: number;
    effect: string;
  }>;
  /** Minimum stability required for this event to fire */
  stabilityMin?: number;
  stabilityMax?: number;
  /** Season filter — if set, only fires in this season */
  seasonFilter?: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
  /** Weight relative to other templates in its category (higher = more likely) */
  weight: number;
}

// ═══════════════════════════════════════════════════════════════════════
// COURT PETITIONS
// ═══════════════════════════════════════════════════════════════════════

export const COURT_PETITION_TEMPLATES: EventTemplate[] = [
  {
    id: 'evt_petition_road',
    type: 'COURT_PETITION',
    title: 'Petition: Road Repairs',
    description: 'The merchants of {{provinceName}} petition the crown to fund repairs on the crumbling northern road. Trade has slowed and brigands have grown bolder.',
    choices: [
      { label: 'Fund the repairs (200 gold)', action: 'SPEND_GOLD', amount: 200, effect: '+15 road quality in {{provinceName}}' },
      { label: 'Dismiss — they can fund it themselves', action: 'IGNORE', effect: '-5 merchant loyalty in {{provinceName}}' },
    ],
    weight: 8,
  },
  {
    id: 'evt_petition_bandit',
    type: 'COURT_PETITION',
    title: 'Petition: Bandit Menace',
    description: 'A haggard delegation of farmers from {{provinceName}} begs for soldiers. A bandit chief named {{npcName}} has extorted three harvests and burned two homesteads.',
    choices: [
      { label: 'Send a patrol (50 gold)', action: 'SPEND_GOLD', amount: 50, effect: 'Reduces bandit presence; +5 province loyalty' },
      { label: 'Grant militia rights', action: 'GAIN_PRESTIGE', amount: 5, effect: 'Peasants arm themselves; +3 loyalty, slight unrest risk' },
      { label: 'Ignore the petition', action: 'IGNORE', effect: '-8 province loyalty; bandit gains strength' },
    ],
    weight: 10,
  },
  {
    id: 'evt_petition_drought',
    type: 'COURT_PETITION',
    title: 'Petition: Drought Relief',
    description: 'The harvest in {{provinceName}} has failed for the second consecutive year. The starving population implores the crown for grain from the royal reserves.',
    choices: [
      { label: 'Release emergency grain (300 food)', action: 'SPEND_GOLD', amount: 300, effect: '+10 loyalty; prevents famine this season' },
      { label: 'Offer reduced tax for one season', action: 'IGNORE', effect: '+5 loyalty; minor treasury cost' },
      { label: 'Refuse — the reserves must be preserved', action: 'IGNORE', effect: '-15 loyalty; famine risk rises steeply' },
    ],
    seasonFilter: 'AUTUMN',
    weight: 7,
  },
  {
    id: 'evt_petition_marriage',
    type: 'COURT_PETITION',
    title: 'Petition: Noble Marriage Proposal',
    description: 'Lord {{npcName}} petitions for the hand of a royal ward in marriage. The match would cement loyalty in {{provinceName}}, but the suitor has a dark reputation.',
    choices: [
      { label: 'Grant the match', action: 'GAIN_PRESTIGE', amount: 10, effect: '+15 vassal loyalty; ward unhappy' },
      { label: 'Decline graciously', action: 'IGNORE', effect: 'No immediate effect; lord mildly disappointed' },
      { label: 'Counter-propose another match', action: 'IGNORE', effect: 'Negotiation continues; +3 diplomacy' },
    ],
    weight: 6,
  },
  {
    id: 'evt_petition_tournament',
    type: 'COURT_PETITION',
    title: 'Petition: Host a Grand Tournament',
    description: 'Your Marshal requests royal sponsorship for a grand tournament to be held at the capital. Knights from across the realm would attend, raising your prestige.',
    choices: [
      { label: 'Fund the tournament (500 gold)', action: 'SPEND_GOLD', amount: 500, effect: '+20 prestige; court mood improves; wandering knights attracted' },
      { label: 'Fund a modest joust (150 gold)', action: 'SPEND_GOLD', amount: 150, effect: '+8 prestige; minor court mood boost' },
      { label: 'Deny the request', action: 'IGNORE', effect: 'Marshal loyalty -3; no cost' },
    ],
    weight: 5,
  },
  {
    id: 'evt_petition_spy_warning',
    type: 'COURT_PETITION',
    title: 'Spymaster Warning: Foreign Agent',
    description: 'Your Spymaster reports a foreign agent has been observed meeting secretly with {{npcName}} in the capital. The nature of their dealings is unknown.',
    choices: [
      { label: 'Launch covert surveillance', action: 'SPEND_GOLD', amount: 75, effect: 'Intelligence gathered; agent possibly identified' },
      { label: 'Arrest the suspect immediately', action: 'EXECUTE', effect: '+5 security; risk of wrongful arrest if mistaken' },
      { label: 'Monitor and wait', action: 'IGNORE', effect: 'No cost; risk of missing a plot' },
    ],
    weight: 7,
  },
  {
    id: 'evt_petition_flood',
    type: 'COURT_PETITION',
    title: 'Disaster: River Flooding',
    description: 'Spring floods have devastated the lowlands of {{provinceName}}. Three villages are submerged, crops lost, and the roads are impassable. The provincial governor urgently requests aid.',
    choices: [
      { label: 'Send relief funds (400 gold)', action: 'SPEND_GOLD', amount: 400, effect: 'Province rebuilds faster; +10 loyalty' },
      { label: 'Send engineers and workers', action: 'SPEND_GOLD', amount: 200, effect: 'Road quality preserved; +7 loyalty' },
      { label: 'Leave them to manage alone', action: 'IGNORE', effect: '-12 loyalty; province devastated for longer' },
    ],
    seasonFilter: 'SPRING',
    weight: 6,
  },
  {
    id: 'evt_petition_comet',
    type: 'COURT_PETITION',
    title: 'Omen: Comet in the Night Sky',
    description: 'A great comet blazes across the heavens. The clergy pronounce it an omen of God\'s displeasure. The peasants grow fearful; some call it a sign of coming plague or war.',
    choices: [
      { label: 'Call for days of prayer and fasting', action: 'GAIN_PRESTIGE', amount: 5, effect: '+10 piety; -5 realm mood short-term' },
      { label: 'Commission an astronomer\'s reading', action: 'SPEND_GOLD', amount: 50, effect: 'Fear allayed with reason; +5 court prestige' },
      { label: 'Ignore the superstition', action: 'IGNORE', effect: '+2 unrest in religious provinces' },
    ],
    weight: 4,
  },
  {
    id: 'evt_petition_monastery',
    type: 'COURT_PETITION',
    title: 'Petition: Monastery Foundation',
    description: 'The Bishop of {{provinceName}} requests a royal land grant to found a new monastery. It would become a centre of learning and attract pilgrims.',
    choices: [
      { label: 'Grant the land', action: 'IGNORE', effect: '+15 piety; church gains minor holding; +5 province stability' },
      { label: 'Grant the land with conditions (taxation)', action: 'GAIN_GOLD', amount: 100, effect: '+8 piety; church less pleased; annual tithe income' },
      { label: 'Decline — the church has enough land', action: 'IGNORE', effect: '+5 tension with bishop; no cost' },
    ],
    weight: 5,
  },
  {
    id: 'evt_petition_wandering_knight',
    type: 'COURT_PETITION',
    title: 'A Knight Seeks Service',
    description: 'A scarred warrior, {{npcName}}, presents himself at the gates claiming to be a landless knight of some renown. He seeks employment in your armies.',
    choices: [
      { label: 'Hire him as a retainer (75 gold/month)', action: 'SPEND_GOLD', amount: 75, effect: 'New character joins court; potential general or officer' },
      { label: 'Test him in the training yard first', action: 'IGNORE', effect: 'Delayed recruitment; his stats revealed' },
      { label: 'Turn him away', action: 'IGNORE', effect: 'Knight departs; may join a rival lord' },
    ],
    weight: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// DEATH EVENTS
// ═══════════════════════════════════════════════════════════════════════

export const DEATH_TEMPLATES: EventTemplate[] = [
  {
    id: 'evt_death_natural',
    type: 'DEATH',
    title: 'Funeral Bells',
    description: '{{firstName}} {{lastName}} has died after a prolonged fever. The court awaits your response.',
    choices: [
      { label: 'Hold a state funeral (120 gold)', action: 'SPEND_GOLD', amount: 120, effect: '+15 dynasty renown; court mourns with dignity' },
      { label: 'Claim the vacant estates', action: 'GAIN_GOLD', amount: 150, effect: '+150 gold; some see it as callous' },
      { label: 'Hold a modest service', action: 'IGNORE', effect: '+3 piety; minimal cost' },
    ],
    weight: 10,
  },
  {
    id: 'evt_death_battle',
    type: 'DEATH',
    title: 'Fallen in Battle',
    description: 'Word arrives that {{firstName}} {{lastName}} has been slain on the field of battle. His family demands the body be returned with honour.',
    choices: [
      { label: 'Return the body with full honours', action: 'SPEND_GOLD', amount: 80, effect: '+10 loyalty with the fallen\'s allies; +5 prestige' },
      { label: 'Bury him where he fell', action: 'IGNORE', effect: 'No cost; family less pleased' },
    ],
    weight: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// BIRTH EVENTS
// ═══════════════════════════════════════════════════════════════════════

export const BIRTH_TEMPLATES: EventTemplate[] = [
  {
    id: 'evt_birth_dynasty',
    type: 'BIRTH',
    title: 'An Heir Is Born',
    description: 'A child has entered the world in your household. The court awaits the naming ceremony.',
    choices: [
      { label: 'Hold a grand feast (200 gold)', action: 'SPEND_GOLD', amount: 200, effect: '+20 prestige; +5 loyalty across realm' },
      { label: 'Name the child with a quiet blessing', action: 'GAIN_PRESTIGE', amount: 8, effect: '+8 prestige; modest celebration' },
      { label: 'Record the birth quietly', action: 'IGNORE', effect: 'No cost; no prestige' },
    ],
    weight: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// ALL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

export const ALL_EVENT_TEMPLATES: EventTemplate[] = [
  ...COURT_PETITION_TEMPLATES,
  ...DEATH_TEMPLATES,
  ...BIRTH_TEMPLATES,
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Replace {{variable}} placeholders in a string with values from the context map.
 */
export function interpolate(text: string, context: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? `[${key}]`);
}

/**
 * Instantiate a template into a real GameEvent with a unique ID and context variables.
 */
export function instantiateTemplate(
  template: EventTemplate,
  id: string,
  year: number,
  day: number,
  context: Record<string, string> = {}
): GameEvent {
  return {
    id,
    type: template.type,
    title: interpolate(template.title, context),
    description: interpolate(template.description, context),
    createdYear: year,
    createdDay: day,
    choices: template.choices.map(c => ({
      ...c,
      label: interpolate(c.label, context),
      effect: interpolate(c.effect, context),
    })),
    resolved: false,
  };
}

/**
 * Pick a weighted random template from a list using the provided RNG.
 */
export function pickWeightedTemplate(templates: EventTemplate[], rng: () => number): EventTemplate {
  const total = templates.reduce((s, t) => s + t.weight, 0);
  let roll = rng() * total;
  for (const t of templates) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return templates[templates.length - 1];
}
