import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour -- forecasts change as the date approaches.
const MAX_FORECAST_DAYS_AHEAD = 16;
const MAX_HISTORY_DAYS_BACK = 92;

// WMO weather codes used by Open-Meteo, mapped to short human-readable labels.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

export type WeatherResult =
  | {
      available: true;
      date: string;
      tempMaxC: number;
      tempMinC: number;
      precipitationProbabilityMax: number | null;
      windSpeedMaxKmh: number;
      weatherCode: number;
      description: string;
    }
  | { available: false; date: string; reason: string };

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    windspeed_10m_max: number[];
    weathercode: number[];
  };
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function cacheKey(lat: number, lon: number, date: string) {
  return `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}:${date}`;
}

export async function getWeatherForDate(lat: number, lon: number, dateStr: string): Promise<WeatherResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00.000Z`);
  const diffDays = daysBetween(today, target);

  if (diffDays > MAX_FORECAST_DAYS_AHEAD) {
    return {
      available: false,
      date: dateStr,
      reason: `Forecast unavailable for this date -- Open-Meteo only forecasts up to ${MAX_FORECAST_DAYS_AHEAD} days ahead.`,
    };
  }
  if (diffDays < -MAX_HISTORY_DAYS_BACK) {
    return {
      available: false,
      date: dateStr,
      reason: 'This date is too far in the past for this weather provider.',
    };
  }

  const key = cacheKey(lat, lon, dateStr);
  const cached = await prisma.weatherCache.findUnique({ where: { cacheKey: key } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.dataJson as unknown as WeatherResult;
  }

  const pastDays = diffDays < 0 ? Math.min(MAX_HISTORY_DAYS_BACK, -diffDays) : 0;
  const forecastDays = diffDays >= 0 ? Math.min(MAX_FORECAST_DAYS_AHEAD, diffDays + 1) : 1;

  const url = new URL('/v1/forecast', env.OPEN_METEO_BASE_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode',
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('past_days', String(pastDays));
  url.searchParams.set('forecast_days', String(forecastDays));

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw HttpError.badGateway("We couldn't retrieve weather information right now.");
  }
  if (!response.ok) {
    throw HttpError.badGateway("We couldn't retrieve weather information right now.");
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const index = data.daily.time.indexOf(dateStr);
  if (index === -1) {
    const result: WeatherResult = {
      available: false,
      date: dateStr,
      reason: 'Forecast unavailable for this date.',
    };
    return result;
  }

  const weatherCode = data.daily.weathercode[index] ?? 0;
  const result: WeatherResult = {
    available: true,
    date: dateStr,
    tempMaxC: data.daily.temperature_2m_max[index] ?? 0,
    tempMinC: data.daily.temperature_2m_min[index] ?? 0,
    precipitationProbabilityMax: data.daily.precipitation_probability_max[index] ?? null,
    windSpeedMaxKmh: data.daily.windspeed_10m_max[index] ?? 0,
    weatherCode,
    description: WEATHER_CODE_LABELS[weatherCode] ?? 'Unknown',
  };

  await prisma.weatherCache.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, dataJson: result as unknown as object },
    update: { dataJson: result as unknown as object, fetchedAt: new Date() },
  });

  return result;
}
