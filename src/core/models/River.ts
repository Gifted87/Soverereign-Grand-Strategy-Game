import { HexCoord } from '../../utils/geo';

export interface RiverSegment {
  id: string;
  coords: HexCoord[];
  width: number;
}

export interface River {
  id: string;
  name: string;
  segments: RiverSegment[];
  currentStrength: number;  // affects crossing difficulty
  isFrozen: boolean;
  floodLevel: number;       // > 1.0 = flooding
}
