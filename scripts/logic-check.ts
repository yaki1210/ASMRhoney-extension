import { albumTracks, audioGroupOf, looseTracks } from "../src/app/data/audio";
import {
  clipInRegion,
  libraryClipVisible,
  collectionCreator,
  collectionFromPath,
  collectionMembers,
  creatorDirectoryGroup,
  creatorRegion,
  enterAction,
  galleryUrls,
  nextPlaylistIndex,
  orderPlaylist,
  selectSearchResults,
  videoTapAction,
} from "../src/app/data/decide";
import { parseRoute, toPath } from "../src/app/data/routes";
import { searchClips } from "../src/app/data/search";
import type { AudioTrack, ClipListItem, Creator } from "../src/app/data/types";
import { readFileSync } from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function eq(actual: unknown, expected: unknown, label: string) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) fail(`${label}\n  actual   ${left}\n  expected ${right}`);
  console.log(`PASS ${label}`);
}

function clip(partial: Partial<ClipListItem> & Pick<ClipListItem, "slug" | "title" | "publishedAt">): ClipListItem {
  return {
    creator: "soly",
    tags: [],
    duration: 60,
    ...partial,
  };
}

function person(partial: Partial<Creator> & Pick<Creator, "slug">): Creator {
  return partial;
}

const now = Date.parse("2026-06-15T00:00:00Z");
const clips: ClipListItem[] = [
  clip({ slug: "a", title: "honey rain", tags: ["whisper"], duration: 100, publishedAt: "2026-06-10T00:00:00Z", playCount: 5, creator: "soly" }),
  clip({ slug: "b", title: "honey storm", tags: ["nsfw"], duration: 900, publishedAt: "2026-01-01T00:00:00Z", playCount: 50, creator: "soly" }),
  clip({ slug: "c", title: "honey long", tags: ["whisper"], duration: 4000, publishedAt: "2024-01-01T00:00:00Z", playCount: 9, creator: "other" }),
  clip({ slug: "d", title: "unrelated", tags: ["whisper"], duration: 100, publishedAt: "2026-06-14T00:00:00Z", playCount: 1, creator: "soly" }),
];
const streamers = new Map<string, Creator>();
const triggers = new Map();

eq(videoTapAction({ coarse: true, playing: true, controlsVisible: false }), "reveal", "coarse hidden playing reveals");
eq(videoTapAction({ coarse: true, playing: true, controlsVisible: true }), "toggle", "coarse visible playing toggles");
eq(videoTapAction({ coarse: false, playing: true, controlsVisible: false }), "toggle", "fine pointer toggles while hidden");
eq(videoTapAction({ coarse: true, playing: false, controlsVisible: false }), "toggle", "coarse paused still toggles");

eq(enterAction("  honey  ", false), { type: "search", q: "honey" }, "enter opens search for the query");
eq(enterAction("honey", true), { type: "pick" }, "armed enter keeps the suggestion");
eq(enterAction("   ", false), { type: "pick" }, "blank enter does not open search");

const all = selectSearchResults(clips, "honey", streamers, triggers, "zh", { now });
const capped = searchClips(clips, "honey", streamers, triggers, "zh", 1);
eq(all.map((item) => item.slug).sort(), ["a", "b", "c"], "search page returns every honey hit");
eq(capped.length, 1, "suggestion list stays capped");
if (all.length <= capped.length) fail("full results were not larger than the capped suggestion list");
console.log("PASS full result set is larger than the capped suggestion list");

eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { tags: ["whisper"], now }).map((item) => item.slug).sort(),
  ["a", "c"],
  "tag filter drops non-matching clips",
);
eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { dur: "short", now }).map((item) => item.slug),
  ["a"],
  "duration bound drops longer clips",
);
eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { when: "7d", now }).map((item) => item.slug),
  ["a"],
  "upload-time bound drops older clips",
);
eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { sort: "new", now }).map((item) => item.slug),
  ["a", "b", "c"],
  "upload time sort is newest first",
);
eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { sort: "views", now }).map((item) => item.slug),
  ["b", "c", "a"],
  "play count sort follows plays",
);
eq(
  selectSearchResults(clips, "honey", streamers, triggers, "zh", { sort: "duration", now }).map((item) => item.slug),
  ["c", "b", "a"],
  "duration sort is longest first",
);

