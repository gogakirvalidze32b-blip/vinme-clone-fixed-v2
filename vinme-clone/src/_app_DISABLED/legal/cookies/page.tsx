export default function CookiesPage() {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <h1 className="text-2xl font-extrabold">Cookie Policy</h1>
        <p className="mt-2 text-sm text-white/60">Last updated: January 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80">
          <p>
            This Cookie Policy explains how <b>Shekhvdi</b> uses cookies and
            similar technologies.
          </p>

          <section>
            <h2 className="font-extrabold">1. What Are Cookies?</h2>
            <p>
              Cookies are small files stored on your device to improve app and
              website functionality.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">2. How We Use Cookies</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authentication and login sessions</li>
              <li>Security and fraud prevention</li>
              <li>App performance and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="font-extrabold">3. Third-Party Cookies</h2>
            <p>
              We may use trusted third-party services (e.g. analytics or auth
              providers).
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">4. Managing Cookies</h2>
            <p>
              You can control or disable cookies through your browser or device
              settings.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
