import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { AudioPage } from "./browse/AudioPage";
import { CreatorPage } from "./browse/CreatorPage";
import { CreatorsPage } from "./browse/CreatorsPage";
import { FavoritesPage } from "./browse/FavoritesPage";
import { GalleryPage } from "./browse/GalleryPage";
import { HistoryPage } from "./browse/HistoryPage";
import { Home } from "./browse/Home";
import { Library } from "./browse/Library";
import { PlaylistView } from "./browse/PlaylistView";
import { SearchPage } from "./browse/SearchPage";
import {
  bootstrapClip,
  ensureFullCatalog,
  fetchAudio,
  fetchCatalog,
  fetchClip,
  fetchPlayCounts,
  fetchStreamers,
  fetchTriggers,
} from "./data/client";
import { collectionCreator, collectionHead, collectionMembers, galleryUrls, hasListedMembers } from "./data/decide";
import { CATEGORIES, categoryTitle, libraryRouteForTag, parseRoute, toPath, type Route } from "./data/routes";
import { listFavorites } from "./data/storage";
import type { AudioAlbum, AudioTrack, ClipDetail, ClipListItem, Creator, Trigger } from "./data/types";
import { copy } from "./i18n";
import { displayCreator, displayTitle } from "./lib";
import { LogoMark } from "./icons";
import { SearchOverlay } from "./overlays/SearchOverlay";
import { Player } from "./player/Player";
import { Sidebar, type SideId } from "./shell/Sidebar";
import { Topbar } from "./shell/Topbar";

function read() {
  return parseRoute(location.pathname, location.search);
}

