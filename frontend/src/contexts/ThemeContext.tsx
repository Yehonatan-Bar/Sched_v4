/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ThemeMode } from "../types/schema";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's theme preference (system, light, or dark) */
  themeMode: ThemeMode;
  /** The actual theme being displayed (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Change the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "sched_theme_mode";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Optional initial theme mode (overrides localStorage) */
  initialTheme?: ThemeMode;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    initialTheme ?? getStoredThemeMode
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(themeMode)
  );

  // Update resolved theme when mode changes
  useEffect(() => {
    setResolvedTheme(resolveTheme(themeMode));
  }, [themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    const handleChange = () => {
      setResolvedTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme attribute if using system
    if (themeMode === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", resolvedTheme);
    }

    // Also set color-scheme for native elements
    root.style.colorScheme = resolvedTheme;
  }, [themeMode, resolvedTheme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setThemeMode(newTheme);
  }, [resolvedTheme, setThemeMode]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
