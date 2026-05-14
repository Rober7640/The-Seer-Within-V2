/**
 * CityAutocomplete
 *
 * Debounced city search backed by Nominatim via /api/astrology/city-search.
 * Renders a dropdown of up to 5 suggestions as the user types.
 */

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/hooks/useAuth';

interface Suggestion {
  displayName: string;
  placeId: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'e.g. London, UK',
  className = '',
  required,
}: Props) {
  const [query, setQuery]           = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef  = useRef<HTMLDivElement>(null);

  // Keep internal query in sync if parent resets the value externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounce → fetch suggestions
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await authFetch(`/api/astrology/city-search?q=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => ({ results: [] }));
        const list: Suggestion[] = data.results ?? [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectSuggestion(s: Suggestion) {
    setQuery(s.displayName);
    onChange(s.displayName);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        required={required}
        placeholder={placeholder}
        className={className}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />

      {/* Loading spinner */}
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          ···
        </span>
      )}

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === activeIndex
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
              } ${i < suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {s.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
