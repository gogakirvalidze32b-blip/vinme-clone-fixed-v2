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
    week: { name: ka ? "1 კვირა" : "1 Week", price: "47.50", days: 7 },
    month: { name: ka ? "1 თვე" : "1 Month", price: "95.00", days: 30 },
    year: { name: ka ? "1 წელი" : "1 Year", price: "570.00", days: 365 },
  };

  const featureList = [
    {
      title: ka ? "უსაზღვრო მოწონებები" : "Unlimited Likes",
      desc: ka ? "მოიწონე რამდენიც გინდა" : "Like as many people as you want"
    },
    {
      title: ka ? "ნახე ვინ მოგწონა" : "See Who Likes You",
      desc: ka ? "გაიგე ვინ გამოხატა სიმპათია" : "Match instantly with people who already liked you"
    },
    {
      title: ka ? "უსაზღვრო გადატრიალება" : "Unlimited Rewinds",
      desc: ka ? "დააბრუნე უკან შემთხვევითი სვაიპი" : "Go back and change your last swipe"
    },
    {
      title: ka ? "1 უფასო ბუსტი თვეში" : "1 Free Boost per month",
      desc: ka ? "იყავი ხილვადი 30 წუთის განმავლობაში" : "Be the top profile in your area for 30 minutes"
    },
    {
      title: ka ? "დამალე რეკლამები" : "Hide Ads",
      desc: ka ? "გამოიყენე აპლიკაცია შეფერხების გარეშე" : "Enjoy an ad-free experience"
    }
  ];

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + plans[selectedPlan].days);

      const { error } = await supabase.from("profiles").update({
        is_premium: true,
        premium_until: expireDate.toISOString(),
      }).eq("user_id", user.id);

      if (error) throw error;
      alert(ka ? "✅ პრემიუმი გააქტიურდა!" : "✅ Premium Activated!");
      router.push("/likes");
    } catch (err) {
      alert("Error processing payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#111] flex justify-center overflow-hidden text-white">
      <div className="w-full max-w-lg flex flex-col h-full bg-black relative">
        
        {/* HEADER */}
        <div className="px-4 pt-6 pb-2 flex items-center justify-between shrink-0">
          <button onClick={() => router.back()} className="text-2xl opacity-60">✕</button>
          <div className="flex items-center gap-1">
             <span className="text-yellow-500 text-xl font-black">🔥</span>
             <span className="font-black text-lg tracking-tighter uppercase">Shekhvdi <span className="text-yellow-500">Gold</span></span>
          </div>
          <div className="w-8" /> 
        </div>

        {/* FEATURES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          
          {/* FEATURE BOX */}
          <div className="border border-white/10 rounded-2xl bg-zinc-900/30 p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-800 px-3 py-1 rounded-full text-[10px] text-white/60 font-bold uppercase tracking-widest border border-white/10">
              Included with Gold
            </div>
            
            <div className="space-y-5 mt-2">
              {featureList.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-white text-lg mt-0.5">✓</span>
                  <div>
                    <h3 className="font-bold text-[15px] leading-tight">{f.title}</h3>
                    <p className="text-white/40 text-[12px] mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PLAN SELECTION */}
          <div className="grid grid-cols-3 gap-2 pb-8">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition ${
                  selectedPlan === p ? "border-yellow-500 bg-yellow-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-[10px] font-bold opacity-60">{plans[p].name}</span>
                <span className="text-sm font-black mt-1">{plans[p].price}₾</span>
              </button>
            ))}
          </div>
        </div>

        {/* STICKY FOOTER (TINDER STYLE) */}
        <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 p-5 pb-8 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <span className="text-white font-black text-lg leading-none">{plans[selectedPlan].name}</span>
            <span className="text-white/60 text-sm font-bold mt-1">{plans[selectedPlan].price}₾ total</span>
          </div>

          <button
            onClick={() => setShowCheckout(true)}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black px-8 py-3.5 rounded-full text-md active:scale-95 transition shadow-lg shadow-yellow-500/20"
          >
            {ka ? "გაგრძელება" : "Continue"}
          </button>
        </div>

        {/* PAYMENT SHEET */}
        {showCheckout && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-zinc-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg">{ka ? "გადახდა" : "Payment"}</h3>
                <button onClick={() => setShowCheckout(false)} className="text-white/40 text-xl">✕</button>
              </div>

              <div className="space-y-3 mb-8">
                {["Visa / Mastercard", "Apple Pay", "TBC Pay"].map((m, i) => (
                  <button key={i} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-sm">{m}</span>
                    <span className="text-white/20">›</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-yellow-500 text-black font-black py-4 rounded-full shadow-xl disabled:opacity-50 transition"
              >
                {loading ? "..." : (ka ? "დადასტურება" : "Confirm Payment")}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}