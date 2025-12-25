"use client";

type Props = {
  name: string;
  age?: number;
  photoUrl?: string | null;
  progress?: number; // 0..100
  onEdit?: () => void;
  onOpenSettings?: () => void;
};

export default function ProfileHeader({
  name,
  age,
  photoUrl,
  progress = 50,
  onEdit,
  onOpenSettings,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

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
              <img src={photoUrl} className="h-full w-full object-cover" alt="avatar" />
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

        {/* Name + button */}
        <div className="flex-1">
          <div className="text-3xl font-extrabold tracking-tight">
            {name}
            {typeof age === "number" ? (
              <span className="text-white/80">, {age}</span>
            ) : null}
          </div>

          <button
            onClick={onEdit}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-extrabold text-zinc-900 hover:bg-zinc-200"
          >
            ✏️ Edit profile
          </button>
        </div>
      </div>
    </div>
  );
}
