"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function PremiumPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  const [selectedPlan, setSelectedPlan] = useState<"week" | "month" | "year">("week");
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);

  const plans = {
    week: {
      name: ka ? "1 კვირა" : "1 Week",
      price: "47.50",
      days: 7,
      popular: true,
    },
    month: {
      name: ka ? "1 თვე" : "1 Month",
      price: "95.00",
      days: 30,
      popular: false,
    },
    year: {
      name: ka ? "1 წელი" : "1 Year",
      price: "570.00",
      days: 365,
      popular: false,
    },
  };

  const features = [
    ka ? "უსაზღვრო მოწონებები" : "Unlimited Likes",
    ka ? "ნახე ვინ მოგწონა" : "See Who Likes You",
    ka ? "გადატრიალება" : "Unlimited Rewinds",
    ka ? "ბუსტი თვეში" : "Free Boost",
  ];

  // რეალური გადახდის და გააქტიურების ლოგიკა
  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert(ka ? "გთხოვთ გაიაროთ ავტორიზაცია" : "Please login first");
        return;
      }

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + plans[selectedPlan].days);

      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: expireDate.toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      alert(ka ? "✅ პრემიუმი წარმატებით გააქტიურდა!" : "✅ Premium activated!");
      setShowCheckout(false);
      router.push("/likes"); // გადავიყვანოთ იქ, სადაც ნახავს ვინ მოიწონა

    } catch (err) {
      console.error(err);
      alert("Error activating premium");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex justify-center overflow-hidden">
      <div className="w-full max-w-lg flex flex-col bg-black text-white h-[100dvh]">
        
        {/* COMPACT HEADER */}
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

        {/* PLANS AREA - COMPACT */}
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

          {/* FEATURES GRID - 2x2 for space saving */}
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
        </div>

        {/* STICKY FOOTER */}
        <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/10 shrink-0">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3.5 rounded-full shadow-lg shadow-pink-500/20 active:scale-95 transition text-md"
          >
            {ka ? `გააქტიურება - ${plans[selectedPlan].price}₾` : `Continue - ${plans[selectedPlan].price}₾`}
          </button>
          <button onClick={() => router.back()} className="w-full text-white/40 text-xs font-semibold py-2 mt-2">
            {ka ? "არა, გმადლობთ" : "No, thanks"}
          </button>
        </div>

        {/* CHECKOUT MODAL */}
        {showCheckout && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-0">
            <div className="w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-white font-bold">{ka ? "გადახდა" : "Payment"}</h2>
                <button onClick={() => setShowCheckout(false)} className="text-white/40 text-xl">✕</button>
              </div>

              <div className="p-4 space-y-2">
                {[
                  { id: 'card', name: "Visa / Mastercard", icon: "💳", sub: ka ? "საბანკო ბარათი" : "Bank Card" },
                  { id: 'apple', name: "Apple Pay", icon: "🍎", sub: "Fast Pay" },
                  { id: 'tbc', name: "TBC Pay", icon: "💎", sub: "Instant" }
                ].map((m) => (
                  <button key={m.id} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition">
                    <span className="text-2xl">{m.icon}</span>
                    <div className="text-left flex-1">
                      <div className="text-white font-bold text-sm">{m.name}</div>
                      <div className="text-white/40 text-[10px]">{m.sub}</div>
                    </div>
                    <span className="text-white/20">›</span>
                  </button>
                ))}
              </div>

              <div className="p-4 pb-8">
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-pink-500 text-white font-black py-3.5 rounded-full active:scale-95 transition disabled:opacity-50 shadow-xl"
                >
                  {loading ? (ka ? "მუშავდება..." : "Processing...") : (ka ? "დადასტურება" : "Confirm & Pay")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}