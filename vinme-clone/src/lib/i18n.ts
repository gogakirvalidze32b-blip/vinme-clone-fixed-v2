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
  window.dispatchEvent(new Event("app:lang"));
}

export const dict = {
  ka: {
    // login
    login_title: "შეხვდი",
    login_subtitle: "შეხვდი ახალ ადამიანებს — მარტივად.",
    login_terms: "გაგრძელებით ეთანხმები წესებს და კონფიდენციალურობას.",
    beta: "ბეტა",
    // nav
    nav_swipe: "სვაიპი",
    nav_explore: "ძიება",
    nav_likes: "მოწონება",
    nav_chat: "ჩათი",
    nav_profile: "პროფილი",
    // feed
    recently_active: "ახლახან აქტიური",
    no_more: "მეტი პროფილი არ არის",
    no_more_sub: "ყველა ნახე! მოგვიანებით სცადე.",
    refresh: "განახლება",
    // chat
    chat_title: "ჩათი",
    new_matches: "ახალი შეხვედრები",
    messages: "მიმოწერა",
    no_matches: "შეხვედრა ჯერ არ არის",
    no_matches_sub: "დაიწყე სვაიპი!",
    find_matches: "შეხვედრის პოვნა →",
    type_message: "შეიყვანე მესიჯი...",
    online: "ონლაინ",
    voice_ready: "ხმა მზადაა",
    voice_message: "🎤 ხმოვანი მესიჯი",
    stop: "გაჩერება",
    send: "გაგზავნა",
    // settings
    settings_title: "პარამეტრები",
    back: "← უკან",
    save: "შენახვა",
    logout: "გასვლა",
    delete_account: "ანგარიშის წაშლა",
    account_settings: "ანგარიშის პარამეტრები",
    discovery: "ძიების პარამეტრები",
    location: "მდებარეობა",
    interested_in: "მაინტერესებს",
    max_distance: "მაქსიმალური დისტანცია",
    age_range: "ასაკის დიაპაზონი",
    enable_discovery: "ძიების ჩართვა",
    enable_discovery_sub: "გამორთვით პროფილი დაიმალება.",
    photo_verified: "ფოტო-დამოწმებული ჩათი",
    photo_verified_sub: "მხოლოდ დამოწმებული პროფილებისგან მიიღო მესიჯი.",
    read_receipts: "წაკითხვის სტატუსი",
    read_receipts_sub: "გამართვა — შეხვედრებს არ ეჩვენოს.",
    privacy: "კონფიდენციალურობა",
    legal: "სამართლებრივი",
    cookie_policy: "ქუქი-პოლიტიკა",
    privacy_policy: "კონფიდენციალურობის პოლიტიკა",
    privacy_prefs: "კონფიდენციალურობის პარამეტრები",
    licenses: "ლიცენზიები",
    terms: "გამოყენების პირობები",
    version: "ვერსია",
    premium_sub: "პრიორიტეტული მოწონება, ნახე ვინ მოგწონს და სხვა",
  },
  en: {
    login_title: "Shekhvdi",
    login_subtitle: "Meet new people — easily.",
    login_terms: "By continuing, you agree to the terms and privacy policy.",
    beta: "beta",
    nav_swipe: "Swipe",
    nav_explore: "Explore",
    nav_likes: "Likes",
    nav_chat: "Chat",
    nav_profile: "Profile",
    recently_active: "Recently Active",
    no_more: "No more profiles",
    no_more_sub: "You've seen everyone! Come back later.",
    refresh: "Refresh",
    chat_title: "Messages",
    new_matches: "New Matches",
    messages: "Messages",
    no_matches: "No matches yet",
    no_matches_sub: "Start swiping to get matches!",
    find_matches: "Find Matches →",
    type_message: "Message...",
    online: "Online",
    voice_ready: "Voice ready",
    voice_message: "🎤 Voice message",
    stop: "Stop",
    send: "Send",
    settings_title: "Settings",
    back: "← Back",
    save: "Save",
    logout: "Logout",
    delete_account: "Delete Account",
    account_settings: "Account Settings",
    discovery: "Discovery Settings",
    location: "Location",
    interested_in: "Interested In",
    max_distance: "Maximum Distance",
    age_range: "Age Range",
    enable_discovery: "Enable Discovery",
    enable_discovery_sub: "Turn off to hide your profile from the stack.",
    photo_verified: "Photo Verified Chat",
    photo_verified_sub: "Only receive messages from Photo Verified profiles.",
    read_receipts: "Read Receipts",
    read_receipts_sub: "Prevent matches from seeing read status.",
    privacy: "Privacy",
    legal: "Legal",
    cookie_policy: "Cookie Policy",
    privacy_policy: "Privacy Policy",
    privacy_prefs: "Privacy Preferences",
    licenses: "Licenses",
    terms: "Terms of Service",
    version: "Version",
    premium_sub: "Priority Likes, See who Likes you & More",
  },
} as const;

export type DictKey = keyof typeof dict.ka;

export function t(key: DictKey, lang?: Lang): string {
  const l = lang ?? getLang();
  return (dict[l] as any)[key] ?? (dict.ka as any)[key] ?? key;
}
