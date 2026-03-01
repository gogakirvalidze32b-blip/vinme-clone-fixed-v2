export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <h1 className="text-2xl font-extrabold">Terms of Service</h1>
        <p className="mt-2 text-sm text-white/60">Last updated: January 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80">
          <p>
            Welcome to <b>Shekhvdi</b>. By using our app or website, you agree to
            these Terms of Service.
          </p>

          <section>
            <h2 className="font-extrabold">1. Eligibility</h2>
            <p>You must be at least 18 years old to use Shekhvdi.</p>
          </section>

          <section>
            <h2 className="font-extrabold">2. User Accounts</h2>
            <p>
              You are responsible for the information you provide and for keeping
              your account secure.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">3. Acceptable Use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>No harassment, abuse, or hate speech</li>
              <li>No fake profiles or impersonation</li>
              <li>No illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="font-extrabold">4. Matches & Messages</h2>
            <p>
              Matches and messages are private between users. Misuse may result in
              suspension or deletion.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">5. Account Suspension & Deletion</h2>
            <p>
              We may suspend or delete accounts that violate these terms. You may
              also pause or delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">6. Limitation of Liability</h2>
            <p>
              Shekhvdi is provided “as is”. We are not responsible for user
              behavior or interactions.
            </p>
          </section>

          <section>
            <h2 className="font-extrabold">7. Changes</h2>
            <p>
              We may update these terms. Continued use means acceptance of the
              updated terms.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
