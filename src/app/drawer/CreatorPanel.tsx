import { useEffect, useMemo, useState } from "preact/hooks";
import { ClipGrid } from "../browse/ClipGrid";
import { ensureFullCatalog, fetchCommentCount } from "../data/client";
import type { ClipListItem, Creator, CreatorSort, Lang } from "../data/types";
import { copy } from "../i18n";
import { displayCreator } from "../lib";
import { ClipList } from "./ClipList";

const PAGE = 48;

type Props = {
  slug: string;
  catalog: ClipListItem[];
  currentSlug?: string;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator?: (slug: string) => void;
  layout?: "list" | "grid";
};

export function CreatorPanel({
  slug,
  catalog,
  currentSlug,
  counts,
  streamers,
  lang,
  onOpen,
  onOpenCreator,
  layout = "list",
}: Props) {
  const t = copy(lang);
  const [all, setAll] = useState<ClipListItem[]>(() => catalog.filter((c) => c.creator === slug));
  const [sort, setSort] = useState<CreatorSort>("new");
  const [shown, setShown] = useState(PAGE);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    setShown(PAGE);
  }, [slug]);

  useEffect(() => {
    setAll(catalog.filter((c) => c.creator === slug));
    void ensureFullCatalog().then((full) => {
      const mine = full.filter((c) => c.creator === slug);
      if (mine.length) setAll(mine);
    });
  }, [slug, catalog]);

  useEffect(() => {
    if (sort !== "comments") return;
    let cancelled = false;
    setLoadingCounts(true);
    void Promise.all(all.map(async (c) => [c.slug, await fetchCommentCount(c.slug)] as const)).then((pairs) => {
      if (cancelled) return;
      setCommentCounts(Object.fromEntries(pairs));
      setLoadingCounts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sort, all]);

  const clips = useMemo(() => {
    const list = [...all];
    if (sort === "views") {
      list.sort((a, b) => (counts[b.slug] ?? b.playCount ?? 0) - (counts[a.slug] ?? a.playCount ?? 0));
    } else if (sort === "duration") {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (sort === "comments") {
      list.sort((a, b) => (commentCounts[b.slug] ?? 0) - (commentCounts[a.slug] ?? 0));
    } else {
      list.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
    }
    return list;
  }, [all, sort, counts, commentCounts]);

  const sorts: { id: CreatorSort; label: string }[] = [
    { id: "new", label: t.sortNew },
    { id: "views", label: t.sortViews },
    { id: "duration", label: t.sortDuration },
    { id: "comments", label: t.sortComments },
  ];

  return (
    <>
      <div class="sort-row" role="tablist">
        {sorts.map((s) => (
          <button key={s.id} class={sort === s.id ? "is-on" : ""} type="button" onClick={() => setSort(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {loadingCounts && sort === "comments" ? <p class="rail-empty">{t.loading}</p> : null}
      {layout === "grid" ? (
        <>
          <ClipGrid
            clips={clips.slice(0, shown)}
            counts={counts}
            streamers={streamers}
            lang={lang}
            onOpen={onOpen}
            onOpenCreator={(creator) => onOpenCreator?.(creator)}
          />
          {shown < clips.length && (
            <button class="more-btn library-more" type="button" onClick={() => setShown((n) => n + PAGE)}>
              {t.commentsMore}
            </button>
          )}
        </>
      ) : (
        <ClipList
          clips={clips}
          currentSlug={currentSlug}
          counts={counts}
          commentCounts={sort === "comments" ? commentCounts : undefined}
          streamers={streamers}
          lang={lang}
          onOpen={onOpen}
        />
      )}
      <p class="rail-footnote">
        {displayCreator(slug, streamers)} {clips.length} {t.creatorWorks}
      </p>
    </>
  );
}

