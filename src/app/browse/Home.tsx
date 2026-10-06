import { useMemo, useState } from "preact/hooks";
import { clipInRegion, type LibraryRegion } from "../data/decide";
import { isPublicClip, sortClips } from "../data/filters";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { ClipGrid } from "./ClipGrid";

const PAGE = 48;

type Props = {
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  region: LibraryRegion;
  onRegion: (region: LibraryRegion) => void;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function Home({ catalog, counts, streamers, lang, region, onRegion, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const [shown, setShown] = useState(PAGE);
  const regions: { id: LibraryRegion; label: string }[] = [
    { id: "all", label: t.regionAll },
    { id: "zh", label: t.regionZh },
    { id: "jp-kr", label: t.regionJpKr },
    { id: "western", label: t.regionWestern },
  ];
  const newest = useMemo(
    () => sortClips(catalog.filter((clip) => isPublicClip(clip) && clipInRegion(clip, streamers, region)), "new", counts),
    [catalog, counts, streamers, region],
  );
  const visible = newest.slice(0, shown);

  return (
    <div class="page">
      <div class="cat-row" role="tablist" aria-label={t.regionAll}>
        {regions.map((item) => (
          <button key={item.id} class={`tag ${region === item.id ? "is-on" : ""}`} type="button" onClick={() => onRegion(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {catalog.length ? (
        <>
          <ClipGrid clips={visible} counts={counts} streamers={streamers} lang={lang} onOpen={onOpen} onOpenCreator={onOpenCreator} />
          {shown < newest.length && (
            <button class="more-btn library-more" type="button" onClick={() => setShown((n) => n + PAGE)}>
              {t.commentsMore}
            </button>
          )}
          {!visible.length && <p class="rail-empty">{t.noResults}</p>}
        </>
      ) : (
        <p class="rail-empty">{t.loading}</p>
      )}
    </div>
  );
}
