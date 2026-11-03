import type { CatalogStatus, Lang } from "../data/types";
import { copy } from "../i18n";

/** Placeholder shown instead of the grid until the catalog anchor is "ready". */
export function GridLoading({ status, lang, count = 12 }: { status: CatalogStatus; lang: Lang; count?: number }) {
  const t = copy(lang);
  if (status === "error") return <p class="rail-empty">{t.catalogFailed}</p>;
  return (
    <div class="grid-loading" aria-busy="true">
      <p class="grid-loading-label" role="status">
        <span class="spinner" aria-hidden="true" />
        {t.catalogLoading}
      </p>
      <div class="clip-grid">
        {Array.from({ length: count }, (_, i) => (
          <article key={i} class="clip-card is-skeleton" aria-hidden="true">
            <span class="clip-thumb" />
            <span class="clip-copy">
              <b class="skel-line" />
              <span class="skel-line is-short" />
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
