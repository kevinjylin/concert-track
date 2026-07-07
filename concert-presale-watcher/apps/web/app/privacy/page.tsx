import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px", lineHeight: 1.7 }}>
      <h1>Privacy</h1>
      <p>Last updated June 9, 2026.</p>
      <p>
        UGround stores account details, watch rules, event matches, alert history, and encrypted
        notification destinations to provide the service. Provider credentials and notification
        destinations are never exposed to browser clients.
      </p>
      <p>
        Data is processed by Supabase, Vercel, and only the notification or event providers needed
        for features you enable. UGround does not sell personal data.
      </p>
      <p>
        You can export or delete your UGround data through the account controls. Contact{" "}
        <a href="mailto:support@uground.app">support@uground.app</a> for privacy requests.
      </p>
      <Link href="/">Back to UGround</Link>
    </main>
  );
}

