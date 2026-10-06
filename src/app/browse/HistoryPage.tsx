import { useMemo } from "preact/hooks";
import { listWatchHistory, type RecentProgress } from "../data/storage";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { coverSrc, displayCreator, displayTitle, formatDuration } from "../lib";

function dayKey(ms: number) {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

function clock(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayLabel(ms: number, lang: Lang, now: number) {
  const when = new Date(ms);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const t = copy(lang);
  if (dayKey(ms) === dayKey(now)) return t.historyToday;
  if (dayKey(ms) === dayKey(yesterday.getTime())) return t.historyYesterday;
  const sameYear = when.getFullYear() === today.getFullYear();
  if (lang === "en") {
    return when.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric",
    });
  }
  const month = when.getMonth() + 1;
  const date = when.getDate();
  return sameYear ? `${month}月${date}日` : `${when.getFullYear()}年${month}月${date}日`;
}

function groupByDay(records: RecentProgress[], lang: Lang) {
  const now = Date.now();
  const groups: { day: number; label: string; rows: RecentProgress[] }[] = [];
  for (const rec of records) {
    const day = dayKey(rec.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(rec);
    else groups.push({ day, label: dayLabel(rec.updatedAt, lang, now), rows: [rec] });
  }
  return groups;
}

type Props = {
  catalog: ClipListItem[];
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function HistoryPage({ catalog, streamers, lang, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const bySlug = useMemo(() => new Map(catalog.map((clip) => [clip.slug, clip])), [catalog]);
  const records = listWatchHistory();
  const groups = useMemo(() => groupByDay(records, lang), [records, lang]);

  return (
    <div class="page">
      <section class="hero-block">
        <h1 class="home-title">{t.history}</h1>
      </section>
      {groups.length ? (
        groups.map((group) => (
          <section key={group.day} class="history-section">
            <h2>{group.label}</h2>
            <div class="history-list">
              {group.rows.map((rec) => {
                const clip = bySlug.get(rec.slug);
                const title = clip ? displayTitle(clip, lang) : rec.slug;
                const src = clip ? coverSrc(clip) : "";
                const pct = rec.dur > 0 ? Math.min(100, (rec.t / rec.dur) * 100) : 0;
                return (
                  <article key={rec.slug} class="history-row" onClick={() => onOpen(rec.slug)}>
                    <span class="history-thumb">
                      {src ? <img src={src} alt="" loading="lazy" /> : null}
                      <em>{formatDuration(clip?.duration || rec.dur)}</em>
                      {pct > 0 && (
                        <span class="history-bar">
                          <i style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </span>
                    <span class="history-copy">
                      <b>{title}</b>
                      {clip && (
                        <button
                          class="clip-creator"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCreator(clip.creator);
                          }}
                        >
                          {displayCreator(clip.creator, streamers)}
                        </button>
                      )}
                      <span class="history-time">
                        {formatDuration(rec.t)} / {formatDuration(rec.dur)}
                      </span>
                      <span class="history-when">
                        {dayLabel(rec.updatedAt, lang, Date.now())} {clock(rec.updatedAt)}
                      </span>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <p class="rail-empty">{t.historyEmpty}</p>
      )}
    </div>
  );
}