eq(collectionFromPath("/soly-collection/")?.creator, "soly", "bare collection slug");
eq(collectionFromPath("/clip/soly-cpllection/")?.creator, "soly", "clip cpllection typo");
eq(collectionFromPath("/en/soly-collection")?.creator, "soly", "english collection slug");
eq(collectionFromPath("/collection/soly-collection/")?.slug, "soly-collection", "origin collection path");
eq(collectionFromPath("/collection/maimy-topless-ppv/")?.slug, "maimy-topless-ppv", "image collection path");
eq(collectionCreator("soly-cpllection"), "soly", "cpllection creator");
eq(collectionFromPath("/clip/qiushui-95/"), null, "normal clip is not a collection");

const catalog: ClipListItem[] = [
  clip({ slug: "soly-collection", title: "set", creator: "soly", kind: "collection", publishedAt: "2020-01-01T00:00:00Z" }),
  clip({ slug: "m2", title: "two", creator: "soly", collectionSlug: "soly-collection", collectionOrder: 2, publishedAt: "2021-01-01T00:00:00Z" }),
  clip({ slug: "m1", title: "one", creator: "soly", collectionSlug: "soly-collection", collectionOrder: 1, publishedAt: "2022-01-01T00:00:00Z" }),
  clip({ slug: "loose", title: "loose", creator: "soly", publishedAt: "2023-01-01T00:00:00Z" }),
];
eq(collectionMembers(catalog, "soly-collection").map((item) => item.slug), ["m1", "m2"], "listed members beat other creator clips");
eq(collectionMembers(catalog, "soly-cpllection").map((item) => item.slug), ["m1", "m2"], "typo slug uses the listed members");

const fallbackCatalog: ClipListItem[] = [
  clip({ slug: "ada-collection", title: "Ada", creator: "ada", kind: "collection", publishedAt: "2020-01-01T00:00:00Z" }),
  clip({ slug: "new", title: "new", creator: "ada", publishedAt: "2024-01-01T00:00:00Z" }),
  clip({ slug: "old", title: "old", creator: "ada", publishedAt: "2021-01-01T00:00:00Z" }),
];
eq(collectionMembers(fallbackCatalog, "ada-collection").map((item) => item.slug), ["old", "new"], "fallback collection is that creator's clips");

const base = ["a", "b", "c", "d"];
eq(orderPlaylist(base, "asc"), base, "asc keeps the list");
eq(orderPlaylist(base, "desc"), ["d", "c", "b", "a"], "desc is the reverse");
if (base.join() !== "a,b,c,d") fail("orderPlaylist mutated its input");
const shuffled = orderPlaylist(base, "shuffle");
eq(shuffled.length, base.length, "shuffle keeps the length");
eq([...shuffled].sort(), [...base].sort(), "shuffle contains each id once");
eq(nextPlaylistIndex(0, shuffled.length), 1, "next item follows the queue");
eq(nextPlaylistIndex(shuffled.length - 1, shuffled.length), null, "queue stops after the last item");
console.log("PASS shuffle was not pinned to one order");

