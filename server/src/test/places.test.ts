import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces } from '../services/geocoding.service.js';
import { buildApp, createTestPlace, createTestTrip, createTestUser } from './helpers.js';

describe('geocoding service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches identical search queries instead of re-hitting Nominatim', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          place_id: 42,
          display_name: 'British Museum, London, UK',
          lat: '51.5194',
          lon: '-0.1269',
          type: 'museum',
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const first = await searchPlaces('british museum cache test');
    expect(first).toHaveLength(1);
    expect(first[0]?.name).toBe('British Museum');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await searchPlaces('British Museum Cache Test'); // different case/whitespace, same normalized query
    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('surfaces a graceful error when Nominatim is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    await expect(searchPlaces('unreachable query')).rejects.toMatchObject({ status: 502 });
  });

  it('returns no results for an empty query without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const results = await searchPlaces('   ');
    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('places API', () => {
  it('prevents deleting a place that is still used by an activity', async () => {
    const app = buildApp();
    const owner = await createTestUser(app);
    const trip = await createTestTrip(owner);
    const place = await createTestPlace(owner, trip.id);

    await owner.agent.post(`/api/trips/${trip.id}/activities`).send({
      placeId: place.id,
      date: trip.startDate.slice(0, 10),
      startTime: '10:00',
    });

    const res = await owner.agent.delete(`/api/trips/${trip.id}/places/${place.id}`);
    expect(res.status).toBe(409);
  });
});
