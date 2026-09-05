import { useEffect, useRef, useState } from 'react';
import { placesApi } from '../api/places';
import type { PlaceSearchResult } from '../api/types';

export function PlaceSearchInput({
  placeholder = 'Search for a place...',
  onSelect,
}: {
  placeholder?: string;
  onSelect: (result: PlaceSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const res = await placesApi.search(query);
        setResults(res.results);
        setIsOpen(true);
      } catch {
        setError('Place search is temporarily unavailable. Please try again shortly.');
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {isSearching && <p className="mt-1 text-xs text-ink-500">Searching...</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-ink-100 bg-white shadow-lg">
          {results.map((result) => (
            <li key={result.externalId}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery(result.name);
                  setIsOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-100/60"
              >
                <span className="font-medium text-ink-900">{result.name}</span>
                {result.category && <span className="ml-2 text-xs text-ink-500">{result.category}</span>}
                <br />
                <span className="text-xs text-ink-500">{result.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
