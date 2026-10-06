import { collectionFromPath, type LibraryRegion, type PlayOrder } from "./decide";
import type { DurFilter, SearchSort, WhenFilter } from "./filters";
import type { Lang } from "./types";

export type Route =
  | { kind: "home"; region?: LibraryRegion }
  | { kind: "clip"; slug: string }
  | { kind: "creators" }
  | { kind: "creator"; slug: string }
  | { kind: "library"; id: string; tags: string[] }
  | { kind: "history" }
  | { kind: "favorites" }
  | { kind: "playlist"; order: PlayOrder }
  | { kind: "search"; q: string; tags: string[]; dur: DurFilter; when: WhenFilter; sort: SearchSort }
  | { kind: "collection"; slug: string; order: PlayOrder }
  | { kind: "audio" }
  | { kind: "audio-album"; slug: string }
  | { kind: "audio-creator"; slug: string }
  | { kind: "other" };

export type Category = {
  id: string;
  tags: string[];
  titleZh: string;
  titleEn: string;
};

export const CATEGORIES: Category[] = [
  { id: "asmr", tags: [], titleZh: "ASMR 视频", titleEn: "ASMR" },
  { id: "sensual-asmr", tags: ["sexy"], titleZh: "感官 ASMR", titleEn: "Sensual" },
  { id: "ear-licking-asmr", tags: ["ear_licking"], titleZh: "舔耳 ASMR", titleEn: "Ear licking" },
  { id: "adult-asmr", tags: ["nsfw"], titleZh: "成人 ASMR", titleEn: "Adult" },
  { id: "mouth-sounds-asmr", tags: ["mouth_sounds"], titleZh: "口音 ASMR", titleEn: "Mouth sounds" },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function isEnglishPath(pathname: string) {
  return pathname === "/en" || pathname.startsWith("/en/");
}

export function langOf(pathname: string): Lang {
  return isEnglishPath(pathname) ? "en" : "zh";
}

function barePath(pathname: string) {
  let path = isEnglishPath(pathname) ? pathname.slice(3) || "/" : pathname;
  if (!path.startsWith("/")) path = `/${path}`;
  return path.replace(/\/+$/, "") || "/";
}

function extraTagsFromSearch(search: string): string[] {
  const raw = new URLSearchParams(search).get("tag")?.trim() || "";
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

function playOrder(search: string): PlayOrder {
  const order = new URLSearchParams(search).get("order");
  if (order === "desc" || order === "shuffle") return order;
  return "asc";
}

function homeRegion(search: string): LibraryRegion {
  const region = new URLSearchParams(search).get("region");
  if (region === "zh" || region === "jp-kr" || region === "western") return region;
  return "all";
}

function searchRoute(search: string, q: string): Extract<Route, { kind: "search" }> {
  const params = new URLSearchParams(search);
  const dur = params.get("dur");
  const when = params.get("when");
  const sort = params.get("sort");
  return {
    kind: "search",
    q,
    tags: extraTagsFromSearch(search),
    dur: dur === "short" || dur === "mid" || dur === "long" || dur === "xl" ? dur : "any",
    when: when === "7d" || when === "30d" || when === "year" ? when : "any",
    sort: sort === "views" || sort === "duration" ? sort : "new",
  };
}

export function libraryRouteForTag(tag: string): Extract<Route, { kind: "library" }> {
  const slug = tag.trim();
  const cat = CATEGORIES.find((c) => c.tags.includes(slug));
  if (cat) return { kind: "library", id: cat.id, tags: [...cat.tags] };
  return { kind: "library", id: "asmr", tags: slug ? [slug] : [] };
}

export function parseRoute(pathname = location.pathname, search = location.search): { lang: Lang; route: Route } {
  const lang = langOf(pathname);
  const path = barePath(pathname);
  const q = new URLSearchParams(search).get("q")?.trim() || "";
  const collection = collectionFromPath(pathname);
  if (collection) return { lang, route: { kind: "collection", slug: collection.slug, order: playOrder(search) } };

  if (path === "/audio") return { lang, route: { kind: "audio" } };
  const album = path.match(/^\/audio\/album\/([^/]+)$/);
  if (album) return { lang, route: { kind: "audio-album", slug: decodeURIComponent(album[1]) } };
  const audioCreator = path.match(/^\/audio\/creator\/([^/]+)$/);
  if (audioCreator) return { lang, route: { kind: "audio-creator", slug: decodeURIComponent(audioCreator[1]) } };

  if (path === "/search") return { lang, route: searchRoute(search, q) };

  const legacyCreator = path.match(/^\/creator\/([^/]+)$/);
  if (legacyCreator) {
    const slug = decodeURIComponent(legacyCreator[1]);
    if (new URLSearchParams(search).get("media") === "audio") return { lang, route: { kind: "audio-creator", slug } };
    return { lang, route: { kind: "creator", slug } };
  }

  const clip = path.match(/^\/clip\/([^/]+)$/);
  if (clip) return { lang, route: { kind: "clip", slug: decodeURIComponent(clip[1]) } };

  if (path === "/history") return { lang, route: { kind: "history" } };
  if (path === "/favorites/play") return { lang, route: { kind: "playlist", order: playOrder(search) } };
  if (path === "/favorites") return { lang, route: { kind: "favorites" } };

  if (path === "/creators") return { lang, route: { kind: "creators" } };
  const creator = path.match(/^\/creators\/([^/]+)$/);
  if (creator) return { lang, route: { kind: "creator", slug: decodeURIComponent(creator[1]) } };

  if (path.startsWith("/download/")) return { lang, route: { kind: "other" } };

  const catId = path.slice(1);
  const cat = CATEGORY_BY_ID.get(catId);
  if (cat) {
    const tags = [...new Set([...cat.tags, ...extraTagsFromSearch(search)])];
    return { lang, route: { kind: "library", id: cat.id, tags } };
  }

  if (path === "/" && q) return { lang, route: searchRoute(search, q) };
  return { lang, route: { kind: "home", region: homeRegion(search) } };
}

export function toPath(route: Route, lang: Lang) {
  const prefix = lang === "en" ? "/en" : "";
  switch (route.kind) {
    case "clip":
      return `${prefix}/clip/${encodeURIComponent(route.slug)}/`;
    case "creators":
      return `${prefix}/creators/`;
    case "history":
      return `${prefix}/history/`;
    case "favorites":
      return `${prefix}/favorites/`;
    case "playlist":
      return route.order === "asc" ? `${prefix}/favorites/play/` : `${prefix}/favorites/play/?order=${route.order}`;
    case "creator":
      return `${prefix}/creators/${encodeURIComponent(route.slug)}/`;
    case "library": {
      const cat = CATEGORY_BY_ID.get(route.id);
      const extras = (route.tags || []).filter((t) => !(cat?.tags || []).includes(t));
      const base = `${prefix}/${route.id}/`;
      if (!extras.length) return base;
      return `${base}?tag=${extras.map(encodeURIComponent).join(",")}`;
    }
    case "search": {
      const params = new URLSearchParams();
      if (route.q) params.set("q", route.q);
      if (route.tags.length) params.set("tag", route.tags.join(","));
      if (route.dur !== "any") params.set("dur", route.dur);
      if (route.when !== "any") params.set("when", route.when);
      if (route.sort !== "new") params.set("sort", route.sort);
      const query = params.toString();
      return `${prefix}/search/${query ? `?${query}` : ""}`;
    }
    case "collection": {
      const base = `${prefix}/collection/${encodeURIComponent(route.slug)}/`;
      return route.order === "asc" ? base : `${base}?order=${route.order}`;
    }
    case "audio":
      return `${prefix}/audio/`;
    case "audio-album":
      return `${prefix}/audio/album/${encodeURIComponent(route.slug)}/`;
    case "audio-creator":
      return `${prefix}/audio/creator/${encodeURIComponent(route.slug)}/`;
    case "home":
      return route.region && route.region !== "all" ? `${prefix}/?region=${route.region}` : `${prefix}/`;
    default:
      return `${prefix}/`;
  }
}

export function categoryTitle(id: string, lang: Lang) {
  const cat = CATEGORY_BY_ID.get(id);
  if (!cat) return lang === "en" ? "Library" : "片库";
  return lang === "en" ? cat.titleEn : cat.titleZh;
}
