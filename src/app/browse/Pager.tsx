import { useEffect, useState } from "preact/hooks";
import type { Lang } from "../data/types";
import { copy } from "../i18n";

type Props = { page: number; count: number; lang: Lang; onPage: (page: number) => void };

export function Pager({ page, count, lang, onPage }: Props) {
  const t = copy(lang);
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);
  if (count <= 1) return null;

  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), count);
    setDraft(String(clamped));
    if (clamped === page) return;
    onPage(clamped);
    window.scrollTo({ top: 0 });
  };
  const commit = () => {
    const n = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(n)) setDraft(String(page));
    else go(n);
  };

  return (
    <nav class="pager" aria-label={t.pageNav}>
      <button class="more-btn" type="button" disabled={page <= 1} onClick={() => go(page - 1)}>
        {t.pagePrev}
      </button>
      <label class="pager-label">
        <span class="pager-pre">{t.pageJumpPre}</span>
        <input
          class="pager-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          size={Math.max(2, String(count).length)}
          value={draft}
          title={t.pageJump}
          aria-label={t.pageJump.replace("{total}", String(count))}
          onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(String(page));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onBlur={commit}
          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <span class="pager-total">{t.pageJumpTotal.replace("{total}", String(count))}</span>
      </label>
      <button class="more-btn" type="button" disabled={page >= count} onClick={() => go(page + 1)}>
        {t.pageNext}
      </button>
    </nav>
  );
}
