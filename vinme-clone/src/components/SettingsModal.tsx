"use client";

export default function SettingsModal({
  value,
  setValue,
  onClose,
  onSave,
  saving,
  msg,
  onRandomName,
}: {
  value: any;
  setValue: (v: any) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  msg?: string;
  onRandomName: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-3 z-50">
      <div className="w-full max-w-md bg-zinc-950 p-4 rounded-3xl space-y-3">
        <button
          onClick={onClose}
          className="rounded-xl bg-white/10 px-4 py-2 text-white"
        >
          Close
        </button>

        <div className="flex gap-2">
          <input
            value={value.nickname}
            onChange={(e) =>
              setValue({ ...value, nickname: e.target.value })
            }
            placeholder="Nickname"
            className="w-full rounded-xl bg-zinc-900 p-3 text-white ring-1 ring-white/10"
          />
          <button
            onClick={onRandomName}
            className="rounded-xl bg-white/10 px-4 py-2"
          >
            🎲
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {msg && <p className="text-sm text-white/70">{msg}</p>}
      </div>
    </div>
  );
}
