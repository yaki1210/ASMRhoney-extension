import type { JSX } from "preact";

type P = JSX.SVGAttributes<SVGSVGElement>;

function svg(d: string, props: P = {}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d={d} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export const IconPlay = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M8 5.2v13.6l11.4-6.8L8 5.2z" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M8 5h3.2v14H8V5zm4.8 0H16v14h-3.2V5z" />
  </svg>
);
export const IconBack = (p: P) => svg("M15 5l-7 7 7 7", p);
export const IconSearch = (p: P) => svg("M11 5a6 6 0 100 12 6 6 0 000-12zM20 20l-3.5-3.5", p);
export const IconVolume = (p: P) => svg("M4 10v4h3l4 3V7L7 10H4zm12.2 1a3.2 3.2 0 010 2.2M16 7.5a6 6 0 010 9", p);
export const IconMute = (p: P) => svg("M4 10v4h3l4 3V7L7 10H4zm16-3l-8 10m0-10l8 10", p);
export const IconFull = (p: P) => svg("M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4", p);
export const IconPip = (p: P) => svg("M4 6h16v12H4V6zm8 5h7v6h-7v-6z", p);
export const IconSkipBack = (p: P) => svg("M5 12h14M5 12l4-4M5 12l4 4", p);
export const IconSkipFwd = (p: P) => svg("M5 12h14M19 12l-4-4M19 12l-4 4", p);
export const IconLoop = (p: P) => svg("M4 12a6 6 0 016-6h9l-3-3M20 12a6 6 0 01-6 6H5l3 3", p);
export const IconMoon = (p: P) => svg("M16 4a8 8 0 11-8 12 6.5 6.5 0 008-12z", p);
export const IconList = (p: P) => svg("M5 7h14M5 12h14M5 17h10", p);
export const IconDownload = (p: P) => svg("M12 4v11m0 0l-4-4m4 4l4-4M5 19h14", p);
export const IconHeadphone = (p: P) => svg("M5 13v-2a7 7 0 0114 0v2M5 13a2 2 0 104 0v3a2 2 0 10-4 0v-3zm10 0a2 2 0 104 0v3a2 2 0 10-4 0v-3z", p);
export const IconClose = (p: P) => svg("M6 6l12 12M18 6L6 18", p);
export const IconComment = (p: P) => svg("M5 6h14v9H8.5L5 18.5V6z", p);

export function LogoMark() {
  return (
    <span class="logo-mark" aria-hidden="true">
      H
    </span>
  );
}
