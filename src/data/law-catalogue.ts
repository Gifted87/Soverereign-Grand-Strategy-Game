/**
 * law-catalogue.ts
 *
 * The complete catalogue of laws the player can enact.
 * Referenced by VassalActionExecutor, PoliticsSystem, and the Laws modal.
 */

import { Law, LawCategory } from '../core/models/Law';

export const LAW_CATALOGUE: Law[] = [

  // ═══════════════════════════════════════════════════════
  // SUCCESSION LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'PRIMOGENITURE',
    name: 'Primogeniture',
    description: 'The eldest child inherits all titles. Reduces succession crises but concentrates wealth in one heir.',
    category: 'SUCCESSION',
    status: 'ACTIVE',
    enactedYear: 1140,
    enactedDay: 1,
    effects: [
      { target: 'realm_stability', delta: 5, description: 'Clear succession line reduces court intrigue.' },
    ],
    vassalLoyaltyImpact: -5,
    prestigeCost: 30,
    stabilityRequirement: 40,
  },
  {
    id: 'GAVELKIND',
    name: 'Gavelkind',
    description: 'Titles are divided equally among all children. Keeps vassals content but risks realm fragmentation.',
    category: 'SUCCESSION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'vassal_loyalty', delta: 10, description: 'Vassals appreciate their children\'s inheritance rights.' },
      { target: 'realm_stability', delta: -8, description: 'Fragmented succession weakens the realm.' },
    ],
    vassalLoyaltyImpact: 10,
    prestigeCost: 20,
    stabilityRequirement: 0,
  },
  {
    id: 'ELECTIVE_MONARCHY',
    name: 'Elective Monarchy',
    description: 'The realm\'s top lords elect the next ruler. Powerful vassals gain influence; weak rulers lose control.',
    category: 'SUCCESSION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'vassal_loyalty', delta: 15, description: 'Electors highly value their political power.' },
      { target: 'realm_stability', delta: -15, description: 'Election periods are politically volatile.' },
    ],
    vassalLoyaltyImpact: 15,
    prestigeCost: 50,
    stabilityRequirement: 60,
  },
  {
    id: 'ABSOLUTE_COGNATIC',
    name: 'Absolute Cognatic',
    description: 'Both sons and daughters may inherit equally based on birth order. Expands the pool of claimants.',
    category: 'SUCCESSION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'realm_stability', delta: 2, description: 'Marginally reduces succession disputes.' },
    ],
    vassalLoyaltyImpact: 0,
    prestigeCost: 25,
    stabilityRequirement: 30,
  },

  // ═══════════════════════════════════════════════════════
  // TAXATION LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'LIGHT_TAXATION',
    name: 'Light Taxation',
    description: 'Taxation is kept low. Trade flourishes, but the treasury grows slowly.',
    category: 'TAXATION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'tax_rate', delta: -0.3, description: 'Tax income reduced.' },
      { target: 'trade_income', delta: 0.2, description: 'Merchants thrive; trade income rises.' },
      { target: 'vassal_loyalty', delta: 5, description: 'Vassals and peasants appreciate low taxes.' },
    ],
    vassalLoyaltyImpact: 5,
    prestigeCost: 10,
    stabilityRequirement: 0,
  },
  {
    id: 'STANDARD_TAXATION',
    name: 'Standard Taxation',
    description: 'The historical norm. Balanced income and vassal goodwill.',
    category: 'TAXATION',
    status: 'ACTIVE',
    enactedYear: 1140,
    enactedDay: 1,
    effects: [
      { target: 'tax_rate', delta: 0, description: 'No modification to baseline tax.' },
    ],
    vassalLoyaltyImpact: 0,
    prestigeCost: 0,
    stabilityRequirement: 0,
  },
  {
    id: 'HEAVY_TAXATION',
    name: 'Heavy Taxation',
    description: 'Maximise tax extraction. Treasury benefits greatly; unrest and smuggling rise.',
    category: 'TAXATION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'tax_rate', delta: 0.5, description: 'Greatly increased tax income.' },
      { target: 'vassal_loyalty', delta: -10, description: 'Vassals resent oppressive taxation.' },
      { target: 'realm_stability', delta: -5, description: 'Peasant unrest rises across the realm.' },
    ],
    vassalLoyaltyImpact: -10,
    prestigeCost: 0,
    stabilityRequirement: 0,
  },
  {
    id: 'CHURCH_EXEMPT_FROM_TAX',
    name: 'Church Tax Exemption',
    description: 'All church holdings are exempted from direct taxation. Earns strong church support.',
    category: 'TAXATION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'tax_rate', delta: -0.1, description: 'Small overall tax income reduction.' },
      { target: 'piety', delta: 10, description: 'Church strongly endorses this law.' },
    ],
    vassalLoyaltyImpact: 3,
    prestigeCost: 15,
    stabilityRequirement: 20,
  },

  // ═══════════════════════════════════════════════════════
  // MILITARY LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'SCUTAGE_ALLOWED',
    name: 'Scutage (Buy Out of Levy)',
    description: 'Vassals may pay gold instead of sending troops. Reduces levy size but fills the war chest.',
    category: 'MILITARY',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'levy_obligation', delta: -0.3, description: 'Fewer troops from vassals who pay scutage.' },
      { target: 'tax_rate', delta: 0.1, description: 'Scutage payments compensate partially.' },
    ],
    vassalLoyaltyImpact: 8,
    prestigeCost: 20,
    stabilityRequirement: 30,
  },
  {
    id: 'MANDATORY_FULL_LEVY',
    name: 'Mandatory Full Levy',
    description: 'All vassals must provide their maximum military obligation. No buy-outs permitted.',
    category: 'MILITARY',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'levy_obligation', delta: 0.4, description: 'Maximum troop extraction from vassals.' },
      { target: 'vassal_loyalty', delta: -12, description: 'Vassals resent being drained of their soldiers.' },
    ],
    vassalLoyaltyImpact: -12,
    prestigeCost: 0,
    stabilityRequirement: 0,
  },
  {
    id: 'STANDING_ARMY_EDICT',
    name: 'Standing Army Edict',
    description: 'Establishes a permanent professional army funded from central taxes. Reduces reliance on vassals.',
    category: 'MILITARY',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'levy_obligation', delta: -0.2, description: 'Less reliance on vassal levies.' },
      { target: 'tax_rate', delta: 0.15, description: 'Ongoing cost to maintain professional troops.' },
      { target: 'realm_stability', delta: 5, description: 'Professional army provides reliable defence.' },
    ],
    vassalLoyaltyImpact: -5,
    prestigeCost: 50,
    stabilityRequirement: 50,
  },

  // ═══════════════════════════════════════════════════════
  // RELIGION LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'RELIGIOUS_TOLERANCE',
    name: 'Edict of Tolerance',
    description: 'Minority faiths are permitted to practise openly. Trade with foreign realms improves; zealots are angered.',
    category: 'RELIGION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'trade_income', delta: 0.1, description: 'Diverse merchant communities boost trade.' },
      { target: 'piety', delta: -10, description: 'Orthodox clergy condemn tolerance.' },
    ],
    vassalLoyaltyImpact: 3,
    prestigeCost: 35,
    stabilityRequirement: 40,
  },
  {
    id: 'MANDATORY_RELIGIOUS_CONFORMITY',
    name: 'Mandatory Conformity',
    description: 'All subjects must convert to the state religion. Minority populations revolt; zealots rejoice.',
    category: 'RELIGION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'piety', delta: 15, description: 'High Priest applauds your devotion.' },
      { target: 'realm_stability', delta: -10, description: 'Forcible conversion causes unrest.' },
    ],
    vassalLoyaltyImpact: -5,
    prestigeCost: 20,
    stabilityRequirement: 0,
  },
  {
    id: 'CHURCH_CONTROLS_APPOINTMENTS',
    name: 'Free Investiture',
    description: 'The church appoints its own bishops without royal approval. Earns enormous church goodwill.',
    category: 'RELIGION',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'piety', delta: 20, description: 'Church gains autonomous power.' },
      { target: 'realm_stability', delta: -5, description: 'Player loses influence over church appointments.' },
    ],
    vassalLoyaltyImpact: 0,
    prestigeCost: 40,
    stabilityRequirement: 30,
  },

  // ═══════════════════════════════════════════════════════
  // TRADE LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'FREE_TRADE',
    name: 'Free Trade Charter',
    description: 'Merchants may trade freely across all provinces. Income rises but smuggling networks are harder to detect.',
    category: 'TRADE',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'trade_income', delta: 0.25, description: 'Trade income rises significantly.' },
    ],
    vassalLoyaltyImpact: 5,
    prestigeCost: 20,
    stabilityRequirement: 0,
  },
  {
    id: 'MERCHANT_GUILD_CHARTER',
    name: 'Merchant Guild Charter',
    description: 'Grants guilds legal protection and codified rights. Guilds become powerful political actors.',
    category: 'TRADE',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'trade_income', delta: 0.15, description: 'Organised guilds boost commerce.' },
      { target: 'realm_stability', delta: 3, description: 'Stable markets reduce unrest.' },
    ],
    vassalLoyaltyImpact: 2,
    prestigeCost: 25,
    stabilityRequirement: 20,
  },

  // ═══════════════════════════════════════════════════════
  // JUSTICE LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'TRIAL_BY_JURY',
    name: 'Trial by Jury',
    description: 'Accused nobles receive a jury of peers before punishment. Reduces arbitrary power; curbs cruelty.',
    category: 'JUSTICE',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'vassal_loyalty', delta: 8, description: 'Nobles appreciate legal protections.' },
      { target: 'realm_stability', delta: 3, description: 'Fairer justice reduces grievances.' },
    ],
    vassalLoyaltyImpact: 8,
    prestigeCost: 30,
    stabilityRequirement: 35,
  },
  {
    id: 'ABSOLUTE_JUSTICE',
    name: 'Absolute Justice (Summary Execution)',
    description: 'The ruler may punish any noble without trial. Feared but deeply resented.',
    category: 'JUSTICE',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'vassal_loyalty', delta: -15, description: 'Vassals live in fear of arbitrary punishment.' },
      { target: 'realm_stability', delta: 5, description: 'Ruthless order suppresses overt rebellion.' },
    ],
    vassalLoyaltyImpact: -15,
    prestigeCost: 0,
    stabilityRequirement: 0,
  },

  // ═══════════════════════════════════════════════════════
  // AUTONOMY LAWS
  // ═══════════════════════════════════════════════════════

  {
    id: 'HIGH_VASSAL_AUTONOMY',
    name: 'High Vassal Autonomy',
    description: 'Vassals manage their own affairs with minimal interference. Loyalty rises; central control falls.',
    category: 'AUTONOMY',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'vassal_loyalty', delta: 12, description: 'Vassals appreciate their independence.' },
      { target: 'tax_rate', delta: -0.15, description: 'Less gold reaches the central treasury.' },
      { target: 'levy_obligation', delta: -0.2, description: 'Vassals contribute fewer troops.' },
    ],
    vassalLoyaltyImpact: 12,
    prestigeCost: 0,
    stabilityRequirement: 0,
  },
  {
    id: 'CENTRALIZED_ADMINISTRATION',
    name: 'Centralised Administration',
    description: 'The crown directly administers all provinces. Tax efficiency rises; vassals chafe.',
    category: 'AUTONOMY',
    status: 'PROPOSED',
    enactedYear: 0,
    enactedDay: 0,
    effects: [
      { target: 'tax_rate', delta: 0.2, description: 'Direct administration extracts more tax.' },
      { target: 'vassal_loyalty', delta: -10, description: 'Vassals resent loss of autonomy.' },
      { target: 'realm_stability', delta: 5, description: 'Central control provides consistent order.' },
    ],
    vassalLoyaltyImpact: -10,
    prestigeCost: 40,
    stabilityRequirement: 55,
  },
];

/** Get all laws in a specific category. */
export function getLawsByCategory(category: LawCategory): Law[] {
  return LAW_CATALOGUE.filter(l => l.category === category);
}

/** Get the currently active law for a category (assumes one active per category). */
export function getActiveLaw(category: LawCategory): Law | undefined {
  return LAW_CATALOGUE.find(l => l.category === category && l.status === 'ACTIVE');
}
