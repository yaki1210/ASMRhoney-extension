import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { followFeed } from "../data/follows";
import { displayPage } from "../data/paging";
import { followsDocument, importFollows, listFollows, subscribeFollows, type Follow } from "../data/storage";
import type { CatalogStatus, ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { creatorCover, displayCreator, fill } from "../lib";
import { ClipGrid } from "./ClipGrid";
import { FollowButton } from "./FollowButton";
import { GridLoading } from "./GridLoading";
import { Pager } from "./Pager";

type Props = {
  catalog: ClipListItem[];
  status: CatalogStatus;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function FollowingPage({ catalog, status, counts, streamers, lang, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Follow[]>(() => listFollows());
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => subscribeFollows(() => setItems(listFollows())), []);

  const feed = useMemo(() => followFeed(catalog, items), [catalog, items]);
  const slugs = items.map((item) => item.slug).join("\0");
  useEffect(() => setPage(1), [slugs]);
  const win = displayPage(feed, page);

  const onExport = () => {
    const doc = followsDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asmrhoney-follows-${doc.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const onFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      setNote(t.followImportBad);
      return;
    }
    const result = importFollows(text);
    if (!result.ok) {
      setNote(t.followImportBad);
      return;
    }
    const bits: string[] = [];
    if (result.added) bits.push(t.followAdded.replace("{n}", String(result.added)));
    if (result.skipped) bits.push(t.followSkipped.replace("{n}", String(result.skipped)));
    setNote(bits.join(lang === "en" ? ", " : "，") || t.followImportEmpty);
  };

  return (
    <div class="page">
      <section class="hero-block">
        <p class="kicker">{t.following}</p>
        <h1 class="home-title">{fill(t.creatorCount, items.length)}</h1>
        <p class="home-sub">{t.followHint}</p>
        <div class="fav-actions">
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
        {note && <p class="fav-status">{note}</p>}
      </section>
      {items.length === 0 ? (
        <p class="rail-empty">{t.followEmpty}</p>
      ) : (
        <>
          <div class="follow-people">
            {items.map((item) => {
              const person = streamers.get(item.slug);
              const src = person ? creatorCover(person) : "";
              const known = Boolean(person) || catalog.some((clip) => clip.creator === item.slug);
              return (
                <div key={item.slug} class="follow-person">
                  <button class="follow-open" type="button" onClick={() => onOpenCreator(item.slug)}>
                    <span class="creator-cover">{src ? <img src={src} alt="" /> : null}</span>
                    <b>{displayCreator(item.slug, streamers)}</b>
                    {known ? null : <i>{t.followMissing}</i>}
                  </button>
                  <FollowButton slug={item.slug} lang={lang} compact />
                </div>
              );
            })}
          </div>
          <h2 class="follow-heading">{t.followUpdates}</h2>
          {status === "ready" ? (
            <>
              <ClipGrid
                openMode="blank"
                clips={win.items}
                counts={counts}
                streamers={streamers}
                lang={lang}
                onOpen={onOpen}
                onOpenCreator={onOpenCreator}
              />
              <Pager page={win.uiPage} count={win.uiPageCount} lang={lang} onPage={setPage} />
              {!win.items.length && <p class="rail-empty">{t.noResults}</p>}
            </>
          ) : (
            <GridLoading status={status} lang={lang} />
          )}
        </>
      )}
    </div>
  );
}
