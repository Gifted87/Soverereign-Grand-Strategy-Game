export type WeatherState = 'CLEAR' | 'OVERCAST' | 'LIGHT_RAIN' | 'HEAVY_RAIN' | 'THUNDERSTORM' | 'FOG' | 'LIGHT_SNOW' | 'BLIZZARD' | 'DROUGHT' | 'FLOOD' | 'HEATWAVE';

export interface WeatherCondition {
  state: WeatherState;
  durationLeft: number; 
}
