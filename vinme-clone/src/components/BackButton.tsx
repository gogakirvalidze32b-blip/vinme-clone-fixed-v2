"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  href = "/feed",
  className = "",
  label = "Back",
}: {
  href?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // თუ history-ში არის გვერდი უკან, იქ დაბრუნდეს
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.replace(href); // fallback
        }
      }}
      className={[
        "inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15",
        className,
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      ← {label}
    </button>
  );
}
