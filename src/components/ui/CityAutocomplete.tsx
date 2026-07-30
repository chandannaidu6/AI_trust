import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';

interface CityAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}

interface RawCity {
  name: string;
  countryCode: string;
  stateCode?: string;
}

interface RawCountry {
  isoCode: string;
  name: string;
}

interface Result {
  key: string;
  label: string;
}

// Loaded lazily (only when this field is actually used) since the underlying
// dataset is ~150k cities — no reason to ship that in the initial bundle.
let dataPromise: Promise<{ cities: RawCity[]; countries: Map<string, RawCountry> }> | null = null;

function loadCityData() {
  if (!dataPromise) {
    dataPromise = import('country-state-city').then(({ City, Country }) => ({
      cities: City.getAllCities() as RawCity[],
      countries: new Map(Country.getAllCountries().map((c: RawCountry) => [c.isoCode, c])),
    }));
  }
  return dataPromise;
}

function countryLabel(country: RawCountry | undefined): string {
  if (!country) return '';
  return country.isoCode === 'US' ? 'USA' : country.name;
}

const MAX_RESULTS = 30;

export function CityAutocomplete({ value, onChange, placeholder, id }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<RawCity[] | null>(null);
  const [countries, setCountries] = useState<Map<string, RawCountry> | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const ensureLoaded = useCallback(() => {
    if (cities) return;
    setLoading(true);
    loadCityData().then(({ cities: c, countries: co }) => {
      setCities(c);
      setCountries(co);
      setLoading(false);
    });
  }, [cities]);

  const results: Result[] = (() => {
    const q = query.trim().toLowerCase();
    if (!cities || !countries || q.length < 2) return [];

    const matches: RawCity[] = [];
    for (let i = 0; i < cities.length && matches.length < MAX_RESULTS; i++) {
      if (cities[i].name.toLowerCase().startsWith(q)) matches.push(cities[i]);
    }
    if (matches.length < 8) {
      for (let i = 0; i < cities.length && matches.length < MAX_RESULTS; i++) {
        const c = cities[i];
        if (c.name.toLowerCase().includes(q) && !matches.includes(c)) matches.push(c);
      }
    }

    return matches.map(c => {
      const country = countryLabel(countries.get(c.countryCode));
      const label = c.stateCode ? `${c.name}, ${c.stateCode}, ${country}` : `${c.name}, ${country}`;
      return { key: `${c.name}|${c.stateCode ?? ''}|${c.countryCode}`, label };
    });
  })();

  const selectOption = (label: string) => {
    onChange(label);
    setQuery(label);
    setOpen(false);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    setOpen(true);
    setHighlighted(0);
    if (v.trim() === '') onChange('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectOption(results[highlighted].label);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        autoComplete="off"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { setOpen(true); ensureLoaded(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                   text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800
                   placeholder:text-slate-300 dark:placeholder:text-slate-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200
                     dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg"
        >
          {loading && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Loading cities…</p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Type at least 2 characters…</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No matching cities found.</p>
          )}
          {!loading && results.map((r, i) => (
            <button
              key={r.key}
              type="button"
              role="option"
              aria-selected={i === highlighted}
              onClick={() => selectOption(r.label)}
              onMouseEnter={() => setHighlighted(i)}
              className={`block w-full text-left px-3 py-2 text-sm ${
                i === highlighted
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
