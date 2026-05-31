export interface DiseaseState {
  diseaseId: string;
  infectedCount: number;
  severity: number;
  startedAt: number;
}

export type ActiveDisease = DiseaseState;
