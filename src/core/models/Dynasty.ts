export interface CoatOfArms {
  baseColor: string;
  chargeColor: string;
  icon: string;
}

export interface LegendaryAncestor {
  name: string;
  deed: string;
}

export interface Dynasty {
  id: string;
  name: string;
  coatOfArms: CoatOfArms;
  founderId: string;
  foundedDate: number;       // game tick
  headId: string;            // Current dynasty head
  members: string[];         // All living member IDs
  extinct: boolean;
  prestigeLevel: number;     // 0–1000
  cultureId: string;
  homeProvinceId: string;
  renown: number;
  legendaryAncestors: LegendaryAncestor[];
}
