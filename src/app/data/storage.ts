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
