import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { coverSrc, displayCreator, displayTitle, formatCount, formatDuration } from "../lib";

type Props = {
  clips: ClipListItem[];
  currentSlug?: string;
  counts: Record<string, number>;
  commentCounts?: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
};

export function ClipList({ clips, currentSlug, counts, commentCounts, streamers, lang, onOpen }: Props) {
  const t = copy(lang);
  return (
    <div class="rail-list">
      {clips.map((item) => {
        const views = counts[item.slug] ?? item.playCount ?? 0;
        const cc = commentCounts?.[item.slug];
        return (
          <button
            key={item.slug}
            class={`rail-card ${item.slug === currentSlug ? "is-on" : ""}`}
            type="button"
            onClick={() => onOpen(item.slug)}
          >
            <span class="thumb">
              {coverSrc(item) && <img src={coverSrc(item)} alt="" loading="lazy" />}
              <em>{formatDuration(item.duration)}</em>
            </span>
            <span class="rail-copy">
              <b>{displayTitle(item, lang)}</b>
              <i>{displayCreator(item.creator, streamers)}</i>
              <i>
                {views > 0 ? `${formatCount(views)} ${t.views}` : ""}
                {cc != null ? `${views > 0 ? " · " : ""}${cc} ${t.comments}` : ""}
              </i>
            </span>
          </button>
        );
      })}
    </div>
  );
}
