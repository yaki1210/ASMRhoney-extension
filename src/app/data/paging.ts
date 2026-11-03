/** Fixed-boundary pagination (v0.7).
 * Items are chunked from the OLDEST end in groups of PAGE_SIZE, so page membership
 * never shifts when new items arrive at the newest end. The newest leftover chunk
 * (< PAGE_SIZE) is merged into the previous chunk, so UI page 1 holds
 * [PAGE_SIZE, 2*PAGE_SIZE-1] items (or all items when total < PAGE_SIZE). */
export const PAGE_SIZE = 50;

export type PageWindow<T> = { uiPage: number; uiPageCount: number; items: T[]; start: number; end: number };

/** Number of UI pages for a list of `total` items. */
export function uiPageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.floor(total / pageSize));
}

/** pages[0] = newest UI page (possibly merged), pages[last] = oldest. Each page keeps ascending (old→new) order. */
export function buildMergedPages<T>(sortedOldToNew: T[], pageSize = PAGE_SIZE): { pages: T[][]; uiPageCount: number } {
  const count = uiPageCount(sortedOldToNew.length, pageSize);
  const pages: T[][] = [];
  for (let p = 1; p <= count; p++) pages.push(pageSlice(sortedOldToNew, p, pageSize).items);
  return { pages, uiPageCount: count };
}

/** 1-based UI page → contiguous [start, end) slice of the ascending array (items kept ascending). */
export function pageSlice<T>(sortedOldToNew: T[], uiPage: number, pageSize = PAGE_SIZE): PageWindow<T> {
  const total = sortedOldToNew.length;
  const count = uiPageCount(total, pageSize);
  const page = Math.min(Math.max(1, Math.floor(uiPage) || 1), count);
  // Chunk index (0 = oldest). UI page p maps to chunk count-p; the top chunk absorbs the remainder.
  const chunk = count - page;
  const start = chunk * pageSize;
  const end = page === 1 ? total : start + pageSize;
  return { uiPage: page, uiPageCount: count, items: sortedOldToNew.slice(start, end), start, end };
}

/** Convenience for lists already in display order (newest/top first):
 * the ascending view is the reverse, and the returned items are back in display order. */
export function displayPage<T>(newestFirst: T[], uiPage: number, pageSize = PAGE_SIZE): PageWindow<T> {
  const win = pageSlice([...newestFirst].reverse(), uiPage, pageSize);
  return { ...win, items: win.items.reverse() };
}
