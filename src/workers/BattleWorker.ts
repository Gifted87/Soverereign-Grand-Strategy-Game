/**
 * BattleWorker.ts
 *
 * Web Worker: Phase-based battle resolution engine.
 * Runs off the main thread to prevent UI jank during heavy battles.
 *
 * Phases: SKIRMISH → CLASH → PURSUIT (or ROUT)
 * Factors: unit strength, morale, discipline, experience, terrain, weather, commander skill
 */

export interface BattleInput {
  attackerSize: number;
  attackerMorale: number;
  attackerDiscipline: number;
  attackerExperience: number;
  attackerCommanderMartial: number;
  defenderSize: number;
  defenderMorale: number;
  defenderDiscipline: number;
  defenderExperience: number;
  defenderCommanderMartial: number;
  terrainAdvantage: 'attacker' | 'defender' | 'neutral';
  weatherPenalty: number; // 0–30 penalty applied to attacker
  siegeEquipment?: boolean;
  seed: number;
}

export interface BattlePhaseResult {
  name: string;
  attackerCasualtiesThisPhase: number;
  defenderCasualtiesThisPhase: number;
  attackerMoraleAtEnd: number;
  defenderMoraleAtEnd: number;
  narrative: string;
}

export interface BattleOutput {
  attackerCasualties: number;
  defenderCasualties: number;
  attackerMoraleCollapse: boolean;
  defenderMoraleCollapse: boolean;
  winner: 'attacker' | 'defender' | 'draw';
  phases: BattlePhaseResult[];
  narrativeSummary: string;
}

// ── Seeded RNG (LCG) ──────────────────────────────────────────────────────
function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function (): number {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}

// ── Core battle math ──────────────────────────────────────────────────────

/**
 * Compute the "combat power" of one side for a phase.
 * Range: roughly 0–200 (higher = more lethal to the enemy).
 */
function combatPower(
  size: number,
  morale: number,
  discipline: number,
  experience: number,
  commanderMartial: number
): number {
  const moraleFactor    = morale    / 100;
  const disciplineFactor= discipline/ 100;
  const experienceFactor= 0.8 + (experience / 100) * 0.4; // 0.8–1.2
  const commanderBonus  = 1 + (commanderMartial / 100) * 0.3; // 1.0–1.3
  return size * moraleFactor * disciplineFactor * experienceFactor * commanderBonus;
}

/**
 * Resolve one phase of combat.
 * Returns new morale values and casualties for each side.
 */
function resolvePhase(
  input: BattleInput,
  rng: () => number,
  atkSize: number,
  atkMorale: number,
  defSize: number,
  defMorale: number,
  phaseName: string,
  phaseIntensity: number,     // 0.3–1.0 (how deadly)
  terrainDfBonus: number,     // 0–40 terrain defense advantage to defender
  weatherPenalty: number
): BattlePhaseResult {
  // Raw power scores
  const atkPower = combatPower(atkSize, atkMorale - weatherPenalty, input.attackerDiscipline, input.attackerExperience, input.attackerCommanderMartial);
  const defPower = combatPower(defSize, defMorale, input.defenderDiscipline, input.defenderExperience, input.defenderCommanderMartial) * (1 + terrainDfBonus / 100);

  // Casualty rate: the stronger side inflicts more, with noise (±20%)
  const atkLossRate = (defPower / Math.max(1, atkPower + defPower)) * phaseIntensity * (0.8 + rng() * 0.4);
  const defLossRate = (atkPower / Math.max(1, atkPower + defPower)) * phaseIntensity * (0.8 + rng() * 0.4);

  const atkCasualties = Math.round(atkSize * atkLossRate);
  const defCasualties = Math.round(defSize * defLossRate);

  // Morale hit: proportional to casualties as fraction of unit, plus discipline buffer
  const atkMoraleDrop = (atkCasualties / Math.max(1, atkSize)) * 100 * (1 - input.attackerDiscipline / 200);
  const defMoraleDrop = (defCasualties / Math.max(1, defSize)) * 100 * (1 - input.defenderDiscipline / 200);

  const newAtkMorale = Math.max(0, atkMorale - atkMoraleDrop);
  const newDefMorale = Math.max(0, defMorale - defMoraleDrop);

  // Narrative
  const atkName = 'attackers';
  const defName = 'defenders';
  let narrative = `${phaseName}: `;
  if (atkCasualties > defCasualties * 1.5) {
    narrative += `The ${defName} hold the line, repelling waves of ${atkName} with fierce discipline. Attacker losses mount.`;
  } else if (defCasualties > atkCasualties * 1.5) {
    narrative += `The ${atkName} press hard, shattering ${defName} formations. Defender lines begin to buckle.`;
  } else {
    narrative += `Both sides exchange brutal blows in grinding attrition warfare. Neither yields ground easily.`;
  }

  return {
    name: phaseName,
    attackerCasualtiesThisPhase: atkCasualties,
    defenderCasualtiesThisPhase: defCasualties,
    attackerMoraleAtEnd: newAtkMorale,
    defenderMoraleAtEnd: newDefMorale,
    narrative,
  };
}

// ── Main battle resolver ──────────────────────────────────────────────────

