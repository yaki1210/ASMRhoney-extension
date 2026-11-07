import type { ClipListItem, Creator, Lang, Trigger } from "./data/types";

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Upload date as YYYY-MM-DD (local time). Invalid/missing → "". */
export function formatDate(publishedAt?: string | null) {
  if (!publishedAt) return "";
  const d = new Date(publishedAt);
  if (Number.isNaN(+d)) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatCount(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "")} 万`;
  return n.toLocaleString("zh-CN");
}

export function formatWhen(ts: number) {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "刚刚";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  return new Date(ts).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function parseTimestamp(label: string): number | null {
  const parts = label.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function displayTitle(item: { title: string; title_en?: string }, lang: Lang) {
  if (lang === "en" && item.title_en) return item.title_en;
  return item.title;
}

function prettyName(name: string) {
  if (/^[a-z0-9-]+$/.test(name)) {
    return name
      .split("-")
      .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return name;
}

export function displayCreator(creator: string, streamers: Map<string, Creator>) {
  const s = streamers.get(creator);
  if (!s) return prettyName(creator);
  const name = s.name ? prettyName(s.name) : "";
  if (s.displayName && name && s.displayName !== name && s.displayName.toLowerCase() !== s.name?.toLowerCase()) {
    return `${s.displayName} · ${name}`;
  }
  return s.displayName || name || prettyName(creator);
}

export function triggerLabel(slug: string, triggers: Map<string, Trigger>, lang: Lang) {
  const t = triggers.get(slug);
  if (!t) return slug;
  if (lang === "en") return t.label_en || t.label_zh;
  return t.label_zh;
}

export function coverSrc(clip: ClipListItem) {
  return clip.coverAvifUrl || clip.coverWebpUrl || clip.coverUrl || "";
}

export function creatorCover(creator: Creator) {
  return creator.coverUrl || creator.avatarUrl || "";
}

export function creatorPoster(creator: Creator) {
  return creator.posterWebpUrl || creator.posterAvifUrl || creator.posterUrl || creator.coverUrl || creator.avatarUrl || "";
}

export function creatorAvatar(creator: Creator) {
  return creator.avatarWebpUrl || creator.avatarAvifUrl || creator.avatarUrl || "";
}

export function creatorSpecialtyLabels(creator: Creator, triggers: Map<string, Trigger>, lang: Lang) {
  const raw = creator.specialty;
  const slugs = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((slug) => typeof slug === "string" && slug);
  const labels: string[] = [];
  for (const slug of slugs) {
    if (!triggers.has(slug)) continue;
    labels.push(triggerLabel(slug, triggers, lang));
  }
  return labels;
}

export function creatorProfileUrl(creator: Creator) {
  const url = creator.profileSourceUrl || "";
  return /^https?:\/\//i.test(url) ? url : "";
}

export function creatorProfileLabel(creator: Creator, fallback: string) {
  const platform = (creator.profileSourcePlatform || "").trim().toLowerCase();
  if (platform === "youtube") return "YouTube";
  if (platform === "patreon") return "Patreon";
  if (platform === "twitch") return "Twitch";
  if (platform === "twitter" || platform === "x") return "X";
  if (platform && platform !== "unknown") return platform.charAt(0).toUpperCase() + platform.slice(1);
  return fallback;
}

export function fill(template: string, n: number) {
  return template.replace("{n}", String(n));
}

export function relatedClips(current: ClipListItem, catalog: ClipListItem[]) {
  const others = catalog.filter((c) => c.slug !== current.slug && c.kind !== "collection" && !c.hideFromLibrary);
  const tags = new Set((current.tags || []).filter((t) => t !== "sfw" && t !== "nsfw"));
  const scored = others.map((clip) => {
    let score = 0;
    if (clip.creator === current.creator) score += 8;
    for (const tag of clip.tags || []) if (tags.has(tag)) score += 2;
    if (clip.language && clip.language === current.language) score += 1;
    return { clip, score };
  });
  scored.sort((a, b) => b.score - a.score || +new Date(b.clip.publishedAt) - +new Date(a.clip.publishedAt));
  return scored.filter((x) => x.score > 0).map((x) => x.clip);
}
