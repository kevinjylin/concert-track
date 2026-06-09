"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Heart, RefreshCw, Bell } from "lucide-react";
import { alertTypeLabel, channelLabel } from "../../lib/alertFormat";
import { relativeTime, shortDate } from "../../lib/format";
import type {
  AlertRecord,
  AlertType,
  EventRecord,
  EventStatus,
} from "../../lib/types";
import styles from "../dashboard/dashboard.module.css";

const statusLabel: Record<EventStatus, string> = {
  onsale: "On Sale",
  offsale: "Off Sale",
  cancelled: "Cancelled",
  postponed: "Postponed",
  rescheduled: "Rescheduled",
  scheduled: "Scheduled",
  unknown: "Unknown",
};

const cx = (...classes: Array<string | undefined>): string =>
  classes.filter(Boolean).join(" ");

const statusBadgeClass: Record<EventStatus, string | undefined> = {
  onsale: styles.statusBadgeOnsale,
  offsale: "",
  cancelled: styles.statusBadgeCancelled,
  postponed: styles.statusBadgePostponed,
  rescheduled: styles.statusBadgeRescheduled,
  scheduled: "",
  unknown: "",
};

const statusRailClass: Record<EventStatus, string | undefined> = {
  onsale: styles.eventStatusRailOnsale,
  offsale: "",
  cancelled: styles.eventStatusRailCancelled,
  postponed: styles.eventStatusRailWarning,
  rescheduled: styles.eventStatusRailWarning,
  scheduled: "",
  unknown: "",
};

const alertTypeBadgeClass: Record<AlertType, string | undefined> = {
  new_event: styles.alertBadgeNew,
  status_changed: styles.alertBadgeStatus,
  ticket_url_changed: styles.alertBadgeTicket,
  on_sale_moved_earlier: styles.alertBadgeUrgent,
  presale_announced: styles.alertBadgeUrgent,
  presale_opened: styles.alertBadgeUrgent,
  public_sale_announced: styles.alertBadgeTicket,
  public_sale_opened: styles.alertBadgeNew,
};

const eventDate = (event: EventRecord): string => shortDate(event.start_time);

const eventVenueLine = (event: EventRecord): string => {
  const cityRegion = [event.city, event.state].filter(Boolean).join(", ");

  return [event.title, event.venue ?? null, cityRegion || null]
    .filter(Boolean)
    .join(" · ");
};

interface EventCardProps {
  event: EventRecord;
  alerts: AlertRecord[];
  expanded: boolean;
  onToggleExpanded: () => void;
}

