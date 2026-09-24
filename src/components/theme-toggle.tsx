import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("dabliu-theme", theme);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("dabliu-theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button className={`theme-toggle ${className}`} type="button" onClick={toggle} aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"} title={theme === "light" ? "Modo escuro" : "Modo claro"}>
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}