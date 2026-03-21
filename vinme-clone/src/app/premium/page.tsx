"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLang();
  const ka = lang !== "en";

  const [selectedPlan, setSelectedPlan] = useState<"week" | "month" | "year">("week");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "fail"; text: string } | null>(null);

  <button
  onClick={() => alert("დაჭერილია!")}
  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3.5 rounded-full"
>
  ტესტი
</button>

  const plans = {
    week:  { name: ka ? "1 კვირა"  : "1 Week",  price: "47.50",  days: 7,   popular: true  },
    month: { name: ka ? "1 თვე"   : "1 Month", price: "95.00",  days: 30,  popular: false },
    year:  { name: ka ? "1 წელი"  : "1 Year",  price: "570.00", days: 365, popular: false },
  };

  const features = [
    ka ? "უსაზღვრო მოწონებები" : "Unlimited Likes",
    ka ? "ნახე ვინ მოგწონა"    : "See Who Likes You",
    ka ? "გადატრიალება"        : "Unlimited Rewinds",
    ka ? "ბუსტი თვეში"        : "Free Boost",
  ];

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setStatusMsg({
        type: "success",
        text: ka ? "✅ გადახდა წარმატებით დასრულდა! Premium გააქტიურდება რამდენიმე წამში." : "✅ Payment successful! Premium activating shortly.",
      });
      setTimeout(() => router.push("/likes"), 3000);
    } else if (status === "fail") {
      setStatusMsg({
        type: "fail",
        text: ka ? "❌ გადახდა ვერ შესრულდა. სცადე თავიდან." : "❌ Payment failed. Please try again.",
      });
    }
  }, [searchParams]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert(ka ? "გთხოვთ გაიაროთ ავტორიზაცია" : "Please login first");
        return;
      }

      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, userId: user.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error || "Failed to create payment");
      }

      window.location.href = data.redirectUrl;

    } catch (err) {
      console.error(err);
      alert(ka ? "შეცდომა გადახდის შექმნისას. სცადე თავიდან." : "Payment error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex justify-center overflow-hidden">
      <div className="w-full max-w-lg flex flex-col bg-black text-white h-[100dvh]">

        {statusMsg && (
          <div className={`mx-4 mt-4 p-3 rounded-xl text-sm font-semibold text-center ${
            statusMsg.type === "success" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
            {statusMsg.text}
          </div>
        )}

        <div className="relative bg-gradient-to-b from-pink-500/20 via-purple-500/10 to-black pt-6 pb-4 px-4 shrink-0 text-center">
          <button onClick={() => router.back()} className="absolute top-4 left-4 text-white/50 text-xl">✕</button>
          <div className="text-3xl mb-1">✨</div>
          <h1 className="text-2xl font-black">
            Shekhvdi <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Plus</span>
          </h1>
          <p className="text-white/60 text-xs mt-1">
            {ka ? "გახსენი ყველა შესაძლებლობა" : "Unlock all premium features"}
          </p>
        </div>

        <div className="flex-1 px-4 space-y-3 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 gap-2">
            {(["week", "month", "year"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`relative flex items-center justify-between p-3 rounded-xl border-2 transition ${
                  selectedPlan === key ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="text-left">
                  {plans[key].popular && <div className="text-[9px] font-bold text-pink-400 mb-0.5 uppercase">🔥 Popular</div>}
                  <div className="text-sm font-bold">{plans[key].name}</div>
                  <div className="text-xs text-white/40">{ka ? "ჯამში" : "Total"}: {plans[key].price}₾</div>
                </div>
                <div className="text-right">
                  <div className="text-pink-400 font-black text-lg">{plans[key].price}₾</div>
                  {selectedPlan === key && <div className="text-[10px] text-pink-500 font-bold">✓ Selected</div>}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-y-2 gap-x-1">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-pink-500 text-xs">✓</span>
                  <span className="text-white/80 text-[10px] font-medium truncate">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-1 flex-wrap">
            <span className="text-white/30 text-[10px]">{ka ? "მიღებული:" : "Accepted:"}</span>
            {["💳 Visa", "💳 MC", "🍎 Apple Pay", "🤖 Google Pay"].map((m) => (
              <span key={m} className="text-white/50 text-[10px] bg-white/5 px-2 py-0.5 rounded-full">{m}</span>
            ))}
          </div>
        </div>

        <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/10 shrink-0">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3.5 rounded-full shadow-lg shadow-pink-500/20 active:scale-95 transition text-md disabled:opacity-60"
          >
            {loading
              ? (ka ? "მუშავდება..." : "Processing...")
              : (ka ? `გადახდა - ${plans[selectedPlan].price}₾` : `Pay - ${plans[selectedPlan].price}₾`)
            }
          </button>
          <button onClick={() => router.back()} className="w-full text-white/40 text-xs font-semibold py-2 mt-2">
            {ka ? "არა, გმადლობთ" : "No, thanks"}
          </button>
          <p className="text-center text-white/20 text-[9px] mt-1">
            🔒 {ka ? "გადახდა დაცულია BOG-ის მიერ" : "Secured by Bank of Georgia"}
          </p>
        </div>
      </div>
    </div>
  );
}
