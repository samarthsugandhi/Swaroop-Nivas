"use client";
import { Sun, Moon, Languages } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";

/**
 * Reusable top-right control cluster: theme toggle + language toggle.
 * Place inside any page header.
 */
export default function HeaderControls() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();

  return (
    <div className="flex items-center gap-2">
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-sm font-semibold active:scale-95 transition-transform min-h-[44px]"
        aria-label="Toggle language"
      >
        <Languages size={16} />
        <span>{lang === "en" ? "ಕನ್ನಡ" : "EN"}</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 active:scale-95 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    </div>
  );
}
