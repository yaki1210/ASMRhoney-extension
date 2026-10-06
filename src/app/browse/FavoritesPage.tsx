import { useMemo, useRef, useState } from "preact/hooks";
import {
  favoritesDocument,
  importFavorites,
  listFavorites,
  removeFavorite,
  type Favorite,
} from "../data/storage";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { ClipGrid } from "./ClipGrid";

type Props = {
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
  onPlayAll: () => void;
};

export function FavoritesPage({ catalog, counts, streamers, lang, onOpen, onOpenCreator, onPlayAll }: Props) {
  const t = copy(lang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Favorite[]>(() => listFavorites());
  const [status, setStatus] = useState("");
  const bySlug = useMemo(() => new Map(catalog.map((clip) => [clip.slug, clip])), [catalog]);
  const clips = items.flatMap((item) => {
    const clip = bySlug.get(item.slug);
    return clip ? [clip] : [];
  });
  const pending = catalog.length === 0;
  const missing = pending ? items : items.filter((item) => !bySlug.has(item.slug));

  const reload = () => setItems(listFavorites());

  const onExport = () => {
    const doc = favoritesDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asmrhoney-favorites-${doc.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      setStatus(t.favImportBad);
      return;
    }
    const result = importFavorites(text);
    if (!result.ok) {
      setStatus(t.favImportBad);
      return;
    }
    reload();
    const bits: string[] = [];
    if (result.added) bits.push(t.favAdded.replace("{n}", String(result.added)));
    if (result.skipped) bits.push(t.favSkipped.replace("{n}", String(result.skipped)));
    setStatus(bits.join(lang === "en" ? ", " : "，") || t.favImportEmpty);
  };

  const onRemove = (slug: string) => {
    removeFavorite(slug);
    reload();
  };

  return (
    <div class="page">
      <section class="hero-block">
        <h1 class="home-title">{t.favorites}</h1>
        <p class="home-sub">{t.favHint}</p>
        <div class="fav-actions">
          <button class="more-btn" type="button" onClick={onPlayAll} disabled={!clips.length}>
            {t.playAll}
          </button>
          <button class="more-btn" type="button" onClick={onExport} disabled={!items.length}>
            {t.favExport}
          </button>
          <button class="more-btn" type="button" onClick={() => fileRef.current?.click()}>
            {t.favImport}
          </button>
          <input
            ref={fileRef}
            class="file-hidden"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            onChange={onFile}
          />
        </div>
        {status && <p class="fav-status">{status}</p>}
      </section>
      {items.length === 0 ? (
        <p class="rail-empty">{t.favoritesEmpty}</p>
      ) : (
        <>
          {clips.length > 0 && (
            <ClipGrid
              clips={clips}
              counts={counts}
              streamers={streamers}
              lang={lang}
              onOpen={onOpen}
              onOpenCreator={onOpenCreator}
              onRemove={onRemove}
            />
          )}
          {missing.length > 0 && (
            <ul class="fav-missing">
              {missing.map((item) => (
                <li key={item.slug}>
                  <span>
                    <b>{item.slug}</b>
                    {pending ? null : <small>{t.favMissing}</small>}
                  </span>
                  <button class="more-btn" type="button" onClick={() => onRemove(item.slug)}>
                    {t.favoriteRemove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
