import { useCallback,useEffect, useState } from "react";

function getInitialTheme(): boolean {
  const stored = localStorage.getItem("dashboard-theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("bp6-dark", isDark);
    localStorage.setItem("dashboard-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);

  return { isDark, toggleTheme };
}
