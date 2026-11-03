import type { ClipListItem, Creator, Lang } from "../data/types";
import { copy } from "../i18n";
import { IconHeart, IconViews } from "../icons";
import { toPath } from "../data/routes";
import { useDragReorder } from "./useDragReorder";
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
  /** "blank" opens clips in a new tab via real links; "same" keeps SPA navigation. */
  openMode?: "same" | "blank";
  /** Enables drag-and-drop reordering of cards. */
  onReorder?: (from: number, to: number) => void;
};

export function ClipGrid({ clips, currentSlug, counts, streamers, lang, onOpen, onOpenCreator, onRemove, openMode = "same", onReorder }: Props) {
  const t = copy(lang);
  const drag = useDragReorder((from, to) => onReorder?.(from, to), !!onReorder);
  return (
    <div class={`clip-grid ${onReorder ? "is-sortable" : ""}`}>
      {clips.map((item, i) => {
        const views = counts[item.slug] ?? item.playCount ?? 0;
        const src = coverSrc(item);
        const href = toPath({ kind: "clip", slug: item.slug }, lang);
        const blank = openMode === "blank";
        // Real links: middle/ctrl-click work everywhere; plain click is SPA in "same" mode.
        const linkProps = blank
          ? { href, target: "_blank", rel: "noopener noreferrer", onClick: (e: MouseEvent) => e.stopPropagation() }
          : {
              href,
              onClick: (e: MouseEvent) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { e.stopPropagation(); return; }
                e.preventDefault();
              },
            };
        return (
          <article
            key={item.slug}
            class={`clip-card ${item.slug === currentSlug ? "is-on" : ""} ${drag.rowClass(i)}`}
            {...drag.itemProps(i)}
            title={onReorder ? t.dragToReorder : undefined}
            onClick={() => {
              if (blank) window.open(href, "_blank", "noopener,noreferrer");
              else onOpen(item.slug);
            }}
          >
            <span class="clip-thumb">
              <a class="clip-thumb-link" {...linkProps} draggable={onReorder ? false : undefined} tabIndex={-1} aria-hidden="true">
              {src ? (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  class="is-pending"
                  onLoad={(e) => e.currentTarget.classList.remove("is-pending")}
                  onError={(e) => e.currentTarget.classList.add("is-broken")}
                />
              ) : null}
              <em>{formatDuration(item.duration)}</em>
              </a>
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
              <a class="clip-title" {...linkProps} draggable={onReorder ? false : undefined}>
                <b>{displayTitle(item, lang)}</b>
              </a>
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
