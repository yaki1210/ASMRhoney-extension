import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { fetchClip } from "../data/client";
import { nextPlaylistIndex, orderPlaylist, type PlayOrder } from "../data/decide";
import type { ClipDetail, ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { IconBack, IconComment } from "../icons";
import { coverSrc, displayCreator, displayTitle, formatDuration } from "../lib";
import { Player } from "../player/Player";

type Props = {
  title: string;
  items: ClipListItem[];
  order: PlayOrder;
  ready: boolean;
  lang: Lang;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  catalog: ClipListItem[];
  emptyLabel: string;
  onOrder: (order: PlayOrder) => void;
  onHome: () => void;
  onBack: () => void;
  onSearch: () => void;
  onTag: (tag: string) => void;
};

export function PlaylistView({
  title,
  items,
  order,
  ready,
  lang,
  counts,
  streamers,
  triggers,
  catalog,
  emptyLabel,
  onOrder,
  onHome,
  onBack,
  onSearch,
  onTag,
}: Props) {
  const t = copy(lang);
  const itemKey = items.map((item) => item.slug).join("\n");
  const stableItems = useMemo(() => items.slice(), [itemKey]);
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const slugRef = useRef<string | null>(null);
  const [index, setIndex] = useState(0);
  const queue = useMemo(() => orderPlaylist(stableItems, order, order === "shuffle" ? Math.random : () => 0), [stableItems, order, nonce]);
  const [detail, setDetail] = useState<ClipDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const current = queue[index];

  useEffect(() => {
    setStarted(false);
    slugRef.current = null;
    setIndex(0);
  }, [itemKey]);

  useEffect(() => {
    const slug = slugRef.current;
    if (!slug) return;
    const at = queue.findIndex((clip) => clip.slug === slug);
    setIndex(at < 0 ? 0 : at);
  }, [queue]);

  useEffect(() => {
    if (!started || !current) return;
    let cancel = false;
    setDetail(null);
    setDetailError(false);
    void fetchClip(current.slug).then(
      (next) => {
        if (!cancel) setDetail(next);
      },
      () => {
        if (!cancel) setDetailError(true);
      },
    );
    return () => {
      cancel = true;
    };
  }, [started, current?.slug, attempt]);

  const choose = (at: number) => {
    slugRef.current = queue[at]?.slug ?? null;
    setIndex(at);
    setStarted(true);
  };

  const pickOrder = (next: PlayOrder) => {
    if (next === "shuffle") setNonce((value) => value + 1);
    if (current) slugRef.current = current.slug;
    onOrder(next);
  };

  const orders: { id: PlayOrder; label: string }[] = [
    { id: "asc", label: t.orderAsc },
    { id: "desc", label: t.orderDesc },
    { id: "shuffle", label: t.orderShuffle },
  ];

  if (!ready) {
    return (
      <div class="page">
        <p class="rail-empty">{t.loading}</p>
      </div>
    );
  }

  return (
    <div class="page playlist-page">
      <button
        class={`ghost play-comments ${commentsOpen ? "is-on" : ""}`}
        type="button"
        onClick={() => {
          if (!started) choose(index || 0);
          setCommentsOpen((open) => !open);
        }}
        title={t.comments}
        aria-pressed={commentsOpen}
      >
        <IconComment />
        <span class="play-comments-label">{t.comments}</span>
        {commentCount > 0 && <strong>{commentCount}</strong>}
      </button>
      <div class="playlist-head">
        <h1 class="library-heading">{title}</h1>
        <div class="sort-row" role="tablist">
          {orders.map((item) => (
            <button key={item.id} class={order === item.id ? "is-on" : ""} type="button" onClick={() => pickOrder(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {!queue.length ? (
        <p class="rail-empty">{emptyLabel}</p>
      ) : (
        <div class={`playlist ${commentsOpen ? "is-comments" : ""}`}>
          <div class="playlist-stage">
            <button class="player-back" type="button" onClick={onBack} title={t.back} aria-label={t.back} data-player-back="1">
              <IconBack />
            </button>
            {!started || !current ? (
              <button class="playlist-poster" type="button" onClick={() => choose(index || 0)}>
                {coverSrc(queue[index] || queue[0]) ? <img src={coverSrc(queue[index] || queue[0])} alt="" /> : null}
                <span>{t.play}</span>
              </button>
            ) : detailError ? (
              <div class="placeholder">
                <p>{t.failed}</p>
                <button class="gold-btn" type="button" onClick={() => setAttempt((n) => n + 1)}>
                  {t.retry}
                </button>
              </div>
            ) : !detail ? (
              <p class="rail-empty">{t.loading}</p>
            ) : (
              <Player
                key={detail.slug}
                embed
                autoplay
                clip={detail}
                catalog={catalog}
                streamers={streamers}
                triggers={triggers}
                counts={counts}
                lang={lang}
                onOpen={(slug) => {
                  const at = queue.findIndex((clip) => clip.slug === slug);
                  if (at >= 0) choose(at);
                }}
                onHome={onHome}
                onBack={onBack}
                onSearch={onSearch}
                onTag={onTag}
                commentsOpen={commentsOpen}
                onCommentsOpenChange={setCommentsOpen}
                onCommentCount={setCommentCount}
                onEnded={() => {
                  const next = nextPlaylistIndex(index, queue.length);
                  if (next == null) return;
                  choose(next);
                }}
              />
            )}
          </div>
          <ol class="playlist-list">
            {queue.map((clip, i) => (
              <li key={clip.slug}>
                <button class={`playlist-item ${i === index && started ? "is-on" : ""}`} type="button" onClick={() => choose(i)}>
                  <em>{i + 1}</em>
                  {coverSrc(clip) ? <img src={coverSrc(clip)} alt="" /> : <span class="search-fallback" />}
                  <span>
                    <b>{displayTitle(clip, lang)}</b>
                    <i>
                      {displayCreator(clip.creator, streamers)} · {formatDuration(clip.duration)}
                      {i === index && started ? ` · ${t.playlistNow}` : ""}
                    </i>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
