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

const FAV_KEY = "ahx.favorites";
const FAV_TYPE = "asmrhoney.favorites";
const FAV_VERSION = 1;
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export type Favorite = { slug: string; savedAt: number };

export type FavoritesFile = {
  type: typeof FAV_TYPE;
  version: typeof FAV_VERSION;
  exportedAt: string;
  items: Favorite[];
};

export type FavoriteImport =
  | { ok: true; added: number; skipped: number }
  | { ok: false };

function favoriteFrom(item: unknown, fallbackAt: number): Favorite | null {
  if (typeof item === "string") {
    return SLUG_RE.test(item) ? { slug: item, savedAt: fallbackAt } : null;
  }
  if (!item || typeof item !== "object") return null;
  const slug = (item as { slug?: unknown }).slug;
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) return null;
  const rawAt = (item as { savedAt?: unknown }).savedAt;
  let savedAt = fallbackAt;
  if (typeof rawAt === "number" && Number.isFinite(rawAt) && rawAt >= 0 && rawAt < 1e14) savedAt = rawAt;
  else if (typeof rawAt === "string") {
    const parsed = Date.parse(rawAt);
    if (Number.isFinite(parsed) && parsed >= 0) savedAt = parsed;
  }
  return { slug, savedAt };
}

function readFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: Favorite[] = [];
    const seen = new Set<string>();
    for (const item of data) {
      const fav = favoriteFrom(item, 0);
      if (!fav || seen.has(fav.slug)) continue;
      seen.add(fav.slug);
      out.push(fav);
    }
    out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  } catch {
    return [];
  }
}

function writeFavorites(items: Favorite[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function listFavorites(): Favorite[] {
  return readFavorites();
}

export function isFavorite(slug: string) {
  return readFavorites().some((item) => item.slug === slug);
}

export function toggleFavorite(slug: string) {
  const cur = readFavorites();
  const idx = cur.findIndex((item) => item.slug === slug);
  if (idx >= 0) {
    cur.splice(idx, 1);
    writeFavorites(cur);
    return false;
  }
  cur.unshift({ slug, savedAt: Date.now() });
  writeFavorites(cur);
  return true;
}

export function removeFavorite(slug: string) {
  writeFavorites(readFavorites().filter((item) => item.slug !== slug));
}

export function favoritesDocument(): FavoritesFile {
  return {
    type: FAV_TYPE,
    version: FAV_VERSION,
    exportedAt: new Date().toISOString(),
    items: readFavorites(),
  };
}

function rowsFromFile(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return null;
  const rec = data as { type?: unknown; version?: unknown; items?: unknown };
  if (rec.type !== FAV_TYPE || rec.version !== FAV_VERSION || !Array.isArray(rec.items)) return null;
  return rec.items;
}

export function importFavorites(text: string): FavoriteImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  const rows = rowsFromFile(data);
  if (!rows) return { ok: false };
  const incoming: Favorite[] = [];
  const seen = new Set<string>();
  rows.forEach((item, index) => {
    const fav = favoriteFrom(item, Date.now() - index);
    if (!fav || seen.has(fav.slug)) return;
    seen.add(fav.slug);
    incoming.push(fav);
  });
  if (rows.length > 0 && incoming.length === 0) return { ok: false };

  const local = readFavorites();
  const have = new Set(local.map((item) => item.slug));
  let added = 0;
  let skipped = 0;
  const next = [...local];
  for (const item of incoming) {
    if (have.has(item.slug)) {
      skipped += 1;
      continue;
    }
    have.add(item.slug);
    next.push(item);
    added += 1;
  }
  next.sort((a, b) => b.savedAt - a.savedAt);
  writeFavorites(next);
  return { ok: true, added, skipped };
}
