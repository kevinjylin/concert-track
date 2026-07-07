"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type {
  ArtistSuggestion,
  NotificationSettingsResponse,
  PollResult,
  WatchArtist,
  WatchRule,
} from "../../lib/types";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import AccountPanel from "./AccountPanel";
import WatchlistList from "./WatchlistList";
import WatchlistPanel from "./WatchlistPanel";
import styles from "../dashboard/dashboard.module.css";

type SettingsTab = "watchlist" | "notifications" | "account";

const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: "watchlist", label: "Watchlist" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusable = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
};

interface SettingsDrawerProps {
  open: boolean;
  initialTab?: SettingsTab;
  artists: WatchArtist[];
  watchRules: WatchRule[];
  busy: boolean;
  city: string;
  stateRegion: string;
  country: string;
  notificationSettings: NotificationSettingsResponse | null;
  polling: boolean;
  lastPoll: PollResult | null;
  onClose: () => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onAddArtist: (name: string, spotifyId?: string) => Promise<void>;
  onRemoveArtist: (id: string) => Promise<void>;
  onAddWatchRule: (input: Record<string, unknown>) => Promise<void>;
  onRemoveWatchRule: (id: string) => Promise<void>;
  onImportSpotify: (ids: string) => Promise<void>;
  onPreviewSpotifyPlaylist: (url: string) => Promise<ArtistSuggestion[]>;
  onImportSpotifyPlaylist: (url: string, artistIds: string[]) => Promise<void>;
  onPoll: () => Promise<void>;
  onSaveNotificationSettings: (input: {
    discordWebhook?: string | null;
    discordEnabled: boolean;
    email?: string | null;
    emailEnabled: boolean;
    phone?: string | null;
    smsEnabled: boolean;
  }) => Promise<void>;
  onTestDiscord: () => Promise<void>;
  onSendEmailConfirmation: () => Promise<void>;
  onSendSmsConfirmation: () => Promise<void>;
  onConfirmSms: (code: string) => Promise<void>;
}

export default function SettingsDrawer({
  open,
  initialTab,
  artists,
  watchRules,
  busy,
  city,
  stateRegion,
  country,
  notificationSettings,
  polling,
  lastPoll,
  onClose,
  onCityChange,
  onStateChange,
  onCountryChange,
  onAddArtist,
  onRemoveArtist,
  onAddWatchRule,
  onRemoveWatchRule,
  onImportSpotify,
  onPreviewSpotifyPlaylist,
  onImportSpotifyPlaylist,
  onPoll,
  onSaveNotificationSettings,
  onTestDiscord,
  onSendEmailConfirmation,
  onSendSmsConfirmation,
  onConfirmSms,
}: SettingsDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const tabBaseId = useId();
  const [activeTab, setActiveTab] = useState<SettingsTab>("watchlist");

  useEffect(() => {
    if (!open) return;

    setActiveTab(initialTab ?? "watchlist");

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = getFocusable(drawerRef.current)[0];
      (firstFocusable ?? drawerRef.current)?.focus();
    });

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialTab, open, onClose]);

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;

    const focusable = getFocusable(drawerRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      drawerRef.current?.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const getTabId = (tab: SettingsTab) => `${tabBaseId}-${tab}-tab`;
  const getPanelId = (tab: SettingsTab) => `${tabBaseId}-${tab}-panel`;

  const focusTab = (tab: SettingsTab) => {
    window.requestAnimationFrame(() => {
      document.getElementById(getTabId(tab))?.focus();
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: SettingsTab,
  ) => {
    const currentIndex = settingsTabs.findIndex((item) => item.id === tab);
    const lastIndex = settingsTabs.length - 1;
    let nextTab: SettingsTab | null = null;

    if (event.key === "ArrowRight") {
      nextTab =
        settingsTabs[currentIndex === lastIndex ? 0 : currentIndex + 1]!.id;
    } else if (event.key === "ArrowLeft") {
      nextTab =
        settingsTabs[currentIndex === 0 ? lastIndex : currentIndex - 1]!.id;
    }

    if (!nextTab) return;

    event.preventDefault();
    setActiveTab(nextTab);
    focusTab(nextTab);
  };

  if (!open) return null;

  return (
    <div className={styles.settingsLayer}>
      <button
        type="button"
        className={styles.settingsBackdrop}
        aria-label="Close settings"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className={styles.settingsDrawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerKicker}>Settings</p>
            <h2 id="settings-title">Watchlist and alerts</h2>
          </div>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.buttonSmall}`}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className={styles.drawerContent}>
          <div
            className={styles.tabStrip}
            role="tablist"
            aria-label="Settings sections"
          >
            {settingsTabs.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={getTabId(tab.id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={getPanelId(tab.id)}
                  tabIndex={selected ? 0 : -1}
                  className={`${styles.tabButton} ${
                    selected ? styles.tabButtonActive : ""
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "watchlist" ? (
            <section
              id={getPanelId("watchlist")}
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby={getTabId("watchlist")}
              tabIndex={0}
            >
              <WatchlistPanel
                busy={busy}
                city={city}
                stateRegion={stateRegion}
                country={country}
                onCityChange={onCityChange}
                onStateChange={onStateChange}
                onCountryChange={onCountryChange}
                onAdd={onAddArtist}
                onAddWatchRule={onAddWatchRule}
                onImportSpotify={onImportSpotify}
                onPreviewSpotifyPlaylist={onPreviewSpotifyPlaylist}
                onImportSpotifyPlaylist={onImportSpotifyPlaylist}
                onPoll={onPoll}
                polling={polling}
                lastPoll={lastPoll}
              />

              <section
                className={`${styles.panel} ${styles.watchlistTabList}`}
                aria-labelledby={`${tabBaseId}-followed-heading`}
              >
                <div className={styles.watchlistListHeader}>
                  <h2 id={`${tabBaseId}-followed-heading`}>
                    Followed Artists ({artists.length})
                  </h2>
                </div>
                <WatchlistList
                  artists={artists}
                  onRemove={onRemoveArtist}
                  loading={busy}
                />
                {watchRules.filter((rule) => rule.kind !== "artist").length ? (
                  <ul className={styles.list}>
                    {watchRules
                      .filter((rule) => rule.kind !== "artist")
                      .map((rule) => (
                        <li key={rule.id} className={styles.watchlistItem}>
                          <span>
                            <strong>{rule.label}</strong>
                            <small>
                              {rule.kind === "venue"
                                ? "Venue watch"
                                : `${rule.radius_miles} mile radius`}
                            </small>
                          </span>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => void onRemoveWatchRule(rule.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </section>
            </section>
          ) : activeTab === "notifications" ? (
            <section
              id={getPanelId("notifications")}
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby={getTabId("notifications")}
              tabIndex={0}
            >
              <NotificationSettingsPanel
                settings={notificationSettings}
                busy={busy}
                onSave={onSaveNotificationSettings}
                onTestDiscord={onTestDiscord}
                onSendEmailConfirmation={onSendEmailConfirmation}
                onSendSmsConfirmation={onSendSmsConfirmation}
                onConfirmSms={onConfirmSms}
              />
            </section>
          ) : (
            <section
              id={getPanelId("account")}
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby={getTabId("account")}
              tabIndex={0}
            >
              <AccountPanel />
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
