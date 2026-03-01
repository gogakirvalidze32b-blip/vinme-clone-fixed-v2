"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
        <button onClick={() => router.back()} className="text-pink-400 mb-4 block">← {ka ? "უკან" : "Back"}</button>
        <h1 className="text-2xl font-extrabold">{ka ? "კონფიდენციალურობის პოლიტიკა" : "Privacy Policy"}</h1>
        <p className="mt-1 text-xs text-white/40">{ka ? "ბოლო განახლება: 2025 წლის 1 იანვარი" : "Last updated: January 1, 2025"}</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/80">
          {ka ? (
            <>
              <p>„შეხვდი" („ჩვენ", „ჩვენი") პატივს სცემს თქვენს კონფიდენციალურობას. ეს პოლიტიკა განმარტავს, თუ როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ თქვენს პერსონალურ მონაცემებს.</p>
              <Section title="1. რა ინფორმაციას ვაგროვებთ">
                <Li>სარეგისტრაციო მონაცემები: სახელი, ელ.ფოსტა, დაბადების თარიღი, სქესი</Li>
                <Li>პროფილის ინფორმაცია: ბიო, ფოტოები, ადგილმდებარეობა, ინტერესები</Li>
                <Li>შეტყობინებები: ჩათის შინაარსი (დაშიფრული ტრანზიტისას)</Li>
                <Li>გამოყენების მონაცემები: ლოგინი, სვაიპები, მოწონებები, ტექნიკური ლოგები</Li>
                <Li>მოწყობილობის მონაცემები: IP მისამართი, ბრაუზერი, ოპერაციული სისტემა</Li>
              </Section>
              <Section title="2. როგორ ვიყენებთ ინფორმაციას">
                <Li>მომსახურების უზრუნველყოფა და გაუმჯობესება</Li>
                <Li>მომხმარებლების შესაბამისობის გამოთვლა და ჩვენება</Li>
                <Li>უსაფრთხოების, თაღლითობის პრევენცია</Li>
                <Li>კანონმდებლობით გათვალისწინებული ვალდებულებების შესრულება</Li>
                <Li>პროდუქტის ანალიზი და გაუმჯობესება</Li>
              </Section>
              <Section title="3. მონაცემთა გაზიარება">
                <p>ჩვენ არ ვყიდით თქვენს პერსონალურ მონაცემებს. შეიძლება გავუზიაროთ:</p>
                <Li>ტექნიკური პარტნიორები (Supabase, Vercel) — მხოლოდ სერვისის შესრულებისთვის</Li>
                <Li>სახელმწიფო ორგანოები — კანონის მოთხოვნის შემთხვევაში</Li>
              </Section>
              <Section title="4. მონაცემთა შენახვა">
                <p>ანგარიშის წაშლის შემდეგ მონაცემები 30 დღის განმავლობაში ინახება სარეზერვო სისტემაში, შემდეგ სრულად იშლება.</p>
              </Section>
              <Section title="5. თქვენი უფლებები">
                <Li>წვდომა — გაიგოთ რა მონაცემები გვაქვს</Li>
                <Li>გასწორება — შეცვალოთ არასწორი ინფორმაცია</Li>
                <Li>წაშლა — მოითხოვოთ ანგარიშის სრული წაშლა</Li>
                <Li>პორტაბელობა — მიიღოთ მონაცემები ფაილის სახით</Li>
              </Section>
              <Section title="6. Cookie-ები">
                <p>ვიყენებთ session cookie-ებს ავტორიზაციისთვის. ანალიტიკური cookie-ები გამოიყენება მხოლოდ თქვენი თანხმობით.</p>
              </Section>
              <Section title="7. კონტაქტი">
                <p>კითხვებისთვის: <span className="text-pink-400">privacy@shekhvdi.ge</span></p>
              </Section>
            </>
          ) : (
            <>
              <p>Shekhvdi ("we", "our", "us") respects your privacy. This policy explains how we collect, use and protect your personal data.</p>
              <Section title="1. Information We Collect">
                <Li>Registration data: name, email, date of birth, gender</Li>
                <Li>Profile info: bio, photos, location, interests</Li>
                <Li>Messages: chat content (encrypted in transit)</Li>
                <Li>Usage data: logins, swipes, likes, technical logs</Li>
                <Li>Device data: IP address, browser, operating system</Li>
              </Section>
              <Section title="2. How We Use Your Information">
                <Li>Provide and improve our service</Li>
                <Li>Calculate and display user matches</Li>
                <Li>Safety, fraud prevention, and security</Li>
                <Li>Comply with legal obligations</Li>
                <Li>Product analytics and improvement</Li>
              </Section>
              <Section title="3. Data Sharing">
                <p>We do not sell your personal data. We may share with:</p>
                <Li>Technical partners (Supabase, Vercel) — only for service provision</Li>
                <Li>Government authorities — only when required by law</Li>
              </Section>
              <Section title="4. Data Retention">
                <p>After account deletion, data is kept in backups for 30 days, then permanently deleted.</p>
              </Section>
              <Section title="5. Your Rights">
                <Li>Access — know what data we hold about you</Li>
                <Li>Correction — fix inaccurate information</Li>
                <Li>Deletion — request complete account removal</Li>
                <Li>Portability — receive your data as a file</Li>
              </Section>
              <Section title="6. Cookies">
                <p>We use session cookies for authentication. Analytics cookies are only used with your consent.</p>
              </Section>
              <Section title="7. Contact">
                <p>Questions: <span className="text-pink-400">privacy@shekhvdi.ge</span></p>
              </Section>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-extrabold text-white mb-2">{title}</h2><ul className="space-y-1">{children}</ul></section>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span className="text-pink-400 shrink-0">•</span><span>{children}</span></li>;
}
import React from "react";
