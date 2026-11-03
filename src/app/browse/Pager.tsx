import type { Lang } from "../data/types";
import { copy } from "../i18n";

type Props = { page: number; count: number; lang: Lang; onPage: (page: number) => void };

export function Pager({ page, count, lang, onPage }: Props) {
  if (count <= 1) return null;
  const t = copy(lang);
  const go = (next: number) => {
    onPage(next);
    window.scrollTo({ top: 0 });
  };
  return (
    <nav class="pager" aria-label={t.pageNav}>
      <button class="more-btn" type="button" disabled={page <= 1} onClick={() => go(page - 1)}>
        {t.pagePrev}
      </button>
      <span class="pager-label">{t.pageOf.replace("{n}", String(page)).replace("{total}", String(count))}</span>
      <button class="more-btn" type="button" disabled={page >= count} onClick={() => go(page + 1)}>
        {t.pageNext}
      </button>
    </nav>
  );
}
