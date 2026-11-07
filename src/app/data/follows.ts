import { isPublicClip, sortClips } from "./filters";
import type { ClipListItem } from "./types";

export type FollowRef = { slug: string; followedAt: number };

/** Public clips by followed creators, newest first. Collections stay out of the feed. */
export function followFeed(clips: ClipListItem[], follows: FollowRef[]) {
  const slugs = new Set(follows.map((item) => item.slug));
  return sortClips(
    clips.filter((clip) => slugs.has(clip.creator) && isPublicClip(clip)),
    "new",
    {},
  );
}

/**
 * Sidebar count. A clip counts only when it was published after you followed
 * that creator, and after the last time the following page was opened.
 * Older work stays in the feed, but it does not light up as new.
 */
export function unseenFollowCount(
  clips: ClipListItem[],
  follows: FollowRef[],
  seenAt: number | null,
  now = Date.now(),
) {
  const followedAt = new Map(follows.map((item) => [item.slug, item.followedAt]));
  let count = 0;
  for (const clip of clips) {
    if (!isPublicClip(clip)) continue;
    const since = followedAt.get(clip.creator);
    if (since == null) continue;
    const published = +new Date(clip.publishedAt);
    if (!Number.isFinite(published) || published <= since || published > now) continue;
    if (seenAt != null && published <= seenAt) continue;
    count += 1;
  }
  return count;
}
