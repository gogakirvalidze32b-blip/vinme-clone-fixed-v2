"use client";

import { calcAgeFromBirthdate } from "@/lib/profile";
import { useRouter } from "next/navigation";

const router = useRouter();

type Props = {
  name: string;
  age?: number | null;
  birthdate?: string | null; // ✅ add this
  photoUrl?: string | null;
  progress?: number; // 0..100
  onEdit?: () => void;
  onOpenSettings?: () => void;
};
export default function ProfileHeader({
  name,
  age,
  birthdate,
  photoUrl,
  progress = 50,
  onEdit,
  onOpenSettings,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  const safeBirth = birthdate?.trim() ? birthdate.trim() : null;

  const shownAge =
    typeof age === "number"
      ? age
      : safeBirth
      ? calcAgeFromBirthdate(safeBirth)
      : null;
console.log("ProfileHeader props:", { name, age, birthdate });

  return (
    <div className="relative w-full rounded-3xl bg-zinc-950 px-5 pt-5 pb-6 text-white">
      {/* Settings top-right */}
      <button
        onClick={onOpenSettings}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/15"
        aria-label="Settings"
        title="Settings"
      >
        ⚙️
      </button>


      <div className="flex items-center gap-4">
        {/* Avatar with ring */}
        <div className="relative h-20 w-20 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#ec4899 ${pct * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
            }}
          />
          <div className="absolute inset-[4px] overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
            {photoUrl ? (
              <img
                src={photoUrl}
                className="h-full w-full object-cover"
                alt="avatar"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/50">
                👤
              </div>
            )}
          </div>

          {/* percent pill */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-extrabold ring-1 ring-white/10 backdrop-blur">
            {pct}%
          </div>
        </div>

        {/* Name + age + button */}
        <div className="flex-1">
<div className="mt-2 flex items-center gap-3">
  <button
    onClick={() => router.push("/profile/edit")}
    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black active:scale-[0.99]"
  >
    ✏️ Edit profile
  </button>

  <button
    onClick={() => router.push("/settings")}
    aria-label="Settings"
    className="h-10 w-10 rounded-full bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-lg active:scale-[0.99]"
    title="Settings"
  >
    ⚙️
  </button>
</div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">
              {name}
              {shownAge != null ? `, ${shownAge}` : ""}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
