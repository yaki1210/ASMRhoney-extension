import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { searchClips, searchCreators } from "../data/search";
import { loadRecentSearches, listRecentProgress, pushRecentSearch } from "../data/storage";
import type { ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { coverSrc, creatorCover, displayCreator, displayTitle, formatDuration } from "../lib";
import { IconClose, IconSearch } from "../icons";

type Props = {
  catalog: ClipListItem[];
  people: Creator[];
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  lang: Lang;
  initialQuery?: string;
  onClose: () => void;
  onOpenClip: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function SearchOverlay({
  catalog,
  people,
  streamers,
  triggers,
  lang,
  initialQuery = "",
  onClose,
  onOpenClip,
  onOpenCreator,
}: Props) {
  const t = copy(lang);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initialQuery);
  const [cursor, setCursor] = useState(0);
  const recents = useMemo(() => loadRecentSearches(), []);
  const resume = useMemo(() => {
    const slugs = listRecentProgress(6).map((p) => p.slug);
    return slugs.map((slug) => catalog.find((c) => c.slug === slug)).filter(Boolean) as ClipListItem[];
  }, [catalog]);

  const clipHits = useMemo(
    () => searchClips(catalog, q, streamers, triggers, lang),
    [catalog, q, streamers, triggers, lang],
  );
  const creatorHits = useMemo(() => searchCreators(people, q), [people, q]);

  type Row =
    | { kind: "clip"; slug: string }
    | { kind: "creator"; slug: string }
    | { kind: "query"; q: string };
  const rows: Row[] = q.trim()
    ? [
        ...creatorHits.map((h) => ({ kind: "creator" as const, slug: h.creator.slug })),
        ...clipHits.map((h) => ({ kind: "clip" as const, slug: h.clip.slug })),
      ]
    : [
        ...recents.map((term) => ({ kind: "query" as const, q: term })),
        ...resume.map((c) => ({ kind: "clip" as const, slug: c.slug })),
      ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[cursor];
        if (row) pick(row);
        else if (q.trim()) pushRecentSearch(q);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cursor, q]);

  const pick = (row: Row) => {
    if (row.kind === "query") {
      setQ(row.q);
      return;
    }
    if (q.trim()) pushRecentSearch(q);
    if (row.kind === "clip") onOpenClip(row.slug);
    else onOpenCreator(row.slug);
    onClose();
  };

  return (
    <div class="overlay" onClick={onClose}>
      <div class="search-palette" onClick={(e) => e.stopPropagation()}>
        <div class="search-field">
          <IconSearch />
          <input
            ref={inputRef}
            value={q}
            placeholder={t.searchPlaceholder}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
          <button class="ghost" type="button" onClick={onClose} title={t.back}>
            <IconClose />
          </button>
        </div>
        <div class="search-body">
          {!q.trim() && recents.length > 0 && <p class="search-label">{t.searchRecent}</p>}
          {!q.trim() && !recents.length && resume.length > 0 && <p class="search-label">{t.continueWatch}</p>}
          {q.trim() && creatorHits.length > 0 && <p class="search-label">{t.searchCreators}</p>}
          {rows.length === 0 && q.trim() && <p class="rail-empty">{t.searchEmpty}</p>}
          {rows.map((row, i) => {
            if (row.kind === "query") {
              return (
                <button key={`q-${row.q}`} class={`search-row ${i === cursor ? "is-on" : ""}`} type="button" onClick={() => pick(row)}>
                  <IconSearch />
                  <span>{row.q}</span>
                </button>
              );
            }
            if (row.kind === "creator") {
              const person = streamers.get(row.slug);
              const src = person ? creatorCover(person) : "";
              return (
                <button key={`c-${row.slug}`} class={`search-row ${i === cursor ? "is-on" : ""}`} type="button" onClick={() => pick(row)}>
                  {src ? <img src={src} alt="" /> : <span class="search-fallback" />}
                  <span>
                    <b>{displayCreator(row.slug, streamers)}</b>
                    <i>{t.creators}</i>
                  </span>
                </button>
              );
            }
            const clip = catalog.find((c) => c.slug === row.slug);
            if (!clip) return null;
            const src = coverSrc(clip);
            return (
              <button key={`v-${row.slug}`} class={`search-row ${i === cursor ? "is-on" : ""}`} type="button" onClick={() => pick(row)}>
                {src ? <img src={src} alt="" /> : <span class="search-fallback" />}
                <span>
                  <b>{displayTitle(clip, lang)}</b>
                  <i>
                    {displayCreator(clip.creator, streamers)} · {formatDuration(clip.duration)}
                  </i>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
