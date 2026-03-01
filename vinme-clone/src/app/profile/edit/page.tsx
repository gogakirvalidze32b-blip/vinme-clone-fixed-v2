"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

const PHOTO_KEYS = ["photo1_url","photo2_url","photo3_url","photo4_url","photo5_url","photo6_url","photo7_url","photo8_url","photo9_url"];

const GENDER_OPTIONS = [
  { value: "male", ka: "მამაკაცი", en: "Man" },
  { value: "female", ka: "ქალი", en: "Woman" },
  { value: "nonbinary", ka: "არარობინარი", en: "Non-binary" },
];
const ORIENTATION_OPTIONS = [
  { value: "straight", ka: "ჰეტეროსექსუალი", en: "Straight" },
  { value: "gay", ka: "გეი", en: "Gay" },
  { value: "lesbian", ka: "ლესბოსელი", en: "Lesbian" },
  { value: "bisexual", ka: "ბისექსუალი", en: "Bisexual" },
];
const INTENT_OPTIONS = [
  { value: "long_term", ka: "სერიოზული ურთიერთობა", en: "Long-term relationship" },
  { value: "short_term", ka: "ხანმოკლე ურთიერთობა", en: "Short-term fun" },
  { value: "friends", ka: "მეგობრობა", en: "Friendship" },
  { value: "networking", ka: "ნეთვორქინგი", en: "Networking" },
];
const PETS_OPTIONS = [{ value: "dog", ka: "ძაღლი", en: "Dog" }, { value: "cat", ka: "კატა", en: "Cat" }, { value: "none", ka: "არ მყავს", en: "None" }];
const DRINKING_OPTIONS = [{ value: "never", ka: "არ ვსვამ", en: "Never" }, { value: "socially", ka: "სოციალურად", en: "Socially" }, { value: "often", ka: "ხშირად", en: "Often" }];
const SMOKING_OPTIONS = [{ value: "never", ka: "არ ვწევ", en: "Never" }, { value: "sometimes", ka: "ზოგჯერ", en: "Sometimes" }, { value: "often", ka: "ხშირად", en: "Often" }];
const WORKOUT_OPTIONS = [{ value: "never", ka: "არა", en: "Never" }, { value: "sometimes", ka: "ზოგჯერ", en: "Sometimes" }, { value: "daily", ka: "ყოველდღე", en: "Daily" }];

// profile completeness fields
const COMPLETENESS_FIELDS = ["nickname","bio","city","gender","orientation","intent","job_title","company","education","pets","drinking","smoking","workout","photo1_url"];

function calcProgress(p: any): number {
  if (!p) return 0;
  const filled = COMPLETENESS_FIELDS.filter(f => p[f] && String(p[f]).trim() !== "").length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}


// ===== ORIENTATION MODAL (Tinder style) =====
const ORIENTATION_FULL = [
  { value: "straight", ka: "ჰეტეროსექსუალი", en: "Straight", desc_ka: "ადამიანი ვინც იზიდება მოპირდაპირე სქესისკენ", desc_en: "A person who is exclusively attracted to members of the opposite gender" },
  { value: "gay", ka: "გეი", en: "Gay", desc_ka: "ადამიანი ვინც იზიდება იმავე სქესისკენ", desc_en: "An umbrella term for someone who is attracted to members of their gender" },
  { value: "lesbian", ka: "ლესბოსელი", en: "Lesbian", desc_ka: "ქალი ვინც იზიდება ქალებისკენ", desc_en: "A woman who is emotionally, romantically, or sexually attracted to other women" },
  { value: "bisexual", ka: "ბისექსუალი", en: "Bisexual", desc_ka: "ადამიანი ვინც იზიდება ერთზე მეტი სქესისკენ", desc_en: "A person who has potential for attraction to people of more than one gender" },
  { value: "asexual", ka: "ასექსუალი", en: "Asexual", desc_ka: "ადამიანი ვინც სექსუალურ მიზიდულობას არ განიცდის", desc_en: "A person who does not experience sexual attraction" },
  { value: "demisexual", ka: "დემისექსუალი", en: "Demisexual", desc_ka: "იზიდება მხოლოდ ემოციური კავშირის შემდეგ", desc_en: "A person who does not experience sexual attraction unless they form a strong emotional connection" },
  { value: "pansexual", ka: "პანსექსუალი", en: "Pansexual", desc_ka: "იზიდება ნებისმიერი სქესის ადამიანებისკენ", desc_en: "A person who has potential for attraction to people regardless of gender" },
  { value: "queer", ka: "ქვირი", en: "Queer", desc_ka: "სექსუალური ორიენტაციების სპექტრი", desc_en: "An umbrella term to express a spectrum of sexual orientations and genders" },
  { value: "questioning", ka: "კითხვის ნიშნის ქვეშ", en: "Questioning", desc_ka: "სქესობრივი ორიენტაციის კვლევის პროცესში", desc_en: "A person exploring their sexual orientation and/or gender" },
  { value: "not_listed", ka: "სხვა", en: "Not listed", desc_ka: "მიეცი ჩვენ შეხება", desc_en: "Tell us what's missing." },
];

