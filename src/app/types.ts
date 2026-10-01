import type { ActivityScore } from "../activities/types.js";
import type { CityRecord } from "../persistence/types.js";

export type CityForecastResult = {
  city: CityRecord;
  forecast: CityForecastDay[];
};

export type CityForecastDay = {
  date: string;
  weather: {
    temperatureMinC: number;
    temperatureMaxC: number;
    precipitationSumMm: number;
    snowfallSumCm: number;
    windSpeedMaxKmh: number;
    waveHeightMaxM: number | null;
    wavePeriodMaxS: number | null;
  };
  activities: ActivityScore[];
};
