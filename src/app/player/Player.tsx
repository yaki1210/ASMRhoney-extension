import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { fetchComments } from "../data/client";
import type { ClipDetail, ClipListItem, Comment, Creator, DrawerLayer, Lang, Trigger } from "../data/types";
import { ClipGrid } from "../browse/ClipGrid";
import { CommentsPanel } from "../drawer/CommentsPanel";
import { CreatorPanel } from "../drawer/CreatorPanel";
import { copy } from "../i18n";
import {
  coverSrc,
  displayCreator,
  displayTitle,
  formatCount,
  formatDuration,
  relatedClips,
  triggerLabel,
} from "../lib";
import {
  IconBack,
  IconComment,
  IconDownload,
  IconFull,
  IconHeadphone,
  IconList,
  IconLoop,
  IconMoon,
  IconMute,
  IconPause,
  IconPip,
  IconPlay,
  IconViews,
  IconVolume,
} from "../icons";
import { Topbar } from "../shell/Topbar";
import { usePlayer } from "./usePlayer";

type Props = {
  clip: ClipDetail;
  catalog: ClipListItem[];
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  counts: Record<string, number>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onHome: () => void;
  onSearch: () => void;
  onTag: (tag: string) => void;
};

function sameLayer(a: DrawerLayer, b: DrawerLayer) {
  if (a.type !== b.type) return false;
  if (a.type === "creator" && b.type === "creator") return a.slug === b.slug;
  return true;
}

