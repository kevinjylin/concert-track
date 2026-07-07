"use client";

import { Menu, RefreshCw } from "lucide-react";
import styles from "../dashboard/dashboard.module.css";

interface TopBarProps {
  lastPollText: string;
  busy: boolean;
  polling: boolean;
  onOpenMenu: () => void;
  onRefresh: () => void;
  sourceSummary: string;
}

export default function TopBar({
  lastPollText,
  busy,
  polling,
  onOpenMenu,
  onRefresh,
  sourceSummary,
}: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarTitleGroup}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mobileMenuButton}`}
          aria-label="Open navigation"
          onClick={onOpenMenu}
        >
          <Menu aria-hidden="true" size={18} />
        </button>
        <div className={styles.topBarCopy}>
          <h1>Event Feed</h1>
          <p>
            <span className={styles.liveDot} aria-hidden="true" />
            <span aria-live="polite">{lastPollText}</span>
            <span> · {sourceSummary}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.primaryButton} ${styles.refreshButton}`}
        onClick={onRefresh}
        disabled={busy || polling}
      >
        <RefreshCw
          aria-hidden="true"
          size={17}
          className={polling ? styles.refreshIconSpinning : styles.refreshIcon}
        />
        <span>{polling ? "Refreshing" : "Refresh"}</span>
      </button>
    </header>
  );
}
