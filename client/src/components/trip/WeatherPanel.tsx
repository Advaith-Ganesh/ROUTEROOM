import { useWeather } from '../../hooks/useWeather';
import { formatDay } from '../../utils/format';

export function WeatherPanel({ tripId }: { tripId: string }) {
  const { data: forecasts, isLoading, isError } = useWeather(tripId);

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h3 className="font-semibold text-ink-900">Weather</h3>
      {isLoading && <p className="mt-2 text-sm text-ink-500">Loading forecast...</p>}
      {isError && (
        <p className="mt-2 text-sm text-red-600">We couldn't retrieve weather information right now.</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {forecasts?.map((forecast) => (
          <div key={forecast.date} className="rounded-md border border-ink-100 p-3 text-center">
            <p className="text-xs font-medium text-ink-700">{formatDay(forecast.date)}</p>
            {forecast.available ? (
              <>
                <p className="mt-1 text-lg font-semibold text-ink-900">{Math.round(forecast.tempMaxC)}°C</p>
                <p className="text-xs text-ink-500">{forecast.description}</p>
                <p className="text-xs text-ink-500">Low {Math.round(forecast.tempMinC)}°C</p>
                {forecast.precipitationProbabilityMax !== null && (
                  <p className="text-xs text-ink-500">☔ {forecast.precipitationProbabilityMax}%</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-ink-500">{forecast.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
