import type { Lang } from "./types";

export type Route =
  | { kind: "home"; q?: string }
  | { kind: "clip"; slug: string }
  | { kind: "creators" }
  | { kind: "creator"; slug: string }
  | { kind: "library"; id: string; tags: string[] }
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

  const clip = path.match(/^\/clip\/([^/]+)$/);
  if (clip) return { lang, route: { kind: "clip", slug: decodeURIComponent(clip[1]) } };

  if (path === "/creators") return { lang, route: { kind: "creators" } };
  const creator = path.match(/^\/creators\/([^/]+)$/);
  if (creator) return { lang, route: { kind: "creator", slug: decodeURIComponent(creator[1]) } };

  if (path === "/audio" || path.startsWith("/audio/")) return { lang, route: { kind: "other" } };
  if (path.startsWith("/download/")) return { lang, route: { kind: "other" } };

  const catId = path.slice(1);
  const cat = CATEGORY_BY_ID.get(catId);
  if (cat) {
    const tags = [...new Set([...cat.tags, ...extraTagsFromSearch(search)])];
    return { lang, route: { kind: "library", id: cat.id, tags } };
  }

  return { lang, route: { kind: "home", q: q || undefined } };
}

export function toPath(route: Route, lang: Lang) {
  const prefix = lang === "en" ? "/en" : "";
  switch (route.kind) {
    case "clip":
      return `${prefix}/clip/${encodeURIComponent(route.slug)}/`;
    case "creators":
      return `${prefix}/creators/`;
    case "creator":
      return `${prefix}/creators/${encodeURIComponent(route.slug)}/`;
    case "library": {
      const cat = CATEGORY_BY_ID.get(route.id);
      const extras = (route.tags || []).filter((t) => !(cat?.tags || []).includes(t));
      const base = `${prefix}/${route.id}/`;
      if (!extras.length) return base;
      return `${base}?tag=${extras.map(encodeURIComponent).join(",")}`;
    }
    case "home":
      return route.q ? `${prefix}/?q=${encodeURIComponent(route.q)}` : `${prefix}/`;
    default:
      return `${prefix}/`;
  }
}

export function categoryTitle(id: string, lang: Lang) {
  const cat = CATEGORY_BY_ID.get(id);
  if (!cat) return lang === "en" ? "Library" : "片库";
  return lang === "en" ? cat.titleEn : cat.titleZh;
}
