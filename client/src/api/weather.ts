import { api } from './client';
import type { WeatherForecast } from './types';

export const weatherApi = {
  forTrip: (tripId: string) => api.get<{ forecasts: WeatherForecast[] }>(`/trips/${tripId}/weather`),
};
