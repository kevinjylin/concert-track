import { createHash } from "node:crypto";
import type { EventStatus, NormalizedEvent } from "./types";

const SOURCE_PRIORITY: Record<NormalizedEvent["source_slug"], number> = {
  ticketmaster: 3,
  eventbrite: 2,
  songkick: 2,
  bandsintown: 2,
  axs: 2,
  dice: 2,
  manual: 1,
};

export const slugify = (value: string | null | undefined): string => {
  if (!value) {
    return "unknown";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
};

export const asIsoOrNull = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

export const buildDedupeKey = (artistName: string, venue: string | null, startTime: string | null): string => {
  const day = startTime ? startTime.slice(0, 10) : "unknown-day";
  return `${slugify(artistName)}::${slugify(venue)}::${day}`;
};

export const hashJson = (payload: unknown): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

export const normalizeStatus = (status: string | null | undefined): EventStatus => {
  if (!status) {
    return "unknown";
  }

  const normalized = status.toLowerCase();
  if (["onsale", "on_sale", "on sale"].includes(normalized)) {
    return "onsale";
  }

  if (["offsale", "off_sale", "off sale", "soldout", "sold_out"].includes(normalized)) {
    return "offsale";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  if (["postponed"].includes(normalized)) {
    return "postponed";
  }

  if (["rescheduled"].includes(normalized)) {
    return "rescheduled";
  }

  if (["scheduled", "active"] .includes(normalized)) {
    return "scheduled";
  }

  return "unknown";
};

export const dedupeEvents = (events: NormalizedEvent[]): NormalizedEvent[] => {
  const map = new Map<string, NormalizedEvent>();

  for (const event of events) {
    const scopedDedupeKey = `${event.user_id}::${event.dedupe_key}`;
    const existing = map.get(scopedDedupeKey);

    if (!existing) {
      map.set(scopedDedupeKey, event);
      continue;
    }

    const nextPriority = SOURCE_PRIORITY[event.source_slug];
    const existingPriority = SOURCE_PRIORITY[existing.source_slug];

    if (nextPriority > existingPriority) {
      map.set(scopedDedupeKey, event);
    }
  }

  return [...map.values()];
};

export const movedEarlier = (previous: string | null, next: string | null): boolean => {
  if (!next) {
    return false;
  }

  if (!previous) return false;

  return new Date(next).getTime() < new Date(previous).getTime();
};
