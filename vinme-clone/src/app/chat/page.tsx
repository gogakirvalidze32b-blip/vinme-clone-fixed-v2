import dynamic from "next/dynamic";

const MessagesClient = dynamic(() => import("./MessagesClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
      Loading…
    </div>
  ),
});

export default function Page() {
  return <MessagesClient />;
}