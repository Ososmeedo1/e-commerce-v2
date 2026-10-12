"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "masar_theme";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

// Initial state comes from the <html> class already set by the no-flash
// inline script — never from localStorage during render (avoids hydration
// mismatch; the toggle button additionally sets suppressHydrationWarning).
function getInitialTheme() {
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  ) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme) {
  const dark =
    theme === "dark" ||
    (theme !== "light" &&
      theme !== "dark" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Follow the OS while in "system" mode (reached via setTheme("system")).
  useEffect(() => {
    if (theme !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures; theme still applies in-memory.
    }
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures; theme still applies in-memory.
    }
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