export function App() {
  const [{ lang, route }, setLoc] = useState(read);
  const [clip, setClip] = useState<ClipDetail | null>(() => {
    const boot = bootstrapClip();
    return boot && route.kind === "clip" && boot.slug === route.slug ? boot : null;
  });
  const [catalog, setCatalog] = useState<ClipListItem[]>([]);
  const [streamers, setStreamers] = useState<Creator[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(route.kind === "clip");
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogFull, setCatalogFull] = useState(false);
  const [audio, setAudio] = useState<{ albums: AudioAlbum[]; tracks: AudioTrack[] }>({ albums: [], tracks: [] });
  const [audioReady, setAudioReady] = useState(false);
  const audioLoaded = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 720px)").matches);
  const t = copy(lang);
  const streamerMap = useMemo(() => new Map(streamers.map((s) => [s.slug, s])), [streamers]);
  const triggerMap = useMemo(() => new Map(triggers.map((x) => [x.slug, x])), [triggers]);

  const go = useCallback(
    (next: Route, replace = false) => {
      const url = toPath(next, lang);
      if (replace) history.replaceState(next, "", url);
      else history.pushState(next, "", url);
      setLoc({ lang, route: next });
      setSearchOpen(false);
    },
    [lang],
  );

  useEffect(() => {
    const onPop = () => setLoc(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [route]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    void Promise.all([fetchCatalog(4), fetchStreamers(), fetchTriggers(), fetchPlayCounts()]).then(
      ([clips, people, tags, play]) => {
        setCatalog((cur) => (cur.length > clips.length ? cur : clips));
        setStreamers(people);
        setTriggers(tags);
        setCounts(play);
      },
    );
    void ensureFullCatalog().then((full) => {
      if (full.length) {
        full.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
        setCatalog((cur) => (cur.length > full.length ? cur : full));
      }
      setCatalogFull(true);
    });
  }, []);

  useEffect(() => {
    const want = route.kind === "audio" || route.kind === "audio-album" || route.kind === "audio-creator";
    if (!want || audioLoaded.current) return;
    audioLoaded.current = true;
    void fetchAudio()
      .then((next) => {
        setAudio(next);
        setAudioReady(true);
      })
      .catch(() => {
        audioLoaded.current = false;
        setAudioReady(true);
      });
  }, [route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !typing && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (route.kind !== "clip") return;
    if (collectionCreator(route.slug)) {
      go({ kind: "collection", slug: route.slug, order: "asc" }, true);
      return;
    }
    const known = catalog.find((item) => item.slug === route.slug);
    if (known?.kind === "collection") go({ kind: "collection", slug: route.slug, order: "asc" }, true);
  }, [route, catalog, go]);

  useEffect(() => {
    if (route.kind !== "clip") {
      setLoading(false);
      return;
    }
    if (collectionCreator(route.slug)) return;
    const known = catalog.find((item) => item.slug === route.slug);
    if (known?.kind === "collection") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchClip(route.slug)
      .then((detail) => {
        if (cancelled) return;
        setClip(detail);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route]);

  useEffect(() => {
    if (route.kind === "home") document.title = "ASMRHoney Theater";
    else if (route.kind === "creators") document.title = `${t.creators} · ASMRHoney`;
    else if (route.kind === "library") document.title = `${categoryTitle(route.id, lang)} · ASMRHoney`;
    else if (route.kind === "creator") document.title = `${displayCreator(route.slug, streamerMap)} · ASMRHoney`;
    else if (route.kind === "history") document.title = `${t.history} · ASMRHoney`;
    else if (route.kind === "favorites" || route.kind === "playlist") document.title = `${t.favorites} · ASMRHoney`;
    else if (route.kind === "search") document.title = `${route.q || t.searchClips} · ASMRHoney`;
    else if (route.kind === "collection") document.title = `${t.collection} · ASMRHoney`;
    else if (route.kind === "audio" || route.kind === "audio-album" || route.kind === "audio-creator") document.title = `${t.audioTitle} · ASMRHoney`;
  }, [route, lang, t.creators, t.history, t.favorites, t.searchClips, t.collection, t.audioTitle, streamerMap]);

  const openClip = (slug: string) => {
    if (collectionCreator(slug)) {
      go({ kind: "collection", slug, order: "asc" });
      return;
    }
    const item = catalog.find((clip) => clip.slug === slug);
    if (item?.kind === "collection") {
      go({ kind: "collection", slug, order: "asc" });
      return;
    }
    go({ kind: "clip", slug });
  };
  const openCreator = (slug: string) => go({ kind: "creator", slug });
  const openHome = () => go({ kind: "home" });
  const openTag = (tag: string) => go(libraryRouteForTag(tag));
  const openCategory = (id: string) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    go({ kind: "library", id, tags: cat?.tags || [] });
  };

  const closeSearch = () => setSearchOpen(false);

  const sideActive = (current: Route): SideId | null => {
    if (current.kind === "library") return "library";
    if (current.kind === "creators" || current.kind === "creator") return "creators";
    if (current.kind === "audio" || current.kind === "audio-album" || current.kind === "audio-creator") return "audio";
    if (current.kind === "history") return "history";
    if (current.kind === "favorites" || current.kind === "playlist") return "favorites";
    if (current.kind === "home") return "home";
    return null;
  };

  const toggleSide = () => {
    if (narrow) setNavOpen((open) => !open);
    else setSideCollapsed((collapsed) => !collapsed);
  };

  const browseChrome = (body: ComponentChildren) => (
    <div class={`shell is-browse ${navOpen ? "is-nav" : ""} ${!narrow && sideCollapsed ? "is-collapsed" : ""}`}>
      <Sidebar
        lang={lang}
        active={sideActive(route)}
        onHome={openHome}
        onLibrary={() => openCategory("asmr")}
        onCreators={() => go({ kind: "creators" })}
        onAudio={() => go({ kind: "audio" })}
        onHistory={() => go({ kind: "history" })}
        onFavorites={() => go({ kind: "favorites" })}
        onNavigate={() => setNavOpen(false)}
      />
      <button class="side-backdrop" type="button" aria-label={t.menu} onClick={() => setNavOpen(false)} />
      <Topbar
        lang={lang}
        onHome={openHome}
        onSearch={() => setSearchOpen(true)}
        onMenu={toggleSide}
        menuExpanded={narrow ? navOpen : !sideCollapsed}
        menuLabel={narrow ? t.menu : sideCollapsed ? t.navExpand : t.navCollapse}
      />
      {body}
    </div>
  );

  let page: ComponentChildren = null;

  if (route.kind === "clip") {
    if ((loading && !clip) || error || !clip) {
      page = (
        <div class="placeholder">
          <LogoMark />
          <h1>{error ? t.failed : t.loading}</h1>
          {error && (
            <button class="gold-btn" type="button" onClick={() => openClip(route.slug)}>
              {t.retry}
            </button>
          )}
        </div>
      );
    } else {
      page = (
        <Player
          clip={clip}
          catalog={catalog}
          streamers={streamerMap}
          triggers={triggerMap}
          counts={counts}
          lang={lang}
          onOpen={openClip}
          onHome={openHome}
          onSearch={() => setSearchOpen(true)}
          onTag={openTag}
        />
      );
    }
  } else if (route.kind === "creators") {
    page = browseChrome(
      <CreatorsPage people={streamers} catalog={catalog} lang={lang} onOpen={(slug) => go({ kind: "creator", slug })} />,
    );
  } else if (route.kind === "creator") {
    page = browseChrome(
      <CreatorPage
        slug={route.slug}
        catalog={catalog}
        counts={counts}
        streamers={streamerMap}
        lang={lang}
        onOpen={openClip}
        onOpenCreator={openCreator}
      />,
    );
  } else if (route.kind === "favorites") {
    page = browseChrome(
      <FavoritesPage
        catalog={catalog}
        counts={counts}
        streamers={streamerMap}
        lang={lang}
        onOpen={openClip}
        onOpenCreator={openCreator}
        onPlayAll={() => go({ kind: "playlist", order: "asc" })}
      />,
    );
  } else if (route.kind === "playlist") {
    const saved = listFavorites().flatMap((item) => {
      const clip = catalog.find((row) => row.slug === item.slug);
      if (!clip || clip.kind === "collection" || clip.collectionMedia === "images") return [];
      return [clip];
    });
    page = browseChrome(
      <PlaylistView
        title={t.favorites}
        items={saved}
        order={route.order}
        ready
        lang={lang}
        counts={counts}
        streamers={streamerMap}
        triggers={triggerMap}
        catalog={catalog}
        emptyLabel={t.favoritesEmpty}
        onOrder={(order) => go({ kind: "playlist", order }, true)}
        onHome={openHome}
        onSearch={() => setSearchOpen(true)}
        onTag={openTag}
      />,
    );
  } else if (route.kind === "search") {
    page = browseChrome(
      <SearchPage
        catalog={catalog}
        counts={counts}
        streamers={streamerMap}
        triggers={triggerMap}
        lang={lang}
        query={route.q}
        tags={route.tags}
        dur={route.dur}
        when={route.when}
        sort={route.sort}
        onChange={(next) => go({ kind: "search", q: next.q, tags: next.tags, dur: next.dur, when: next.when, sort: next.sort }, true)}
        onOpen={openClip}
        onOpenCreator={openCreator}
      />,
    );
  } else if (route.kind === "collection") {
    const head = collectionHead(catalog, route.slug);
    const ready = catalogFull || head?.collectionMedia === "images" || hasListedMembers(catalog, route.slug);
    const title = head ? displayTitle(head, lang) : route.slug;
    page = browseChrome(
      head?.collectionMedia === "images" ? (
        <GalleryPage title={title} urls={galleryUrls(head)} note={t.collectionImages} hint={t.galleryHint} />
      ) : (
        <PlaylistView
          title={title}
          items={collectionMembers(catalog, route.slug)}
          order={route.order}
          ready={ready}
          lang={lang}
          counts={counts}
          streamers={streamerMap}
          triggers={triggerMap}
          catalog={catalog}
          emptyLabel={t.collectionEmpty}
          onOrder={(order) => go({ kind: "collection", slug: route.slug, order }, true)}
          onHome={openHome}
          onSearch={() => setSearchOpen(true)}
          onTag={openTag}
        />
      ),
    );
  } else if (route.kind === "audio" || route.kind === "audio-album" || route.kind === "audio-creator") {
    page = browseChrome(
      <AudioPage
        view={route}
        albums={audio.albums}
        tracks={audio.tracks}
        streamers={streamerMap}
        lang={lang}
        onOpenCreator={(slug) => go({ kind: "audio-creator", slug })}
        onOpenAlbum={(slug) => go({ kind: "audio-album", slug })}
        onBack={() => go({ kind: "audio" })}
        ready={audioReady}
      />,
    );
  } else if (route.kind === "history") {
    page = browseChrome(
      <HistoryPage
        catalog={catalog}
        streamers={streamerMap}
        lang={lang}
        onOpen={openClip}
        onOpenCreator={openCreator}
      />,
    );
  } else if (route.kind === "library") {
    page = browseChrome(
      <div class="page">
        <div class="cat-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              class={`tag ${c.id === route.id ? "is-on" : ""}`}
              type="button"
              onClick={() => openCategory(c.id)}
            >
              {lang === "en" ? c.titleEn : c.titleZh}
            </button>
          ))}
        </div>
        <h1 class="library-heading">{categoryTitle(route.id, lang)}</h1>
        <Library
          key={`${route.id}:${route.tags.join("|")}`}
          catalog={catalog}
          counts={counts}
          streamers={streamerMap}
          triggers={triggerMap}
          lang={lang}
          presetTags={route.tags}
          onOpen={openClip}
          onOpenCreator={openCreator}
        />
      </div>,
    );
  } else if (route.kind === "other") {
    page = (
      <div class="placeholder">
        <LogoMark />
        <h1>ASMRHoney Theater</h1>
        <p>{t.emptyOther}</p>
        <button class="gold-btn" type="button" onClick={openHome}>
          {t.library}
        </button>
      </div>
    );
  } else {
    page = browseChrome(
      <Home
        catalog={catalog}
        counts={counts}
        streamers={streamerMap}
        lang={lang}
        region={route.region || "all"}
        onRegion={(region) => go({ kind: "home", region }, true)}
        onOpen={openClip}
        onOpenCreator={openCreator}
      />,
    );
  }

  return (
    <>
      {page}
      {searchOpen && (
        <SearchOverlay
          catalog={catalog}
          people={streamers}
          streamers={streamerMap}
          triggers={triggerMap}
          lang={lang}
          initialQuery={route.kind === "search" ? route.q : ""}
          onClose={closeSearch}
          onOpenClip={openClip}
          onOpenCreator={(slug) => go({ kind: "creator", slug })}
          onSearch={(query) => go({ kind: "search", q: query, tags: [], dur: "any", when: "any", sort: "new" })}
        />
      )}
    </>
  );
}
