export type LearnLevel = "Beginner" | "Intermediate" | "Advanced";

export type LearnSection = {
  heading?: string;
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
};

/** A live page on the site that applies the concept (the "smart mapping"). */
export type LearnTool = {
  label: string;
  href: string;
  blurb: string;
};

export type LearnChapter = {
  slug: string;
  title: string;
  summary: string;
  /** Approximate reading time in minutes. */
  minutes: number;
  sections: LearnSection[];
  takeaways: string[];
  tools: LearnTool[];
  /** Related chapters as "module/chapter" keys. */
  related?: string[];
  /** Slug this chapter used under the old flat /learn/<slug> URLs (redirected). */
  legacySlug?: string;
};

export type LearnModule = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  level: LearnLevel;
  /** Matches the NAV section it explains, for cross-linking. */
  navSection: string;
  /** Tailwind classes: accent text + soft background. */
  accent: { text: string; bg: string; border: string; dot: string };
  chapters: LearnChapter[];
};
