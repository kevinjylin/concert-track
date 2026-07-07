"use client";

import { ArrowUpRight } from "lucide-react";
import { shortDate } from "../../lib/format";
import type { EventRecord } from "../../lib/types";
import styles from "../dashboard/dashboard.module.css";

const eventPlace = (event: EventRecord): string => {
  const cityRegion = [event.city, event.state].filter(Boolean).join(", ");
  return [event.venue, cityRegion].filter(Boolean).join(" · ");
};

interface OnSaleHeroProps {
  events: EventRecord[];
  totalCount: number;
}

export default function OnSaleHero({ events, totalCount }: OnSaleHeroProps) {
  if (totalCount === 0) return null;

  return (
    <section className={styles.heroStrip} aria-labelledby="onsale-heading">
      <div className={styles.heroHeader}>
        <h2 id="onsale-heading">
          <span className={styles.heroStatusDot} aria-hidden="true" />
          On sale now
        </h2>
        <span>{totalCount} live</span>
      </div>

      <ul className={styles.heroScroller}>
        {events.slice(0, 4).map((event) => (
          <li key={event.id} className={styles.heroCard}>
            <div className={styles.heroCardCopy}>
              <h3>{event.artist_name}</h3>
              <p>
                {[event.title, eventPlace(event)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className={styles.heroCardMeta}>
              <span>{shortDate(event.start_time)}</span>
              {event.ticket_url ? (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.heroTicketLink}
                  aria-label={`Get tickets for ${event.title} (opens in new tab)`}
                >
                  Tickets
                  <ArrowUpRight aria-hidden="true" size={14} />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
