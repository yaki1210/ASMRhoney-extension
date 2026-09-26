import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import {
  bootstrapClip,
  clipPath,
  fetchCatalog,
  fetchClip,
  fetchPlayCounts,
  fetchStreamers,
  fetchTriggers,
  isEnglishPath,
  parseClipSlug,
} from "./data/client";
import type { ClipDetail, ClipListItem, Creator, Lang, Trigger } from "./data/types";
import { copy } from "./i18n";
import { LogoMark } from "./icons";
import { Player } from "./player/Player";

type Route = { kind: "clip"; slug: string } | { kind: "other" };

function readRoute(): Route {
  const slug = parseClipSlug(location.pathname);
  return slug ? { kind: "clip", slug } : { kind: "other" };
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [lang] = useState<Lang>(isEnglishPath(location.pathname) ? "en" : "zh");
  const [clip, setClip] = useState<ClipDetail | null>(() => {
    const boot = bootstrapClip();
    const slug = parseClipSlug(location.pathname);
    return boot && slug && boot.slug === slug ? boot : null;
  });
  const [catalog, setCatalog] = useState<ClipListItem[]>([]);
  const [streamers, setStreamers] = useState<Creator[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = copy(lang);
  const streamerMap = useMemo(() => new Map(streamers.map((s) => [s.slug, s])), [streamers]);
  const triggerMap = useMemo(() => new Map(triggers.map((x) => [x.slug, x])), [triggers]);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    void Promise.all([fetchCatalog(4), fetchStreamers(), fetchTriggers(), fetchPlayCounts()]).then(
      ([clips, people, tags, play]) => {
        setCatalog(clips);
        setStreamers(people);
        setTriggers(tags);
        setCounts(play);
      },
    );
  }, []);

  const openClip = useCallback(
    (slug: string, replace = false) => {
      const url = clipPath(slug, lang === "en");
      if (replace) history.replaceState({ slug }, "", url);
      else history.pushState({ slug }, "", url);
      setRoute({ kind: "clip", slug });
    },
    [lang],
  );

  useEffect(() => {
    if (route.kind === "other" && catalog[0]) openClip(catalog[0].slug, true);
  }, [route, catalog, openClip]);

  useEffect(() => {
    if (route.kind !== "clip") return;
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

  const openLatest = () => {
    const latest = catalog[0];
    if (latest) openClip(latest.slug, true);
  };

  if (route.kind === "other") {
    return (
      <div class="placeholder">
        <LogoMark />
        <h1>ASMRHoney Theater</h1>
        <p>{t.emptyOther}</p>
        <button class="gold-btn" type="button" onClick={openLatest} disabled={!catalog[0]}>
          {t.openLatest}
        </button>
      </div>
    );
  }

  if ((loading && !clip) || error || !clip) {
    return (
      <div class="placeholder">
        <LogoMark />
        <h1>{error ? t.failed : t.loading}</h1>
        {error && route.kind === "clip" && (
          <button class="gold-btn" type="button" onClick={() => openClip(route.slug, true)}>
            {t.retry}
          </button>
        )}
      </div>
    );
  }

  return (
    <Player
      clip={clip}
      catalog={catalog}
      streamers={streamerMap}
      triggers={triggerMap}
      counts={counts}
      lang={lang}
      onOpen={(slug) => openClip(slug)}
    />
  );
}
