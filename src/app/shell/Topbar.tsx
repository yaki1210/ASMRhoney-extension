import type { ComponentChildren } from "preact";
import type { Lang } from "../data/types";
import { copy } from "../i18n";
import { IconSearch, LogoMark } from "../icons";

type Props = {
  lang: Lang;
  nav?: "home" | "library" | "creators" | "clip";
  onHome: () => void;
  onSearch: () => void;
  onLibrary?: () => void;
  onCreators?: () => void;
  children?: ComponentChildren;
};

export function Topbar({ lang, nav = "home", onHome, onSearch, onLibrary, onCreators, children }: Props) {
  const t = copy(lang);
  return (
    <header class="topbar">
      <a class="brand" href={lang === "en" ? "/en/" : "/"} onClick={(e) => { e.preventDefault(); onHome(); }}>
        <LogoMark />
        <span class="brand-text">
          <strong>ASMRHoney</strong>
          <em>Theater</em>
        </span>
      </a>
      <button class="search-btn" type="button" onClick={onSearch} title={t.searchPlaceholder}>
        <IconSearch />
        <span>{t.searchPlaceholder}</span>
        <kbd>{t.searchHint}</kbd>
      </button>
      <div class="top-actions">
        {onLibrary && (
          <button class={`text-nav ${nav === "library" || nav === "home" ? "is-on" : ""}`} type="button" onClick={onLibrary}>
            {t.library}
          </button>
        )}
        {onCreators && (
          <button class={`text-nav ${nav === "creators" ? "is-on" : ""}`} type="button" onClick={onCreators}>
            {t.creators}
          </button>
        )}
        {children}
      </div>
    </header>
  );
}
