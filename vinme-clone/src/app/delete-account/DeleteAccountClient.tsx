"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

function Modal({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* card */}
      <div
        className="relative w-full max-w-sm rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "mt-0.5 h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ring-1 ring-white/10",
              danger ? "bg-red-500/15 text-red-300" : "bg-pink-500/15 text-pink-300",
            ].join(" ")}
            aria-hidden="true"
          >
            {danger ? "!" : "⏸"}
          </div>

          <div className="min-w-0">
            <div className="text-lg font-extrabold">{title}</div>
            <div className="mt-2 text-sm leading-relaxed text-white/70">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl bg-white/10 px-4 py-3 font-semibold text-white ring-1 ring-white/10 active:scale-[0.99] disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-2xl px-4 py-3 font-extrabold text-black active:scale-[0.99] disabled:opacity-60",
              danger ? "bg-red-400" : "bg-white",
            ].join(" ")}
          >
            {loading ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const deleteMode = useMemo(() => sp.get("delete") === "1", [sp]);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<"pause" | "delete" | null>(null);

  async function safeGetUserId() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      router.replace("/login");
      return null;
    }
    return user.id;
  }

  async function doPause() {
    try {
      setBusy("pause");

      const userId = await safeGetUserId();
      if (!userId) return;

      // ✅ Pause: უბრალოდ არ გამოჩნდეს სხვებისთვის
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ paused: true })
        .eq("user_id", userId);

      if (updErr) throw updErr;

      // ✅ Pause-ის მერე logout + replace
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      alert(e?.message ?? "Pause failed");
    } finally {
      setBusy(null);
      setPauseOpen(false);
    }
  }

  async function doSoftDelete30d() {
    try {
      setBusy("delete");

      const userId = await safeGetUserId();
      if (!userId) return;

      const now = new Date();
      const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // ✅ SOFT DELETE (30 დღე)
      const { error } = await supabase
        .from("profiles")
        .update({
          deleted_at: now.toISOString(),
          delete_scheduled_at: scheduled.toISOString(),
          paused: true, // დამალოს ყველგან
        })
        .eq("user_id", userId);

      if (error) throw error;

      // ✅ logout + replace
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    } finally {
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-pink-400 text-2xl leading-none"
            aria-label="Back"
          >
            ←
          </button>

          <div className="min-w-0">
            <h1 className="text-xl font-extrabold">
              {deleteMode ? "Delete Account" : "Account Options"}
            </h1>
            <p className="mt-1 text-xs text-white/50">
              {deleteMode
                ? "You can restore your account within 30 days."
                : "Pause or schedule deletion — you control it."}
            </p>
          </div>
        </div>

        {!deleteMode ? (
          <div className="mt-14 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-2xl">
              ⏸
            </div>

            
            

            <h2 className="mt-6 text-2xl font-extrabold">Pause my account</h2>

            <p className="mt-3 max-w-sm text-white/60 leading-relaxed">
              Your profile won’t be shown to other people while paused. You can
              turn it back on anytime in Settings.
            </p>

            <div className="pt-6 w-full">
              <button
                type="button"
                onClick={() => setPauseOpen(true)}
                className="w-full rounded-2xl bg-white px-4 py-4 text-black font-extrabold active:scale-[0.99] disabled:opacity-60"
                disabled={busy !== null}
              >
                Pause My Account
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/delete-account?delete=1")}
              className="mt-6 text-white/70 font-semibold underline decoration-white/20 underline-offset-4"
              disabled={busy !== null}
            >
              Delete my account →
            </button>
          </div>
        ) : (
          <div className="mt-14 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-red-500/15 flex items-center justify-center text-red-300 text-2xl">
              !
            </div>

            <h2 className="mt-6 text-2xl font-extrabold">Delete my account</h2>

            <p className="mt-3 max-w-sm text-white/60 leading-relaxed">
              We’ll schedule deletion for <span className="text-white/80 font-semibold">30 days</span>.
              If you sign in during that period, you can restore your account.
              If you don’t sign in, it will be deleted after 30 days.
            </p>

            <div className="pt-6 w-full">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="w-full rounded-2xl bg-red-400 px-4 py-4 text-black font-extrabold active:scale-[0.99] disabled:opacity-60"
                disabled={busy !== null}
              >
                Schedule Deletion (30 days)
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/delete-account")}
              className="mt-6 text-white/70 font-semibold underline decoration-white/20 underline-offset-4"
              disabled={busy !== null}
            >
              Back to pause option →
            </button>
          </div>
        )}
      </div>

      {/* ✅ Pause confirm modal */}
      <Modal
        open={pauseOpen}
        title="Pause your account?"
        description={
          <>
            Your profile will be hidden from other users.
            <br />
            You can unpause anytime from Settings.
          </>
        }
        confirmText="Yes, pause"
        cancelText="Cancel"
        danger={false}
        loading={busy === "pause"}
        onClose={() => (busy ? null : setPauseOpen(false))}
        onConfirm={doPause}
      />

      {/* ✅ Delete confirm modal */}
      <Modal
        open={deleteOpen}
        title="Schedule deletion?"
        description={
          <>
            Your account will be scheduled for deletion in <b>30 days</b>.
            <br />
            If you sign in during this period, you can restore it. Otherwise it
            will be deleted after 30 days.
          </>
        }
        confirmText="Yes, delete"
        cancelText="Cancel"
        danger
        loading={busy === "delete"}
        onClose={() => (busy ? null : setDeleteOpen(false))}
        onConfirm={doSoftDelete30d}
      />

      <BottomNav />
    </main>
  );
}