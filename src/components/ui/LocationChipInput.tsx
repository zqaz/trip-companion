import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchCities, cityLabel, type City } from '@/data/cities';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function LocationChipInput({ value, onChange, placeholder = 'Search and add places...' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const found = searchCities(q).filter(c => !value.includes(cityLabel(c)));
      setResults(found);
      setIsOpen(q.length >= 2);
      setHighlightedIndex(-1);
    }, 150);
  }, [value]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    search(q);
  }

  function addCity(city: City) {
    const label = cityLabel(city);
    if (!value.includes(label)) {
      onChange([...value, label]);
    }
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  }

  function removeChip(label: string) {
    onChange(value.filter(v => v !== label));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && isOpen) {
      e.preventDefault();
      addCity(results[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function highlightMatch(text: string, q: string) {
    if (!q) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="text-primary font-bold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="min-h-[44px] w-full bg-muted border border-border rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-primary transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(label => (
          <span
            key={label}
            className="inline-flex items-center gap-1 bg-primary/20 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold"
          >
            {label}
            <button
              onMouseDown={e => { e.preventDefault(); removeChip(label); }}
              className="hover:text-primary/60 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(results.length > 0)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground text-sm">No results found</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {results.map((city, i) => (
                <li key={`${city.city}-${city.country}`}>
                  <button
                    onMouseDown={e => { e.preventDefault(); addCity(city); }}
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
