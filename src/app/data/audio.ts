import { creatorRegion } from "./decide";
import type { AudioTrack, Creator } from "./types";

export type AudioGroup = "zh" | "ja";

export function audioGroupOf(streamer: Creator | undefined | null): AudioGroup {
  return creatorRegion(streamer) === "zh" ? "zh" : "ja";
}

export function albumTracks(tracks: readonly AudioTrack[], albumSlug: string) {
  return tracks
    .filter((track) => track.albumSlug === albumSlug)
    .slice()
    .sort((a, b) => (a.trackNo || 0) - (b.trackNo || 0) || a.slug.localeCompare(b.slug));
}

export function looseTracks(tracks: readonly AudioTrack[], creator: string) {
  return tracks
    .filter((track) => track.creator === creator && !track.albumSlug)
    .slice()
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export function creatorsInGroup(
  tracks: readonly AudioTrack[],
  streamers: Map<string, Creator>,
  group: AudioGroup,
) {
  const slugs = [...new Set(tracks.map((track) => track.creator))];
  return slugs
    .filter((slug) => audioGroupOf(streamers.get(slug)) === group)
    .sort((a, b) => {
      const latest = (slug: string) =>
        Math.max(0, ...tracks.filter((track) => track.creator === slug).map((track) => +new Date(track.publishedAt) || 0));
      return latest(b) - latest(a) || a.localeCompare(b);
    });
}
