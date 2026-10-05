import type { ClipListItem, CreatorSort } from "./types";

export type TagGroupId = "rating" | "sounds" | "body" | "scene";

export type TagGroup = {
  id: TagGroupId;
  slugs: string[];
};

export const TAG_GROUPS: TagGroup[] = [
  { id: "rating", slugs: ["sfw", "nsfw"] },
  {
    id: "sounds",
    slugs: [
      "whisper",
      "soft_spoken",
      "breathing",
      "mouth_sounds",
      "tongue",
      "tonguevibrating",
      "tapping",
      "scratching",
      "brushing",
      "ear_cleaning",
      "eating",
      "paper",
      "keyboard",
      "rain",
      "fire",
      "water",
      "trigger_sounds",
      "wet",
      "heart",
    ],
  },
  {
    id: "body",
    slugs: ["ear_licking", "eareating", "kiss", "kissing", "feet", "pantyhose", "aloevera", "vision", "visual_triggers"],
  },
  { id: "scene", slugs: ["roleplay", "sleep_aid", "focus", "comfort", "sexy", "vtuber"] },
];

export function clipMatchesTags(clip: ClipListItem, selected: string[]) {
  if (!selected.length) return true;
  const tags = new Set(clip.tags || []);
  for (const group of TAG_GROUPS) {
    const picked = group.slugs.filter((s) => selected.includes(s));
    if (!picked.length) continue;
    if (!picked.some((s) => tags.has(s))) return false;
  }
  for (const slug of selected) {
    if (TAG_GROUPS.some((g) => g.slugs.includes(slug))) continue;
    if (!tags.has(slug)) return false;
  }
  return true;
}

export function sortClips(
  clips: ClipListItem[],
  sort: CreatorSort,
  counts: Record<string, number>,
  commentCounts: Record<string, number> = {},
) {
  const list = [...clips];
  if (sort === "views") {
    list.sort((a, b) => (counts[b.slug] ?? b.playCount ?? 0) - (counts[a.slug] ?? a.playCount ?? 0));
  } else if (sort === "duration") {
    list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  } else if (sort === "comments") {
    list.sort((a, b) => (commentCounts[b.slug] ?? 0) - (commentCounts[a.slug] ?? 0));
  } else {
    list.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }
  return list;
}
