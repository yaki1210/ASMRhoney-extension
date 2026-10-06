import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { IconHeart, IconViews } from "../icons";
import { coverSrc, displayCreator, displayTitle, formatCount, formatDuration } from "../lib";

type Props = {
  clips: ClipListItem[];
  currentSlug?: string;
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (slug: string) => void;
  onOpenCreator: (slug: string) => void;
  onRemove?: (slug: string) => void;
};

export function ClipGrid({ clips, currentSlug, counts, streamers, lang, onOpen, onOpenCreator, onRemove }: Props) {
  const t = copy(lang);
  return (
    <div class="clip-grid">
      {clips.map((item) => {
        const views = counts[item.slug] ?? item.playCount ?? 0;
        const src = coverSrc(item);
        return (
          <article
            key={item.slug}
            class={`clip-card ${item.slug === currentSlug ? "is-on" : ""}`}
            onClick={() => onOpen(item.slug)}
          >
            <span class="clip-thumb">
              {src ? <img src={src} alt="" loading="lazy" /> : null}
              <em>{formatDuration(item.duration)}</em>
              {onRemove && (
                <button
                  class="clip-unsave"
                  type="button"
                  title={t.favoriteRemove}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.slug);
                  }}
                >
                  <IconHeart filled />
                </button>
              )}
            </span>
            <span class="clip-copy">
              <b>{displayTitle(item, lang)}</b>
              <span class="clip-meta">
                <button
                  class="clip-creator"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreator(item.creator);
                  }}
                >
                  {displayCreator(item.creator, streamers)}
                </button>
                {views > 0 && (
                  <span class="view-count" title={t.views}>
                    <IconViews />
                    {formatCount(views)}
                  </span>
                )}
              </span>
            </span>
          </article>
        );
      })}
    </div>
  );
}
