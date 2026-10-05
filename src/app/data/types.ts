export type Lang = "zh" | "en";

export type ClipListItem = {
  slug: string;
  title: string;
  title_en?: string;
  title_ja?: string;
  title_ko?: string;
  creator: string;
  tags: string[];
  language?: string;
  mode?: string;
  duration: number;
  playCount?: number;
  publishedAt: string;
  updatedAt?: string;
  coverUrl?: string;
  coverWebpUrl?: string;
  coverAvifUrl?: string;
  audioOnly?: boolean;
  status?: string;
};

export type SubtitleTrack = {
  src?: string;
  url?: string;
  lang?: string;
  language?: string;
  label?: string;
  kind?: string;
};

export type ClipDetail = ClipListItem & {
  description?: string;
  videoUrl?: string;
  video480Url?: string;
  backgroundAudioUrl?: string;
  subtitleTracks?: SubtitleTrack[];
  uploadMode?: string;
};

export type Creator = {
  slug: string;
  name?: string;
  displayName?: string;
  aliases?: string[];
  language?: string | string[];
  specialty?: string | string[];
  bio?: string;
  active?: boolean;
  region?: string;
  avatarUrl?: string;
  coverUrl?: string;
};

export type Trigger = {
  slug: string;
  label_zh: string;
  label_en?: string;
  label_ja?: string;
  label_ko?: string;
};

export type Comment = {
  id: number;
  nickname: string;
  body: string;
  created_at: number;
};

export type CommentsPage = {
  comments: Comment[];
  count: number;
  has_more: boolean;
  next_before: number | null;
};

export type DrawerLayer =
  | { type: "comments" }
  | { type: "related" }
  | { type: "creator"; slug: string };

export type CreatorSort = "new" | "views" | "duration" | "comments";

declare global {
  interface Window {
    __ASMR_INITIAL_CLIP__?: string;
    __ASMR_INITIAL_CLIP_DATA__?: ClipDetail;
    __ASMR_VIEW__?: string;
  }
}

export {};