function OrientationModal({ value, visible, lang, onSave, onClose }: {
  value: string; visible: boolean; lang: string;
  onSave: (v: string, vis: boolean) => void; onClose: () => void;
}) {
  const ka = lang !== "en";
  const [selected, setSelected] = React.useState(value);
  const [vis, setVis] = React.useState(visible);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col text-white">
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none">✕</button>
        <button onClick={() => onSave(selected, vis)}
          className="text-blue-400 font-bold text-sm hover:text-blue-300">{ka ? "შენახვა" : "Done"}</button>
      </div>
      <div className="px-5 mb-6">
        <h1 className="text-2xl font-extrabold mb-1">{ka ? "ჩემი სექსუალური ორიენტაცია" : "My sexual orientation"}</h1>
        <p className="text-sm text-white/50">{ka ? "აირჩიე ყველაფერი რაც გამოხატავს შენ." : "Select all that describe you to reflect your identity."}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
        {ORIENTATION_FULL.map(opt => (
          <button key={opt.value} type="button" onClick={() => setSelected(opt.value)}
            className={`w-full text-left rounded-2xl px-4 py-3.5 ring-1 transition
              ${selected === opt.value ? "ring-pink-500 bg-pink-500/10" : "ring-white/12 bg-zinc-900 hover:bg-zinc-800"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{ka ? opt.ka : opt.en}</span>
              {selected === opt.value && <span className="text-pink-400 text-lg">✓</span>}
            </div>
            <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{ka ? opt.desc_ka : opt.desc_en}</p>
          </button>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-white/8 space-y-3 bg-zinc-950">
        <p className="text-xs text-center text-white/40">
          {ka ? `სექსუალური ორიენტაცია პროფილში ${vis ? "ხილულია" : "დამალულია"}.` : `Your sexual orientation is ${vis ? "visible" : "hidden"} in profile.`}
        </p>
        <button onClick={() => setVis(!vis)}
          className="w-full rounded-2xl bg-white py-3.5 font-bold text-black text-sm">
          {ka ? (vis ? "დამალვა" : "გამოჩენა") : (vis ? "Hide" : "Show")}
        </button>
      </div>
    </div>
  );
}


// ✅ Reverse geocoding - get city from GPS coordinates
async function getCityFromCoords(lat: number, lon: number, lang: string): Promise<string | null> {
  try {
    // fetch both languages in parallel for accuracy
    const acceptLang = lang === "en" ? "en" : "ka";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${acceptLang}`,
      { headers: { "User-Agent": "Shekhvdi/1.0" } }
    );
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || data.address?.county || data.address?.state;
    return city ?? null;
  } catch { return null; }
}

export default function EditProfilePage() {
  const router = useRouter();
  const lang = getLang();
  const L = (ka: string, en: string) => lang === "en" ? en : ka;

  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState<number | null>(null);

  const [p, setP] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [education, setEducation] = useState("");
  const [gender, setGender] = useState("");
  const [orientation, setOrientation] = useState("");
  const [intent, setIntent] = useState("");
  const [pets, setPets] = useState("");
  const [drinking, setDrinking] = useState("");
  const [smoking, setSmoking] = useState("");
  const [workout, setWorkout] = useState("");
  const [showAge, setShowAge] = useState(true);
  const [showOrientModal, setShowOrientModal] = useState(false);
  const [orientVisible, setOrientVisible] = useState(false);
  const [showDist, setShowDist] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingPhotoIdx = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
      if (!data) { router.replace("/onboarding"); return; }
      setP(data);
      setBio(data.bio ?? "");
      setCity(data.city ?? "");
      // ✅ Always get GPS to keep coords fresh + auto-fill city
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const cityName = await getCityFromCoords(pos.coords.latitude, pos.coords.longitude, lang);
          if (cityName) setCity(cityName);
          await supabase.from("profiles").update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: cityName ?? data.city,
          }).eq("user_id", data.user_id);
        }, () => {
          // permission denied — keep existing city
        });
      }
      setJobTitle(data.job_title ?? "");
      setCompany(data.company ?? "");
      setEducation(data.education ?? "");
      setGender(data.gender ?? "");
      setOrientation(data.orientation ?? "");
      setIntent(data.intent ?? "");
      setPets(data.pets ?? "");
      setDrinking(data.drinking ?? "");
      setSmoking(data.smoking ?? "");
      setWorkout(data.workout ?? "");
      setShowAge(data.show_age !== false);
      setShowDist(data.show_distance !== false);
      setOrientVisible(data.orientation_visible ?? false);
      setLoading(false);
    })();
  }, [router]);

  async function handleSave() {
    if (!p || saving) return;
    setSaving(true);
    const patch = { bio, city, job_title: jobTitle, company, education, gender, orientation, intent, pets, drinking, smoking, workout, show_age: showAge, show_distance: showDist, orientation_visible: orientVisible };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", p.user_id);
    if (!error) { setP((prev: any) => ({ ...prev, ...patch })); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function uploadPhoto(idx: number, file: File) {
    if (!p) return;
    setBusyPhoto(idx);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `photos/${p.user_id}/photo${idx}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (upErr) { setBusyPhoto(null); return; }
    const key = `photo${idx}_url`;
    const { error: dbErr } = await supabase.from("profiles").update({ [key]: path }).eq("user_id", p.user_id);
    if (!dbErr) setP((prev: any) => ({ ...prev, [key]: path }));
    setBusyPhoto(null);
  }

  async function removePhoto(idx: number) {
    if (!p) return;
    const key = `photo${idx}_url`;
    await supabase.from("profiles").update({ [key]: null }).eq("user_id", p.user_id);
    setP((prev: any) => ({ ...prev, [key]: null }));
  }

  const progress = calcProgress({ ...p, bio, city, job_title: jobTitle, company, education, gender, orientation, intent, pets, drinking, smoking, workout });
  const photos = PHOTO_KEYS.map((k, i) => ({ key: k, idx: i + 1, src: p?.[k] ? photoSrc(p[k]) : null }));
  const name = p?.nickname ?? p?.first_name ?? "User";
  const age = p?.age ?? null;

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="bg-black text-white min-h-[100dvh]">
      <div className="mx-auto w-full max-w-lg">

        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()} className="text-pink-400 text-2xl shrink-0">←</button>
            <h1 className="font-extrabold text-base flex-1">{L("პროფილის რედაქტირება", "Edit profile")}</h1>
            <button onClick={handleSave} disabled={saving}
              className="rounded-full bg-pink-500 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">
              {saved ? "✓" : saving ? "..." : L("შენახვა", "Save")}
            </button>
          </div>

          {/* TABS */}
          <div className="flex rounded-full bg-white/8 p-0.5">
            {(["edit", "preview"] as const).map(t2 => (
              <button key={t2} onClick={() => setTab(t2)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${tab === t2 ? "bg-white text-black" : "text-white/50"}`}>
                {t2 === "edit" ? L("რედაქტირება", "Edit") : L("გადახედვა", "Preview")}
              </button>
            ))}
          </div>

          {/* PROGRESS */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-pink-400">{progress}%</span>
          </div>
        </div>

        {tab === "preview" ? (
          /* ====== PREVIEW ====== */
          <PreviewTab p={{ ...p, bio, city, job_title: jobTitle, company, education, gender, orientation, intent, pets, drinking, smoking, workout }} lang={lang} />
        ) : (
          /* ====== EDIT ====== */
          <div className="px-4 pt-4 pb-32 space-y-6">

            {/* PHOTOS */}
            <Section title={L("ფოტოები", "Photos")}>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(({ idx, src }) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800">
                    {src ? (
                      <>
                        <img src={src} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-xs text-white">✕</button>
                        {idx === 1 && <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">MAIN</div>}
                      </>
                    ) : (
                      <button onClick={() => { uploadingPhotoIdx.current = idx; fileInputRef.current?.click(); }}
                        disabled={busyPhoto !== null}
                        className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 transition">
                        {busyPhoto === idx ? <span className="text-xl animate-spin">⏳</span> : <span className="text-3xl">+</span>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(uploadingPhotoIdx.current, f); e.target.value = ""; }} />
            </Section>

            {/* BIO */}
            <Section title={L("ჩემ შესახებ", "About me")} dot>
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-white/30 outline-none resize-none ring-1 ring-white/10 focus:ring-pink-500"
                placeholder={L("დაწერე ჩემ შესახებ...", "Write about yourself...")} />
              <div className="text-right text-xs text-white/30 mt-1">{bio.length}/500</div>
            </Section>

            {/* CITY */}
            <Section title={L("საცხოვრებელი ადგილი", "Living In")} dot>
              <div className="relative">
                <input value={city} readOnly
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 cursor-default"
                  placeholder={L("ლოკაცია ავტომატურად...", "Auto-detecting location...")} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] text-white/30">📍 {L("ავტო", "Auto")}</span>
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">Premium</span>
                </div>
              </div>
            </Section>

            {/* JOB */}
            <Section title={L("სამსახური", "Job")} badge="+4%">
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-pink-500 mb-2"
                placeholder={L("პოზიცია / სამუშაო", "Job Title")} />
              <input value={company} onChange={e => setCompany(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-pink-500"
                placeholder={L("კომპანია", "Company")} />
            </Section>

            {/* EDUCATION */}
            <Section title={L("განათლება", "Education")} badge="+3%">
              <input value={education} onChange={e => setEducation(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-pink-500"
                placeholder={L("სკოლა / უნივერსიტეტი", "School / University")} />
            </Section>

            {/* GENDER */}
            <Section title={L("სქესი", "Gender")}>
              <div className="space-y-2">
                {GENDER_OPTIONS.map(opt => (
                  <ChoiceRow key={opt.value} label={lang === "en" ? opt.en : opt.ka}
                    active={gender === opt.value} onClick={() => setGender(opt.value)} />
                ))}
                <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-white/10">
                  <div>
                    <div className="text-sm font-medium">{L("სქესის ჩვენება", "Show my gender")}</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
              </div>
            </Section>

            {/* ORIENTATION - Tinder style row that opens modal */}
            <Section title={L("სექსუალური ორიენტაცია", "Sexual Orientation")}>
              <button type="button" onClick={() => setShowOrientModal(true)}
                className="w-full flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3.5 ring-1 ring-white/10 hover:bg-zinc-800 transition">
                <span className="text-sm text-white/80">
                  {orientation ? (ORIENTATION_OPTIONS.find(o => o.value === orientation)?.[lang === "en" ? "en" : "ka"] ?? orientation) : L("არჩიე", "Select")}
                </span>
                <span className="text-white/30 flex items-center gap-1 text-sm">
                  {orientVisible ? L("ხილული", "Visible") : L("დამალული", "Hidden")} ›
                </span>
              </button>
            </Section>

            {/* INTENT */}
            <Section title={L("რას ვეძებ", "Looking for")} dot>
              <div className="space-y-2">
                {INTENT_OPTIONS.map(opt => (
                  <ChoiceRow key={opt.value} label={lang === "en" ? opt.en : opt.ka}
                    active={intent === opt.value} onClick={() => setIntent(opt.value)} />
                ))}
              </div>
            </Section>

            {/* LIFESTYLE */}
            <Section title={L("ცხოვრების სტილი", "Lifestyle")} badge="+5%">
              <SubSection label={L("შინაური ცხოველი", "Pets")} icon="🐾">
                <ChoiceRow3 options={PETS_OPTIONS} value={pets} onChange={setPets} lang={lang} />
              </SubSection>
              <SubSection label={L("ალკოჰოლი", "Drinking")} icon="🍷">
                <ChoiceRow3 options={DRINKING_OPTIONS} value={drinking} onChange={setDrinking} lang={lang} />
              </SubSection>
              <SubSection label={L("მოწევა", "Smoking")} icon="🚬">
                <ChoiceRow3 options={SMOKING_OPTIONS} value={smoking} onChange={setSmoking} lang={lang} />
              </SubSection>
              <SubSection label={L("ვარჯიში", "Workout")} icon="💪">
                <ChoiceRow3 options={WORKOUT_OPTIONS} value={workout} onChange={setWorkout} lang={lang} />
              </SubSection>
            </Section>

            {/* CONTROL */}
            <Section title={L("პროფილის მართვა", "Control Your Profile")}>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-white/10">
                  <div className="text-sm">{L("ასაკის დამალვა", "Don't Show My Age")}</div>
                  <Toggle checked={!showAge} onChange={v => setShowAge(!v)} />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-white/10">
                  <div className="text-sm">{L("დისტანციის დამალვა", "Don't Show My Distance")}</div>
                  <Toggle checked={!showDist} onChange={v => setShowDist(!v)} />
                </div>
              </div>
            </Section>

            {/* PHOTO VERIFICATION */}
            <Section title={L("ფოტო ვერიფიკაცია", "Photo Verification")}>
              <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl shrink-0">🤳</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{L("ვერიფიცირებული პროფილი", "Verified Profile")}</div>
                  <div className="text-xs text-white/40 mt-0.5">{L("სელფი გადაიღე პროფილის დასადასტურებლად", "Take a selfie to verify your profile")}</div>
                </div>
                <button className="rounded-full bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shrink-0">
                  {L("დადასტურება", "Verify")}
                </button>
              </div>
            </Section>

          </div>
        )}
      </div>

      <BottomNav />

      {showOrientModal && (
        <OrientationModal
          value={orientation} visible={orientVisible} lang={lang}
          onSave={(v, vis) => { setOrientation(v); setOrientVisible(vis); setShowOrientModal(false); }}
          onClose={() => setShowOrientModal(false)}
        />
      )}
    </div>
  );
}


function PreviewTab({ p, lang }: { p: any; lang: string }) {
  const photos = ["photo1_url","photo2_url","photo3_url","photo4_url","photo5_url","photo6_url"]
    .map(k => p?.[k] ? photoSrc(p[k]) : null).filter(Boolean) as string[];
  const [activePhoto, setActivePhoto] = useState(0);
  const name = p?.nickname ?? p?.first_name ?? "User";

  return (
    <div className="pb-32">
      {/* PHOTO */}
      <div className="relative" style={{ height: "min(70vh, 520px)" }}>
        {photos[activePhoto]
          ? <img src={photos[activePhoto]} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-7xl">👤</div>}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
        {photos.length > 1 && (
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActivePhoto(i)}
                className={`h-1 rounded-full transition-all ${i === activePhoto ? "bg-white w-8" : "bg-white/40 w-4"}`} />
            ))}
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-3xl font-black">{name}{p?.age ? `, ${p.age}` : ""}</h1>
          {p?.city && <p className="text-sm text-white/70 mt-0.5">📍 {p.city}</p>}
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        {p?.bio && (
          <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8">
            <p className="text-sm leading-relaxed">{p.bio}</p>
          </div>
        )}
        <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8 space-y-3">
          {p?.job_title && <InfoRow2 icon="💼" value={p.job_title} />}
          {p?.company && <InfoRow2 icon="🏢" value={p.company} />}
          {p?.education && <InfoRow2 icon="🎓" value={p.education} />}
          {p?.intent && <InfoRow2 icon="💭" value={p.intent} />}
        </div>
        {(p?.pets || p?.drinking || p?.smoking || p?.workout) && (
          <div className="flex flex-wrap gap-2">
            {p.pets && <Chip2 icon="🐾" label={p.pets} />}
            {p.drinking && <Chip2 icon="🍷" label={p.drinking} />}
            {p.smoking && <Chip2 icon="🚬" label={p.smoking} />}
            {p.workout && <Chip2 icon="💪" label={p.workout} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, dot, badge }: { title: string; children: React.ReactNode; dot?: boolean; badge?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {dot && <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" />}
        <span className="font-bold text-sm text-white">{title}</span>
        {badge && <span className="ml-auto text-xs font-bold text-pink-400">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function SubSection({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span>{icon}</span>
        <span className="text-xs text-white/50">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ChoiceRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${active ? "bg-pink-500/20 ring-1 ring-pink-500 text-white" : "bg-zinc-900 ring-1 ring-white/10 text-white/70 hover:bg-zinc-800"}`}>
      <span>{label}</span>
      {active && <span className="text-pink-400 font-bold">✓</span>}
    </button>
  );
}

function ChoiceRow3({ options, value, onChange, lang }: { options: {value:string;ka:string;en:string}[]; value: string; onChange: (v:string)=>void; lang: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${value === opt.value ? "bg-pink-500 text-white" : "bg-zinc-800 text-white/60 hover:bg-zinc-700"}`}>
          {lang === "en" ? opt.en : opt.ka}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v:boolean)=>void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-pink-500" : "bg-white/15"}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function InfoRow2({ icon, value }: { icon: string; value: string }) {
  return <div className="flex items-center gap-3 text-sm"><span>{icon}</span><span className="text-white/80">{value}</span></div>;
}
function Chip2({ icon, label }: { icon: string; label: string }) {
  return <div className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs text-white/80"><span>{icon}</span><span>{label}</span></div>;
}

import React from "react";
