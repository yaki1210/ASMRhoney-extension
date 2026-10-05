import { useMemo } from "preact/hooks";
import { isFinished, listWatchHistory } from "../data/storage";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { coverSrc, displayCreator, displayTitle, formatDuration } from "../lib";

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
  const open = records.filter((rec) => !isFinished(rec));
  const done = records.filter((rec) => isFinished(rec));

  const section = (title: string, rows: typeof records) =>
    rows.length ? (
      <section class="history-section">
        <h2>{title}</h2>
        <div class="history-list">
          {rows.map((rec) => {
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
                </span>
              </article>
            );
          })}
        </div>
      </section>
    ) : null;

  return (
    <div class="page">
      <section class="hero-block">
        <h1 class="home-title">{t.history}</h1>
      </section>
      {records.length ? (
        <>
          {section(t.historyOpen, open)}
          {section(t.historyDone, done)}
        </>
      ) : (
        <p class="rail-empty">{t.historyEmpty}</p>
      )}
    </div>
  );
}
