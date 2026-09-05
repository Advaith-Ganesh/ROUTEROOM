import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWeatherForDate } from '../services/weather.service.js';

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('weather service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('honestly reports a date too far in the future without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await getWeatherForDate(51.5, -0.1, isoDaysFromNow(30));

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toContain('16 days');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honestly reports a date too far in the past without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await getWeatherForDate(51.5, -0.1, isoDaysFromNow(-200));

    expect(result.available).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses a successful forecast response and caches it', async () => {
    const date = isoDaysFromNow(3);
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        daily: {
          time: [date],
          temperature_2m_max: [22.5],
          temperature_2m_min: [14.2],
          precipitation_probability_max: [10],
          windspeed_10m_max: [18.4],
          weathercode: [1],
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const first = await getWeatherForDate(52.0, 4.3, date);
    expect(first.available).toBe(true);
    if (first.available) {
      expect(first.tempMaxC).toBe(22.5);
      expect(first.description).toBe('Mainly clear');
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await getWeatherForDate(52.0, 4.3, date);
    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // served from cache, no second network call
  });

  it('surfaces a graceful error when the weather API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    await expect(getWeatherForDate(10, 10, isoDaysFromNow(1))).rejects.toMatchObject({ status: 502 });
  });
});
