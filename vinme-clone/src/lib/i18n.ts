"use client";

export type Lang = "ka" | "en";
const KEY = "lang";

export function getLang(): Lang {
  if (typeof window === "undefined") return "ka";
  const v = localStorage.getItem(KEY);
  return v === "en" ? "en" : "ka";
}

export function setLang(lang: Lang) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, lang);

  // 🔔 notify app
  window.dispatchEvent(new Event("app:lang"));
}

/* ================= COPY ================= */

export const dict = {
  ka: {
    login_title: "შეხვდი",
    login_subtitle: "შეხვდი ახალ ადამიანებს — მარტივად.",
    login_terms: "გაგრძელებით ეთანხმები წესებს და კონფიდენციალურობას.",
    beta: "ბეტა",
  },
  en: {
    login_title: "Shekhvdi",
    login_subtitle: "Meet new people — easily.",
    login_terms: "By continuing, you agree to the terms and privacy policy.",
    beta: "beta",
  },
} as const;