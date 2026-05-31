export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type TimeOfDay = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'DUSK' | 'NIGHT';
export type Era = 'DARK_AGES' | 'FEUDAL' | 'HIGH_MEDIEVAL' | 'LATE_MEDIEVAL';

export class WorldClock {
  currentDay: number;
  currentYear: number;
  currentEra: Era;
  timeOfDay: TimeOfDay;

  constructor(startYear: number, startDay: number, startEra: Era = 'DARK_AGES') {
    this.currentYear = startYear;
    this.currentDay = startDay;
    this.currentEra = startEra;
    this.timeOfDay = 'MORNING';
  }

  advance(): void {
    this.currentDay += 1;
    if (this.currentDay > 365) {
      this.currentDay = 1;
      this.currentYear += 1;
    }
  }

  get currentSeason(): Season {
    if (this.currentDay >= 60 && this.currentDay <= 151) return 'SPRING';
    if (this.currentDay >= 152 && this.currentDay <= 243) return 'SUMMER';
    if (this.currentDay >= 244 && this.currentDay <= 334) return 'AUTUMN';
    return 'WINTER';
  }
}
