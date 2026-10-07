/**
 * Decorative line-art for the "Five ways to find your edge" bento.
 * Pure SVG, aria-hidden, pointer-inert; strokes are round-capped and consistent.
 * Colours are the approved per-tool accents (see README "Home five-tool bento").
 */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  "aria-hidden": true,
  focusable: "false",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "pointer-events-none select-none",
};

export function DeskArt(props: SVGProps<SVGSVGElement>) {
  const c = "#FF6D65";
  return (
    <svg {...base} viewBox="0 0 240 200" {...props}>
      {/* back bubble */}
      <path d="M92 104h96a22 22 0 0 1 22 22v34a22 22 0 0 1-22 22h-6v22l-24-22H92a22 22 0 0 1-22-22v-34a22 22 0 0 1 22-22Z" fill="#FFC9C3" stroke={c} strokeWidth="3" />
      {/* front bubble */}
      <path d="M26 22h112a22 22 0 0 1 22 22v44a22 22 0 0 1-22 22H62l-30 24V110a22 22 0 0 1-22-22V44a22 22 0 0 1 16-22Z" transform="translate(6 2)" fill="#FFE9E5" stroke={c} strokeWidth="3" />
      <path d="M52 52h68M52 72h40" stroke={c} strokeWidth="3.5" />
      {/* spark strokes */}
      <path d="M176 18l-6 14M194 38l-14 6" stroke={c} strokeWidth="3" />
    </svg>
  );
}

export function ScannerArt(props: SVGProps<SVGSVGElement>) {
  const c = "#2468EF";
  return (
    <svg {...base} viewBox="0 0 150 130" {...props}>
      <path d="M6 24V6h18M126 6h18v18M6 106v18h18" stroke={c} strokeWidth="4" />
      <circle cx="62" cy="62" r="34" fill="#CFE3FF" stroke={c} strokeWidth="6" />
      <circle cx="62" cy="62" r="24" fill="#E8F1FF" />
      <path d="M52 48a18 18 0 0 1 14-5" stroke="#fff" strokeWidth="4" />
      <path d="M88 90l32 30" stroke={c} strokeWidth="11" />
      <path d="M128 64l12-9M130 78l14-3" stroke={c} strokeWidth="3.5" />
    </svg>
  );
}

export function LabArt(props: SVGProps<SVGSVGElement>) {
  const c = "#7C42D8";
  return (
    <svg {...base} viewBox="0 0 140 140" {...props}>
      <path d="M52 22h36M60 22v34L34 106a14 14 0 0 0 12 21h48a14 14 0 0 0 12-21L80 56V22" fill="#fff" stroke={c} strokeWidth="4" />
      <path d="M42 96h56l10 15a9 9 0 0 1-8 14H40a9 9 0 0 1-8-14Z" fill="#D9C8F5" />
      <circle cx="62" cy="108" r="4" fill="#fff" />
      <circle cx="78" cy="100" r="3" fill="#fff" />
      <circle cx="94" cy="110" r="3.5" fill="#fff" />
      <circle cx="104" cy="14" r="6" stroke={c} strokeWidth="3" />
      <circle cx="122" cy="48" r="6" stroke={c} strokeWidth="3" />
      <circle cx="128" cy="86" r="8" fill="#D9C8F5" stroke="none" />
      <circle cx="38" cy="40" r="5" fill="#D9C8F5" stroke="none" />
      <path d="M22 44l-14-6M30 24l-10-10" stroke={c} strokeWidth="3" />
    </svg>
  );
}

export function BellArt(props: SVGProps<SVGSVGElement>) {
  const c = "#CC850D";
  return (
    <svg {...base} viewBox="0 0 150 130" {...props}>
      <circle cx="112" cy="84" r="26" fill="#FBE7B0" stroke="none" />
      <g transform="rotate(14 80 70)">
        <path d="M80 18c-20 0-32 16-32 38v18c0 8-6 14-12 20h88c-6-6-12-12-12-20V56c0-22-12-38-32-38Z" fill="#FFF6DA" stroke={c} strokeWidth="4" />
        <path d="M80 18v-8" stroke={c} strokeWidth="4" />
        <circle cx="80" cy="108" r="9" fill="#FBE09A" stroke={c} strokeWidth="4" />
      </g>
      <path d="M26 54c-6 8-6 18 0 26M12 46c-10 12-10 34 0 46" stroke={c} strokeWidth="3.5" />
      <path d="M120 14l-8 14M138 36l-14 6" stroke={c} strokeWidth="3" />
    </svg>
  );
}

export function FlowArt(props: SVGProps<SVGSVGElement>) {
  const c = "#24875B";
  return (
    <svg {...base} viewBox="0 0 200 110" {...props}>
      <path d="M30 70c20-34 54-42 82-24 22 14 40 8 62-14l2 40c-24 28-62 34-90 20-22-10-38-6-56 8Z" fill="#D6EEDD" stroke="none" />
      <path d="M8 62c28 8 44-6 66-14s44 14 74-4c16-10 28-16 44-30" stroke={c} strokeWidth="3.5" />
      <path d="M24 92c24 4 40-6 62-8s38 8 66 0c22-6 34-14 44-26" stroke={c} strokeWidth="3.5" />
      <circle cx="46" cy="14" r="6" fill="#BCE0CA" stroke="none" />
      <circle cx="164" cy="12" r="5" fill="#8CCBA6" stroke="none" />
      <circle cx="118" cy="100" r="5" fill="#8CCBA6" stroke="none" />
      <circle cx="184" cy="78" r="4.5" fill="#8CCBA6" stroke="none" />
    </svg>
  );
}
