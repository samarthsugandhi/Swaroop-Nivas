"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "@/lib/translations";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("sn-lang") || "en";
    setLang(saved);
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "kn" : "en";
    setLang(next);
    localStorage.setItem("sn-lang", next);
  }

  // t(key) — returns translated string
  function t(key) {
    const keys = key.split(".");
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
    }
    return val ?? translations["en"][key] ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
