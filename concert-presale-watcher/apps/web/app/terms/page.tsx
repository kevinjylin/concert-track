import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px", lineHeight: 1.7 }}>
      <h1>Terms</h1>
      <p>Last updated June 9, 2026.</p>
      <p>
        UGround provides informational event monitoring and does not sell tickets or guarantee
        availability, pricing, source uptime, delivery time, or third-party data accuracy.
      </p>
      <p>
        Use the service lawfully. Do not bypass rate limits, access another user&apos;s data, or
        abuse event and notification providers. Source availability can change with API and
        partnership terms.
      </p>
      <p>Contact <a href="mailto:support@uground.app">support@uground.app</a> with questions.</p>
      <Link href="/">Back to UGround</Link>
    </main>
  );
}
