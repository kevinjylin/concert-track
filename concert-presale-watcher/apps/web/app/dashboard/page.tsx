"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { relativeTime } from "../../lib/format";
import type {
  AlertRecord,
  EventRecord,
  NotificationSettingsResponse,
  PollResult,
  WatchArtist,
} from "../../lib/types";
import ErrorBanner from "../components/ErrorBanner";
import EventList from "../components/EventList";
import FeedToolbar, {
  type EventFilter,
  type EventSort,
} from "../components/FeedToolbar";
import OnSaleHero from "../components/OnSaleHero";
import SettingsDrawer from "../components/SettingsDrawer";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import styles from "./dashboard.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
type SettingsTab = "watchlist" | "notifications";

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const latestActivityTime = (
  event: EventRecord,
  alertsByEventId: Map<string, AlertRecord[]>,
): number => {
  const latestAlertTime = toTimestamp(
    alertsByEventId.get(event.id)?.[0]?.created_at,
  );

  return Math.max(
    latestAlertTime,
    toTimestamp(event.updated_at),
    toTimestamp(event.last_seen_at),
    toTimestamp(event.created_at),
  );
};

const changedWithinDay = (
  event: EventRecord,
  alertsByEventId: Map<string, AlertRecord[]>,
): boolean => {
  const latestAlertAt = toTimestamp(
    alertsByEventId.get(event.id)?.[0]?.created_at,
  );

  return latestAlertAt > 0 && Date.now() - latestAlertAt <= DAY_MS;
};

