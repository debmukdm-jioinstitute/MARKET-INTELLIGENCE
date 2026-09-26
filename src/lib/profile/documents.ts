/**
 * Every document a member can find in their profile. Add an entry here and it appears for ALL accounts
 * (new and existing) - nothing is stored per user.
 */
export type ProfileDocument = {
  id: string;
  title: string;
  description: string;
  /** letter = founder welcome letter (view + email a copy); form = onboarding form (PDF/HTML); link = page on the site */
  kind: "letter" | "form" | "link";
  href?: string;
};

export const PROFILE_DOCUMENTS: ProfileDocument[] = [
  {
    id: "founder-letter",
    title: "Welcome letter from the founder",
    description: "The note every member receives from Debabrata Mukherjee, with the places to start. Read it here or email yourself a copy.",
    kind: "letter",
  },
  {
    id: "onboarding-form",
    title: "Customer onboarding form",
    description: "Your account details, every product feature, subscribed services and disclaimers. Always regenerated from the current catalog, so it is up to date.",
    kind: "form",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "What we collect, why, and how to reach us about your data.",
    kind: "link",
    href: "/privacy",
  },
  {
    id: "terms",
    title: "Terms of Service",
    description: "The rules for using Market Intelligence, including that it is research and education only.",
    kind: "link",
    href: "/terms",
  },
  {
    id: "setup-guide",
    title: "AI assistant and terminal setup guide",
    description: "Connect Claude Code, Cursor or Claude Desktop, or install the mi terminal app, step by step.",
    kind: "link",
    href: "/help",
  },
];
