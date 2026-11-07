import { isPublicClip, sortClips } from "./filters";
import type { AudioTrack, ClipListItem } from "./types";

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

export type FollowUpdate =
  | { kind: "video"; slug: string; creator: string; publishedAt: string; clip: ClipListItem }
  | { kind: "audio"; slug: string; creator: string; publishedAt: string; track: AudioTrack };

function publishedMs(value: string) {
  const n = +new Date(value);
  return Number.isFinite(n) ? n : 0;
}

/** Videos and audio from followed creators, newest first. Pass a creator slug to keep one person. */
export function followTimeline(clips: ClipListItem[], tracks: AudioTrack[], follows: FollowRef[], creator?: string | null) {
  const allowed = new Set(follows.map((item) => item.slug));
  const keep = (slug: string) => allowed.has(slug) && (!creator || slug === creator);
  const videos: FollowUpdate[] = followFeed(clips, follows)
    .filter((clip) => keep(clip.creator))
    .map((clip) => ({ kind: "video", slug: clip.slug, creator: clip.creator, publishedAt: clip.publishedAt, clip }));
  const audios: FollowUpdate[] = [];
  for (const track of tracks) {
    if ((track.status || "published") !== "published" || !keep(track.creator)) continue;
    audios.push({ kind: "audio", slug: track.slug, creator: track.creator, publishedAt: track.publishedAt, track });
  }
  return [...videos, ...audios].sort(
    (a, b) => publishedMs(b.publishedAt) - publishedMs(a.publishedAt) || a.slug.localeCompare(b.slug),
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
