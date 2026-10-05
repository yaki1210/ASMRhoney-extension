import { useMemo, useState } from "preact/hooks";
import { sortClips } from "../data/filters";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { ClipGrid } from "./ClipGrid";

const PAGE = 48;

type Props = {
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function Home({ catalog, counts, streamers, lang, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const [shown, setShown] = useState(PAGE);
  const newest = useMemo(() => sortClips(catalog, "new", counts), [catalog, counts]);
  const visible = newest.slice(0, shown);

  return (
    <div class="page">
      {catalog.length ? (
        <>
          <ClipGrid clips={visible} counts={counts} streamers={streamers} lang={lang} onOpen={onOpen} onOpenCreator={onOpenCreator} />
          {shown < newest.length && (
            <button class="more-btn library-more" type="button" onClick={() => setShown((n) => n + PAGE)}>
              {t.commentsMore}
            </button>
          )}
        </>
      ) : (
        <p class="rail-empty">{t.loading}</p>
      )}
    </div>
  );
}