function resolveBattle(input: BattleInput): BattleOutput {
  const rng = makeLcg(input.seed);

  // Terrain bonus
  let terrainBonus = 0;
  if (input.terrainAdvantage === 'defender') terrainBonus = 25;
  else if (input.terrainAdvantage === 'attacker') terrainBonus = -15; // attacker bypasses terrain advantage

  const phases: BattlePhaseResult[] = [];
  let atkSize   = input.attackerSize;
  let defSize   = input.defenderSize;
  let atkMorale = input.attackerMorale;
  let defMorale = input.defenderMorale;

  // ── Phase 1: Skirmish (low intensity, arrows / light troops) ──────────
  const skirmish = resolvePhase(
    input, rng, atkSize, atkMorale, defSize, defMorale,
    'Skirmish', 0.05, Math.max(0, terrainBonus), input.weatherPenalty
  );
  phases.push(skirmish);
  atkSize   = Math.max(1, atkSize   - skirmish.attackerCasualtiesThisPhase);
  defSize   = Math.max(1, defSize   - skirmish.defenderCasualtiesThisPhase);
  atkMorale = skirmish.attackerMoraleAtEnd;
  defMorale = skirmish.defenderMoraleAtEnd;

  // Early rout check after skirmish
  const skirmishRouted = atkMorale < 15 || defMorale < 15;

  // ── Phase 2: Main Clash (full intensity) ─────────────────────────────
  if (!skirmishRouted) {
    const clash = resolvePhase(
      input, rng, atkSize, atkMorale, defSize, defMorale,
      'Main Clash', 0.18, Math.max(0, terrainBonus * 0.6), input.weatherPenalty * 0.5
    );
    phases.push(clash);
    atkSize   = Math.max(1, atkSize   - clash.attackerCasualtiesThisPhase);
    defSize   = Math.max(1, defSize   - clash.defenderCasualtiesThisPhase);
    atkMorale = clash.attackerMoraleAtEnd;
    defMorale = clash.defenderMoraleAtEnd;
  }

  // ── Phase 3: Pursuit / Rout (if one side collapsed) ──────────────────
  const atkCollapsed = atkMorale < 20;
  const defCollapsed = defMorale < 20;

  if (atkCollapsed || defCollapsed) {
    const pursuitIntensity = 0.08;
    const pursuit = resolvePhase(
      input, rng,
      atkCollapsed ? atkSize : defSize,
      atkCollapsed ? atkMorale : defMorale,
      atkCollapsed ? defSize : atkSize,
      atkCollapsed ? defMorale : atkMorale,
      'Pursuit',
      pursuitIntensity, 0, 0
    );

    // Assign casualties to the routing side
    if (atkCollapsed) {
      phases.push({
        ...pursuit,
        attackerCasualtiesThisPhase: pursuit.attackerCasualtiesThisPhase,
        defenderCasualtiesThisPhase: pursuit.defenderCasualtiesThisPhase,
        narrative: `Pursuit: Routing attackers are cut down as they flee. The defenders press relentlessly.`,
      });
      atkSize = Math.max(0, atkSize - pursuit.attackerCasualtiesThisPhase);
    } else {
      phases.push({
        ...pursuit,
        attackerCasualtiesThisPhase: pursuit.defenderCasualtiesThisPhase,
        defenderCasualtiesThisPhase: pursuit.attackerCasualtiesThisPhase,
        narrative: `Pursuit: Fleeing defenders are ridden down in the open. The attackers claim the field.`,
      });
      defSize = Math.max(0, defSize - pursuit.defenderCasualtiesThisPhase);
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────
  const totalAtkCasualties = input.attackerSize - atkSize;
  const totalDefCasualties = input.defenderSize - defSize;

  // ── Winner ────────────────────────────────────────────────────────────
  let winner: 'attacker' | 'defender' | 'draw';
  if (atkCollapsed && !defCollapsed)        winner = 'defender';
  else if (defCollapsed && !atkCollapsed)   winner = 'attacker';
  else if (totalDefCasualties > totalAtkCasualties * 1.2) winner = 'attacker';
  else if (totalAtkCasualties > totalDefCasualties * 1.2) winner = 'defender';
  else                                       winner = 'draw';

  // ── Summary narrative ─────────────────────────────────────────────────
  const winnerName = winner === 'attacker' ? 'The attacking host' : winner === 'defender' ? 'The defending force' : 'Neither side';
  const narrativeSummary =
    `${winnerName} ${winner === 'draw' ? 'held the field in bloody stalemate' : 'claimed victory'} after ${phases.length} phases of combat. ` +
    `Attackers lost ${totalAtkCasualties.toLocaleString()} men; defenders lost ${totalDefCasualties.toLocaleString()}.`;

  return {
    attackerCasualties:    totalAtkCasualties,
    defenderCasualties:    totalDefCasualties,
    attackerMoraleCollapse: atkCollapsed,
    defenderMoraleCollapse: defCollapsed,
    winner,
    phases,
    narrativeSummary,
  };
}

// ── Worker message handler ────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const { type, payload, jobId } = e.data;
  if (type === 'RESOLVE_PHASE') {
    const result = resolveBattle(payload as BattleInput);
    self.postMessage({ type: 'BATTLE_RESULT', jobId, result });
  }
};
