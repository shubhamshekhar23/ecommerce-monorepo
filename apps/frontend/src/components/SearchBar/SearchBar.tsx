"use client";

import { useState, useRef, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { useProductSearch } from "@/features/products/hooks";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { highlightMatch } from "@/features/products/utils/highlightMatch";
import styles from "./SearchBar.module.scss";

export function SearchBar() {
  const router = useRouter();
  const listboxId = useId();
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { recentSearches, saveSearch, clearSearches } = useRecentSearches();
  const debouncedInput = useDebounce(input, 300);
  const { data: searchData } = useProductSearch(debouncedInput || undefined);
  const suggestions = searchData?.data.slice(0, 5) ?? [];

  const showRecent = isOpen && !input.trim() && recentSearches.length > 0;
  const showSuggestions =
    isOpen && Boolean(input.trim()) && suggestions.length > 0;
  const dropdownOpen = showRecent || showSuggestions;

  const items: string[] = showRecent
    ? recentSearches
    : suggestions.map((p) => p.name);

  const navigate = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      saveSearch(term.trim());
      router.push(`/products?search=${encodeURIComponent(term.trim())}`);
      setInput("");
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [router, saveSearch],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = activeIndex >= 0 ? items[activeIndex] : undefined;
    navigate(selected ?? input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} role="search">
      <div className={styles.bar}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products, brands, categories"
          className={styles.input}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-label="Search products"
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        <button type="submit" className={styles.searchBtn} aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m20 20-4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {dropdownOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className={styles.dropdown}
          aria-label={showRecent ? "Recent searches" : "Search suggestions"}
        >
          {showRecent && (
            <li className={styles.dropdownHeader}>
              <span>Recent searches</span>
              <button
                type="button"
                className={styles.clearBtn}
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearSearches}
              >
                Clear all
              </button>
            </li>
          )}
          {items.map((item, i) => (
            <li
              key={item}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`${styles.item} ${i === activeIndex ? styles.itemActive : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                navigate(item);
              }}
            >
              {showSuggestions ? highlightMatch(item, input) : item}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