eq(creatorRegion(person({ slug: "wan", language: ["zh"] })), "zh", "chinese creator region");
eq(creatorRegion(person({ slug: "mei", language: ["ja"] })), "jp-kr", "japanese creator region");
eq(creatorRegion(person({ slug: "sel", language: ["ko"] })), "jp-kr", "korean creator region");
eq(creatorRegion(person({ slug: "west", region: "western", language: ["zh"] })), "western", "explicit region wins");
eq(creatorRegion(person({ slug: "group", creatorGroup: "zh" })), "zh", "creator group zh");
eq(creatorDirectoryGroup(person({ slug: "wan", creatorGroup: "zh", language: ["en"] })), "zh", "directory chinese is creatorGroup zh");
eq(creatorDirectoryGroup(person({ slug: "mei", creatorGroup: "non-zh", language: ["zh"] })), "non-zh", "directory non-zh stays non-zh even with zh language");
eq(creatorDirectoryGroup(person({ slug: "bare", language: ["zh"], region: "zh" })), "non-zh", "missing creatorGroup counts as non-zh");
eq(creatorRegion(undefined), "western", "missing creator is western");
const regionMap = new Map<string, Creator>([
  ["soly", person({ slug: "soly", language: ["zh"] })],
  ["other", person({ slug: "other", language: ["en"] })],
]);
eq(clipInRegion(clips[0], regionMap, "all"), true, "all region keeps every clip");
eq(clipInRegion(clips[0], regionMap, "zh"), true, "chinese region keeps a zh creator");
eq(clipInRegion(clips[2], regionMap, "zh"), false, "chinese region drops a western creator");
eq(clipInRegion(clip({ slug: "solo", title: "solo", creator: "nobody", publishedAt: "2026-01-01", language: "zh" }), new Map(), "zh"), true, "clip language zh counts before streamers load");
eq(clipInRegion(clip({ slug: "solo-ja", title: "solo", creator: "nobody", publishedAt: "2026-01-01", language: "ja" }), new Map(), "jp-kr"), true, "clip language ja counts as jp-kr before streamers load");
eq(clipInRegion(clip({ slug: "solo-en", title: "solo", creator: "nobody", publishedAt: "2026-01-01", language: "en" }), new Map(), "zh"), false, "english clip language is not the chinese region");
eq(libraryClipVisible(clips[0], regionMap, "zh", ["whisper"]), true, "library keeps a regional clip that matches the tag");
eq(libraryClipVisible(clips[0], regionMap, "jp-kr", ["whisper"]), false, "library region drops a clip before the tag filter");
eq(libraryClipVisible(clips[0], regionMap, "zh", ["nsfw"]), false, "library tag filter still applies inside a region");
eq(parseRoute("/asmr/", "?region=jp-kr").route, { kind: "library", id: "asmr", tags: [], region: "jp-kr" }, "library url keeps the region");
eq(toPath({ kind: "library", id: "adult-asmr", tags: ["nsfw", "whisper"], region: "zh" }, "zh"), "/adult-asmr/?region=zh&tag=whisper", "library path keeps region and extra tags");
eq(audioGroupOf(person({ slug: "wan", language: ["zh"] })), "zh", "chinese audio group");
eq(audioGroupOf(person({ slug: "sel", region: "jp-kr", language: ["ko"] })), "ja", "korean audio sits with japanese");

const tracks: AudioTrack[] = [
  { slug: "t2", title: "two", creator: "mei", duration: 10, publishedAt: "2026-02-01T00:00:00Z", audioUrl: "https://example.test/2.mp3", albumSlug: "ear", trackNo: 2 },
  { slug: "t1", title: "one", creator: "mei", duration: 10, publishedAt: "2026-01-01T00:00:00Z", audioUrl: "https://example.test/1.mp3", albumSlug: "ear", trackNo: 1 },
  { slug: "loose-new", title: "new", creator: "mei", duration: 10, publishedAt: "2026-03-01T00:00:00Z", audioUrl: "https://example.test/n.mp3" },
  { slug: "loose-old", title: "old", creator: "mei", duration: 10, publishedAt: "2025-03-01T00:00:00Z", audioUrl: "https://example.test/o.mp3" },
];
eq(albumTracks(tracks, "ear").map((track) => track.slug), ["t1", "t2"], "album tracks follow track numbers");
eq(looseTracks(tracks, "mei").map((track) => track.slug), ["loose-new", "loose-old"], "loose tracks are newest first");

eq(
  galleryUrls(clip({ slug: "pics", title: "pics", publishedAt: "2026-01-01T00:00:00Z", collectionCount: 3, collectionCovers: ["https://cdn.example/PPV1.jpg"] })),
  ["https://cdn.example/PPV1.jpg", "https://cdn.example/PPV2.jpg", "https://cdn.example/PPV3.jpg"],
  "image collection expands numbered covers",
);

const root = process.cwd();
const zh = readFileSync(path.join(root, "src/app/i18n.ts"), "utf8");
for (const label of ["播放全部", "正序", "倒序", "随机", "中文区", "日韩区", "欧美区", "全部", "非中文", "音频区", "上传时间", "播放量"]) {
  if (!zh.includes(label)) fail(`missing copy ${label}`);
  console.log(`PASS copy ${label}`);
}
const searchPage = readFileSync(path.join(root, "src/app/browse/SearchPage.tsx"), "utf8");
if (!searchPage.includes("IconFilter")) fail("search page has no filter icon");
console.log("PASS search page filter icon");
const favorites = readFileSync(path.join(root, "src/app/browse/FavoritesPage.tsx"), "utf8");
if (!favorites.includes("onPlayAll") || !favorites.includes("t.playAll")) fail("favorites play-all is not wired");
console.log("PASS favorites play-all control");
const playlist = readFileSync(path.join(root, "src/app/browse/PlaylistView.tsx"), "utf8");
if (!playlist.includes("orderPlaylist") || !playlist.includes("nextPlaylistIndex")) fail("playlist view does not use the shared order");
console.log("PASS playlist view uses shared order");

console.log("ALL PASS");
