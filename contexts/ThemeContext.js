"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("sn-theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("sn-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
