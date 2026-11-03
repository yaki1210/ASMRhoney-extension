import { useEffect, useMemo, useState } from "preact/hooks";
import { clipInRegion, type LibraryRegion } from "../data/decide";
import { isPublicClip, sortClips } from "../data/filters";
import type { CatalogStatus, ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { displayPage } from "../data/paging";
import { ClipGrid } from "./ClipGrid";
import { GridLoading } from "./GridLoading";
import { Pager } from "./Pager";

type Props = {
  catalog: ClipListItem[];
  status: CatalogStatus;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  region: LibraryRegion;
  onRegion: (region: LibraryRegion) => void;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function Home({ catalog, status, counts, streamers, lang, region, onRegion, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const [page, setPage] = useState(1);
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
  useEffect(() => setPage(1), [region]);
  // Fixed pages counted from the oldest clip; page 1 = newest (merged remainder), shown new→old.
  const win = displayPage(newest, page);
  const visible = win.items;

  return (
    <div class="page">
      <div class="cat-row" role="tablist" aria-label={t.regionAll}>
        {regions.map((item) => (
          <button key={item.id} class={`tag ${region === item.id ? "is-on" : ""}`} type="button" onClick={() => onRegion(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {status === "ready" ? (
        <>
          <ClipGrid clips={visible} counts={counts} streamers={streamers} lang={lang} onOpen={onOpen} onOpenCreator={onOpenCreator} />
          <Pager page={win.uiPage} count={win.uiPageCount} lang={lang} onPage={setPage} />
          {!visible.length && <p class="rail-empty">{t.noResults}</p>}
        </>
      ) : (
        <GridLoading status={status} lang={lang} />
      )}
    </div>
  );
}
