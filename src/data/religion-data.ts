/**
 * religion-data.ts
 *
 * Structured religion definitions for the simulation.
 * Used by ReligionSystem, HighPriestActionExecutor, and the Religion panel.
 */

export type ReligionId = 'CATHOLICISM' | 'ORTHODOXY' | 'ISLAM' | 'PAGANISM' | 'CATHARISM' | 'JUDAISM';

export interface HolySite {
  id: string;
  name: string;
  provinceId: string;
  description: string;
}

export interface Heresy {
  id: string;
  name: string;
  parentReligionId: ReligionId;
  description: string;
  /** Province IDs where this heresy is spreading */
  spreadProvinces?: string[];
}

export interface Religion {
  id: ReligionId;
  name: string;
  /** Icon emoji for quick display */
  icon: string;
  description: string;
  /** Title for the supreme religious leader */
  highPriestTitle: string;
  /** Doctrines that affect gameplay */
  doctrines: {
    allowsHolyWar: boolean;
    requiresPiety: boolean;
    hasInquisition: boolean;
    hasExcommunication: boolean;
    requiresChurchTax: boolean;
    hasCrusade: boolean;
  };
  holySites: HolySite[];
  heresies: Heresy[];
  /**
   * Baseline piety drain per tick if ruler ignores the church.
   * Higher = more theocratic pressure.
   */
  churchPressureRate: number;
  /** Starting piety bonus for characters of this religion */
  baselinePiety: number;
}

