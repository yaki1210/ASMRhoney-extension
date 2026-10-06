import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { albumTracks, looseTracks, creatorsInGroup, type AudioGroup } from "../data/audio";
import { nextPlaylistIndex } from "../data/decide";
import type { AudioAlbum, AudioTrack, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { IconBack, IconMoon, IconMute, IconPause, IconPlay, IconSkipBack, IconSkipFwd, IconVolume } from "../icons";
import { creatorCover, displayCreator, fill, formatDuration } from "../lib";

type View = { kind: "audio" } | { kind: "audio-album"; slug: string } | { kind: "audio-creator"; slug: string };

type Props = {
  view: View;
  albums: AudioAlbum[];
  tracks: AudioTrack[];
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpenCreator: (slug: string) => void;
  onOpenAlbum: (slug: string) => void;
  onBack: () => void;
  ready: boolean;
};

function trackTitle(track: AudioTrack, lang: Lang) {
  return lang === "en" && track.title_en ? track.title_en : track.title;
}

function albumTitle(album: AudioAlbum, lang: Lang) {
  return lang === "en" && album.title_en ? album.title_en : album.title;
}

function sameQueue(a: AudioTrack[], b: AudioTrack[]) {
  return a.length === b.length && a.every((track, index) => track.slug === b[index]?.slug);
}

function totalDuration(list: AudioTrack[]) {
  return list.reduce((sum, track) => sum + (track.duration || 0), 0);
}

const SLEEP_MINUTES = [15, 30, 60];

export function AudioPage({ view, albums, tracks, streamers, lang, onOpenCreator, onOpenAlbum, onBack, ready }: Props) {
  const t = copy(lang);
  const [group, setGroup] = useState<AudioGroup>("zh");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [sleepUntil, setSleepUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);
  const sleepTimer = useRef(0);
  const started = useRef<string | null>(null);
  const q = query.trim().toLowerCase();
  const creators = useMemo(() => creatorsInGroup(tracks, streamers, group), [tracks, streamers, group]);
  const current = queue[index];

  const begin = (list: AudioTrack[], at: number) => {
    const track = list[at];
    const node = audioRef.current;
    if (!track || !node) return;
    const same = sameQueue(queue, list) && index === at;
    if (same) {
      if (node.paused) void node.play().catch(() => undefined);
      else node.pause();
      return;
    }
    setQueue(list);
    setIndex(at);
    setTime(0);
    started.current = track.slug;
    if (node.src !== track.audioUrl) node.src = track.audioUrl;
    void node.play().catch(() => undefined);
  };

  useEffect(() => {
    const node = audioRef.current;
    const track = queue[index];
    if (!node || !track || started.current === track.slug) return;
    started.current = track.slug;
    setTime(0);
    node.src = track.audioUrl;
    void node.play().catch(() => undefined);
  }, [queue, index]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;
    node.volume = volume;
    node.muted = muted || volume === 0;
  }, [volume, muted]);

  useEffect(() => {
    window.clearTimeout(sleepTimer.current);
    if (!sleepUntil) return;
    const tick = () => {
      const at = Date.now();
      if (at >= sleepUntil) {
        audioRef.current?.pause();
        setSleepUntil(null);
        return;
      }
      setNow(at);
      sleepTimer.current = window.setTimeout(tick, 1000);
    };
    tick();
    return () => window.clearTimeout(sleepTimer.current);
  }, [sleepUntil]);

  const creatorCards = creators.filter((slug) => {
    if (!q) return true;
    const name = displayCreator(slug, streamers).toLowerCase();
    const titles = tracks
      .filter((track) => track.creator === slug)
      .map((track) => track.title)
      .join(" ")
      .toLowerCase();
    return slug.includes(q) || name.includes(q) || titles.includes(q);
  });

  let body = null;
  if (!ready && view.kind !== "audio") {
    body = <p class="rail-empty">{t.loading}</p>;
  } else if (view.kind === "audio") {
    body = (
      <>
        <section class="hero-block">
          <h1 class="home-title">{t.audioTitle}</h1>
          <input
            class="audio-search"
            type="search"
            value={query}
            placeholder={t.audioSearch}
            onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
          />
        </section>
        <div class="cat-row" role="tablist">
          <button class={`tag ${group === "zh" ? "is-on" : ""}`} type="button" onClick={() => setGroup("zh")}>
            {t.audioZh}
          </button>
          <button class={`tag ${group === "ja" ? "is-on" : ""}`} type="button" onClick={() => setGroup("ja")}>
            {t.audioJa}
          </button>
        </div>
        {!ready ? (
          <p class="rail-empty">{t.loading}</p>
        ) : creatorCards.length ? (
          <div class="audio-creator-grid">
            {creatorCards.map((slug) => {
              const mine = tracks.filter((track) => track.creator === slug);
              const cover = mine[0]?.coverUrl || streamers.get(slug)?.coverUrl || "";
              return (
                <button key={slug} class="audio-creator-card" type="button" onClick={() => onOpenCreator(slug)}>
                  {cover ? <img src={cover} alt="" /> : <span class="search-fallback" />}
                  <span>
                    <b>{displayCreator(slug, streamers)}</b>
                    <i>
                      {fill(t.audioTrackCount, mine.length)} · {formatDuration(totalDuration(mine))}
                    </i>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p class="rail-empty">{t.audioEmpty}</p>
        )}
      </>
    );
  } else if (view.kind === "audio-album") {
    const album = albums.find((item) => item.slug === view.slug);
    const list = albumTracks(tracks, view.slug);
    const cover = album?.coverUrl || list[0]?.coverUrl || "";
    body = (
      <>
        <p class="audio-crumb">
          <button type="button" onClick={onBack}>
            <IconBack />
            {t.audio}
          </button>
          {album && (
            <button type="button" onClick={() => onOpenCreator(album.creator)}>
              {displayCreator(album.creator, streamers)}
            </button>
          )}
        </p>
        <Stage
          cover={cover}
          kicker={t.audioAlbums}
          title={album ? albumTitle(album, lang) : view.slug}
          meta={`${fill(t.audioTrackCount, list.length)} · ${formatDuration(album?.totalDuration || totalDuration(list))}`}
          by={album ? displayCreator(album.creator, streamers) : ""}
          onBy={album ? () => onOpenCreator(album.creator) : undefined}
          playLabel={t.playAll}
          onPlay={list.length ? () => begin(list, 0) : undefined}
        />
        <h2>{t.audioTracks}</h2>
        <TrackList tracks={list} lang={lang} current={current?.slug} onPlay={(at) => begin(list, at)} />
      </>
    );
  } else {
    const slug = view.slug;
    const person = streamers.get(slug);
    const mineAlbums = albums.filter((album) => album.creator === slug);
    const loose = looseTracks(tracks, slug);
    const queued = [
      ...mineAlbums.flatMap((album) => albumTracks(tracks, album.slug)),
      ...loose,
    ];
    const cover = person ? creatorCover(person) : loose[0]?.coverUrl || mineAlbums[0]?.coverUrl || "";
    body = (
      <>
        <p class="audio-crumb">
          <button type="button" onClick={onBack}>
            <IconBack />
            {t.audio}
          </button>
        </p>
        <Stage
          cover={cover}
          kicker={t.audio}
          title={displayCreator(slug, streamers)}
          meta={`${fill(t.audioTrackCount, queued.length)} · ${formatDuration(totalDuration(queued))}`}
          playLabel={t.playAll}
          onPlay={queued.length ? () => begin(queued, 0) : undefined}
        />
        {mineAlbums.length > 0 && (
          <>
            <h2>{t.audioAlbums}</h2>
            <div class="audio-album-grid">
              {mineAlbums.map((album) => {
                const list = albumTracks(tracks, album.slug);
                const on = list.some((track) => track.slug === current?.slug);
                return (
                  <button key={album.slug} class={`audio-album-card ${on ? "is-on" : ""}`} type="button" onClick={() => onOpenAlbum(album.slug)}>
                    {album.coverUrl ? <img src={album.coverUrl} alt="" /> : <span class="search-fallback" />}
                    <b>{albumTitle(album, lang)}</b>
                    <i>
                      {fill(t.audioTrackCount, album.trackCount || list.length)} · {formatDuration(album.totalDuration || totalDuration(list))}
                    </i>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {loose.length > 0 && (
          <>
            <h2>{t.audioLoose}</h2>
            <TrackList tracks={loose} lang={lang} current={current?.slug} onPlay={(at) => begin(loose, at)} />
          </>
        )}
        {!mineAlbums.length && !loose.length && <p class="rail-empty">{t.audioEmpty}</p>}
      </>
    );
  }

  return (
    <div class="page audio-page">
      {body}
      <audio
        ref={audioRef}
        class="audio-el"
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime((event.target as HTMLAudioElement).currentTime || 0)}
        onLoadedMetadata={(event) => setDur((event.target as HTMLAudioElement).duration || 0)}
        onEnded={() => {
          const next = nextPlaylistIndex(index, queue.length);
          if (next == null) return;
          setIndex(next);
        }}
      />
      {current && (
        <AudioDock
          track={current}
          lang={lang}
          streamers={streamers}
          playing={playing}
          time={time}
          duration={dur || current.duration || 0}
          volume={volume}
          muted={muted}
          onToggle={() => begin(queue, index)}
          onPrev={() => index > 0 && setIndex(index - 1)}
          onNext={() => {
            const next = nextPlaylistIndex(index, queue.length);
            if (next != null) setIndex(next);
          }}
          onSeek={(ratio) => {
            const node = audioRef.current;
            if (!node || !Number.isFinite(node.duration)) return;
            node.currentTime = ratio * node.duration;
            setTime(node.currentTime);
          }}
          onVolume={(value) => {
            setVolume(value);
            setMuted(value === 0);
          }}
          onMute={() => setMuted((value) => !value)}
          sleepLeft={sleepUntil ? Math.max(0, Math.ceil((sleepUntil - now) / 1000)) : null}
          onSleep={(minutes) => setSleepUntil(minutes ? Date.now() + minutes * 60_000 : null)}
          labels={t}
        />
      )}
    </div>
  );
}

function Stage({
  cover,
  kicker,
  title,
  meta,
  by,
  onBy,
  playLabel,
  onPlay,
}: {
  cover: string;
  kicker: string;
  title: string;
  meta: string;
  by?: string;
  onBy?: () => void;
  playLabel: string;
  onPlay?: () => void;
}) {
  return (
    <section class="audio-stage">
      {cover ? <img src={cover} alt="" /> : <span class="search-fallback" />}
      <div>
        <p class="kicker">{kicker}</p>
        <h1>{title}</h1>
        {by && onBy ? (
          <button class="audio-by" type="button" onClick={onBy}>
            {by}
          </button>
        ) : null}
        <p>{meta}</p>
        {onPlay && (
          <button class="gold-btn" type="button" onClick={onPlay}>
            <IconPlay />
            {playLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function TrackList({
  tracks,
  lang,
  current,
  onPlay,
}: {
  tracks: AudioTrack[];
  lang: Lang;
  current?: string;
  onPlay: (index: number) => void;
}) {
  const t = copy(lang);
  if (!tracks.length) return <p class="rail-empty">{t.audioEmpty}</p>;
  return (
    <ol class="audio-tracks">
      {tracks.map((track, index) => {
        const on = track.slug === current;
        const no = String(track.trackNo || index + 1).padStart(2, "0");
        return (
          <li key={track.slug}>
            <button class={`audio-track ${on ? "is-on" : ""}`} type="button" aria-current={on ? "true" : undefined} onClick={() => onPlay(index)}>
              <em>{on ? <IconPlay /> : no}</em>
              <b>{trackTitle(track, lang)}</b>
              <i>{formatDuration(track.duration)}</i>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function AudioDock({
  track,
  lang,
  streamers,
  playing,
  time,
  duration,
  volume,
  muted,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onMute,
  sleepLeft,
  onSleep,
  labels,
}: {
  track: AudioTrack;
  lang: Lang;
  streamers: Map<string, Creator>;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  muted: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (ratio: number) => void;
  onVolume: (value: number) => void;
  onMute: () => void;
  sleepLeft: number | null;
  onSleep: (minutes: number | null) => void;
  labels: ReturnType<typeof copy>;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
  const ratio = duration ? Math.min(1, time / duration) : 0;
  const seekFrom = (event: PointerEvent) => {
    const node = bar.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    onSeek(rect.width ? x / rect.width : 0);
  };
  return (
    <div class="audio-dock">
      {track.coverUrl ? <img class="audio-dock-art" src={track.coverUrl} alt="" /> : <span class="audio-dock-art search-fallback" />}
      <div class="audio-dock-copy">
        <b>{trackTitle(track, lang)}</b>
        <i>{displayCreator(track.creator, streamers)}</i>
      </div>
      <div class="audio-dock-bar">
        <div class="audio-transport">
          <button class="icon-btn" type="button" title={labels.audioPrev} onClick={onPrev}>
            <IconSkipBack />
          </button>
          <button class="audio-play" type="button" title={playing ? labels.pause : labels.play} onClick={onToggle}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button class="icon-btn" type="button" title={labels.audioNext} onClick={onNext}>
            <IconSkipFwd />
          </button>
        </div>
        <div
          class="audio-seek"
          ref={bar}
          onPointerDown={(event) => {
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            seekFrom(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return;
            seekFrom(event);
          }}
        >
          <span class="audio-seek-track" />
          <span class="audio-seek-played" style={{ width: `${ratio * 100}%` }} />
          <span class="audio-seek-thumb" style={{ left: `${ratio * 100}%` }} />
        </div>
        <span class="time">
          {formatDuration(time)}
          <i>/</i>
          {formatDuration(duration)}
        </span>
        <div class="audio-volume-wrap">
          <div class={`menu-wrap ${sleepOpen ? "is-open" : ""}`}>
            <button
              class={`icon-btn ${sleepLeft != null ? "is-active" : ""}`}
              type="button"
              title={labels.sleep}
              aria-expanded={sleepOpen}
              onClick={() => setSleepOpen((open) => !open)}
            >
              <IconMoon />
            </button>
            {sleepOpen && (
              <div class="popover">
                <button
                  type="button"
                  onClick={() => {
                    onSleep(null);
                    setSleepOpen(false);
                  }}
                >
                  {labels.sleepOff}
                </button>
                {SLEEP_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => {
                      onSleep(minutes);
                      setSleepOpen(false);
                    }}
                  >
                    {fill(labels.sleepMinutes, minutes)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {sleepLeft != null && <span class="audio-sleep-left">{formatDuration(sleepLeft)}</span>}
          <button class="icon-btn" type="button" title={muted ? labels.unmute : labels.mute} onClick={onMute}>
            {muted || volume === 0 ? <IconMute /> : <IconVolume />}
          </button>
          <input
            class="audio-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            aria-label={labels.mute}
            onInput={(event) => onVolume(Number((event.target as HTMLInputElement).value))}
          />
        </div>
      </div>
    </div>
  );
}
