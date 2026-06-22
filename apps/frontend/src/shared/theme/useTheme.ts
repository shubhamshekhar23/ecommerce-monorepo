"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return getSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reading from localStorage / matchMedia to sync React state with the external
    // theme store. The React Compiler flags setState-in-effect as a performance
    // concern, but this is the correct pattern for hydration-safe external system sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  // Apply theme to DOM. localStorage is only written when the user explicitly
  // toggles — never on mount — so the OS listener can apply on return visits
  // when the user has never manually overridden their preference.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme, mounted]);

  // Follow OS preference changes in real time, but only when the user has not
  // stored an explicit override in localStorage.
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
         
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [mounted]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, toggleTheme, mounted };
}
