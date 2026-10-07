"use client";

import Image from "next/image";
import { Bell, Check, Maximize, Share, SquarePlus, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { computeShowDelay, detectPlatform, type InstallPlatform } from "@/lib/pwa/install";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SHOWN_KEY = "mi:pwa:prompt-shown"; // sessionStorage: once per login session
const INSTALLED_KEY = "mi:pwa:installed"; // localStorage: never nag after install

function safeGet(store: "session" | "local", key: string) {
  try {
    return (store === "session" ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: "session" | "local", key: string, value: string) {
  try {
    (store === "session" ? sessionStorage : localStorage).setItem(key, value);
  } catch {
    /* storage can be blocked (private mode); the prompt then simply may repeat */
  }
}

const BENEFITS = [
  {
    icon: Zap,
    tone: "blue",
    title: "One tap, straight in",
    text: "Open your market view from the home screen like any other app. No typing the address.",
  },
  {
    icon: Maximize,
    tone: "green",
    title: "Full screen, no clutter",
    text: "No browser bars, so charts and numbers get the whole display.",
  },
  {
    icon: Bell,
    tone: "yellow",
    title: "Alerts that find you",
    text: "Turn on breakout and price alerts and get them as notifications.",
  },
] as const;

const IOS_STEPS = [
  { icon: Share, text: "Tap the Share button in your browser toolbar" },
  { icon: SquarePlus, text: "Choose “Add to Home Screen”" },
  { icon: Check, text: "Tap “Add”. Market Intelligence is now on your home screen" },
] as const;

/**
 * Bottom-sheet that offers to install the web app. Signed-in mobile users only (the parent
 * mounts it on the Home screen after login). Shows once per login session, 5 s after the first
 * interaction and never later than 10 s after the screen opens. Android/Chrome installs with one
 * tap through the native prompt; iOS has no install API, so it gets a three-step guide instead.
 */
export function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [step, setStep] = useState<"offer" | "ios-guide" | "done">("offer");
  const deferred = useRef<InstallEvent | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => setOpen(false), 220);
  }, []);

  useEffect(() => {
    const plat = detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (plat === "desktop" || plat === "other-mobile" || standalone) return;
    if (safeGet("session", SHOWN_KEY) || safeGet("local", INSTALLED_KEY)) return;
    setPlatform(plat);

    const mountedAt = Date.now();
    let interactedAt: number | null = null;
    let timer = 0;
    let done = false;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as InstallEvent;
    };
    const onInstalled = () => {
      safeSet("local", INSTALLED_KEY, "1");
      deferred.current = null;
      setStep("done");
      window.setTimeout(close, 1600);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const show = () => {
      if (done) return;
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(show, 1000);
        return;
      }
      // Android can only install through the native event; do not offer what we cannot do.
      if (plat === "android" && !deferred.current) return;
      done = true;
      safeSet("session", SHOWN_KEY, "1");
      setOpen(true);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(show, computeShowDelay(mountedAt, interactedAt, Date.now()));
    };
    const onInteract = () => {
      if (interactedAt != null) return;
      interactedAt = Date.now();
      schedule();
    };
    const events = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
    events.forEach((ev) => window.addEventListener(ev, onInteract, { passive: true, once: true }));
    schedule();

    return () => {
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      events.forEach((ev) => window.removeEventListener(ev, onInteract));
    };
  }, [close]);

  // Focus the primary action, close on Escape, and let the page behind stay still.
  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Swipe the sheet down to dismiss (direct style writes: no re-render per frame).
  useEffect(() => {
    const el = sheetRef.current;
    if (!open || !el) return;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      dragging = true;
      el.style.transition = "none";
    };
    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.style.transition = "";
      if (dy > 90) close();
      else el.style.transform = "";
      dy = 0;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [open, close]);

  const install = async () => {
    if (platform === "ios") {
      setStep("ios-guide");
      return;
    }
    const evt = deferred.current;
    if (!evt) return close();
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      deferred.current = null;
      if (outcome === "accepted") {
        safeSet("local", INSTALLED_KEY, "1");
        setStep("done");
        window.setTimeout(close, 1600);
        return;
      }
    } catch {
      /* prompt already used or blocked: just close */
    }
    close();
  };

  if (!open) return null;
  return (
    <div className="pwa-root" data-closing={closing} role="presentation">
      <button type="button" aria-label="Close" tabIndex={-1} className="pwa-scrim" onClick={close} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-title"
        className="pwa-sheet"
      >
        <span className="pwa-handle" aria-hidden />

        {step === "done" ? (
          <div className="pwa-done">
            <span className="pwa-done-badge" aria-hidden>
              <Check className="size-8" strokeWidth={3} />
            </span>
            <h2 id="pwa-title">You’re all set</h2>
            <p>Find Market Intelligence on your home screen.</p>
          </div>
        ) : (
          <>
            <div className="pwa-hero">
              <span className="pwa-icon-wrap" aria-hidden>
                <span className="pwa-icon-ring" />
                <Image
                  src="/logo-mark-192.png"
                  alt=""
                  width={72}
                  height={72}
                  priority
                  className="pwa-icon"
                />
              </span>
              <h2 id="pwa-title">
                {step === "ios-guide" ? "Add to Home Screen" : "Put Market Intelligence on your home screen"}
              </h2>
              <p className="pwa-sub">
                {step === "ios-guide"
                  ? "Three quick taps. It takes about 10 seconds."
                  : "Install the app for a faster, smoother way to follow the market. It’s free and skips the app store."}
              </p>
            </div>

            {step === "ios-guide" ? (
              <ol className="pwa-list">
                {IOS_STEPS.map((s, i) => (
                  <li key={s.text} style={{ ["--i" as string]: i }}>
                    <span className="pwa-tile" data-tone="blue">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="pwa-li-text">
                      <b>Step {i + 1}</b>
                      {s.text}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="pwa-list">
                {BENEFITS.map((b, i) => (
                  <li key={b.title} style={{ ["--i" as string]: i }}>
                    <span className="pwa-tile" data-tone={b.tone}>
                      <b.icon className="size-5" aria-hidden />
                    </span>
                    <span className="pwa-li-text">
                      <b>{b.title}</b>
                      {b.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pwa-actions">
              {step === "ios-guide" ? (
                <button ref={primaryRef} type="button" className="pwa-btn pwa-btn-primary" onClick={close}>
                  Got it
                </button>
              ) : (
                <>
                  <button ref={primaryRef} type="button" className="pwa-btn pwa-btn-primary" onClick={install}>
                    {platform === "ios" ? "Show me how" : "Install app"}
                  </button>
                  <button type="button" className="pwa-btn pwa-btn-text" onClick={close}>
                    Not now
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
