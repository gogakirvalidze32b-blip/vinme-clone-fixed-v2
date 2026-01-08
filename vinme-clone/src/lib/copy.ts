// src/lib/copy.ts
export const copy = {
  ka: {
    common: {
      home: "მთავარი",
      settings: "პარამეტრები",
      reload: "განახლება",
      finishProfileTitle: "დაასრულე პროფილი 📝",
      finishProfileDesc:
        "profiles ცხრილში row ვერ ვიპოვე user_id-ით. შედი Onboarding-ში.",
      goToOnboarding: "Onboarding-ზე გადასვლა",
      errorTitle: "შეცდომა",
      loading: "იტვირთება…",
      noProfilesFound: "პროფილები ვერ მოიძებნა 😅",
    },
    feed: {
      home: "მთავარი",
      settings: "პარამეტრები",
    },
  },

  en: {
    common: {
      home: "Home",
      settings: "Settings",
      reload: "Reload",
      finishProfileTitle: "Finish your profile 📝",
      finishProfileDesc:
        "We couldn't find your profiles row by user_id. Go to Onboarding.",
      goToOnboarding: "Go to Onboarding",
      errorTitle: "Error",
      loading: "Loading…",
      noProfilesFound: "No profiles found 😅",
    },
    feed: {
      home: "Home",
      settings: "Settings",
    },
  },
} as const;

export type Lang = keyof typeof copy; // "ka" | "en"
