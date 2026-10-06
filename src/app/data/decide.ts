import { narrowClips, sortClips, type DurFilter, type SearchSort, type WhenFilter } from "./filters";
import { searchClips } from "./search";
import type { ClipListItem, Creator, Lang, Trigger } from "./types";

export type TapAction = "reveal" | "toggle";

export function videoTapAction(input: {
  coarse: boolean;
  playing: boolean;
  controlsVisible: boolean;
}): TapAction {
  if (!input.coarse) return "toggle";
  if (input.playing && !input.controlsVisible) return "reveal";
  return "toggle";
}

export type EnterResult = { type: "search"; q: string } | { type: "pick" };

export function enterAction(query: string, armed: boolean): EnterResult {
  const q = query.trim();
  if (!q || armed) return { type: "pick" };
  return { type: "search", q };
}

export type PlayOrder = "asc" | "desc" | "shuffle";

export function orderPlaylist<T>(items: readonly T[], order: PlayOrder, random: () => number = Math.random): T[] {
  const list = items.slice();
  if (order === "desc") {
    list.reverse();
    return list;
  }
  if (order === "shuffle") {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const swap = list[i];
      list[i] = list[j];
      list[j] = swap;
    }
  }
  return list;
}

export function nextPlaylistIndex(index: number, length: number): number | null {
  if (length <= 0 || index < 0 || index >= length) return null;
  const next = index + 1;
  return next < length ? next : null;
}

const COLLECTION_SUFFIX = /^(.*)-(collection|cpllection)$/i;

export function collectionCreator(slug: string): string | null {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  const creator = decoded.match(COLLECTION_SUFFIX)?.[1]?.trim() || "";
  return creator || null;
}

function decodePart(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function collectionFromPath(pathname: string): { slug: string; creator: string | null } | null {
  let path = pathname || "/";
  if (path === "/en" || path.startsWith("/en/")) path = path.slice(3) || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "collection") {
    const slug = decodePart(parts[1]);
    return { slug, creator: collectionCreator(slug) };
  }
  if (parts.length === 1 || (parts.length === 2 && parts[0] === "clip")) {
    const slug = decodePart(parts[parts.length - 1]);
    const creator = collectionCreator(slug);
    if (!creator) return null;
    return { slug, creator };
  }
  return null;
}

function collectionNames(slug: string) {
  return new Set([slug, slug.replace(/-cpllection$/i, "-collection")]);
}

export function collectionHead(catalog: readonly ClipListItem[], slug: string): ClipListItem | null {
  const names = collectionNames(slug);
  return (
    catalog.find((clip) => clip.kind === "collection" && names.has(clip.slug)) ||
    catalog.find((clip) => clip.kind === "collection" && !!clip.collectionSlug && names.has(clip.collectionSlug)) ||
    null
  );
}

export function hasListedMembers(catalog: readonly ClipListItem[], slug: string) {
  const names = collectionNames(slug);
  return catalog.some(
    (clip) => !!clip.collectionSlug && names.has(clip.collectionSlug) && !names.has(clip.slug) && clip.kind !== "collection",
  );
}

export function collectionMembers(catalog: readonly ClipListItem[], slug: string): ClipListItem[] {
  const creator = collectionCreator(slug);
  const names = collectionNames(slug);
  const listed = catalog.filter((clip) => {
    if (!clip.collectionSlug || !names.has(clip.collectionSlug)) return false;
    if (names.has(clip.slug) || clip.kind === "collection") return false;
    return true;
  });
  const source = listed.length
    ? listed
    : creator
      ? catalog.filter((clip) => clip.creator === creator && clip.kind !== "collection" && !collectionCreator(clip.slug))
      : [];
  return canonicalMembers(source);
}

function canonicalMembers(clips: ClipListItem[]) {
  const list = clips.slice();
  const ranked = list.some((clip) => Number.isFinite(clip.collectionOrder));
  if (ranked) {
    list.sort(
      (a, b) =>
        (a.collectionOrder ?? Number.MAX_SAFE_INTEGER) - (b.collectionOrder ?? Number.MAX_SAFE_INTEGER) ||
        +new Date(a.publishedAt) - +new Date(b.publishedAt) ||
        a.slug.localeCompare(b.slug),
    );
  } else {
    list.sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt) || a.slug.localeCompare(b.slug));
  }
  return list;
}

export function galleryUrls(head: ClipListItem): string[] {
  const covers = (head.collectionCovers || []).filter(Boolean);
  const count = head.collectionCount || covers.length;
  if (!count) return covers.length ? covers : head.coverUrl ? [head.coverUrl] : [];
  if (covers.length >= count) return covers;
  const sample = covers[0] || head.coverUrl || "";
  const match = sample.match(/^(.*?)(\d+)(\.[a-z0-9]+)(?:\?.*)?$/i);
  if (!match) return covers.length ? covers : sample ? [sample] : [];
  const urls: string[] = [];
  for (let n = 1; n <= count; n++) urls.push(`${match[1]}${n}${match[3]}`);
  return urls;
}

export type LibraryRegion = "all" | "zh" | "jp-kr" | "western";

export function creatorRegion(streamer: Creator | undefined | null): Exclude<LibraryRegion, "all"> {
  const region = streamer?.region;
  if (region === "zh" || region === "jp-kr" || region === "western") return region;
  const raw = streamer?.language;
  const langs = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (streamer?.creatorGroup === "zh" || langs.includes("zh")) return "zh";
  if (langs.some((lang) => lang === "ja" || lang === "ko")) return "jp-kr";
  return "western";
}

export function clipInRegion(clip: ClipListItem, streamers: Map<string, Creator>, region: LibraryRegion) {
  if (region === "all") return true;
  return creatorRegion(streamers.get(clip.creator)) === region;
}

export function selectSearchResults(
  clips: ClipListItem[],
  query: string,
  streamers: Map<string, Creator>,
  triggers: Map<string, Trigger>,
  lang: Lang,
  opts: {
    tags?: string[];
    dur?: DurFilter;
    when?: WhenFilter;
    sort?: SearchSort;
    counts?: Record<string, number>;
    now?: number;
  } = {},
): ClipListItem[] {
  const hits = searchClips(clips, query, streamers, triggers, lang, Number.POSITIVE_INFINITY);
  const narrowed = narrowClips(hits.map((hit) => hit.clip), opts.tags || [], opts.dur || "any", opts.when || "any", opts.now);
  const sort = opts.sort === "views" || opts.sort === "duration" ? opts.sort : "new";
  return sortClips(narrowed, sort, opts.counts || {});
}