export function Player({ clip, catalog, streamers, triggers, counts, lang, onOpen, onHome, onSearch, onTag }: Props) {
  const t = copy(lang);
  const p = usePlayer(clip);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stack, setStack] = useState<DrawerLayer[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [commentCursor, setCommentCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const related = useMemo(() => relatedClips(clip, catalog).slice(0, 18), [clip, catalog]);
  const title = displayTitle(clip, lang);
  const creator = displayCreator(clip.creator, streamers);
  const views = counts[clip.slug] ?? clip.playCount ?? 0;
  const src = coverSrc(clip);
  const sleepLeft = p.sleepUntil ? Math.max(0, Math.ceil((p.sleepUntil - Date.now()) / 1000)) : 0;
  const current = stack[stack.length - 1];
  const railOpen = stack.length > 0;

  const push = useCallback((layer: DrawerLayer) => {
    setStack((s) => {
      const top = s[s.length - 1];
      if (top && sameLayer(top, layer)) return s;
      return [...s, layer];
    });
  }, []);

  const back = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  useEffect(() => {
    document.title = `${title} · ASMRHoney`;
  }, [title]);

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setCommentCursor(null);
    void fetchComments(clip.slug)
      .then((page) => {
        if (cancelled) return;
        setComments(page.comments);
        setCommentCount(page.count);
        setCommentCursor(page.has_more ? page.next_before : null);
      })
      .catch(() => {
        if (!cancelled) setCommentCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [clip.slug]);

  const loadMoreComments = () => {
    if (!commentCursor || loadingMore) return;
    setLoadingMore(true);
    void fetchComments(clip.slug, commentCursor)
      .then((page) => {
        setComments((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...page.comments.filter((c) => !seen.has(c.id))];
        });
        setCommentCount(page.count);
        setCommentCursor(page.has_more ? page.next_before : null);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  const seekFromEvent = (e: PointerEvent | MouseEvent) => {
    const el = barRef.current;
    if (!el || !p.duration) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    p.seek(x * p.duration);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => seekFromEvent(e);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, p.duration]);

  const playedPct = p.duration ? (p.currentTime / p.duration) * 100 : 0;
  const bufPct = p.duration ? (p.buffered / p.duration) * 100 : 0;
  const has480 = Boolean(clip.video480Url);
  const hasAudio = Boolean(clip.backgroundAudioUrl);

  const drawerTitle =
    current?.type === "comments"
      ? `${t.comments}${commentCount ? ` · ${commentCount}` : ""}`
      : current?.type === "creator"
        ? displayCreator(current.slug, streamers)
        : t.related;

  return (
    <div class={`shell ${railOpen ? "is-rail" : ""}`}>
      <Topbar lang={lang} onHome={onHome} onSearch={onSearch}>
        <button
          class={`comment-bubble ${current?.type === "comments" ? "is-on" : ""}`}
          type="button"
          onClick={() => push({ type: "comments" })}
          title={t.comments}
        >
          <IconComment />
          <strong>{commentCount}</strong>
        </button>
        <button
          class={`ghost ${current?.type === "related" ? "is-on" : ""}`}
          type="button"
          onClick={() => push({ type: "related" })}
          title={t.related}
        >
          <IconList />
        </button>
      </Topbar>

      <div class="workspace">
        <section class="theater">
          <div
            class={`frame ${p.showUi || !p.playing ? "is-ui" : ""} ${p.playing ? "" : "is-paused"} ${p.audioOnly ? "is-audio" : ""}`}
            onMouseMove={p.nudgeUi}
            onPointerDown={p.nudgeUi}
          >
            <video
              ref={p.videoRef}
              class="video"
              playsInline
              preload="metadata"
              poster={clip.coverUrl}
              onClick={(e) => {
                e.stopPropagation();
                p.toggle();
              }}
            />
            {p.audioOnly && src && <img class="audio-cover" src={src} alt="" />}

            {!p.playing && (
              <button
                class="big-play"
                type="button"
                onClick={p.play}
                aria-label={p.resumeAt && !p.started ? t.continueWatch : t.play}
              >
                <span class="big-play-orb">
                  <IconPlay />
                </span>
                {p.resumeAt && !p.started && (
                  <span class="resume-label">
                    {t.continueWatch} {formatDuration(p.resumeAt)}
                  </span>
                )}
              </button>
            )}

            <div class="hud" onClick={(e) => e.stopPropagation()}>
              <div class="hud-top">
                <button class="icon-btn" type="button" onClick={() => (history.length > 1 ? history.back() : onOpen(clip.slug))} title={t.back}>
                  <IconBack />
                </button>
                <div class="hud-title">
                  <b>{title}</b>
                  <button class="hud-creator" type="button" onClick={() => push({ type: "creator", slug: clip.creator })}>
                    {creator}
                  </button>
                </div>
              </div>

              <div class="hud-bottom">
                <div
                  ref={barRef}
                  class="seek"
                  onPointerDown={(e) => {
                    setDragging(true);
                    seekFromEvent(e);
                  }}
                >
                  <div class="seek-buf" style={{ width: `${bufPct}%` }} />
                  <div class="seek-played" style={{ width: `${playedPct}%` }} />
                  <div class="seek-thumb" style={{ left: `${playedPct}%` }} />
                </div>

                <div class="controls">
                  <div class="ctrl-left">
                    <button class="icon-btn" type="button" onClick={p.toggle} title={p.playing ? t.pause : t.play}>
                      {p.playing ? <IconPause /> : <IconPlay />}
                    </button>
                    <button class="chip-btn skip-btn" type="button" onClick={() => p.skip(-5)} title="-5s">
                      −5
                    </button>
                    <button class="chip-btn skip-btn" type="button" onClick={() => p.skip(5)} title="+5s">
                      +5
                    </button>
                    <span class="time">
                      {formatDuration(p.currentTime)} <i>/</i> {formatDuration(p.duration)}
                    </span>
                  </div>

                  <div class="ctrl-right">
                    <div class={`menu-wrap ${p.menu === "volume" ? "is-open" : ""}`}>
                      <button class="icon-btn" type="button" onClick={() => p.setMenu(p.menu === "volume" ? null : "volume")} title={p.muted ? t.unmute : t.mute}>
                        {p.muted || p.volume === 0 ? <IconMute /> : <IconVolume />}
                      </button>
                      {p.menu === "volume" && (
                        <div class="popover pop-volume">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={p.muted ? 0 : p.volume}
                            onInput={(e) => p.changeVolume(Number((e.target as HTMLInputElement).value))}
                          />
                        </div>
                      )}
                    </div>

                    <div class={`menu-wrap ${p.menu === "speed" ? "is-open" : ""}`}>
                      <button class="chip-btn" type="button" onClick={() => p.setMenu(p.menu === "speed" ? null : "speed")}>
                        {p.rate === 1 ? t.speed : `${p.rate}×`}
                      </button>
                      {p.menu === "speed" && (
                        <div class="popover">
                          {p.speeds.map((s) => (
                            <button key={s} class={s === p.rate ? "is-on" : ""} type="button" onClick={() => p.changeRate(s)}>
                              {s}×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {has480 && (
                      <div class={`menu-wrap ${p.menu === "quality" ? "is-open" : ""}`}>
                        <button class="chip-btn" type="button" onClick={() => p.setMenu(p.menu === "quality" ? null : "quality")}>
                          {p.quality === "480" ? t.quality480 : t.qualitySource}
                        </button>
                        {p.menu === "quality" && (
                          <div class="popover">
                            <button class={p.quality === "source" ? "is-on" : ""} type="button" onClick={() => p.changeQuality("source")}>
                              {t.qualitySource}
                            </button>
                            <button class={p.quality === "480" ? "is-on" : ""} type="button" onClick={() => p.changeQuality("480")}>
                              {t.quality480}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <button class={`icon-btn ${p.loop ? "is-active" : ""}`} type="button" onClick={p.toggleLoop} title={t.loop}>
                      <IconLoop />
                    </button>

                    <div class={`menu-wrap ${p.menu === "sleep" ? "is-open" : ""}`}>
                      <button class={`icon-btn ${p.sleepUntil ? "is-active" : ""}`} type="button" onClick={() => p.setMenu(p.menu === "sleep" ? null : "sleep")} title={t.sleep}>
                        <IconMoon />
                      </button>
                      {p.menu === "sleep" && (
                        <div class="popover">
                          <button type="button" onClick={() => p.setSleep(null)}>
                            {t.sleepOff}
                          </button>
                          {p.sleepMinutes.map((m) => (
                            <button key={m} type="button" onClick={() => p.setSleep(m)}>
                              {m} min
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {hasAudio && (
                      <button class={`icon-btn ${p.audioOnly ? "is-active" : ""}`} type="button" onClick={p.toggleAudioOnly} title={t.listen}>
                        <IconHeadphone />
                      </button>
                    )}

                    <a class="icon-btn" href={`/download/${encodeURIComponent(clip.slug)}/`} title={t.download}>
                      <IconDownload />
                    </a>
                    <button class="icon-btn" type="button" onClick={p.togglePip} title={t.pip}>
                      <IconPip />
                    </button>
                    <button class="icon-btn" type="button" onClick={p.toggleFullscreen} title={t.fullscreen}>
                      <IconFull />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="meta">
            <h1>{title}</h1>
            <div class="meta-row">
              <button class="creator" type="button" onClick={() => push({ type: "creator", slug: clip.creator })}>
                {creator}
              </button>
              {views > 0 && (
                <span class="stat view-count" title={t.views}>
                  <IconViews />
                  {formatCount(views)}
                </span>
              )}
              {p.sleepUntil && <span class="stat gold">{formatDuration(sleepLeft)} 后暂停</span>}
            </div>
            <div class="tags">
              {(clip.tags || []).map((tag) => (
                <button class={`tag ${tag === "nsfw" ? "is-hot" : ""}`} key={tag} type="button" onClick={() => onTag(tag)}>
                  {triggerLabel(tag, triggers, lang)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside class="rail">
          <div class="rail-head">
            <button class="ghost rail-back" type="button" onClick={back} title={t.back}>
              <IconBack />
            </button>
            <span class="rail-title">{drawerTitle}</span>
          </div>
          {current?.type === "comments" && (
            <CommentsPanel
              key={clip.slug}
              comments={comments}
              hasMore={commentCursor != null}
              loadingMore={loadingMore}
              lang={lang}
              onMore={loadMoreComments}
              onSeek={p.seek}
            />
          )}
          {current?.type === "related" && (
            <div class="rail-clips">
              <ClipGrid
                clips={related}
                currentSlug={clip.slug}
                counts={counts}
                streamers={streamers}
                lang={lang}
                onOpen={onOpen}
                onOpenCreator={(slug) => push({ type: "creator", slug })}
              />
            </div>
          )}
          {current?.type === "creator" && (
            <CreatorPanel
              slug={current.slug}
              catalog={catalog}
              currentSlug={clip.slug}
              counts={counts}
              streamers={streamers}
              lang={lang}
              onOpen={onOpen}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
