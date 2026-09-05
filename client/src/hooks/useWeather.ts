import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../api/weather';

export function useWeather(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'weather'],
    queryFn: () => weatherApi.forTrip(tripId).then((r) => r.forecasts),
  });
}
