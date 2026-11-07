import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { isPublicClip } from "../data/filters";
import { followTimeline, type FollowUpdate } from "../data/follows";
import { displayPage } from "../data/paging";
import { toPath } from "../data/routes";
import { followsDocument, importFollows, listFollows, subscribeFollows, type Follow } from "../data/storage";
import type { AudioAlbum, AudioTrack, CatalogStatus, ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { creatorAvatar, creatorSpecialtyLabels, displayCreator, displayTitle, fill, formatCount, formatDate, formatDuration, coverSrc, triggerLabel } from "../lib";
import { FollowButton } from "./FollowButton";
import { GridLoading } from "./GridLoading";
import { Pager } from "./Pager";
import { IconViews } from "../icons";

type Props = {
  catalog: ClipListItem[];
  status: CatalogStatus;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  tracks: AudioTrack[];
  albums: AudioAlbum[];
  lang: Lang;
  onOpenCreator: (slug: string) => void;
  onOpenAudio: (track: AudioTrack) => void;
};

export function FollowingPage({
  catalog,
  status,
  counts,
  streamers,
  triggers,
  tracks,
  albums,
  lang,
  onOpenCreator,
  onOpenAudio,
}: Props) {
  const t = copy(lang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Follow[]>(() => listFollows());
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => subscribeFollows(() => setItems(listFollows())), []);

  const timeline = useMemo(() => followTimeline(catalog, tracks, items), [catalog, tracks, items]);
  const feed = useMemo(
    () => (active ? timeline.filter((item) => item.creator === active) : timeline),
    [timeline, active],
  );
  const latest = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of timeline) {
      const at = +new Date(item.publishedAt);
      if (!map.has(item.creator)) map.set(item.creator, Number.isFinite(at) ? at : 0);
    }
    return map;
  }, [timeline]);
  const people = useMemo(
    () =>
      [...items].sort(
        (a, b) => (latest.get(b.slug) || 0) - (latest.get(a.slug) || 0) || b.followedAt - a.followedAt,
      ),
    [items, latest],
  );
  const slugs = items.map((item) => item.slug).join("\0");
  useEffect(() => setPage(1), [slugs, active]);
  useEffect(() => {
    if (active && !items.some((item) => item.slug === active)) setActive(null);
  }, [items, active]);
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
    <div class="page follow-page">
      <div class="follow-bar">
        <span title={t.followHint}>{fill(t.creatorCount, items.length)}</span>
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
      </div>
      {note && <p class="fav-status">{note}</p>}
      {items.length === 0 ? (
        <p class="rail-empty">{t.followEmpty}</p>
      ) : (
        <div class="follow-split">
          <aside class="follow-side" aria-label={t.following}>
            {people.map((item) => {
              const person = streamers.get(item.slug);
              const avatar = person ? creatorAvatar(person) : "";
              const name = displayCreator(item.slug, streamers);
              const known = Boolean(person) || timeline.some((row) => row.creator === item.slug);
              const works = catalog.filter((clip) => clip.creator === item.slug && isPublicClip(clip)).length;
              const specialties = person ? creatorSpecialtyLabels(person, triggers, lang) : [];
              const bio = person?.bio?.trim() || "";
              return (
                <div key={item.slug} class={`follow-side-row ${active === item.slug ? "is-on" : ""}`}>
                  <button
                    class="follow-side-btn"
                    type="button"
                    aria-pressed={active === item.slug}
                    onClick={() => setActive((cur) => (cur === item.slug ? null : item.slug))}
                  >
                    <span class="follow-face">{avatar ? <img src={avatar} alt="" /> : name.slice(0, 1)}</span>
                    <span class="follow-side-copy">
                      <b>{name}</b>
                      {specialties.length > 0 && <span class="follow-side-spec">{specialties.join(" · ")}</span>}
                      {known ? (
                        status === "ready" ? (
                          <span class="follow-side-meta">
                            {works} {t.creatorWorks}
                          </span>
                        ) : null
                      ) : (
                        <span class="follow-side-meta">{t.followMissing}</span>
                      )}
                      {bio && <span class="follow-side-bio">{bio}</span>}
                    </span>
                  </button>
                  <FollowButton slug={item.slug} lang={lang} compact />
                </div>
              );
            })}
          </aside>
          <div class="follow-feed-col">
            {status === "ready" ? (
              <>
                <div class="follow-feed">
                  {win.items.map((item) => (
                    <FeedRow
                      key={`${item.kind}:${item.slug}`}
                      item={item}
                      albums={albums}
                      counts={counts}
                      streamers={streamers}
                      lang={lang}
                      triggers={triggers}
                      onOpenCreator={onOpenCreator}
                      onOpenAudio={onOpenAudio}
                    />
                  ))}
                </div>
                <Pager page={win.uiPage} count={win.uiPageCount} lang={lang} onPage={setPage} />
                {!win.items.length && <p class="rail-empty">{t.noResults}</p>}
              </>
            ) : (
              <GridLoading status={status} lang={lang} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function audioCover(track: AudioTrack, albums: AudioAlbum[], streamers: Map<string, Creator>) {
  if (track.coverUrl) return track.coverUrl;
  const album = track.albumSlug ? albums.find((item) => item.slug === track.albumSlug) : undefined;
  if (album?.coverUrl || album?.coverWebpUrl || album?.coverAvifUrl) {
    return album.coverAvifUrl || album.coverWebpUrl || album.coverUrl || "";
  }
  const person = streamers.get(track.creator);
  return person ? creatorAvatar(person) : "";
}

function FeedRow({
  item,
  albums,
  counts,
  streamers,
  lang,
  triggers,
  onOpenCreator,
  onOpenAudio,
}: {
  item: FollowUpdate;
  albums: AudioAlbum[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  triggers: Map<string, Trigger>;
  onOpenCreator: (slug: string) => void;
  onOpenAudio: (track: AudioTrack) => void;
}) {
  const video = item.kind === "video";
  const title = displayTitle(video ? item.clip : item.track, lang);
  const src = video ? coverSrc(item.clip) : audioCover(item.track, albums, streamers);
  const duration = video ? item.clip.duration : item.track.duration;
  const date = formatDate(item.publishedAt);
  const views = video ? counts[item.clip.slug] ?? item.clip.playCount ?? 0 : 0;
  const tags = video
    ? (item.clip.tags || []).flatMap((slug) => (triggers.has(slug) ? [{ slug, label: triggerLabel(slug, triggers, lang) }] : []))
    : [];
  const href = video ? toPath({ kind: "clip", slug: item.clip.slug }, lang) : "";
  const open = () => {
    if (video) window.open(href, "_blank", "noopener,noreferrer");
    else onOpenAudio(item.track);
  };
  const ignore = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button")) event.stopPropagation();
  };
  return (
    <article class="follow-entry" onClick={open}>
      {video ? (
        <a class="follow-thumb" href={href} target="_blank" rel="noopener noreferrer" onClick={ignore}>
          {src ? <img src={src} alt="" loading="lazy" /> : null}
          <em>{formatDuration(duration)}</em>
        </a>
      ) : (
        <button class="follow-thumb" type="button">
          {src ? <img src={src} alt="" loading="lazy" /> : null}
          <em>{formatDuration(duration)}</em>
        </button>
      )}
      <div class="follow-entry-copy">
        {video ? (
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={ignore}>
            <b>{title}</b>
          </a>
        ) : (
          <b>{title}</b>
        )}
        {tags.length > 0 && (
          <span class="creator-tags">
            {tags.map((tag) => (
              <span key={tag.slug}>{tag.label}</span>
            ))}
          </span>
        )}
        <button
          class="clip-creator"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenCreator(item.creator);
          }}
        >
          {displayCreator(item.creator, streamers)}
        </button>
        {(date || views > 0) && (
          <div class="follow-entry-meta">
            {date && <time dateTime={item.publishedAt}>{date}</time>}
            {views > 0 && (
              <span class="view-count">
                <IconViews />
                {formatCount(views)}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
