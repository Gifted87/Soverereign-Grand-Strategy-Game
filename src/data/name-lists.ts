/**
 * name-lists.ts
 *
 * Culture-specific NPC name lists for procedural character generation.
 * Used by npcGenerator.ts and DynastyFactory.ts.
 */

export interface NameList {
  maleFirst: string[];
  femaleFirst: string[];
  surnames: string[];
}

export const NAME_LISTS: Record<string, NameList> = {

  // ── Western / Latin ──────────────────────────────────────────────────
  Latin: {
    maleFirst: [
      'Aldric', 'Baldwin', 'Conrad', 'Dietrich', 'Edmund', 'Frederick', 'Godfrey',
      'Heinrich', 'Isidore', 'Jerome', 'Konrad', 'Leopold', 'Maximilian', 'Nikolaus',
      'Oswald', 'Petrus', 'Quintus', 'Reginald', 'Sigismund', 'Tancred',
      'Ulrich', 'Valerian', 'Wilhelm', 'Xander', 'Yvain', 'Zacharias',
      'Anselm', 'Bertrand', 'Clemens', 'Dominic', 'Eberhard', 'Florian',
    ],
    femaleFirst: [
      'Adelaide', 'Beatrice', 'Cecilia', 'Dorothea', 'Eleanor', 'Felicia',
      'Gertrude', 'Hildegard', 'Isabella', 'Johanna', 'Katherine', 'Leonora',
      'Mathilda', 'Nicolette', 'Odette', 'Philippa', 'Rosalind', 'Scholastica',
      'Theodora', 'Ursula', 'Valentina', 'Wulfhild', 'Ximena', 'Yolanda',
      'Agnes', 'Blanche', 'Constance', 'Delphine', 'Ermengarde', 'Fleur',
    ],
    surnames: [
      'von Kareth', 'de Valedor', 'of Sarn', 'von Alder', 'de Marne',
      'of Thornwall', 'von Breck', 'de Solmere', 'of Harkon', 'von Eiswald',
      'de Rhakar', 'of Caldmere', 'von Sturmfeld', 'de Gravis', 'of Orvance',
      'Blackwood', 'Ironhelm', 'Stonebridge', 'Ravenswick', 'Ashford',
      'Coldwater', 'Fairfax', 'Grimsby', 'Halworth', 'Irontide',
    ],
  },

  // ── Norse / Nordic ───────────────────────────────────────────────────
  Norse: {
    maleFirst: [
      'Bjorn', 'Erik', 'Gunnar', 'Harald', 'Ivar', 'Jarl', 'Knut',
      'Leif', 'Magnus', 'Njord', 'Olaf', 'Ragnar', 'Sigurd', 'Thorvald',
      'Ulf', 'Vali', 'Wulfgar', 'Yngvar', 'Asmund', 'Brandulf',
      'Dagfinn', 'Egil', 'Floki', 'Grimr', 'Halfdan',
    ],
    femaleFirst: [
      'Astrid', 'Brynhildr', 'Dagny', 'Eira', 'Freydis', 'Gudrun',
      'Helga', 'Ingrid', 'Jorunn', 'Kata', 'Liv', 'Mjoll', 'Nanna',
      'Oddny', 'Ragnhild', 'Sigrid', 'Thora', 'Unn', 'Valdis', 'Ylva',
      'Asdis', 'Bergljot', 'Dalla', 'Embla', 'Fjotr',
    ],
    surnames: [
      'Ironside', 'Forkbeard', 'Bloodaxe', 'the Bold', 'Ravenmane',
      'Wulfson', 'Eriksson', 'Haraldsen', 'Bjornsen', 'Gunnarsson',
      'of Kaupang', 'of Hedeby', 'Skullbreaker', 'Longship', 'Icebrand',
    ],
  },

  // ── Eastern / Byzantine ─────────────────────────────────────────────
  Byzantine: {
    maleFirst: [
      'Alexios', 'Basileios', 'Constantine', 'Demetrios', 'Emmanuel',
      'Georgios', 'Ioannes', 'Konstantinos', 'Leon', 'Michael',
      'Nikephoros', 'Phokas', 'Romanos', 'Stephanos', 'Theodore',
      'Tiberius', 'Vasilios', 'Xenophon', 'Zeno', 'Andronikos',
    ],
    femaleFirst: [
      'Anna', 'Zoe', 'Irene', 'Euphrosyne', 'Maria', 'Theodora',
      'Helena', 'Eudokia', 'Komnenê', 'Nikephora', 'Xene', 'Alexia',
      'Sophia', 'Elene', 'Anastasia', 'Ariadne', 'Chrysanthe', 'Despina',
    ],
    surnames: [
      'Komnenos', 'Palaiologos', 'Doukas', 'Angelos', 'Laskaris',
      'Vatatzes', 'Kantakouzenos', 'Philanthropenos', 'Melissenos', 'Botaneiates',
      'of Konstantinoupolis', 'of Thessalonika', 'of Antioch',
    ],
  },

  // ── Moorish / Arabic ─────────────────────────────────────────────────
  Arabic: {
    maleFirst: [
      'Ahmad', 'Badr', 'Dawud', 'Faris', 'Hamid', 'Ibrahim', 'Jamal',
      'Khalid', 'Latif', 'Mahmud', 'Nadir', 'Omar', 'Qasim', 'Rais',
      'Salim', 'Tariq', 'Uthman', 'Walid', 'Yasir', 'Zafar',
    ],
    femaleFirst: [
      'Aisha', 'Bahira', 'Dina', 'Fatima', 'Hind', 'Iman', 'Jamila',
      'Khadija', 'Layla', 'Maryam', 'Nadia', 'Rania', 'Sabah', 'Tarub',
      'Umm Kulthum', 'Wafa', 'Yasmin', 'Zahra', 'Asma', 'Buthaina',
    ],
    surnames: [
      'al-Rashid', 'ibn Yusuf', 'al-Mansur', 'ibn Khalid', 'al-Hakim',
      'of Cordoba', 'of Toledo', 'of Seville', 'al-Qurtubi', 'ibn Battuta',
      'al-Walid', 'ibn Abbas', 'al-Nasir', 'ibn Tashfin',
    ],
  },

  // ── Generic fallback ─────────────────────────────────────────────────
  Generic: {
    maleFirst: [
      'Aldor', 'Brendan', 'Caius', 'Davan', 'Edric', 'Ferin', 'Gareth',
      'Holt', 'Iras', 'Joran', 'Kell', 'Lorin', 'Maren', 'Nolan',
      'Orin', 'Pell', 'Quinn', 'Rael', 'Sorin', 'Taran',
      'Uris', 'Vane', 'Wren', 'Xeron', 'Yorn', 'Zael',
    ],
    femaleFirst: [
      'Aela', 'Brea', 'Calla', 'Dael', 'Elara', 'Faye', 'Gael',
      'Hara', 'Ila', 'Jess', 'Kira', 'Lara', 'Mira', 'Nael',
      'Ora', 'Petra', 'Quin', 'Reva', 'Sael', 'Tara',
      'Ula', 'Vael', 'Wyla', 'Xara', 'Yara', 'Zael',
    ],
    surnames: [
      'Ashvale', 'Brightwater', 'Coldmoor', 'Darkwood', 'Edgecliff',
      'Fallbrook', 'Greystone', 'Hillcrest', 'Irongate', 'Jadehaven',
      'Kestrel', 'Lightwood', 'Moonveil', 'Nightfall', 'Oakhollow',
      'Pinecrest', 'Quicksilver', 'Ravensdale', 'Silverbrook', 'Thornfield',
    ],
  },
};

/** Pick a random name from a list using a provided RNG function. */
export function pickName(list: string[], rng: () => number): string {
  return list[Math.floor(rng() * list.length)];
}

/** Generate a full name (first + surname) for a character. */
export function generateName(
  gender: 'MALE' | 'FEMALE',
  culture: string,
  rng: () => number
): { firstName: string; lastName: string } {
  const names = NAME_LISTS[culture] ?? NAME_LISTS['Generic'];
  const firstName = pickName(gender === 'MALE' ? names.maleFirst : names.femaleFirst, rng);
  const lastName  = pickName(names.surnames, rng);
  return { firstName, lastName };
}
