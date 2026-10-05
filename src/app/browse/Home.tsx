import { useMemo } from "preact/hooks";
import { CATEGORIES } from "../data/routes";
import { listRecentProgress } from "../data/storage";
import type { ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { displayTitle } from "../lib";
import { Library } from "./Library";

type Props = {
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
  onCategory: (id: string) => void;
};

export function Home({ catalog, counts, streamers, triggers, lang, onOpen, onOpenCreator, onCategory }: Props) {
  const t = copy(lang);
  const resume = useMemo(() => {
    const recent = listRecentProgress(1)[0];
    if (!recent) return null;
    return catalog.find((c) => c.slug === recent.slug) || null;
  }, [catalog]);

  return (
    <div class="page">
      <section class="hero-block">
        <p class="kicker">{t.homeKicker}</p>
        <h1 class="home-title">{t.homeLead}</h1>
        <p class="home-sub">{t.homeSub}</p>
        <div class="cat-row">
          {CATEGORIES.map((c) => (
            <button key={c.id} class="tag" type="button" onClick={() => onCategory(c.id)}>
              {lang === "en" ? c.titleEn : c.titleZh}
            </button>
          ))}
        </div>
      </section>

      {resume && (
        <button class="resume-row" type="button" onClick={() => onOpen(resume.slug)}>
          {t.continueWatch} · {displayTitle(resume, lang)}
        </button>
      )}

      {catalog.length ? (
        <Library
          catalog={catalog}
          counts={counts}
          streamers={streamers}
          triggers={triggers}
          lang={lang}
          onOpen={onOpen}
          onOpenCreator={onOpenCreator}
        />
      ) : (
        <p class="rail-empty">{t.loading}</p>
      )}
    </div>
  );
}
