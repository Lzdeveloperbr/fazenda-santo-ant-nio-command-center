import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Theme preference saved per user on this device; applies the `dark` class to <html>. */
export function useTheme(userId: string) {
  const key = `fsa-theme:${userId}`;
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = localStorage.getItem(key) as Theme | null;
    setTheme(saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, [key]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    return () => document.documentElement.classList.remove("dark");
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => { const n = t === "dark" ? "light" : "dark"; localStorage.setItem(key, n); return n; });
  }, [key]);
  return { theme, toggle };
}
