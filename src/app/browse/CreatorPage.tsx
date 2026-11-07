import { CreatorPanel } from "../drawer/CreatorPanel";
import type { ClipListItem, Creator, Lang, Trigger } from "../data/types";
import { copy } from "../i18n";
import { creatorAvatar, creatorProfileLabel, creatorProfileUrl, creatorSpecialtyLabels, displayCreator } from "../lib";
import { FollowButton } from "./FollowButton";

type Props = {
  slug: string;
  catalog: ClipListItem[];
  counts: Record<string, number>;
  streamers: Map<string, Creator>;
  triggers: Map<string, Trigger>;
  lang: Lang;
  onOpen: (clipSlug: string) => void;
  onOpenCreator: (slug: string) => void;
};

export function CreatorPage({ slug, catalog, counts, streamers, triggers, lang, onOpen, onOpenCreator }: Props) {
  const t = copy(lang);
  const person = streamers.get(slug);
  const avatar = person ? creatorAvatar(person) : "";
  const specialties = person ? creatorSpecialtyLabels(person, triggers, lang) : [];
  const profile = person ? creatorProfileUrl(person) : "";
  const works = catalog.filter((clip) => clip.creator === slug && !clip.hideFromLibrary).length;
  const showWorks = catalog.length > 0;
  return (
    <div class="page creator-page">
      <header class="creator-hero">
        {avatar ? <img class="creator-avatar" src={avatar} alt="" /> : null}
        <div class="creator-identity">
          <div class="creator-name-row">
            <h1>{displayCreator(slug, streamers)}</h1>
            <FollowButton slug={slug} lang={lang} />
          </div>
          {specialties.length > 0 && <p class="creator-specialty">{specialties.join(" · ")}</p>}
          {person?.bio ? <p>{person.bio}</p> : null}
          {(showWorks || profile) && (
            <p class="creator-facts">
              {showWorks && (
                <span>
                  {works} {t.creatorWorks}
                </span>
              )}
              {profile && (
                <a href={profile} target="_blank" rel="noopener noreferrer">
                  {person ? creatorProfileLabel(person, t.creatorProfile) : t.creatorProfile}
                </a>
              )}
            </p>
          )}
        </div>
      </header>
      <CreatorPanel
        slug={slug}
        catalog={catalog}
        counts={counts}
        streamers={streamers}
        lang={lang}
        onOpen={onOpen}
        onOpenCreator={onOpenCreator}
        layout="grid"
      />
    </div>
  );
}
