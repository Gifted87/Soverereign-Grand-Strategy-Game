/**
 * DynastyFactory.ts
 *
 * Procedurally generates dynasties, their histories, and coats of arms.
 */

import { Dynasty } from '../models/Dynasty';
import { RandomSeed } from '../engine/RandomSeed';
import { WorldClock } from '../engine/WorldClock';
import { nanoid } from 'nanoid';
import { pickName, NAME_LISTS } from '../../data/name-lists';

export class DynastyFactory {
  constructor(
    private clock: WorldClock,
    private rng: RandomSeed
  ) {}

  generateDynasty(cultureId: string, founderId: string, homeProvinceId: string): Dynasty {
    const list = NAME_LISTS[cultureId] ?? NAME_LISTS['Generic'];
    const name = pickName(list.surnames, this.rng.next.bind(this.rng));

    const colors = ['#8B0000', '#00008B', '#006400', '#B8860B', '#4B0082', '#2F4F4F', '#A0522D'];
    const chargeColors = ['#FFD700', '#C0C0C0', '#FFFFFF', '#000000'];
    const icons = ['🦁', '🦅', '🐺', '🐉', '🐻', '⚔️', '🏰', '🦅', '🦌', '⚜️', '☀️', '🌙'];

    const coatOfArms = {
      baseColor: colors[Math.floor(this.rng.next() * colors.length)],
      chargeColor: chargeColors[Math.floor(this.rng.next() * chargeColors.length)],
      icon: icons[Math.floor(this.rng.next() * icons.length)],
    };

    const legendaryAncestors = [];
    if (this.rng.next() > 0.5) {
      const ancestorDeeds = [
        "Slew the great boar of the eastern woods",
        "Held the pass against a hundred raiders",
        "Founded the first great abbey",
        "United the squabbling local tribes",
        "Forged the ancestral sword from fallen star-metal"
      ];
      legendaryAncestors.push({
        name: pickName(list.maleFirst, this.rng.next.bind(this.rng)),
        deed: ancestorDeeds[Math.floor(this.rng.next() * ancestorDeeds.length)]
      });
    }

    return {
      id: `dynasty_${nanoid()}`,
      name,
      coatOfArms,
      founderId,
      foundedDate: this.clock.currentYear * 360 + this.clock.currentDay,
      headId: founderId,
      members: [founderId],
      extinct: false,
      prestigeLevel: Math.floor(this.rng.next() * 50) + 10,
      cultureId,
      homeProvinceId,
      renown: 0,
      legendaryAncestors
    };
  }
}
