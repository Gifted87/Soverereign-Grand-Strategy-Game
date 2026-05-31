export interface Building {
  id: string;
  typeId: string;
  level: number;
  condition: number;
  isConstructing: boolean;
  completionTick?: number;
}
