import { displayCreator, displayTitle, triggerLabel } from "../lib";
import type { ClipListItem, Creator, Lang, Trigger } from "./types";

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function hay(parts: Array<string | undefined | null>) {
  return norm(parts.filter(Boolean).join(" "));
}

export type ClipHit = { clip: ClipListItem; score: number };
export type CreatorHit = { creator: Creator; score: number };

export function searchClips(
  clips: ClipListItem[],
  query: string,
  streamers: Map<string, Creator>,
  triggers: Map<string, Trigger>,
  lang: Lang,
  limit = 40,
): ClipHit[] {
  const q = norm(query);
  if (!q) return [];
  const hits: ClipHit[] = [];
  for (const clip of clips) {
    let score = 0;
    const title = hay([clip.title, clip.title_en, clip.title_ja, clip.title_ko, displayTitle(clip, lang)]);
    const creator = hay([
      clip.creator,
      streamers.get(clip.creator)?.name,
      streamers.get(clip.creator)?.displayName,
      displayCreator(clip.creator, streamers),
      ...(streamers.get(clip.creator)?.aliases || []),
    ]);
    const tags = hay((clip.tags || []).map((t) => `${t} ${triggerLabel(t, triggers, lang)}`));
    if (title.includes(q)) score += title.startsWith(q) ? 16 : 10;
    if (creator.includes(q)) score += 12;
    if (tags.includes(q)) score += 5;
    if (norm(clip.slug).includes(q)) score += 6;
    if (score) hits.push({ clip, score });
  }
  hits.sort((a, b) => b.score - a.score || +new Date(b.clip.publishedAt) - +new Date(a.clip.publishedAt));
  return hits.slice(0, limit);
}

export function searchCreators(people: Creator[], query: string, limit = 8): CreatorHit[] {
  const q = norm(query);
  if (!q) return [];
  const hits: CreatorHit[] = [];
  for (const creator of people) {
    const blob = hay([creator.slug, creator.name, creator.displayName, ...(creator.aliases || [])]);
    if (!blob.includes(q)) continue;
    let score = 6;
    if (norm(creator.slug) === q || norm(creator.name || "") === q) score = 14;
    hits.push({ creator, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
