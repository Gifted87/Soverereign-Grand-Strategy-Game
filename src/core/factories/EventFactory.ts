/**
 * EventFactory.ts
 *
 * Replaces the hardcoded event generation logic in GameLoop.ts.
 * Uses the structured event-templates library to produce context-aware GameEvents.
 */

import { GameEvent } from '../models/Event';
import { WorldClock } from '../engine/WorldClock';
import { RandomSeed } from '../engine/RandomSeed';
import {
  ALL_EVENT_TEMPLATES,
  pickWeightedTemplate,
  instantiateTemplate,
} from '../../data/event-templates';
import { nanoid } from 'nanoid';
import { Character } from '../models/Character';
import { Province } from '../models/Province';

export class EventFactory {
  constructor(
    private clock: WorldClock,
    private rng: RandomSeed,
    private getCharacters: () => Record<string, Character>,
    private getProvinces: () => Record<string, Province>
  ) {}

  /**
   * Generates a random contextual event, filtering templates by season and stability.
   */
  generateRandomEvent(realmStability: number = 50): GameEvent | null {
    const season = this.clock.currentSeason;

    const validTemplates = ALL_EVENT_TEMPLATES.filter(t => {
      if (t.seasonFilter && t.seasonFilter !== season) return false;
      if (t.stabilityMin !== undefined && realmStability < t.stabilityMin) return false;
      if (t.stabilityMax !== undefined && realmStability > t.stabilityMax) return false;
      return true;
    });

    if (validTemplates.length === 0) return null;

    const template = pickWeightedTemplate(validTemplates, this.rng.next.bind(this.rng));
    
    // Build context
    const context: Record<string, string> = {};
    let characterId: string | undefined;
    let provinceId: string | undefined;

    // Pick random character if needed by template
    if (template.description.includes('{{firstName}}') || template.description.includes('{{npcName}}')) {
      const chars = Object.values(this.getCharacters()).filter(c => c.isAlive && !c.isPlayer);
      if (chars.length > 0) {
        const npc = chars[Math.floor(this.rng.next() * chars.length)];
        context['npcName'] = `${npc.firstName} ${npc.lastName}`;
        context['firstName'] = npc.firstName;
        context['lastName'] = npc.lastName;
        characterId = npc.id;
      }
    }

    // Pick random province if needed by template
    if (template.description.includes('{{provinceName}}')) {
      const provs = Object.values(this.getProvinces());
      if (provs.length > 0) {
        const prov = provs[Math.floor(this.rng.next() * provs.length)];
        context['provinceName'] = prov.name;
        provinceId = prov.id;
      }
    }

    const event = instantiateTemplate(
      template,
      `event_${nanoid()}`,
      this.clock.currentYear,
      this.clock.currentDay,
      context
    );
    
    if (characterId) event.characterId = characterId;
    if (provinceId) event.provinceId = provinceId;

    return event;
  }
}
