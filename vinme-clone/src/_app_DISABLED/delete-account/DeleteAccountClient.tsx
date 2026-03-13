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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "mt-0.5 h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ring-1 ring-white/10",
              danger
                ? "bg-red-500/15 text-red-300"
                : "bg-pink-500/15 text-pink-300",
            ].join(" ")}
          >
            {danger ? "!" : " "}
          </div>

          <div className="min-w-0">
            <div className="text-lg font-extrabold">{title}</div>
            <div className="mt-2 text-sm text-white/70">{description}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl bg-white/10 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-2xl px-4 py-3 font-extrabold text-black disabled:opacity-60",
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
  const deleteMode = false;
  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<"pause" | "delete" | null>(null);
  

  async function safeGetUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      router.replace("/login");
      return null;
    }
    return data.user.id;
  }

  async function doPause() {
    try {
      setBusy("pause");
      const userId = await safeGetUserId();
      if (!userId) return;

      await supabase
        .from("profiles")
        .update({ paused: true })
        .eq("user_id", userId);

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      alert(e?.message ?? "Pause failed");
    } {
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

      await supabase
        .from("profiles")
        .update({
          deleted_at: now.toISOString(),
          delete_scheduled_at: scheduled.toISOString(),
          paused: true,
        })
        .eq("user_id", userId);

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    } {
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-xl font-extrabold">
          {deleteMode ? "Delete Account" : "Account Options"}
        </h1>

        {!deleteMode ? (
          <>
            <button
              onClick={() => setPauseOpen(true)}
              className="mt-10 w-full rounded-2xl bg-white px-4 py-4 text-black font-extrabold"
            >
              Pause My Account
            </button>

            <button
              onClick={() => router.push("/delete-account?delete=1")}
              className="mt-6 underline text-white/70"
            >
              Delete my account →
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setDeleteOpen(true)}
              className="mt-10 w-full rounded-2xl bg-red-400 px-4 py-4 text-black font-extrabold"
            >
              Schedule Deletion (30 days)
            </button>

            <button
              onClick={() => router.push("/delete-account")}
              className="mt-6 underline text-white/70"
            >
              Back to pause option →
            </button>
          </>
        )}
      </div>

      <Modal
        open={pauseOpen}
        title="Pause your account?"
        description="Your profile will be hidden from other users."
        confirmText="Yes, pause"
        onClose={() => setPauseOpen(false)}
        onConfirm={doPause}
        loading={busy === "pause"}
      />

      <Modal
        open={deleteOpen}
        title="Schedule deletion?"
        description="Your account will be deleted after 30 days if you don’t sign in."
        confirmText="Yes, delete"
        danger
        onClose={() => setDeleteOpen(false)}
        onConfirm={doSoftDelete30d}
        loading={busy === "delete"}
      />

      <BottomNav />
    </main>
  );
}

