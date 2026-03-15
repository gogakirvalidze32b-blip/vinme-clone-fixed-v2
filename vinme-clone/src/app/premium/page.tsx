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
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
          <button
            onClick={() => router.back()}
            className="text-white text-2xl hover:opacity-70 transition"
          >
            ✕
          </button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            <span className="text-xl font-bold">tinder</span>
            <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
              {ka ? "ოქროს" : "GOLD"}
            </span>
          </div>
          <div className="w-8" />
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {/* TITLE */}
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              {ka
                ? "ნახე ვინ მოგწონა და დაიწყე მათ სასწრაფოდ"
                : "See Who Likes You and match with them instantly"}
            </h1>
            <p className="text-lg font-semibold mt-2 text-white/90">
              {ka ? "Tinder Gold™-ით" : "with Tinder Gold™"}
            </p>
          </div>

          {/* PLANS */}
          <div>
            <h2 className="text-white font-semibold mb-4">
              {ka ? "აირჩიე გეგმა" : "Select a Plan"}
            </h2>

            <div className="space-y-4">
              {/* 1 WEEK */}
              <button
                onClick={() => setSelectedPlan("week")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "week"
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-left">
                    {plans.week.popular && (
                      <div className="text-yellow-400 text-xs font-semibold mb-1">
                        {ka ? "პოპულარული" : "Popular"}
                      </div>
                    )}
                    <div className="text-white font-bold text-lg">
                      {plans.week.name}
                    </div>
                  </div>
                  {selectedPlan === "week" && (
                    <span className="text-yellow-400 text-xl">✓</span>
                  )}
                </div>
                <div className="text-yellow-400 font-bold text-2xl">
                  {plans.week.price}₾
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {plans.week.pricePerWeek}₾/{ka ? "კვირ" : "wk"}
                </div>
              </button>

              {/* 1 MONTH */}
              <button
                onClick={() => setSelectedPlan("month")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "month"
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      {plans.month.name}
                    </div>
                  </div>
                  {selectedPlan === "month" && (
                    <span className="text-yellow-400 text-xl">✓</span>
                  )}
                </div>
                <div className="text-yellow-400 font-bold text-2xl">
                  {plans.month.price}₾
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {plans.month.pricePerWeek}₾/{ka ? "კვირ" : "wk"}
                </div>
              </button>

              {/* 1 YEAR */}
              <button
                onClick={() => setSelectedPlan("year")}
                className={`w-full p-4 rounded-2xl border-2 transition ${
                  selectedPlan === "year"
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      {plans.year.name}
                    </div>
                  </div>
                  {selectedPlan === "year" && (
                    <span className="text-yellow-400 text-xl">✓</span>
                  )}
                </div>
                <div className="text-yellow-400 font-bold text-2xl">
                  {plans.year.price}₾
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {plans.year.pricePerWeek}₾/{ka ? "კვირ" : "wk"}
                </div>
              </button>
            </div>

            {/* DOTS */}
            <div className="flex justify-center gap-2 mt-6">
              <div
                className={`w-2 h-2 rounded-full transition ${
                  selectedPlan === "week" ? "bg-white" : "bg-white/30"
                }`}
              />
              <div
                className={`w-2 h-2 rounded-full transition ${
                  selectedPlan === "month" ? "bg-white" : "bg-white/30"
                }`}
              />
              <div
                className={`w-2 h-2 rounded-full transition ${
                  selectedPlan === "year" ? "bg-white" : "bg-white/30"
                }`}
              />
            </div>
          </div>

          {/* FEATURES */}
          <div className="border border-white/20 rounded-2xl p-4 bg-white/5">
            <div className="text-white/60 text-xs font-semibold mb-4 block text-center">
              {ka ? "Tinder Gold®-ში შედის" : "Included with Tinder Gold®"}
            </div>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-white text-lg">✓</span>
                  <span className="text-white text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="text-white/40 text-xs mt-4 pt-4 border-t border-white/10">
              {ka
                ? "დაწკაპებით გაგრძელება, გადახდილი იქნება, გამოწერა თავს განაახლებს იმავე ფასით და პაკეტის სიგრძით, სანამ თქვენ არ გაუქმებთ Play Store-ის პარამეტრებით და თქვენ აღიარებთ ჩვენი"
                : "By tapping Continue, you will be charged, your subscription will auto-renew for the same price and package length until you cancel via Play Store settings, and you agree to our"}
              <span className="text-white/60 ml-1">{ka ? "პირობები" : "Terms"}</span>
            </div>
          </div>
        </div>

        {/* BUTTON */}
        <div className="px-4 py-6 border-t border-white/10 shrink-0 bg-black">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-full hover:bg-yellow-300 transition active:scale-95"
          >
            {ka ? ` продолж ${plans[selectedPlan].price}₾` : `Continue for ${plans[selectedPlan].price}₾ total`}
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
                <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition border border-yellow-400/30">
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
                    alert(ka ? "სიმულაცია: გადახდა დასრულდა!" : "Mock: Payment completed!");
                    setShowCheckout(false);
                  }}
                  className="w-full bg-yellow-400 text-black font-bold py-3 rounded-full hover:bg-yellow-300 transition"
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
