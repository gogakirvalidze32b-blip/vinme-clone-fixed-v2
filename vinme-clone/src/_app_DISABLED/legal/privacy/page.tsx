export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <h1 className="text-2xl font-extrabold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/60">Last updated: January 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80">
          <p>
            This Privacy Policy explains how <b>Shekhvdi</b> (“we”, “our”, “us”)
            collects, uses, and protects your information when you use our
            application and website.
          </p>

          <section>
            <h2 className="text-base font-extrabold text-white">1. Information We Collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-white/75">
              <li>Account information (name, nickname, email, profile details)</li>
              <li>Photos you upload</li>
              <li>Messages and interactions inside the app</li>
              <li>Technical data (device type, IP address, app usage data)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">2. How We Use Your Information</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-white/75">
              <li>Provide and improve the Shekhvdi service</li>
              <li>Match users and enable messaging</li>
              <li>Ensure safety, security, and fraud prevention</li>
              <li>Communicate important updates related to your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">3. Messages & Privacy</h2>
            <p className="mt-2 text-white/75">
              Messages are private between matched users. We do not read messages
              unless required for safety, moderation, or legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">4. Account Pause & Deletion</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-white/75">
              <li>You can pause your account anytime. Your profile will be hidden.</li>
              <li>
                You can schedule deletion. After 30 days your data will be deleted
                unless you sign in to restore it.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">5. Data Storage & Security</h2>
            <p className="mt-2 text-white/75">
              We use industry-standard security measures to protect your data.
              However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">6. Sharing of Information</h2>
            <p className="mt-2 text-white/75">
              We do not sell your personal data. We may share data only with
              trusted service providers or if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">7. Cookies</h2>
            <p className="mt-2 text-white/75">
              We may use cookies or similar technologies to improve user
              experience and app performance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">8. Your Rights</h2>
            <p className="mt-2 text-white/75">
              Depending on your location, you may have rights to access, correct,
              or delete your data. You can manage most of these in app settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">9. Changes to This Policy</h2>
            <p className="mt-2 text-white/75">
              We may update this policy from time to time. Changes will be posted
              here with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-white">10. Contact Us</h2>
            <p className="mt-2 text-white/75">
              Questions? Email: <b>support@shekhvdi.app</b>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
