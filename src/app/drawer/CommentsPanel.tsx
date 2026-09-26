import type { ComponentChildren } from "preact";
import type { Comment, Lang } from "../data/types";
import { copy } from "../i18n";
import { formatWhen, parseTimestamp } from "../lib";

type Props = {
  comments: Comment[];
  hasMore: boolean;
  loadingMore: boolean;
  lang: Lang;
  onMore: () => void;
  onSeek: (seconds: number) => void;
};

const TS_RE = /(?:\d{1,2}:)?[0-5]?\d:[0-5]\d/g;

function Body({ text, onSeek }: { text: string; onSeek: (s: number) => void }) {
  const nodes: ComponentChildren[] = [];
  let last = 0;
  const re = new RegExp(TS_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const label = m[0];
    const sec = parseTimestamp(label);
    if (sec == null) nodes.push(label);
    else {
      nodes.push(
        <button key={`${m.index}-${label}`} class="ts-link" type="button" onClick={() => onSeek(sec)}>
          {label}
        </button>,
      );
    }
    last = m.index + label.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export function CommentsPanel({ comments, hasMore, loadingMore, lang, onMore, onSeek }: Props) {
  const t = copy(lang);
  if (!comments.length && !loadingMore) {
    return <p class="rail-empty">{t.commentsEmpty}</p>;
  }
  return (
    <div class="comment-list">
      {comments.map((c) => (
        <article class="comment" key={c.id}>
          <header>
            <b>{c.nickname || "游客"}</b>
            <time>{formatWhen(c.created_at)}</time>
          </header>
          <p>
            <Body text={c.body} onSeek={onSeek} />
          </p>
        </article>
      ))}
      {hasMore && (
        <button class="more-btn" type="button" onClick={onMore} disabled={loadingMore}>
          {t.commentsMore}
        </button>
      )}
    </div>
  );
}
