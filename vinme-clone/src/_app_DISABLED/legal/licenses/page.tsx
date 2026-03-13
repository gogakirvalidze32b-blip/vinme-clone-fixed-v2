export default function LicensesPage() {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <h1 className="text-2xl font-extrabold">Licenses</h1>
        <p className="mt-2 text-sm text-white/60">Last updated: January 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80">
          <p>
            Shekhvdi uses open-source software and licensed technologies.
          </p>

          <section>
            <h2 className="font-extrabold">1. Application License</h2>
            <p>
              Shekhvdi grants you a limited, non-exclusive, non-transferable
              license to use the app for personal purposes.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">2. Third-Party Software</h2>
            <p>
              The app may include software licensed under open-source licenses
              such as MIT, Apache 2.0, or BSD.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">3. Restrictions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>No copying or reselling the app</li>
              <li>No reverse engineering</li>
              <li>No unauthorized commercial use</li>
            </ul>
          </section>

          <section>
            <h2 className="font-extrabold">4. Ownership</h2>
            <p>
              All trademarks, logos, and branding belong to Shekhvdi unless
              otherwise stated.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
