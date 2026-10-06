import { useMemo, useState } from "preact/hooks";
import { creatorDirectoryGroup, type CreatorLang } from "../data/decide";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { creatorCover, displayCreator, fill } from "../lib";

type Props = {
  people: Creator[];
  catalog: ClipListItem[];
  lang: Lang;
  onOpen: (slug: string) => void;
};

export function CreatorsPage({ people, catalog, lang, onOpen }: Props) {
  // Language tabs follow the original directory: creatorGroup zh, otherwise 非中文.
  const t = copy(lang);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<CreatorLang>("all");
  const groups: { id: CreatorLang; label: string }[] = [
    { id: "all", label: t.regionAll },
    { id: "zh", label: t.creatorZh },
    { id: "non-zh", label: t.creatorNonZh },
  ];
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const clip of catalog) map.set(clip.creator, (map.get(clip.creator) || 0) + 1);
    return map;
  }, [catalog]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = people.filter((p) => p.active !== false && (group === "all" || creatorDirectoryGroup(p) === group));
    const filtered = needle
      ? rows.filter((p) =>
          [p.slug, p.name, p.displayName, ...(p.aliases || [])].some((x) => x && x.toLowerCase().includes(needle)),
        )
      : rows;
    return filtered.sort((a, b) => (counts.get(b.slug) || 0) - (counts.get(a.slug) || 0));
  }, [people, q, counts, group]);

  return (
    <div class="page">
      <section class="hero-block">
        <p class="kicker">{t.creators}</p>
        <h1 class="home-title">{fill(t.creatorCount, list.length)}</h1>
        <div class="creator-tools">
          <input
            class="creator-filter"
            value={q}
            placeholder={t.searchCreators}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
          <div class="sort-row creator-lang" role="tablist" aria-label={t.creatorLang}>
            {groups.map((item) => (
              <button
                key={item.id}
                class={group === item.id ? "is-on" : ""}
                type="button"
                aria-pressed={group === item.id}
                onClick={() => setGroup(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div class="creator-grid">
        {list.map((person) => {
          const src = creatorCover(person);
          const n = counts.get(person.slug) || 0;
          return (
            <button key={person.slug} class="creator-card" type="button" onClick={() => onOpen(person.slug)}>
              <span class="creator-cover">{src ? <img src={src} alt="" loading="lazy" /> : null}</span>
              <span class="creator-copy">
                <b>{displayCreator(person.slug, new Map([[person.slug, person]]))}</b>
                <i>
                  {n} {t.creatorWorks}
                </i>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
