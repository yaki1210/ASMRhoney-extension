import { useEffect, useState } from "preact/hooks";
import type { Lang } from "../data/types";
import { copy } from "../i18n";
import { IconPageExit, IconPageFull } from "../icons";

const CLS = "ahx-page-fs";

/**
 * Webpage fullscreen (宽屏/网页全屏): pure CSS — the player stage fills the browser
 * viewport while browser chrome stays visible. Never uses the Fullscreen API.
 */
export function usePageFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(CLS, on);
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.fullscreenElement || e.defaultPrevented) return;
      setOn(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      root.classList.remove(CLS);
    };
  }, [on]);
  const toggle = () => setOn((v) => !v);
  return { on, supported: true, toggle };
}

export function PageFullscreenButton({
  lang,
  class: cls = "ghost",
  on,
  toggle,
}: {
  lang: Lang;
  class?: string;
  on: boolean;
  toggle: () => void;
}) {
  const t = copy(lang);
  const label = on ? t.exitPageFullscreen : t.pageFullscreen;
  return (
    <button class={`${cls} page-fs-btn ${on ? "is-active" : ""}`} type="button" onClick={toggle} title={label} aria-label={label} aria-pressed={on}>
      {on ? <IconPageExit /> : <IconPageFull />}
    </button>
  );
}
