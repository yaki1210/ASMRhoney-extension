import type { ComponentChildren } from "preact";
import type { Lang } from "../data/types";
import { copy } from "../i18n";
import { IconList, IconSearch, LogoMark } from "../icons";

type Props = {
  lang: Lang;
  onHome: () => void;
  onSearch: () => void;
  onMenu?: () => void;
  menuExpanded?: boolean;
  menuLabel?: string;
  children?: ComponentChildren;
};

export function Topbar({ lang, onHome, onSearch, onMenu, menuExpanded, menuLabel, children }: Props) {
  const t = copy(lang);
  const menuText = menuLabel || t.menu;
  return (
    <header class="topbar">
      <div class="brand-slot">
        {onMenu && (
          <button
            class="ghost menu-btn"
            type="button"
            onClick={onMenu}
            title={menuText}
            aria-label={menuText}
            aria-expanded={menuExpanded}
          >
            <IconList />
          </button>
        )}
        <a class="brand" href={lang === "en" ? "/en/" : "/"} onClick={(e) => { e.preventDefault(); onHome(); }}>
          <LogoMark />
          <span class="brand-text">ASMRHoney</span>
        </a>
      </div>
      <button class="search-btn" type="button" onClick={onSearch} title={t.searchPlaceholder}>
        <IconSearch />
        <span>{t.searchPlaceholder}</span>
        <kbd>{t.searchHint}</kbd>
      </button>
      <div class="top-actions">{children}</div>
    </header>
  );
}
