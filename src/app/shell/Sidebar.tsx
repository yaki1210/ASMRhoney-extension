import type { ComponentChildren } from "preact";
import type { Lang } from "../data/types";
import { toPath } from "../data/routes";
import { copy } from "../i18n";
import { IconGrid, IconHistory, IconHome, IconUsers } from "../icons";

export type SideId = "home" | "library" | "creators" | "history";

type Props = {
  lang: Lang;
  active: SideId;
  onHome: () => void;
  onLibrary: () => void;
  onCreators: () => void;
  onHistory: () => void;
  onNavigate: () => void;
};

export function Sidebar({ lang, active, onHome, onLibrary, onCreators, onHistory, onNavigate }: Props) {
  const t = copy(lang);
  const items: { id: SideId; label: string; href: string; icon: ComponentChildren; go: () => void }[] = [
    { id: "home", label: t.home, href: toPath({ kind: "home" }, lang), icon: <IconHome />, go: onHome },
    { id: "library", label: t.library, href: toPath({ kind: "library", id: "asmr", tags: [] }, lang), icon: <IconGrid />, go: onLibrary },
    { id: "creators", label: t.creators, href: toPath({ kind: "creators" }, lang), icon: <IconUsers />, go: onCreators },
    { id: "history", label: t.history, href: toPath({ kind: "history" }, lang), icon: <IconHistory />, go: onHistory },
  ];

  return (
    <nav class="side" aria-label={t.menu}>
      {items.map((item) => (
        <a
          key={item.id}
          class={`side-link ${active === item.id ? "is-on" : ""}`}
          href={item.href}
          title={item.label}
          aria-current={active === item.id ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            item.go();
            onNavigate();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