export const RELIGIONS: Record<ReligionId, Religion> = {

  CATHOLICISM: {
    id: 'CATHOLICISM',
    name: 'Catholicism',
    icon: '✝️',
    description: 'The universal church of the west, led by the Pope in Rome. Crusades, excommunications, and the threat of interdict keep even the mightiest kings in check.',
    highPriestTitle: 'Pope',
    doctrines: {
      allowsHolyWar: true,
      requiresPiety: true,
      hasInquisition: true,
      hasExcommunication: true,
      requiresChurchTax: true,
      hasCrusade: true,
    },
    holySites: [
      { id: 'rome',       name: 'Rome',          provinceId: 'prov_rome',    description: 'Seat of the Pope; pilgrimage destination of Christendom.' },
      { id: 'jerusalem',  name: 'Jerusalem',      provinceId: 'prov_jerusalem', description: 'The holiest city, site of the Holy Sepulchre.' },
      { id: 'compostela', name: 'Santiago de Compostela', provinceId: 'prov_galicia', description: 'Tomb of the Apostle James; pilgrimage terminus.' },
    ],
    heresies: [
      {
        id: 'CATHARISM',
        name: 'Catharism',
        parentReligionId: 'CATHOLICISM',
        description: 'A dualist heresy in southern France viewing matter as evil. Triggers inquisition responses.',
        spreadProvinces: [],
      },
      {
        id: 'WALDENSIANISM',
        name: 'Waldensianism',
        parentReligionId: 'CATHOLICISM',
        description: 'A poverty movement challenging church wealth and hierarchy.',
        spreadProvinces: [],
      },
    ],
    churchPressureRate: 0.5,
    baselinePiety: 30,
  },

  ORTHODOXY: {
    id: 'ORTHODOXY',
    name: 'Eastern Orthodoxy',
    icon: '☦️',
    description: 'The church of the Byzantine east, led by the Patriarch of Constantinople. The emperor and patriarch often vie for supremacy.',
    highPriestTitle: 'Patriarch',
    doctrines: {
      allowsHolyWar: true,
      requiresPiety: true,
      hasInquisition: false,
      hasExcommunication: true,
      requiresChurchTax: false,
      hasCrusade: false,
    },
    holySites: [
      { id: 'constantinople', name: 'Constantinople', provinceId: 'prov_constantinople', description: 'The New Rome; seat of the Ecumenical Patriarch.' },
      { id: 'mount_athos',    name: 'Mount Athos',    provinceId: 'prov_thessalonika', description: 'The Holy Mountain; centre of Orthodox monasticism.' },
    ],
    heresies: [
      {
        id: 'BOGOMILISM',
        name: 'Bogomilism',
        parentReligionId: 'ORTHODOXY',
        description: 'A dualist sect widespread in Bulgaria and the Balkans.',
        spreadProvinces: [],
      },
    ],
    churchPressureRate: 0.3,
    baselinePiety: 35,
  },

  ISLAM: {
    id: 'ISLAM',
    name: 'Islam',
    icon: '☪️',
    description: 'The faith of submission, dominant across the southern and eastern reaches. The Caliph holds nominal spiritual authority while sultans wield military power.',
    highPriestTitle: 'Caliph',
    doctrines: {
      allowsHolyWar: true,
      requiresPiety: true,
      hasInquisition: false,
      hasExcommunication: false,
      requiresChurchTax: true,
      hasCrusade: true,
    },
    holySites: [
      { id: 'mecca',   name: 'Mecca',   provinceId: 'prov_hijaz',     description: 'The most sacred city; site of the Grand Mosque and the Kaaba.' },
      { id: 'medina',  name: 'Medina',  provinceId: 'prov_hejaz_north', description: 'City of the Prophet; second holiest site.' },
      { id: 'baghdad', name: 'Baghdad', provinceId: 'prov_baghdad',   description: 'Seat of the Abbasid Caliphate.' },
    ],
    heresies: [
      {
        id: 'ISMAILISM',
        name: 'Ismailism (Shia branch)',
        parentReligionId: 'ISLAM',
        description: 'A Shia minority sect with distinct imams; source of great schismatic tension.',
        spreadProvinces: [],
      },
    ],
    churchPressureRate: 0.4,
    baselinePiety: 40,
  },

  PAGANISM: {
    id: 'PAGANISM',
    name: 'Nordic Paganism',
    icon: '⚡',
    description: 'The old gods of the north: Odin, Thor, Freya. Practiced in the far north; faces relentless Christian mission pressure.',
    highPriestTitle: 'High Gothi',
    doctrines: {
      allowsHolyWar: true,
      requiresPiety: false,
      hasInquisition: false,
      hasExcommunication: false,
      requiresChurchTax: false,
      hasCrusade: false,
    },
    holySites: [
      { id: 'uppsala',   name: 'Uppsala',   provinceId: 'prov_sweden_south', description: 'Sacred temple complex of the Norse gods.' },
      { id: 'helgafell', name: 'Helgafell', provinceId: 'prov_iceland',     description: 'The Holy Mountain of Iceland.' },
    ],
    heresies: [],
    churchPressureRate: 0.1,
    baselinePiety: 20,
  },

  CATHARISM: {
    id: 'CATHARISM',
    name: 'Catharism',
    icon: '🕊️',
    description: 'A dualist faith viewing the material world as the creation of an evil god. Prevalent in southern France; triggers crusade from Rome.',
    highPriestTitle: 'Perfect',
    doctrines: {
      allowsHolyWar: false,
      requiresPiety: true,
      hasInquisition: false,
      hasExcommunication: false,
      requiresChurchTax: false,
      hasCrusade: false,
    },
    holySites: [
      { id: 'montsegur', name: 'Montségur', provinceId: 'prov_languedoc', description: 'Mountain stronghold of the Cathar Perfects.' },
    ],
    heresies: [],
    churchPressureRate: 0.2,
    baselinePiety: 25,
  },

  JUDAISM: {
    id: 'JUDAISM',
    name: 'Judaism',
    icon: '✡️',
    description: 'The ancient faith of the Jewish diaspora communities. Merchants and moneylenders; tolerated in prosperity, persecuted in crisis.',
    highPriestTitle: 'Chief Rabbi',
    doctrines: {
      allowsHolyWar: false,
      requiresPiety: false,
      hasInquisition: false,
      hasExcommunication: false,
      requiresChurchTax: false,
      hasCrusade: false,
    },
    holySites: [
      { id: 'jerusalem_temple', name: 'Temple Mount', provinceId: 'prov_jerusalem', description: 'Site of the destroyed Temple; spiritual heart of Judaism.' },
    ],
    heresies: [],
    churchPressureRate: 0.0,
    baselinePiety: 15,
  },
};

/** Get a religion by id, falling back to CATHOLICISM. */
export function getReligion(id: string): Religion {
  return RELIGIONS[id as ReligionId] ?? RELIGIONS['CATHOLICISM'];
}

/** Check if two religions are hostile (trigger holy war conditions). */
export function areReligionsHostile(a: string, b: string): boolean {
  if (a === b) return false;
  const hostilepairs: Array<[string, string]> = [
    ['CATHOLICISM', 'ISLAM'],
    ['ORTHODOXY', 'ISLAM'],
    ['CATHOLICISM', 'PAGANISM'],
    ['CATHOLICISM', 'CATHARISM'],
  ];
  return hostilepairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}
