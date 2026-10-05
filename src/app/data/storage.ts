const PROGRESS_PREFIX = "ahx.progress.";
const PREF_KEY = "ahx.prefs";

export type Progress = { t: number; dur: number; updatedAt: number };

export type Prefs = {
  volume: number;
  muted: boolean;
  rate: number;
  quality: "source" | "480";
  railOpen: boolean;
};

const defaultPrefs: Prefs = {
  volume: 1,
  muted: false,
  rate: 1,
  quality: "source",
  railOpen: true,
};

export function loadProgress(slug: string): Progress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + slug);
    if (!raw) return null;
    const p = JSON.parse(raw) as Progress;
    if (!Number.isFinite(p.t) || p.t < 5) return null;
    if (p.dur > 0 && p.t >= p.dur * 0.95) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProgress(slug: string, t: number, dur: number) {
  try {
    localStorage.setItem(
      PROGRESS_PREFIX + slug,
      JSON.stringify({ t, dur, updatedAt: Date.now() } satisfies Progress),
    );
  } catch {
    /* quota */
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

const SEARCH_KEY = "ahx.recentSearch";

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string) {
  const term = q.trim();
  if (!term) return;
  const next = [term, ...loadRecentSearches().filter((x) => x !== term)].slice(0, 8);
  try {
    localStorage.setItem(SEARCH_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export type RecentProgress = Progress & { slug: string };

export function isFinished(p: Pick<Progress, "t" | "dur">) {
  return p.dur > 0 && p.t >= p.dur * 0.95;
}

export function listWatchHistory(): RecentProgress[] {
  const out: RecentProgress[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PROGRESS_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const p = JSON.parse(raw) as Progress;
      if (!Number.isFinite(p.t) || !Number.isFinite(p.updatedAt)) continue;
      out.push({ slug: key.slice(PROGRESS_PREFIX.length), ...p });
    }
  } catch {
    return [];
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export function listRecentProgress(limit = 8): RecentProgress[] {
  return listWatchHistory().slice(0, limit);
}