export default function DashboardPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<WatchArtist[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettingsResponse | null>(null);

  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [country, setCountry] = useState("US");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [sort, setSort] = useState<EventSort>("recent_change");
  const [settingsOpen, setSettingsOpen] = useState<false | SettingsTab>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [busy, setBusy] = useState(true);
  const [polling, setPolling] = useState(false);
  const [lastPoll, setLastPoll] = useState<PollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track previous artist count to detect first-artist-added transition.
  const prevArtistCount = useRef<number | null>(null);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSettings = useCallback((tab: SettingsTab) => {
    setSettingsOpen(tab);
  }, []);

  const refreshAll = async (isInitialLoad = false) => {
    setBusy(true);
    setError(null);
    try {
      const [watchlistRes, eventsRes, alertsRes, notificationSettingsRes] =
        await Promise.all([
          fetch("/api/watchlist", { cache: "no-store" }),
          fetch("/api/events?limit=80", { cache: "no-store" }),
          fetch("/api/alerts?limit=60", { cache: "no-store" }),
          fetch("/api/notification-settings", { cache: "no-store" }),
        ]);
      const watchlistJson = (await watchlistRes.json()) as {
        artists?: WatchArtist[];
        error?: string;
      };
      const eventsJson = (await eventsRes.json()) as {
        events?: EventRecord[];
        error?: string;
      };
      const alertsJson = (await alertsRes.json()) as {
        alerts?: AlertRecord[];
        error?: string;
      };
      const notificationSettingsJson =
        (await notificationSettingsRes.json()) as {
          settings?: NotificationSettingsResponse;
          error?: string;
        };

      if (
        watchlistJson.error ||
        eventsJson.error ||
        alertsJson.error ||
        notificationSettingsJson.error
      ) {
        throw new Error(
          watchlistJson.error ??
            eventsJson.error ??
            alertsJson.error ??
            notificationSettingsJson.error,
        );
      }
      const fetchedArtists = watchlistJson.artists ?? [];
      const fetchedEvents = eventsJson.events ?? [];

      setArtists(fetchedArtists);
      setEvents(fetchedEvents);
      setAlerts(alertsJson.alerts ?? []);
      setNotificationSettings(notificationSettingsJson.settings ?? null);

      if (isInitialLoad) {
        prevArtistCount.current = fetchedArtists.length;
      }
    } catch (caught) {
      setError((caught as Error).message);
      if (isInitialLoad) {
        prevArtistCount.current = 0;
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refreshAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user goes from 0 artists to 1+, auto-trigger a poll so
  // events appear immediately instead of an empty feed.
  useEffect(() => {
    if (prevArtistCount.current === null) return;
    if (prevArtistCount.current === 0 && artists.length > 0 && !polling) {
      void runPoll("");
    }
    prevArtistCount.current = artists.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artists.length]);

  const alertsByEventId = useMemo(() => {
    const grouped = new Map<string, AlertRecord[]>();

    for (const alert of alerts) {
      const existing = grouped.get(alert.event_id) ?? [];
      existing.push(alert);
      grouped.set(alert.event_id, existing);
    }

    for (const eventAlerts of grouped.values()) {
      eventAlerts.sort(
        (a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at),
      );
    }

    return grouped;
  }, [alerts]);

  const filterCounts = useMemo(() => {
    let onsale = 0;
    let scheduled = 0;
    let changedToday = 0;

    for (const event of events) {
      if (event.status === "onsale") onsale += 1;
      if (event.status === "scheduled") scheduled += 1;
      if (changedWithinDay(event, alertsByEventId)) changedToday += 1;
    }

    return {
      all: events.length,
      onsale,
      scheduled,
      changed_today: changedToday,
    };
  }, [alertsByEventId, events]);

  const filters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: filterCounts.all },
      {
        id: "onsale" as const,
        label: "On Sale",
        count: filterCounts.onsale,
      },
      {
        id: "changed_today" as const,
        label: "Changed Today",
        count: filterCounts.changed_today,
      },
      {
        id: "scheduled" as const,
        label: "Upcoming",
        count: filterCounts.scheduled,
      },
    ],
    [filterCounts],
  );

  const filteredSortedEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (filter === "all") return true;
      if (filter === "changed_today") {
        return changedWithinDay(event, alertsByEventId);
      }
      return event.status === filter;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "date_soonest") {
        const aTime = a.start_time
          ? toTimestamp(a.start_time)
          : Number.POSITIVE_INFINITY;
        const bTime = b.start_time
          ? toTimestamp(b.start_time)
          : Number.POSITIVE_INFINITY;
        if (aTime !== bTime) return aTime - bTime;

        return (
          a.artist_name.localeCompare(b.artist_name) ||
          a.title.localeCompare(b.title)
        );
      }

      if (sort === "artist_az") {
        return (
          a.artist_name.localeCompare(b.artist_name) ||
          a.title.localeCompare(b.title)
        );
      }

      return (
        latestActivityTime(b, alertsByEventId) -
          latestActivityTime(a, alertsByEventId) ||
        a.artist_name.localeCompare(b.artist_name)
      );
    });
  }, [alertsByEventId, events, filter, sort]);

  const onSaleEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === "onsale")
        .sort(
          (a, b) =>
            latestActivityTime(b, alertsByEventId) -
              latestActivityTime(a, alertsByEventId) ||
            a.artist_name.localeCompare(b.artist_name),
        )
        .slice(0, 6),
    [alertsByEventId, events],
  );

  const latestPollishTimestamp = useMemo(
    () =>
      events.reduce(
        (latest, event) => Math.max(latest, toTimestamp(event.last_seen_at)),
        0,
      ),
    [events],
  );
  const lastPollTimestamp =
    toTimestamp(lastPoll?.endedAt) || latestPollishTimestamp;
  const lastPollText =
    lastPollTimestamp > 0
      ? `last poll ${relativeTime(new Date(lastPollTimestamp).toISOString())}`
      : busy
        ? "loading latest status"
        : "last poll unavailable";

  const addArtist = async (name: string, spotifyId?: string) => {
    setError(null);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        spotifyId,
        city: city || undefined,
        state: stateRegion || undefined,
        country: country || "US",
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok || json.error)
      throw new Error(json.error ?? "Failed to add artist");
    await refreshAll();
  };

  const removeArtist = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok || json.error)
      throw new Error(json.error ?? "Failed to remove artist");
    await refreshAll();
  };

  const importFromSpotify = async (ids: string) => {
    setError(null);
    const res = await fetch("/api/watchlist/import-spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistIds: ids,
        city: city || undefined,
        state: stateRegion || undefined,
        country: country || "US",
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok || json.error)
      throw new Error(json.error ?? "Spotify import failed");
    await refreshAll();
  };

  const runPoll = async (secret: string) => {
    setPolling(true);
    setError(null);
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-poll-secret": secret } : {}),
        },
        body: JSON.stringify({ city: city || undefined }),
      });
      const json = (await res.json()) as {
        result?: PollResult;
        error?: string;
      };
      if (!res.ok || json.error || !json.result)
        throw new Error(json.error ?? "Poll run failed");
      setLastPoll(json.result);
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPolling(false);
    }
  };

  const saveNotificationSettings = async (input: {
    discordWebhook?: string;
    discordEnabled: boolean;
    email?: string;
    emailEnabled: boolean;
    phone?: string;
    smsEnabled: boolean;
  }) => {
    setError(null);
    try {
      const res = await fetch("/api/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as {
        settings?: NotificationSettingsResponse;
        error?: string;
      };
      if (!res.ok || json.error || !json.settings)
        throw new Error(json.error ?? "Failed to save alert destinations");
      setNotificationSettings(json.settings);
    } catch (caught) {
      setError((caught as Error).message);
      throw caught;
    }
  };

  const runNotificationAction = async (
    path: string,
    body?: Record<string, unknown>,
  ) => {
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        settings?: NotificationSettingsResponse;
        error?: string;
      };
      if (!res.ok || json.error)
        throw new Error(json.error ?? "Notification action failed");
      if (json.settings) {
        setNotificationSettings(json.settings);
      } else {
        await refreshAll();
      }
    } catch (caught) {
      setError((caught as Error).message);
      throw caught;
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div id="studio-dashboard" className={styles.dashboardPage}>
      <a href="#event-feed" className={styles.skipLink}>
        Skip to event feed
      </a>
      <div className={styles.layout}>
        <Sidebar
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          onOpenSettings={openSettings}
          onLogout={() => void handleSignOut()}
        />

        <main className={styles.mainColumn} aria-busy={busy}>
          <TopBar
            lastPollText={lastPollText}
            busy={busy}
            polling={polling}
            onOpenMenu={() => setSidebarOpen(true)}
            onRefresh={() => void runPoll("")}
          />

          {error ? (
            <ErrorBanner message={error} className={styles.errorBanner} />
          ) : null}

          <OnSaleHero events={onSaleEvents} totalCount={filterCounts.onsale} />

          <FeedToolbar
            filter={filter}
            sort={sort}
            filters={filters}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />

          <EventList
            events={filteredSortedEvents}
            alertsByEventId={alertsByEventId}
            totalEvents={events.length}
            loading={busy}
            hasArtists={artists.length > 0}
            onOpenWatchlist={() => openSettings("watchlist")}
          />
        </main>
      </div>

      <SettingsDrawer
        open={settingsOpen !== false}
        initialTab={settingsOpen || undefined}
        artists={artists}
        busy={busy}
        city={city}
        stateRegion={stateRegion}
        country={country}
        notificationSettings={notificationSettings}
        polling={polling}
        lastPoll={lastPoll}
        onClose={closeSettings}
        onCityChange={setCity}
        onStateChange={setStateRegion}
        onCountryChange={setCountry}
        onAddArtist={addArtist}
        onRemoveArtist={removeArtist}
        onImportSpotify={importFromSpotify}
        onPoll={runPoll}
        onSaveNotificationSettings={saveNotificationSettings}
        onTestDiscord={() =>
          runNotificationAction("/api/notification-settings/test-discord")
        }
        onSendEmailConfirmation={() =>
          runNotificationAction(
            "/api/notification-settings/send-email-confirmation",
          )
        }
        onSendSmsConfirmation={() =>
          runNotificationAction(
            "/api/notification-settings/send-sms-confirmation",
          )
        }
        onConfirmSms={(code) =>
          runNotificationAction("/api/notification-settings/confirm-sms", {
            code,
          })
        }
      />
    </div>
  );
}
