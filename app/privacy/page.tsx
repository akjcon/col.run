import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — col",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-12 block font-serif text-2xl font-medium tracking-tight text-neutral-900"
        >
          col
        </Link>

        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-neutral-500">
          Last updated: February 19, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              What We Collect
            </h2>
            <p>
              When you create an account, we store your name and email address
              via Clerk authentication. When you connect Strava, we access your
              activity data (runs, hikes, walks), athlete profile (name, profile
              photo), and athlete statistics to personalize your training plan.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              How We Use Your Data
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Generate personalized training plans based on your fitness
                history and goals
              </li>
              <li>
                Match completed Strava activities to your planned workouts
              </li>
              <li>
                Calculate training load metrics (fitness, fatigue, form) from
                your activity history
              </li>
              <li>
                Provide AI coaching responses informed by your training context
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Strava Data
            </h2>
            <p>
              We request read-only access to your Strava activities. We do not
              post to Strava, modify your activities, or access your social data.
              Your Strava data is stored in a secure Firebase Firestore database
              and is only used to power features within col.run.
            </p>
            <p className="mt-2">
              We do not sell, share, or distribute your Strava data to any third
              parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Data Retention
            </h2>
            <p>
              Your data is retained for as long as your account is active. If
              you disconnect Strava, your stored Strava tokens are immediately
              deleted. If you revoke access from Strava directly, we
              automatically delete your stored tokens, synced activities, and
              fitness data when we receive the deauthorization webhook.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Data Deletion
            </h2>
            <p>
              You can disconnect Strava at any time from within the app, which
              revokes our access and deletes stored tokens. To request full
              account and data deletion, contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Security
            </h2>
            <p>
              All data is transmitted over HTTPS. Strava OAuth tokens are stored
              server-side in Firebase Firestore and are never exposed to the
              client. Authentication is handled by Clerk with industry-standard
              security practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Third-Party Services
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Clerk</strong> — authentication
              </li>
              <li>
                <strong>Firebase / Google Cloud</strong> — database and hosting
              </li>
              <li>
                <strong>Strava</strong> — activity data integration
              </li>
              <li>
                <strong>Anthropic</strong> — AI coaching responses
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">
              Contact
            </h2>
            <p>
              For questions about this policy or to request data deletion, email{" "}
              <a
                href="mailto:privacy@col.run"
                className="font-medium text-neutral-900 underline"
              >
                privacy@col.run
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
