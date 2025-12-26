"use client";

import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <GoogleButton />
      </div>
    </div>
  );
}
