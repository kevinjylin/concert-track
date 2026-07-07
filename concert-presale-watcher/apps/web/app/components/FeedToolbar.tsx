import styles from "../dashboard/dashboard.module.css";

export type EventFilter = "all" | "onsale" | "scheduled" | "changed_today";
export type EventSort = "recent_change" | "date_soonest" | "artist_az";

interface FilterOption {
  id: EventFilter;
  label: string;
  count: number;
}

interface FeedToolbarProps {
  filter: EventFilter;
  sort: EventSort;
  filters: FilterOption[];
  onFilterChange: (filter: EventFilter) => void;
  onSortChange: (sort: EventSort) => void;
}

export default function FeedToolbar({
  filter,
  sort,
  filters,
  onFilterChange,
  onSortChange,
}: FeedToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Feed controls">
      <div className={styles.filterGroup} aria-label="Event filters">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.filterPill} ${
              filter === option.id ? styles.filterPillActive : ""
            } ${option.count === 0 ? styles.filterPillEmpty : ""}`}
            onClick={() => onFilterChange(option.id)}
            aria-pressed={filter === option.id}
          >
            {option.label} <span>{option.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbarActions}>
        <label className={styles.sortControl}>
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as EventSort)}
          >
            <option value="recent_change">Recent change</option>
            <option value="date_soonest">Date (soonest)</option>
            <option value="artist_az">Artist (A-Z)</option>
          </select>
        </label>
      </div>
    </section>
  );
}
