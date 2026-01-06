// src/lib/i18n.ts
"use client";


export function getLang(): "ka" | "en" {
  if (typeof window === "undefined") return "ka";
  const v = localStorage.getItem("lang");
  return v === "en" ? "en" : "ka";
}

export function setLang(l: "ka" | "en") {
  if (typeof window === "undefined") return;
  localStorage.setItem("lang", l);
}



export const t = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      back: "Back",
    },

    nav: {
      feed: "Feed",
      likes: "Likes",
      chats: "Chats",
      profile: "Profile",
      settings: "Settings",
    },

    auth: {
      continueGoogle: "Continue with Google",
      subtitle: "Find your match",
    },

    settings: {
      title: "Settings",
      privacy: "Privacy",
      legal: "Legal",
      logout: "Log out",
      deleteAccount: "Delete account",
    },

    legal: {
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      licenses: "Licenses",
    },
  },

  ka: {
    common: {
      save: "შენახვა",
      cancel: "გაუქმება",
      back: "უკან",
    },

    nav: {
      feed: "შეხვედრები",
      likes: "მოწონებები",
      chats: "ჩათები",
      profile: "პროფილი",
      settings: "პარამეტრები",
    },

    auth: {
      continueGoogle: "Google-ით გაგრძელება",
      subtitle: "შეიგრძენი ახალი შეხვედრა",
    },

    settings: {
      title: "პარამეტრები",
      privacy: "კონფიდენციალურობა",
      legal: "იურიდიული",
      logout: "გასვლა",
      deleteAccount: "ანგარიშის წაშლა",
    },

    legal: {
      terms: "მომსახურების პირობები",
      privacy: "კონფიდენციალურობის პოლიტიკა",
      cookies: "ქუქიების პოლიტიკა",
      licenses: "ლიცენზიები",
    },
  },
} as const;

/* ---------- language helpers ---------- */

export function getLangClient(): "en" | "ka" {
  if (typeof window === "undefined") return "ka"; // ✅ default ქართული
  const v = localStorage.getItem("lang");
  return v === "en" ? "en" : "ka"; // ✅ თუ არაფერი წერია → ka
}

export function setLangClient(lang: "en" | "ka") {
  if (typeof window === "undefined") return;
  localStorage.setItem("lang", lang);
}


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
