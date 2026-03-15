"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";

export default function PremiumPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  const [selectedPlan, setSelectedPlan] = useState<"week" | "month" | "year">("week");
  const [showCheckout, setShowCheckout] = useState(false);

  const plans = {
    week: {
      name: ka ? "1 კვირა" : "1 Week",
      price: "47.50",
      pricePerWeek: "47.50",
      popular: true,
    },
    month: {
      name: ka ? "1 თვე" : "1 Month",
      price: "95.00",
      pricePerWeek: "23.74",
      popular: false,
    },
    year: {
      name: ka ? "1 წელი" : "1 Year",
      price: "570.00",
      pricePerWeek: "10.96",
      popular: false,
    },
  };

  const features = [
    ka ? "უსაზღვრო მოწონებები" : "Unlimited Likes",
    ka ? "ნახე ვინ მოგწონა" : "See Who Likes You",
    ka ? "უსაზღვრო გადატრიალება" : "Unlimited Rewinds",
    ka ? "1 უფასო ბუსტი თვეში" : "1 Free Boost per month",
  ];

  return (
    <div className="fixed inset-0 bg-black flex justify-center">
      <div className="w-full max-w-lg flex flex-col bg-black text-white h-screen overflow-y-auto">
        {/* GRADIENT HEADER */}
        <div className="relative bg-gradient-to-b from-pink-500/30 via-purple-500/20 to-black pt-8 pb-12 px-4">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 text-white text-2xl hover:opacity-70 transition"
          >
            ✕
          </button>

          <div className="text-center">
            <div className="text-5xl font-black mb-2">✨</div>
            <h1 className="text-4xl font-black mb-1">
              {ka ? "Shekhvdi" : "Shekhvdi"}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {" Plus"}
              </span>
            </h1>
            <p className="text-white/70 text-sm mt-3">
              {ka
                ? "ნახე ვინ მოგწონა და დაიწყე მათთან"
                : "See who likes you and connect instantly"}
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* PLANS */}
          <div>
            <h2 className="text-white font-bold text-lg mb-4">
              {ka ? "აირჩიე გეგმა" : "Choose Your Plan"}
            </h2>

            <div className="space-y-3">
              {/* 1 WEEK */}
              <button
                onClick={() => setSelectedPlan("week")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "week"
                    ? "border-pink-400 bg-pink-400/10"
                    : "border-white/20 bg-white/5 hover:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-left">
                    {plans.week.popular && (
                      <div className="text-pink-400 text-xs font-bold mb-1">
                        🔥 {ka ? "პოპულარული" : "POPULAR"}
                      </div>
                    )}
                    <div className="text-white font-bold text-lg">
                      {plans.week.name}
                    </div>
                  </div>
                  {selectedPlan === "week" && (
                    <span className="text-pink-400 text-2xl">✓</span>
                  )}
                </div>
                <div className="text-pink-400 font-bold text-2xl">
                  {plans.week.price}₾
                </div>
              </button>

              {/* 1 MONTH */}
              <button
                onClick={() => setSelectedPlan("month")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "month"
                    ? "border-pink-400 bg-pink-400/10"
                    : "border-white/20 bg-white/5 hover:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      {plans.month.name}
                    </div>
                  </div>
                  {selectedPlan === "month" && (
                    <span className="text-pink-400 text-2xl">✓</span>
                  )}
                </div>
                <div className="text-pink-400 font-bold text-2xl">
                  {plans.month.price}₾
                </div>
                <div className="text-white/50 text-xs mt-1">
                  {ka ? "ფასი კვირაში: " : "Price per week: "}{plans.month.pricePerWeek}₾
                </div>
              </button>

              {/* 1 YEAR */}
              <button
                onClick={() => setSelectedPlan("year")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "year"
                    ? "border-pink-400 bg-pink-400/10"
                    : "border-white/20 bg-white/5 hover:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      {plans.year.name}
                    </div>
                  </div>
                  {selectedPlan === "year" && (
                    <span className="text-pink-400 text-2xl">✓</span>
                  )}
                </div>
                <div className="text-pink-400 font-bold text-2xl">
                  {plans.year.price}₾
                </div>
                <div className="text-white/50 text-xs mt-1">
                  {ka ? "ფასი კვირაში: " : "Price per week: "}{plans.year.pricePerWeek}₾
                </div>
              </button>
            </div>
          </div>

          {/* FEATURES */}
          <div className="border border-pink-500/20 rounded-2xl p-4 bg-pink-500/5">
            <div className="text-white/60 text-xs font-bold mb-4 block text-center">
              {ka ? "Shekhvdi Plus-ში შედის" : "Included with Shekhvdi Plus"}
            </div>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-pink-400 text-lg">✓</span>
                  <span className="text-white/90 text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TERMS */}
          <div className="text-white/40 text-xs leading-relaxed">
            {ka
              ? "გადახდით გაგრძელება, გადახდილი იქნება, გამოწერა თავს განაახლებს იმავე ფასით სანამ არ გაუქმებთ."
              : "By tapping Continue, you will be charged and your subscription will auto-renew at the same price until you cancel."}
          </div>
        </div>

        {/* BUTTON */}
        <div className="px-4 py-6 border-t border-white/10 shrink-0 bg-black space-y-3">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-4 rounded-full hover:shadow-lg hover:shadow-pink-500/50 transition active:scale-95 text-lg"
          >
            {ka ? `გადახდა - ${plans[selectedPlan].price}₾` : `Continue - ${plans[selectedPlan].price}₾`}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full bg-white/5 text-white font-semibold py-3 rounded-full hover:bg-white/10 transition active:scale-95"
          >
            {ka ? "უკან" : "Back"}
          </button>
        </div>

        {/* CHECKOUT MODAL */}
        {showCheckout && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
            <div className="w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <h2 className="text-white font-bold text-lg">
                  {ka ? "გადახდის მეთოდი" : "Payment Method"}
                </h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-white/40 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* VISA/MASTERCARD */}
                <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition">
                  <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-red-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">💳</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold text-sm">
                      Visa / Mastercard
                    </div>
                    <div className="text-white/60 text-xs">
                      {ka ? "საბანკო ბარათი" : "Bank Card"}
                    </div>
                  </div>
                  <span className="text-white/40">›</span>
                </button>

                {/* GOOGLE PAY */}
                <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition">
                  <div className="w-10 h-6 bg-white rounded flex items-center justify-center">
                    <span className="text-2xl">🅖</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold text-sm">
                      Google Pay
                    </div>
                    <div className="text-white/60 text-xs">
                      {ka ? "სწრაფი გადახდა" : "Fast Payment"}
                    </div>
                  </div>
                  <span className="text-white/40">›</span>
                </button>

                {/* APPLE PAY */}
                <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition">
                  <div className="w-10 h-6 bg-black rounded flex items-center justify-center">
                    <span className="text-2xl">🍎</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold text-sm">
                      Apple Pay
                    </div>
                    <div className="text-white/60 text-xs">
                      {ka ? "სწრაფი გადახდა" : "Fast Payment"}
                    </div>
                  </div>
                  <span className="text-white/40">›</span>
                </button>

                {/* TBC PAY */}
                <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition border border-pink-400/30">
                  <div className="w-10 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">TBC</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold text-sm">
                      TBC Pay
                    </div>
                    <div className="text-white/60 text-xs">
                      {ka ? "საქართველოს ბანკი" : "Georgian Bank"}
                    </div>
                  </div>
                  <span className="text-white/40">›</span>
                </button>
              </div>

              <div className="px-4 pb-6 pt-2">
                <button
                  onClick={() => {
                    alert(ka ? "✅ გადახდა დასრულდა!" : "✅ Payment completed!");
                    setShowCheckout(false);
                  }}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-full hover:shadow-lg transition"
                >
                  {ka ? "გადახდა" : "Pay"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
