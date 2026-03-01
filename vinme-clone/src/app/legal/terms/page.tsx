"use client";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

export default function TermsPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
        <button onClick={() => router.back()} className="text-pink-400 mb-4 block">← {ka ? "უკან" : "Back"}</button>
        <h1 className="text-2xl font-extrabold">{ka ? "გამოყენების პირობები" : "Terms of Service"}</h1>
        <p className="mt-1 text-xs text-white/40">{ka ? "ბოლო განახლება: 2025 წლის 1 იანვარი" : "Last updated: January 1, 2025"}</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/80">
          {ka ? (
            <>
              <p>„შეხვდი"-ს გამოყენებით თქვენ ეთანხმებით ამ პირობებს.</p>
              <Sec title="1. სერვისი">
                <p>„შეხვდი" არის სოციალური აპლიკაცია, რომელიც ეხმარება მომხმარებლებს ახალი ადამიანების გაცნობაში. ჩვენ არ ვიძლევით გარანტიას ურთიერთობების შედეგზე.</p>
              </Sec>
              <Sec title="2. მომხმარებლის ვალდებულებები">
                <Li>18 წელს გადაცილებული უნდა იყოთ</Li>
                <Li>სწორი ინფორმაცია მიუთითოთ</Li>
                <Li>სხვა მომხმარებლებს პატივი სცეთ</Li>
                <Li>შეუსაბამო ან უკანონო კონტენტი არ განათავსოთ</Li>
                <Li>Spam, ფიშინგი ან სხვა ბოროტად გამოყენება იკრძალება</Li>
              </Sec>
              <Sec title="3. კონტენტი">
                <p>თქვენ ინარჩუნებთ პროფილის ფოტოებისა და ბიოს საავტორო უფლებებს. „შეხვდი"-ს ეძლევა ლიცენზია სერვისის ჩვენებისთვის.</p>
              </Sec>
              <Sec title="4. ანგარიშის შეწყვეტა">
                <p>ჩვენ ვიტოვებთ უფლებას, პირობების დარღვევის შემთხვევაში ანგარიში გათიშოთ გაფრთხილების გარეშე.</p>
              </Sec>
              <Sec title="5. პასუხისმგებლობის შეზღუდვა">
                <p>„შეხვდი" არ არის პასუხისმგებელი მომხმარებლებს შორის ურთიერთობის შედეგებზე. სერვისი მოეწოდება „როგორც არის".</p>
              </Sec>
              <Sec title="6. კონტაქტი">
                <p>დარღვევის შეტყობინება: <span className="text-pink-400">support@shekhvdi.ge</span></p>
              </Sec>
            </>
          ) : (
            <>
              <p>By using Shekhvdi, you agree to these Terms of Service.</p>
              <Sec title="1. Service">
                <p>Shekhvdi is a social application that helps users meet new people. We make no guarantees about the outcomes of relationships formed.</p>
              </Sec>
              <Sec title="2. User Obligations">
                <Li>You must be 18 years of age or older</Li>
                <Li>Provide accurate information</Li>
                <Li>Respect other users</Li>
                <Li>Do not post inappropriate or illegal content</Li>
                <Li>Spam, phishing, or other misuse is prohibited</Li>
              </Sec>
              <Sec title="3. Content">
                <p>You retain copyright of your profile photos and bio. Shekhvdi is granted a license to display them for service provision.</p>
              </Sec>
              <Sec title="4. Account Termination">
                <p>We reserve the right to suspend accounts for Terms violations without prior notice.</p>
              </Sec>
              <Sec title="5. Limitation of Liability">
                <p>Shekhvdi is not responsible for the outcomes of interactions between users. The service is provided "as is".</p>
              </Sec>
              <Sec title="6. Contact">
                <p>Report violations: <span className="text-pink-400">support@shekhvdi.ge</span></p>
              </Sec>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-extrabold text-white mb-2">{title}</h2>{children}</section>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 list-none"><span className="text-pink-400 shrink-0">•</span><span>{children}</span></li>;
}
import React from "react";
