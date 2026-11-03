import { useEffect, useState } from "preact/hooks";
import type { Lang } from "../data/types";
import { copy } from "../i18n";
import { IconPageExit, IconPageFull } from "../icons";

/** Document (whole page) fullscreen, distinct from the video element's own fullscreen. */
export function usePageFullscreen() {
  const [on, setOn] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const supported = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  return { on, supported, toggle };
}

export function PageFullscreenButton({ lang, class: cls = "ghost" }: { lang: Lang; class?: string }) {
  const t = copy(lang);
  const { on, supported, toggle } = usePageFullscreen();
  if (!supported) return null;
  const label = on ? t.exitPageFullscreen : t.pageFullscreen;
  return (
    <button class={`${cls} page-fs-btn ${on ? "is-active" : ""}`} type="button" onClick={toggle} title={label} aria-label={label} aria-pressed={on}>
      {on ? <IconPageExit /> : <IconPageFull />}
    </button>
  );
}
