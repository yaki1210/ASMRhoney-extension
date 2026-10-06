import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { albumTracks, creatorsInGroup, looseTracks, type AudioGroup } from "../data/audio";
import { nextPlaylistIndex } from "../data/decide";
import type { AudioAlbum, AudioTrack, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { displayCreator, formatDuration } from "../lib";

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

export function AudioPage({ view, albums, tracks, streamers, lang, onOpenCreator, onOpenAlbum, onBack, ready }: Props) {
  const t = copy(lang);
  const [group, setGroup] = useState<AudioGroup>("zh");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const q = query.trim().toLowerCase();
  const creators = useMemo(() => creatorsInGroup(tracks, streamers, group), [tracks, streamers, group]);
  const playing = queue[index];

  useEffect(() => {
    const node = audioRef.current;
    const track = queue[index];
    if (!node || !track) return;
    node.src = track.audioUrl;
    void node.play().catch(() => undefined);
  }, [queue, index]);

  const playList = (list: AudioTrack[], at: number) => {
    if (!list.length) return;
    setQueue(list);
    setIndex(Math.min(at, list.length - 1));
  };

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
  if (view.kind === "audio") {
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
              const total = mine.reduce((sum, track) => sum + (track.duration || 0), 0);
              const cover = mine[0]?.coverUrl || streamers.get(slug)?.coverUrl || "";
              return (
                <button key={slug} class="audio-creator-card" type="button" onClick={() => onOpenCreator(slug)}>
                  {cover ? <img src={cover} alt="" /> : <span class="search-fallback" />}
                  <span>
                    <b>{displayCreator(slug, streamers)}</b>
                    <i>
                      {mine.length} · {formatDuration(total)}
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
    body = (
      <>
        <button class="text-btn" type="button" onClick={onBack}>
          {t.back}
        </button>
        <h1 class="library-heading">{album ? albumTitle(album, lang) : view.slug}</h1>
        <TrackList tracks={list} lang={lang} streamers={streamers} current={playing?.slug} onPlay={(at) => playList(list, at)} />
      </>
    );
  } else {
    const slug = view.slug;
    const mineAlbums = albums.filter((album) => album.creator === slug);
    const loose = looseTracks(tracks, slug);
    body = (
      <>
        <button class="text-btn" type="button" onClick={onBack}>
          {t.back}
        </button>
        <h1 class="library-heading">{displayCreator(slug, streamers)}</h1>
        {mineAlbums.length > 0 && (
          <>
            <h2 class="history-section-title">{t.audioAlbums}</h2>
            <div class="audio-creator-grid">
              {mineAlbums.map((album) => (
                <button key={album.slug} class="audio-creator-card" type="button" onClick={() => onOpenAlbum(album.slug)}>
                  {album.coverUrl ? <img src={album.coverUrl} alt="" /> : <span class="search-fallback" />}
                  <span>
                    <b>{albumTitle(album, lang)}</b>
                    <i>
                      {album.trackCount || albumTracks(tracks, album.slug).length} · {formatDuration(album.totalDuration || 0)}
                    </i>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <h2 class="history-section-title">{t.audioLoose}</h2>
        <TrackList tracks={loose} lang={lang} streamers={streamers} current={playing?.slug} onPlay={(at) => playList(loose, at)} />
      </>
    );
  }

  return (
    <div class="page audio-page">
      {body}
      {playing && (
        <div class="audio-dock">
          {playing.coverUrl ? <img src={playing.coverUrl} alt="" /> : null}
          <div>
            <b>{trackTitle(playing, lang)}</b>
            <i>{displayCreator(playing.creator, streamers)}</i>
          </div>
          <audio
            ref={audioRef}
            controls
            onEnded={() => {
              const next = nextPlaylistIndex(index, queue.length);
              if (next == null) return;
              setIndex(next);
            }}
          />
        </div>
      )}
    </div>
  );
}

function TrackList({
  tracks,
  lang,
  streamers,
  current,
  onPlay,
}: {
  tracks: AudioTrack[];
  lang: Lang;
  streamers: Map<string, Creator>;
  current?: string;
  onPlay: (index: number) => void;
}) {
  const t = copy(lang);
  if (!tracks.length) return <p class="rail-empty">{t.audioEmpty}</p>;
  return (
    <ol class="playlist-list">
      {tracks.map((track, index) => (
        <li key={track.slug}>
          <button class={`playlist-item ${track.slug === current ? "is-on" : ""}`} type="button" onClick={() => onPlay(index)}>
            <em>{track.trackNo || index + 1}</em>
            {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span class="search-fallback" />}
            <span>
              <b>{trackTitle(track, lang)}</b>
              <i>
                {displayCreator(track.creator, streamers)} · {formatDuration(track.duration)}
              </i>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
