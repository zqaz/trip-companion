import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Globe, X } from 'lucide-react';
import { searchCities, cityLabel, type City } from '@/data/cities';
import { searchCountries } from '@/data/countries';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mode?: 'city' | 'country';
}

export default function LocationAutocomplete({ value, onChange, placeholder = 'e.g. Paris, France', className, mode = 'city' }: Props) {
  const [query, setQuery] = useState(value);
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [countryResults, setCountryResults] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const results = mode === 'country' ? countryResults : cityResults;

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (mode === 'country') {
        const found = searchCountries(q);
        setCountryResults(found);
        setIsOpen(q.length >= 1 && found.length > 0);
      } else {
        const found = searchCities(q);
        setCityResults(found);
        setIsOpen(q.length >= 2);
      }
      setHighlightedIndex(-1);
    }, 150);
  }, [mode]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    search(q);
  }

  function selectCity(city: City) {
    const label = cityLabel(city);
    setQuery(label);
    onChange(label);
    setIsOpen(false);
    setCityResults([]);
  }

  function selectCountry(country: string) {
    setQuery(country);
    onChange(country);
    setIsOpen(false);
    setCountryResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      if (mode === 'country') selectCountry(countryResults[highlightedIndex]);
      else selectCity(cityResults[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function highlightMatch(text: string, query: string) {
    if (!query) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </span>
    );
  }

  const Icon = mode === 'country' ? Globe : MapPin;

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (mode === 'country' && query.length >= 1) setIsOpen(countryResults.length > 0);
            else if (mode === 'city' && query.length >= 2) setIsOpen(cityResults.length > 0);
          }}
          placeholder={placeholder}
          className="w-full bg-muted border border-border rounded-xl pl-9 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onChange(''); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground text-sm">No results found</div>
          ) : mode === 'country' ? (
            <ul className="max-h-60 overflow-y-auto">
              {(results as string[]).map((country, i) => (
                <li key={country}>
                  <button
                    onMouseDown={e => { e.preventDefault(); selectCountry(country); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === highlightedIndex ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-foreground text-sm">{highlightMatch(country, query)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {(results as City[]).map((city, i) => (
                <li key={`${city.city}-${city.country}`}>
                  <button
                    onMouseDown={e => { e.preventDefault(); selectCity(city); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === highlightedIndex ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-foreground text-sm">{highlightMatch(city.city, query)}</p>
                      <p className="text-muted-foreground text-xs">{city.country}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
