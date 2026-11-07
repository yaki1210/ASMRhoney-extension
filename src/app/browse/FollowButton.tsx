import { useEffect, useState } from "preact/hooks";
import { isFollowed, subscribeFollows, toggleFollow } from "../data/storage";
import type { Lang } from "../data/types";
import { copy } from "../i18n";
import { IconCheck, IconPlus } from "../icons";

type Props = {
  slug: string;
  lang: Lang;
  compact?: boolean;
};

export function FollowButton({ slug, lang, compact = false }: Props) {
  const t = copy(lang);
  const [on, setOn] = useState(() => isFollowed(slug));

  useEffect(() => {
    setOn(isFollowed(slug));
    return subscribeFollows(() => setOn(isFollowed(slug)));
  }, [slug]);

  return (
    <button
      class={`follow-btn ${on ? "is-on" : ""} ${compact ? "is-compact" : ""}`}
      type="button"
      aria-pressed={on}
      aria-label={on ? t.unfollow : t.follow}
      title={on ? t.unfollow : t.follow}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOn(toggleFollow(slug));
      }}
    >
      {on ? <IconCheck /> : <IconPlus />}
      {compact ? null : <span>{on ? t.followed : t.follow}</span>}
    </button>
  );
}
