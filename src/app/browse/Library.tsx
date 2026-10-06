import { useMemo, useState } from "preact/hooks";
import { libraryClipVisible, type LibraryRegion } from "../data/decide";
import { sortClips, TAG_GROUPS, type TagGroupId } from "../data/filters";
import type { ClipListItem, Creator, CreatorSort, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { fill, triggerLabel } from "../lib";
import { ClipGrid } from "./ClipGrid";

const PAGE = 48;
const GROUP_COPY: Record<TagGroupId, "groupRating" | "groupSounds" | "groupBody" | "groupScene"> = {
  rating: "groupRating",
  sounds: "groupSounds",
  body: "groupBody",
  scene: "groupScene",
};

type Props = {
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  lang: Lang;
  region: LibraryRegion;
  presetTags?: string[];
  currentSlug?: string;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function Library({
  catalog,
  counts,
  streamers,
  triggers,
  lang,
  region,
  presetTags = [],
  currentSlug,
  onOpen,
  onOpenCreator,
}: Props) {
  const t = copy(lang);
  const [selected, setSelected] = useState<string[]>(presetTags);
  const [sort, setSort] = useState<CreatorSort>("new");
  const [shown, setShown] = useState(PAGE);
  const filtered = useMemo(() => {
    const matched = catalog.filter((clip) => libraryClipVisible(clip, streamers, region, selected));
    return sortClips(matched, sort, counts);
  }, [catalog, selected, sort, counts, streamers, region]);

  const visible = filtered.slice(0, shown);
  const sorts: { id: CreatorSort; label: string }[] = [
    { id: "new", label: t.sortNew },
    { id: "views", label: t.sortViews },
    { id: "duration", label: t.sortDuration },
  ];

  const toggle = (slug: string) => {
    setShown(PAGE);
    setSelected((cur) => (cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug]));
  };

  return (
    <div class="library">
      {TAG_GROUPS.map((group) => (
        <div class="filter-row" key={group.id}>
          <span class="filter-label">{t[GROUP_COPY[group.id]]}</span>
          <div class="filter-chips">
            {group.slugs.map((slug) => (
              <button
                key={slug}
                class={`tag ${selected.includes(slug) ? "is-on" : ""} ${slug === "nsfw" ? "is-hot" : ""}`}
                type="button"
                onClick={() => toggle(slug)}
              >
                {triggerLabel(slug, triggers, lang)}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div class="library-toolbar">
        <p class="library-count">{fill(t.resultCount, filtered.length)}</p>
        <div class="sort-row" role="tablist">
          {sorts.map((s) => (
            <button key={s.id} class={sort === s.id ? "is-on" : ""} type="button" onClick={() => { setSort(s.id); setShown(PAGE); }}>
              {s.label}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <button class="text-btn" type="button" onClick={() => { setSelected(presetTags); setShown(PAGE); }}>
            {t.clearFilters}
          </button>
        )}
      </div>
      {!catalog.length ? (
        <p class="rail-empty">{t.loading}</p>
      ) : visible.length ? (
        <ClipGrid
          clips={visible}
          currentSlug={currentSlug}
          counts={counts}
          streamers={streamers}
          lang={lang}
          onOpen={onOpen}
          onOpenCreator={onOpenCreator}
        />
      ) : (
        <p class="rail-empty">{t.noResults}</p>
      )}
      {shown < filtered.length && (
        <button class="more-btn library-more" type="button" onClick={() => setShown((n) => n + PAGE)}>
          {t.commentsMore}
        </button>
      )}
    </div>
  );
}
