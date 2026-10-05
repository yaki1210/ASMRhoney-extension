import { CreatorPanel } from "../drawer/CreatorPanel";
import type { ClipListItem, Creator, Lang } from "../data/types";
import { creatorCover, displayCreator } from "../lib";

type Props = {
  slug: string;
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  lang: Lang;
  onOpen: (clipSlug: string) => void;
};

export function CreatorPage({ slug, catalog, counts, streamers, lang, onOpen }: Props) {
  const person = streamers.get(slug);
  const src = person ? creatorCover(person) : "";
  return (
    <div class="page creator-page">
      <header class="creator-hero">
        {src ? <img src={src} alt="" /> : null}
        <div>
          <h1>{displayCreator(slug, streamers)}</h1>
          {person?.bio ? <p>{person.bio}</p> : null}
        </div>
      </header>
      <CreatorPanel slug={slug} catalog={catalog} counts={counts} streamers={streamers} lang={lang} onOpen={onOpen} />
    </div>
  );
}
