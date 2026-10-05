import { toPath } from "./routes";
import type { ClipDetail, ClipListItem, CommentsPage, Creator, Lang, Trigger } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-cache", headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

export function clipPath(slug: string, en = false) {
  return toPath({ kind: "clip", slug }, (en ? "en" : "zh") as Lang);
}

export function parseClipSlug(pathname: string): string | null {
  const m = pathname.match(/\/clip\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/?$/);
  return m?.[1] ?? null;
}

export { isEnglishPath, parseRoute, toPath } from "./routes";

export async function fetchClip(slug: string): Promise<ClipDetail> {
  const json = await getJson<{ clip?: ClipDetail } & ClipDetail>(
    `/data/clips/${encodeURIComponent(slug)}.json`,
  );
  return (json.clip ?? json) as ClipDetail;
}

export async function fetchListPage(page: number): Promise<ClipListItem[]> {
  const json = await getJson<{ clips: ClipListItem[] }>(`/data/clips-page-${page}.json`);
  return (json.clips || []).filter((c) => (c.status || "published") === "published");
}

export async function fetchStreamers(): Promise<Creator[]> {
  const json = await getJson<{ streamers: Creator[] }>("/data/streamers.json");
  return json.streamers || [];
}

export async function fetchTriggers(): Promise<Trigger[]> {
  const json = await getJson<{ triggers: Trigger[] }>("/data/triggers.json");
  return json.triggers || [];
}

export async function fetchPlayCounts(): Promise<Record<string, number>> {
  try {
    const json = await getJson<{ counts: Record<string, number> }>("/api/play-counts");
    return json.counts || {};
  } catch {
    return {};
  }
}

export async function fetchCatalog(pages = 3): Promise<ClipListItem[]> {
  const lists = await Promise.all(
    Array.from({ length: pages }, (_, i) => fetchListPage(i + 1).catch(() => [] as ClipListItem[])),
  );
  const seen = new Set<string>();
  const out: ClipListItem[] = [];
  for (const list of lists) {
    for (const clip of list) {
      if (seen.has(clip.slug)) continue;
      seen.add(clip.slug);
      out.push(clip);
    }
  }
  return out;
}

export async function fetchComments(slug: string, before?: number | null): Promise<CommentsPage> {
  const q = new URLSearchParams({ clip: slug });
  if (before) q.set("before", String(before));
  const json = await getJson<CommentsPage>(`/api/comments?${q.toString()}`);
  const comments = json.comments || [];
  const count = Number(json.count) || comments.length;
  commentCountCache.set(slug, count);
  return {
    comments,
    count,
    has_more: Boolean(json.has_more),
    next_before: json.next_before ?? null,
  };
}

const commentCountCache = new Map<string, number>();

export function cachedCommentCount(slug: string): number | undefined {
  return commentCountCache.get(slug);
}

export async function fetchCommentCount(slug: string): Promise<number> {
  const hit = commentCountCache.get(slug);
  if (hit != null) return hit;
  const page = await fetchComments(slug);
  return page.count;
}

let fullCatalogPromise: Promise<ClipListItem[]> | null = null;

export function ensureFullCatalog(): Promise<ClipListItem[]> {
  if (!fullCatalogPromise) {
    fullCatalogPromise = getJson<{ clips: ClipListItem[] }>("/data/clips-search.json")
      .then((json) => (json.clips || []).filter((c) => (c.status || "published") === "published"))
      .catch(() => [] as ClipListItem[]);
  }
  return fullCatalogPromise;
}

export function bootstrapClip(): ClipDetail | null {
  const expected = window.__ASMR_INITIAL_CLIP__;
  const clip = window.__ASMR_INITIAL_CLIP_DATA__;
  if (!expected || !clip || clip.slug !== expected) return null;
  if ((clip.status || "published") !== "published") return null;
  return clip;
}
