import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ClipDetail } from "../data/types";
import { loadPrefs, loadProgress, savePrefs, saveProgress, type Prefs } from "../data/storage";

export type Menu = null | "volume" | "speed" | "quality" | "sleep" | "more";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SLEEP_MINUTES = [15, 30, 60];

export function usePlayer(clip: ClipDetail | null, options: { autoplay?: boolean; onEnded?: () => void } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoplayRef = useRef(Boolean(options.autoplay));
  const onEndedRef = useRef(options.onEnded);
  autoplayRef.current = Boolean(options.autoplay);
  onEndedRef.current = options.onEnded;
  const hideTimer = useRef<number>(0);
  const saveTimer = useRef<number>(0);
  const sleepTimer = useRef<number>(0);
  const prefsRef = useRef<Prefs>(loadPrefs());

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip?.duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(prefsRef.current.volume);
  const [muted, setMuted] = useState(prefsRef.current.muted);
  const [rate, setRate] = useState(prefsRef.current.rate);
  const [quality, setQuality] = useState<Prefs["quality"]>(prefsRef.current.quality);
  const [loop, setLoop] = useState(false);
  const [sleepUntil, setSleepUntil] = useState<number | null>(null);
  const [showUi, setShowUi] = useState(true);
  const [menu, setMenu] = useState<Menu>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srcFor = useCallback(
    (c: ClipDetail, q: Prefs["quality"], audio: boolean) => {
      if (audio && c.backgroundAudioUrl) return c.backgroundAudioUrl;
      if (q === "480" && c.video480Url) return c.video480Url;
      return c.videoUrl || c.video480Url || "";
    },
    [],
  );

  const persistPrefs = useCallback((patch: Partial<Prefs>) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    savePrefs(prefsRef.current);
  }, []);

  const nudgeUi = useCallback(() => {
    setShowUi(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowUi(false);
    }, 2400);
  }, []);

  const applySrc = useCallback(
    async (c: ClipDetail, q: Prefs["quality"], audio: boolean, seek?: number, autoplay?: boolean) => {
      const video = videoRef.current;
      if (!video) return;
      const src = srcFor(c, q, audio);
      if (!src) {
        setError("no-video");
        return;
      }
      setError(null);
      const t = seek ?? video.currentTime;
      video.src = src;
      video.loop = loop;
      video.playbackRate = rate;
      video.volume = volume;
      video.muted = muted;
      video.poster = c.coverUrl || "";
      await video.load();
      if (t > 0.4) {
        try {
          video.currentTime = t;
        } catch {
          /* ignore */
        }
      }
      if (autoplay) {
        try {
          await video.play();
        } catch {
          setPlaying(false);
        }
      }
    },
    [loop, muted, rate, srcFor, volume],
  );

  useEffect(() => {
    if (!clip) return;
    const saved = loadProgress(clip.slug);
    setResumeAt(saved?.t ?? null);
    setStarted(false);
    setPlaying(false);
    setCurrentTime(saved?.t ?? 0);
    setDuration(clip.duration || 0);
    setAudioOnly(false);
    setMenu(null);
    setError(null);
    void applySrc(clip, quality, false, saved?.t ?? 0, autoplayRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clip change should reset, not follow quality
  }, [clip?.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || clip?.duration || 0);
      try {
        const buf = video.buffered;
        if (buf.length > 0) setBuffered(buf.end(buf.length - 1));
      } catch {
        /* TimeRanges can throw while the buffer is mutating */
      }
      if (clip && !saveTimer.current) {
        saveTimer.current = window.setTimeout(() => {
          saveTimer.current = 0;
          saveProgress(clip.slug, video.currentTime, video.duration || clip.duration || 0);
        }, 4000);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      nudgeUi();
    };
    const onPause = () => {
      setPlaying(false);
      setShowUi(true);
      if (clip) saveProgress(clip.slug, video.currentTime, video.duration || clip.duration || 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setShowUi(true);
      if (!video.loop) onEndedRef.current?.();
    };
    const onErr = () => setError("play");

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("progress", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnd);
    video.addEventListener("error", onErr);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("progress", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("error", onErr);
    };
  }, [clip, nudgeUi]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.loop = loop;
  }, [loop]);

  useEffect(() => {
    window.clearTimeout(sleepTimer.current);
    if (!sleepUntil) return;
    const tick = () => {
      if (Date.now() >= sleepUntil) {
        videoRef.current?.pause();
        setSleepUntil(null);
        return;
      }
      sleepTimer.current = window.setTimeout(tick, 1000);
    };
    tick();
    return () => window.clearTimeout(sleepTimer.current);
  }, [sleepUntil]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => videoRef.current?.pause(), []);

  const toggle = useCallback(() => {
    if (videoRef.current?.paused) void play();
    else pause();
  }, [pause, play]);

  const seek = useCallback((t: number) => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || duration;
    video.currentTime = Math.min(Math.max(0, t), Number.isFinite(dur) ? dur : t);
    setCurrentTime(video.currentTime);
    setStarted(true);
  }, [duration]);

  const skip = useCallback((delta: number) => seek(currentTime + delta), [currentTime, seek]);

  const changeVolume = useCallback(
    (v: number) => {
      const next = Math.min(1, Math.max(0, v));
      setVolume(next);
      setMuted(next === 0);
      if (videoRef.current) {
        videoRef.current.volume = next;
        videoRef.current.muted = next === 0;
      }
      persistPrefs({ volume: next, muted: next === 0 });
    },
    [persistPrefs],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    persistPrefs({ muted: next });
  }, [muted, persistPrefs]);

  const changeRate = useCallback(
    (r: number) => {
      setRate(r);
      if (videoRef.current) videoRef.current.playbackRate = r;
      persistPrefs({ rate: r });
      setMenu(null);
    },
    [persistPrefs],
  );

  const changeQuality = useCallback(
    (q: Prefs["quality"]) => {
      setQuality(q);
      persistPrefs({ quality: q });
      setMenu(null);
      if (clip) void applySrc(clip, q, audioOnly, videoRef.current?.currentTime || 0, playing);
    },
    [applySrc, audioOnly, clip, persistPrefs, playing],
  );

  const toggleAudioOnly = useCallback(() => {
    if (!clip?.backgroundAudioUrl) return;
    const next = !audioOnly;
    setAudioOnly(next);
    void applySrc(clip, quality, next, videoRef.current?.currentTime || 0, true);
  }, [applySrc, audioOnly, clip, quality]);

  const toggleLoop = useCallback(() => setLoop((v) => !v), []);

  const setSleep = useCallback((minutes: number | null) => {
    setSleepUntil(minutes ? Date.now() + minutes * 60_000 : null);
    setMenu(null);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = videoRef.current?.parentElement;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen();
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const k = e.key;
      if (k === " " || k === "k" || k === "K") {
        e.preventDefault();
        toggle();
      } else if (k === "ArrowLeft") {
        e.preventDefault();
        skip(-5);
      } else if (k === "ArrowRight") {
        e.preventDefault();
        skip(5);
      } else if (k === "ArrowUp") {
        e.preventDefault();
        changeVolume(volume + 0.05);
      } else if (k === "ArrowDown") {
        e.preventDefault();
        changeVolume(volume - 0.05);
      } else if (k === "f" || k === "F") {
        toggleFullscreen();
      } else if (k === "m" || k === "M") {
        toggleMute();
      } else if (k === "l" || k === "L") {
        toggleLoop();
      } else if (k === "[") {
        const i = SPEEDS.indexOf(rate);
        if (i > 0) changeRate(SPEEDS[i - 1]);
      } else if (k === "]") {
        const i = SPEEDS.indexOf(rate);
        if (i >= 0 && i < SPEEDS.length - 1) changeRate(SPEEDS[i + 1]);
      } else if (/^[0-9]$/.test(k) && duration) {
        seek((Number(k) / 10) * duration);
      } else if (k === "Escape") {
        setMenu(null);
      }
      nudgeUi();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeRate, changeVolume, duration, nudgeUi, rate, seek, skip, toggle, toggleFullscreen, toggleLoop, toggleMute, volume]);

  return {
    videoRef,
    playing,
    started,
    currentTime,
    duration,
    buffered,
    volume,
    muted,
    rate,
    quality,
    loop,
    sleepUntil,
    showUi,
    menu,
    setMenu,
    resumeAt,
    audioOnly,
    error,
    speeds: SPEEDS,
    sleepMinutes: SLEEP_MINUTES,
    nudgeUi,
    play,
    pause,
    toggle,
    seek,
    skip,
    changeVolume,
    toggleMute,
    changeRate,
    changeQuality,
    toggleAudioOnly,
    toggleLoop,
    setSleep,
    toggleFullscreen,
    togglePip,
  };
}
