export class RandomSeed {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed |= 0;
    this.seed = this.seed + 0x6D2B79F5 | 0;
    let t = Math.imul(this.seed ^ this.seed >>> 15, 1 | this.seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFrom<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  nextGaussian(): number {
    let u = 0, v = 0;
    while(u === 0) u = this.next(); // Converting [0,1) to (0,1)
    while(v === 0) v = this.next();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
