import { useEffect, useState } from "preact/hooks";

type Props = {
  title: string;
  urls: string[];
  note: string;
  hint: string;
};

export function GalleryPage({ title, urls, note, hint }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      else if (event.key === "ArrowRight") setOpen((index) => (index == null ? 0 : (index + 1) % urls.length));
      else if (event.key === "ArrowLeft") setOpen((index) => (index == null ? 0 : (index + urls.length - 1) % urls.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, urls.length]);

  return (
    <div class="page">
      <h1 class="library-heading">{title}</h1>
      <p class="home-sub">{note}</p>
      <p class="rail-empty">{hint}</p>
      <div class="photo-grid">
        {urls.map((url, index) => (
          <button key={url} class="photo-cell" type="button" onClick={() => setOpen(index)}>
            <img src={url} alt="" />
          </button>
        ))}
      </div>
      {open != null && urls[open] && (
        <div class="lightbox" onClick={() => setOpen(null)}>
          <button
            class="lightbox-nav"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((open + urls.length - 1) % urls.length);
            }}
          >
            ‹
          </button>
          <img src={urls[open]} alt="" onClick={(event) => event.stopPropagation()} />
          <button
            class="lightbox-nav"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((open + 1) % urls.length);
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