function EventCard({
  event,
  alerts,
  expanded,
  onToggleExpanded,
}: EventCardProps) {
  const latestAlert = alerts[0];
  const updateCount = alerts.length;

  return (
    <li className={styles.eventCard}>
      <i
        className={cx(styles.eventStatusRail, statusRailClass[event.status])}
        aria-hidden="true"
      />
      <div className={styles.eventCardMain}>
        <div className={styles.eventCardTop}>
          <div className={styles.eventStatusGroup}>
            <span
              className={cx(styles.statusBadge, statusBadgeClass[event.status])}
            >
              {statusLabel[event.status]}
            </span>
            <span className={styles.eventDate}>{eventDate(event)}</span>
          </div>
          {event.ticket_url ? (
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noreferrer"
              className={styles.ticketLink}
              aria-label={`Tickets for ${event.title} (opens in new tab)`}
            >
              Tickets
              <ArrowUpRight aria-hidden="true" size={15} />
            </a>
          ) : null}
        </div>

        <strong className={styles.eventArtist}>{event.artist_name}</strong>
        <p className={styles.eventTitle}>{eventVenueLine(event)}</p>
        {event.sale_windows?.length ? (
          <div className={styles.channelChips} aria-label="Sale windows">
            {event.sale_windows.map((window, index) => {
              const label = [window.name, window.starts_at ? shortDate(window.starts_at) : null]
                .filter(Boolean)
                .join(" · ");
              return window.url ? (
                <a
                  key={`${window.kind}-${window.name}-${index}`}
                  href={window.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.channelChip}
                >
                  {label}
                </a>
              ) : (
                <span key={`${window.kind}-${window.name}-${index}`} className={styles.channelChip}>
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}

        <div className={styles.activityLine}>
          <span
            className={cx(styles.activityDot, statusRailClass[event.status])}
            aria-hidden="true"
          />
          {latestAlert ? (
            <>
              <span
                className={cx(
                  styles.alertBadge,
                  alertTypeBadgeClass[latestAlert.alert_type],
                )}
              >
                {alertTypeLabel[latestAlert.alert_type]}
              </span>
              <span className={styles.activityMessage}>
                {latestAlert.message}
              </span>
              <span className={styles.alertTime}>
                {relativeTime(latestAlert.created_at)}
              </span>
            </>
          ) : (
            <span className={styles.activityMuted}>
              {relativeTime(event.last_seen_at)}
            </span>
          )}
        </div>

        {updateCount > 1 ? (
          <button
            type="button"
            className={styles.timelineToggle}
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${updateCount} updates for ${event.title}`}
          >
            <span>{updateCount} updates</span>
            <ChevronDown
              aria-hidden="true"
              size={14}
              className={cx(
                styles.timelineChevron,
                expanded ? styles.timelineChevronOpen : undefined,
              )}
            />
          </button>
        ) : null}

        {expanded ? (
          <ol className={styles.alertTimeline}>
            {alerts.map((alert) => (
              <li key={alert.id} className={styles.timelineItem}>
                <div className={styles.timelineItemTop}>
                  <span
                    className={cx(
                      styles.alertBadge,
                      alertTypeBadgeClass[alert.alert_type],
                    )}
                  >
                    {alertTypeLabel[alert.alert_type]}
                  </span>
                  <span className={styles.alertTime}>
                    {relativeTime(alert.created_at)}
                  </span>
                </div>
                <p>{alert.message}</p>
                <div className={styles.channelChips}>
                  {alert.sent_channels.length > 0 ? (
                    alert.sent_channels.map((channel) => (
                      <span
                        key={channel}
                        className={cx(
                          styles.channelChip,
                          styles.channelChipSent,
                        )}
                      >
                        {channelLabel[channel] ?? channel}
                      </span>
                    ))
                  ) : (
                    <span
                      className={cx(
                        styles.channelChip,
                        styles.channelChipStored,
                      )}
                    >
                      stored only
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </li>
  );
}

// ── Onboarding empty state ──────────────────────────────────────────────────
const onboardingSteps = [
  {
    num: "01",
    title: "Add artists to your watchlist",
    desc: "Search by name or import from Spotify — we'll start watching for presales and new dates.",
    Icon: Heart,
  },
  {
    num: "02",
    title: "We poll the sources",
    desc: "Connected sources are checked at adaptive intervals. Freshness is prioritized around active sales.",
    Icon: RefreshCw,
  },
  {
    num: "03",
    title: "Set up notifications",
    desc: "Get notified by Discord, email, or SMS after a connected source reports a meaningful change.",
    Icon: Bell,
  },
];

function OnboardingCard({ onOpenWatchlist }: { onOpenWatchlist: () => void }) {
  return (
    <li className={styles.onboardingCard}>
      <div className={styles.onboardingHeader}>
        <span className={styles.onboardingKicker}>Getting started</span>
        <h3 className={styles.onboardingTitle}>
          Build your watchlist,{"\u00A0"}catch every show.
        </h3>
        <p className={styles.onboardingLead}>
          Add the artists you care about and UGround will watch for presales,
          new dates, and status changes — and alert you when a source check
          moves.
        </p>
      </div>

      <ol className={styles.onboardingSteps}>
        {onboardingSteps.map((step) => (
          <li key={step.num} className={styles.onboardingStep}>
            <div className={styles.onboardingStepIcon} aria-hidden="true">
              <step.Icon size={18} />
            </div>
            <div className={styles.onboardingStepBody}>
              <div className={styles.onboardingStepNum}>{step.num}</div>
              <strong>{step.title}</strong>
              <p>{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={styles.onboardingCta}
        onClick={onOpenWatchlist}
      >
        <Heart aria-hidden="true" size={16} />
        Open Watchlist &amp; Add Artists
      </button>
    </li>
  );
}

// ── Event list ──────────────────────────────────────────────────────────────

interface EventListProps {
  events: EventRecord[];
  alertsByEventId: Map<string, AlertRecord[]>;
  totalEvents?: number;
  loading?: boolean;
  hasArtists?: boolean;
  onOpenWatchlist?: () => void;
}

export default function EventList({
  events,
  alertsByEventId,
  totalEvents,
  loading,
  hasArtists,
  onOpenWatchlist,
}: EventListProps) {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hasAnyEvents = (totalEvents ?? events.length) > 0;

  const toggleExpanded = (eventId: string) => {
    setExpandedEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <article
      id="event-feed"
      className={`${styles.panel} ${styles.eventPanel}`}
      tabIndex={-1}
    >
      <div className={styles.feedHeader}>
        <h2>Event Feed</h2>
        {!loading ? <span>{events.length} shown</span> : null}
      </div>
      <ul className={styles.list}>
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <li
                key={i}
                className={`${styles.eventCard} ${styles.skeleton} ${styles.skeletonRow}`}
                aria-hidden="true"
              />
            ))
          : events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                alerts={alertsByEventId.get(event.id) ?? []}
                expanded={expandedEventIds.has(event.id)}
                onToggleExpanded={() => toggleExpanded(event.id)}
              />
            ))}
        {!loading && events.length === 0 ? (
          !hasArtists && !hasAnyEvents && onOpenWatchlist ? (
            <OnboardingCard onOpenWatchlist={onOpenWatchlist} />
          ) : (
            <li className={styles.emptyState}>
              <span className={styles.emptyStateTitle}>
                {hasAnyEvents
                  ? "No events match this view"
                  : "No events tracked yet"}
              </span>
              <span className={styles.emptyStateHint}>
                {hasAnyEvents
                  ? "Change the filter or run a refresh to check for new presales."
                  : "Run a refresh to start tracking presales for your followed artists."}
              </span>
            </li>
          )
        ) : null}
      </ul>
    </article>
  );
}
