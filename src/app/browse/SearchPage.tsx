import { useMemo, useState } from "preact/hooks";
import { selectSearchResults } from "../data/decide";
import { TAG_GROUPS, type DurFilter, type SearchSort, type TagGroupId, type WhenFilter } from "../data/filters";
import type { ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { IconFilter } from "../icons";
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
  query: string;
  tags: string[];
  dur: DurFilter;
  when: WhenFilter;
  sort: SearchSort;
  onChange: (next: { q: string; tags: string[]; dur: DurFilter; when: WhenFilter; sort: SearchSort }) => void;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function SearchPage({
  catalog,
  counts,
  streamers,
  triggers,
  lang,
  query,
  tags,
  dur,
  when,
  sort,
  onChange,
  onOpen,
  onOpenCreator,
}: Props) {
  const t = copy(lang);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const results = useMemo(
    () => selectSearchResults(catalog, query, streamers, triggers, lang, { tags, dur, when, sort, counts }),
    [catalog, query, streamers, triggers, lang, tags, dur, when, sort, counts],
  );
  const active = tags.length + (dur === "any" ? 0 : 1) + (when === "any" ? 0 : 1);
  const durations: { id: DurFilter; label: string }[] = [
    { id: "any", label: t.durAny },
    { id: "short", label: t.durShort },
    { id: "mid", label: t.durMid },
    { id: "long", label: t.durLong },
    { id: "xl", label: t.durXl },
  ];
  const whens: { id: WhenFilter; label: string }[] = [
    { id: "any", label: t.whenAny },
    { id: "7d", label: t.when7 },
    { id: "30d", label: t.when30 },
    { id: "year", label: t.whenYear },
  ];
  const sorts: { id: SearchSort; label: string }[] = [
    { id: "new", label: t.sortUploaded },
    { id: "views", label: t.sortPlays },
    { id: "duration", label: t.sortDuration },
  ];

  const patch = (next: Partial<Pick<Props, "tags" | "dur" | "when" | "sort">>) => {
    setShown(PAGE);
    onChange({ q: query, tags, dur, when, sort, ...next });
  };

  const toggleTag = (slug: string) => {
    patch({ tags: tags.includes(slug) ? tags.filter((item) => item !== slug) : [...tags, slug] });
  };

  return (
    <div class="page">
      <div class="library-toolbar">
        <h1 class="library-heading">{query || t.searchClips}</h1>
        <p class="library-count">{fill(t.resultCount, results.length)}</p>
        <button class="filter-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <IconFilter />
          <span>{t.filter}</span>
          {active > 0 && <em class="filter-badge">{active}</em>}
        </button>
        <div class="sort-row" role="tablist">
          {sorts.map((item) => (
            <button key={item.id} class={sort === item.id ? "is-on" : ""} type="button" onClick={() => patch({ sort: item.id })}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div class="filter-panel">
          {TAG_GROUPS.map((group) => (
            <div class="filter-row" key={group.id}>
              <span class="filter-label">{t[GROUP_COPY[group.id]]}</span>
              <div class="filter-chips">
                {group.slugs.map((slug) => (
                  <button
                    key={slug}
                    class={`tag ${tags.includes(slug) ? "is-on" : ""} ${slug === "nsfw" ? "is-hot" : ""}`}
                    type="button"
                    onClick={() => toggleTag(slug)}
                  >
                    {triggerLabel(slug, triggers, lang)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div class="filter-row">
            <span class="filter-label">{t.filterDuration}</span>
            <div class="filter-chips">
              {durations.map((item) => (
                <button key={item.id} class={`tag ${dur === item.id ? "is-on" : ""}`} type="button" onClick={() => patch({ dur: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">{t.filterWhen}</span>
            <div class="filter-chips">
              {whens.map((item) => (
                <button key={item.id} class={`tag ${when === item.id ? "is-on" : ""}`} type="button" onClick={() => patch({ when: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {active > 0 && (
            <button class="text-btn" type="button" onClick={() => patch({ tags: [], dur: "any", when: "any" })}>
              {t.clearFilters}
            </button>
          )}
        </div>
      )}
      {results.length ? (
        <>
          <ClipGrid
            clips={results.slice(0, shown)}
            counts={counts}
            streamers={streamers}
            lang={lang}
            onOpen={onOpen}
            onOpenCreator={onOpenCreator}
          />
          {shown < results.length && (
            <button class="more-btn library-more" type="button" onClick={() => setShown((n) => n + PAGE)}>
              {t.commentsMore}
            </button>
          )}
        </>
      ) : (
        <p class="rail-empty">{catalog.length ? t.searchEmpty : t.loading}</p>
      )}
    </div>
  );
}
