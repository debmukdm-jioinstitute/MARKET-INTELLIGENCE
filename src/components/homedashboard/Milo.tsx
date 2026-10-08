"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./milo.css";

export type MiloEmotion =
  "happy" | "joyful" | "confused" | "worried" | "sorrow";

const SEQUENCE: MiloEmotion[] = [
  "happy",
  "joyful",
  "confused",
  "worried",
  "sorrow",
];
const LINES: Record<MiloEmotion, string> = {
  happy: "Let’s figure it out together.",
  joyful: "Green day! Let’s go!",
  confused: "Hmm, what’s driving this?",
  worried: "Markets look jumpy…",
  sorrow: "Ouch. Red days happen.",
};
const HOLD_MS = 4200;
const INK = "#1b1b1e";

/**
 * Milo, the Mi owl. Pure SVG + CSS (transform/opacity only), no animation library:
 * ~4 KB, zero layout work, paused when off-screen or tab hidden, static for reduced motion.
 */
export function Milo({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [emotion, setEmotion] = useState<MiloEmotion>("happy");
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const next = useCallback(
    () =>
      setEmotion((e) => SEQUENCE[(SEQUENCE.indexOf(e) + 1) % SEQUENCE.length]),
    [],
  );

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-cycle while visible; any emotion change (incl. a tap) restarts the hold timer.
  useEffect(() => {
    if (!visible || still) return;
    timer.current = window.setTimeout(next, HOLD_MS);
    return () => window.clearTimeout(timer.current);
  }, [emotion, visible, still, next]);

  const clipL = `${uid}l`;
  const clipR = `${uid}r`;

  return (
    <div
      ref={root}
      className={`milo relative select-none ${className}`}
      data-e={emotion}
      data-paused={!visible}
    >
      <span
        key={emotion}
        aria-hidden
        className="bubble absolute -top-1 right-0 z-10 max-w-[58%] rounded-[22px] rounded-bl-md border-2 border-[#1a5ce6] bg-white px-3.5 py-2 text-[13px] font-semibold leading-tight text-stone-900 sm:text-sm"
      >
        {LINES[emotion]}
      </span>
      <button
        type="button"
        onClick={next}
        aria-label="Milo, your market guide. Tap to change Milo’s mood."
        className="block w-full cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a5ce6]"
      >
        <svg
          viewBox="0 0 320 340"
          className="block h-auto w-full"
          aria-hidden
          focusable="false"
        >
          <defs>
            <radialGradient id={`${uid}g`} cx="45%" cy="30%" r="80%">
              <stop offset="0" stopColor="#2a2a2f" />
              <stop offset="1" stopColor="#141416" />
            </radialGradient>
            <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4a8bff" />
              <stop offset="1" stopColor="#1a5ce6" />
            </linearGradient>
            <clipPath id={clipL}>
              <ellipse cx="112" cy="132" rx="44" ry="48" />
            </clipPath>
            <clipPath id={clipR}>
              <ellipse cx="208" cy="132" rx="44" ry="48" />
            </clipPath>
          </defs>

          <ellipse
            cx="160"
            cy="326"
            rx="84"
            ry="8"
            fill="#000"
            opacity="0.12"
          />
          <ellipse cx="116" cy="320" rx="28" ry="12" fill="#121214" />
          <ellipse cx="204" cy="320" rx="28" ry="12" fill="#121214" />

          <g className="body">
            <ellipse cx="160" cy="246" rx="88" ry="78" fill={`url(#${uid}g)`} />
            <text
              x="160"
              y="272"
              textAnchor="middle"
              fontSize="38"
              fontWeight="800"
              fill="#fff"
            >
              Mi
            </text>

            <g className="wing-r">
              <ellipse
                cx="240"
                cy="244"
                rx="20"
                ry="48"
                fill={INK}
                stroke="#34343a"
                strokeWidth="2"
                transform="rotate(-12 240 244)"
              />
            </g>
            {/* phone in right wing */}
            <g className="phone">
              <g transform="translate(-30 -6) rotate(14 244 262)">
                <rect
                  x="222"
                  y="226"
                  width="46"
                  height="70"
                  rx="8"
                  fill="#d7dae3"
                />
                <rect
                  x="226"
                  y="231"
                  width="38"
                  height="58"
                  rx="5"
                  fill="#f6f8ff"
                />
                <path
                  className="chart-up"
                  d="M229 280 L237 270 L244 274 L258 246"
                  fill="none"
                  stroke="#1fb86b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="chart-down"
                  d="M229 246 L237 256 L244 252 L258 280"
                  fill="none"
                  stroke="#e5484d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
            <ellipse
              cx="212"
              cy="284"
              rx="18"
              ry="14"
              fill={INK}
              stroke="#34343a"
              strokeWidth="2"
            />

            <g className="wing-l">
              <ellipse
                cx="82"
                cy="244"
                rx="20"
                ry="48"
                fill={INK}
                stroke="#34343a"
                strokeWidth="2"
                transform="rotate(12 82 244)"
              />
            </g>

            <g className="head">
              <path
                className="ear-l"
                d="M66 98 C46 74 52 44 78 34 C84 56 98 66 116 70 Z"
                fill={INK}
              />
              <path
                className="ear-r"
                d="M254 98 C274 74 268 44 242 34 C236 56 222 66 204 70 Z"
                fill={INK}
              />
              <ellipse
                cx="160"
                cy="130"
                rx="100"
                ry="84"
                fill={`url(#${uid}g)`}
              />

              {/* eyes */}
              <ellipse cx="112" cy="132" rx="44" ry="48" fill="#fbfaf6" />
              <ellipse cx="208" cy="132" rx="44" ry="48" fill="#fbfaf6" />
              {(
                [
                  [clipL, 112, "l", 60],
                  [clipR, 208, "r", 156],
                ] as const
              ).map(([clip, cx, side, x0]) => (
                <g key={side} clipPath={`url(#${clip})`}>
                  <g transform={`translate(${cx} 134)`}>
                    <g className="pupil">
                      <circle r="23" fill="#121a30" />
                      <circle r="14" fill="#000" />
                      <circle cx="-8" cy="-9" r="6.5" fill="#fff" />
                      <circle cx="8" cy="8" r="3" fill="#fff" opacity="0.8" />
                    </g>
                  </g>
                  <rect
                    className={`lid lid-${side}`}
                    x={x0}
                    y="30"
                    width="104"
                    height="100"
                    fill={INK}
                  />
                  <ellipse
                    className="lid-low"
                    cx={cx}
                    cy="214"
                    rx="58"
                    ry="36"
                    fill={INK}
                  />
                  <rect
                    className={`blink blink-${side}`}
                    x={x0}
                    y="30"
                    width="104"
                    height="100"
                    fill={INK}
                  />
                </g>
              ))}

              {/* brows */}
              <g transform="translate(112 76)">
                <path
                  className="brow brow-l"
                  d="M-24 0 Q0 -10 24 0"
                  fill="none"
                  stroke="#f3efe6"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </g>
              <g transform="translate(208 76)">
                <path
                  className="brow brow-r"
                  d="M-24 0 Q0 -10 24 0"
                  fill="none"
                  stroke="#f3efe6"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </g>

              <ellipse
                className="blush t"
                cx="82"
                cy="178"
                rx="15"
                ry="9"
                fill="#ff8aa8"
              />
              <ellipse
                className="blush t"
                cx="238"
                cy="178"
                rx="15"
                ry="9"
                fill="#ff8aa8"
              />

              <path
                className="beak"
                d="M160 140 C146 150 148 170 160 180 C172 170 174 150 160 140 Z"
                fill={`url(#${uid}b)`}
              />
              <ellipse
                cx="156"
                cy="152"
                rx="4"
                ry="6"
                fill="#fff"
                opacity="0.45"
              />

              {/* emotion props */}
              <g className="fx fx-sorrow">
                <path
                  className="tear"
                  d="M92 184 C97 191 98 195 92 199 C86 195 87 191 92 184 Z"
                  fill="#8fd0ff"
                />
                <path
                  className="tear tear-2"
                  d="M228 184 C233 191 234 195 228 199 C222 195 223 191 228 184 Z"
                  fill="#8fd0ff"
                />
              </g>
              <g className="fx fx-worry">
                <path
                  className="sweat"
                  d="M270 70 C277 80 278 86 270 91 C262 86 263 80 270 70 Z"
                  fill="#8fd0ff"
                />
              </g>
              <g className="fx fx-confused">
                <text
                  className="qmark"
                  x="256"
                  y="52"
                  fontSize="58"
                  fontWeight="800"
                  fill="#1a5ce6"
                >
                  ?
                </text>
              </g>
            </g>
          </g>

          <g className="fx fx-joy" fill="#1a5ce6">
            {[
              [40, 70, 1],
              [284, 110, 0.8],
              [264, 30, 0.6],
            ].map(([x, y, k]) => (
              <path
                key={`${x}-${y}`}
                className="spark"
                transform={`translate(${x} ${y}) scale(${k})`}
                d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z"
              />
            ))}
          </g>
        </svg>
      </button>
      <span className="sr-only" aria-live="off">
        Milo is feeling {emotion}.
      </span>
    </div>
  );
}
