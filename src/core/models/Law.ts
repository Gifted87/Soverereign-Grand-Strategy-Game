/**
 * Law.ts
 *
 * TypeScript model for the realm law system.
 * Laws are edicts issued by the player that modify vassal obligations,
 * succession rules, taxation limits, and religious authority.
 *
 * Referenced by VassalActionExecutor (OPPOSE_NEW_LAW, SUPPORT_PLAYER_LAW)
 * and by the law-catalogue data file.
 */

export type LawCategory =
  | 'SUCCESSION'     // Who inherits
  | 'TAXATION'       // Tax obligations
  | 'MILITARY'       // Levy and conscription rules
  | 'RELIGION'       // Church relationship laws
  | 'TRADE'          // Market and merchant regulations
  | 'JUSTICE'        // Crime, punishment, courts
  | 'AUTONOMY';      // Vassal self-governance rights

export type LawStatus = 'ACTIVE' | 'PROPOSED' | 'REPEALED';

export interface LawEffect {
  /** State key to modify on relevant NPCs or provinces */
  target: 'vassal_loyalty' | 'tax_rate' | 'levy_obligation' | 'piety' | 'trade_income' | 'realm_stability' | string;
  /** How much the effect changes the target (positive or negative) */
  delta: number;
  /** Human-readable description */
  description: string;
}

export interface Law {
  id: string;
  name: string;
  description: string;
  category: LawCategory;
  status: LawStatus;
  /** Year enacted */
  enactedYear: number;
  /** Day enacted */
  enactedDay: number;
  /** Effects applied while this law is ACTIVE */
  effects: LawEffect[];
  /**
   * Vassal disposition modifier — how much this law pushes vassal loyalty
   * up (positive) or down (negative) when enacted.
   * Applied once on enactment.
   */
  vassalLoyaltyImpact: number;
  /**
   * Prestige cost to enact this law.
   * Represents political capital required.
   */
  prestigeCost: number;
  /** Minimum realm stability required to enact */
  stabilityRequirement: number;
}
