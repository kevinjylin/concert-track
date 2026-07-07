"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard/dashboard.module.css";

export default function AccountPanel() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const deleteAccount = async () => {
    if (confirmation !== "DELETE") return;
    setDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Account deletion failed");
      }
      router.replace("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={`${styles.panel} ${styles.stack}`}>
      <div>
        <h2>Your data</h2>
        <p className={styles.helpText}>
          Export watch rules, events, alert history, and notification settings as JSON.
        </p>
      </div>
      <a className={styles.secondaryButton} href="/api/account/export" download>
        Export my data
      </a>
      <hr />
      <div>
        <h2>Delete account data</h2>
        <p className={styles.helpText}>
          This permanently removes UGround watch rules, events, alerts, and destinations. Type
          DELETE to confirm.
        </p>
      </div>
      <input
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        aria-label="Type DELETE to confirm account deletion"
        placeholder="DELETE"
      />
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={deleting || confirmation !== "DELETE"}
        onClick={deleteAccount}
      >
        {deleting ? "Deleting..." : "Delete my UGround data"}
      </button>
    </section>
  );
}

