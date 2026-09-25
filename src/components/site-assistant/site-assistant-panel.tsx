"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import {
  nudgesForSkill,
  pickDidYouKnow,
  scoreSkillFromMcq,
  SKILL_LEVEL_LABELS,
  SKILL_MCQ,
  suggestionsForSkill,
  type SkillLevel,
} from "@/lib/site-assistant/education";
import { AssistantMessageBody } from "@/components/site-assistant/assistant-message-body";
import { isAllowedHref } from "@/lib/site-assistant/site-map";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Lightbulb, Loader2, Send, Sparkles, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HINT_STORAGE_KEY = "mi.assistant.hint.dismissed";
const SKILL_STORAGE_KEY = "mi.assistant.skill";
const ASSISTANT_TITLE = "Ask Deb";
const ASSISTANT_TAGLINE = "Your AI Assistant";

const GOOGLE_FLIP_EASE = [0.4, 0, 0.2, 1] as const;

const FLIP_TAGLINES = [
  { text: ASSISTANT_TAGLINE, className: "text-primary" },
  { text: "Navigate the portal in seconds", className: "text-muted-foreground" },
  { text: "Scanner · macro · portfolio · more", className: "text-muted-foreground" },
] as const;

const HINT_FLIP_LINES = [
  { text: "Ask Deb", className: "text-foreground" },
  { text: "Your AI Assistant", className: "text-primary" },
  { text: "Find tools in minutes", className: "text-foreground" },
] as const;

const CAPABILITIES = [
  { icon: "🧭", label: "Guide you across Today · Invest · Trade · Portfolio · Data" },
  { icon: "🎓", label: "Beginner → advanced paths, AI tools & pro quant" },
  { icon: "⌘K", label: "Open symbol search & commands" },
] as const;

function loadStoredSkill(): SkillLevel | null {
  try {
    const v = localStorage.getItem(SKILL_STORAGE_KEY);
    if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function SkillMcqPanel({ onComplete }: { onComplete: (level: SkillLevel) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const q = SKILL_MCQ[step];
  if (!q) return null;

  const pick = (optionId: string) => {
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    if (step >= SKILL_MCQ.length - 1) {
      onComplete(scoreSkillFromMcq(next));
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -8 }}
      animate={{ opacity: 1, rotateX: 0 }}
      className="rounded-xl border border-primary/25 bg-accent/40 p-3"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <GraduationCap className="size-3.5" aria-hidden />
        Skill check · {step + 1}/{SKILL_MCQ.length}
      </div>
      <p className="text-sm font-medium text-foreground">{q.prompt}</p>
      <div className="mt-2 space-y-1.5">
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => pick(o.id)}
            className="w-full rounded-lg border border-border/80 bg-card px-2.5 py-2 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-accent/50"
          >
            {o.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function DidYouKnowBanner({ seed }: { seed: number }) {
  const tip = pickDidYouKnow(seed);
  return (
    <div className="rounded-xl border border-[#fef7e0] bg-[#fef7e0]/60 px-3 py-2.5">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[#f9ab00]" aria-hidden />
        <span>
          <span className="font-semibold text-[#b06000]">Did you know? </span>
          {tip.fact}
          {tip.href && tip.label ? (
            <>
              {" "}
              <Link href={tip.href} className="font-semibold text-primary hover:underline">
                {tip.label} →
              </Link>
            </>
          ) : null}
        </span>
      </p>
    </div>
  );
}

function GoogleFlipText({
  lines,
  intervalMs = 3200,
  className,
  lineClassName,
}: {
  lines: ReadonlyArray<{ text: string; className?: string }>;
  intervalMs?: number;
  className?: string;
  lineClassName?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
    return () => clearInterval(id);
  }, [lines.length, intervalMs]);

  const line = lines[index]!;

  return (
    <div className={cn("assistant-flip-stage relative w-full", className)} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={line.text}
          initial={{ rotateX: -88, opacity: 0, y: 4 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: 88, opacity: 0, y: -4 }}
          transition={{ duration: 0.52, ease: GOOGLE_FLIP_EASE }}
          className={cn(
            "assistant-flip-face absolute inset-x-0 block truncate text-left",
            lineClassName,
            line.className,
          )}
        >
          {line.text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function messageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function SiteAssistantChat({
  skillLevel,
  onSkillLevel,
  onPickSuggestion,
}: {
  skillLevel: SkillLevel | null;
  onSkillLevel: (level: SkillLevel) => void;
  onPickSuggestion: (text: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const [draft, setDraft] = useState("");
  const [mcqOpen, setMcqOpen] = useState(false);
  const [triviaSeed, setTriviaSeed] = useState(0);
  const suggestions = useMemo(
    () => suggestionsForSkill(skillLevel ?? "beginner"),
    [skillLevel],
  );
  const nudges = useMemo(() => nudgesForSkill(skillLevel ?? "beginner"), [skillLevel]);

  useEffect(() => {
    const id = setInterval(() => setTriviaSeed((s) => s + 1), 9000);
    return () => clearInterval(id);
  }, []);
  const addToolOutputRef = useRef<
    ((args: { tool: string; toolCallId: string; output: unknown }) => void) | null
  >(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/site-assistant",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: { ...body, messages, id, pathname, skillLevel: skillLevel ?? undefined },
        }),
      }),
    [pathname, skillLevel],
  );

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const submit = addToolOutputRef.current;
      if (!submit) return;

      if (toolCall.toolName === "navigate") {
        const input = toolCall.input as { href?: string; label?: string };
        const href = input.href?.trim() ?? "";
        if (!isAllowedHref(href)) {
          submit({
            tool: "navigate",
            toolCallId: toolCall.toolCallId,
            output: { ok: false, error: "That path is not on the portal allowlist." },
          });
          return;
        }
        router.push(href);
        submit({
          tool: "navigate",
          toolCallId: toolCall.toolCallId,
          output: { ok: true, href, label: input.label ?? href },
        });
        return;
      }

      if (toolCall.toolName === "open_command_palette") {
        setPaletteOpen(true);
        submit({
          tool: "open_command_palette",
          toolCallId: toolCall.toolCallId,
          output: { ok: true },
        });
      }
    },
  });

  addToolOutputRef.current = addToolOutput;

  const busy = status === "streaming" || status === "submitted";

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    await sendMessage({ text });
  }, [draft, busy, sendMessage]);

  const sendText = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setDraft("");
      await sendMessage({ text: t });
    },
    [busy, sendMessage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hi — I&apos;m <span className="font-semibold text-foreground">{ASSISTANT_TITLE}</span>, your guide across the whole portal
              (beginner-friendly or pro tools). Tell me your goal, or take the quick skill check so I nudge the right features.
            </p>

            {!skillLevel && !mcqOpen ? (
              <button
                type="button"
                onClick={() => setMcqOpen(true)}
                className="w-full rounded-xl border border-dashed border-primary/40 bg-accent/30 px-3 py-2.5 text-left text-xs font-medium text-primary transition hover:bg-accent/60"
              >
                🎓 New here? 4 quick questions — I&apos;ll tailor Today, Invest, Trade &amp; AI tools for you
              </button>
            ) : null}
            {mcqOpen ? (
              <SkillMcqPanel
                onComplete={(level) => {
                  onSkillLevel(level);
                  setMcqOpen(false);
                }}
              />
            ) : null}
            {skillLevel && !mcqOpen ? (
              <p className="text-xs text-muted-foreground">
                Level:{" "}
                <span className="font-semibold text-primary">{SKILL_LEVEL_LABELS[skillLevel]}</span>
                {" · "}
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setMcqOpen(true)}>
                  Retake quiz
                </button>
              </p>
            ) : null}

            <DidYouKnowBanner seed={triviaSeed} />

            {nudges[0] ? (
              <Link
                href={nudges[0].href}
                className="block rounded-xl border border-border/90 bg-card p-2.5 shadow-sm transition hover:border-primary/35 hover:bg-accent/30"
              >
                <p className="text-xs font-semibold text-foreground">
                  {nudges[0].title}
                  {nudges[0].badge ? (
                    <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{nudges[0].badge}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{nudges[0].body}</p>
                <span className="mt-1 inline-block text-xs font-semibold text-primary">{nudges[0].cta} →</span>
              </Link>
            ) : null}

            <ul className="space-y-1.5">
              {CAPABILITIES.map((c, i) => (
                <motion.li
                  key={c.label}
                  initial={{ opacity: 0, rotateX: -12, y: 6 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.4, ease: GOOGLE_FLIP_EASE }}
                  className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-2 text-xs text-foreground"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground">
                    {c.icon}
                  </span>
                  {c.label}
                </motion.li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.25 }}
                  disabled={busy}
                  onClick={() => {
                    onPickSuggestion(s);
                    void sendText(s);
                  }}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/60 disabled:opacity-50"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              m.role === "user"
                ? "ml-auto max-w-[94%] rounded-xl bg-primary px-3 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm"
                : "max-w-full rounded-xl border border-border/80 bg-card px-3 py-2.5 text-card-foreground shadow-sm",
            )}
          >
            {m.role === "assistant" ? (
              messageText(m) ? (
                <AssistantMessageBody text={messageText(m)} />
              ) : busy ? (
                <span className="text-sm text-muted-foreground">…</span>
              ) : null
            ) : (
              <p className="text-sm leading-relaxed">{messageText(m)}</p>
            )}
          </motion.div>
        ))}
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error.message}
          </p>
        ) : null}
      </div>
      <form
        className="flex shrink-0 gap-2 border-t border-border bg-background/95 p-2.5 backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder={`Ask ${ASSISTANT_TITLE}…`}
          className="max-h-20 min-h-[2.25rem] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition hover:opacity-95 active:scale-95 disabled:opacity-50"
          aria-label="Send message to Ask Deb"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function AssistantFab({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex size-14 items-center justify-center">
      {!open ? (
        <>
          <span className="assistant-fab-ring absolute inset-0 rounded-full border border-primary/25" aria-hidden />
          <span className="assistant-fab-ring assistant-fab-ring-delay absolute inset-0 rounded-full border border-primary/15" aria-hidden />
        </>
      ) : null}
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-expanded={open}
        aria-label={open ? `Close ${ASSISTANT_TITLE}` : `${ASSISTANT_TITLE} — ${ASSISTANT_TAGLINE}`}
        className={cn(
          "relative z-[1] flex size-14 items-center justify-center overflow-hidden rounded-full",
          "border border-border/90 bg-white shadow-[var(--shadow-lg)] transition-shadow",
          "dark:bg-card dark:border-border",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ duration: 0.45, ease: GOOGLE_FLIP_EASE }}
              style={{ transformOrigin: "center center" }}
              className="assistant-flip-face text-foreground"
            >
              <X className="size-6" strokeWidth={2.25} />
            </motion.span>
          ) : (
            <motion.span
              key="logo"
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 0.45, ease: GOOGLE_FLIP_EASE }}
              style={{ transformOrigin: "center center" }}
              className="assistant-flip-face flex size-full items-center justify-center p-2"
            >
              <img
                src="/logo.png"
                alt=""
                aria-hidden
                className="size-10 object-contain mix-blend-multiply dark:invert"
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export function SiteAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);

  useEffect(() => {
    setSkillLevel(loadStoredSkill());
  }, []);

  const persistSkill = (level: SkillLevel) => {
    setSkillLevel(level);
    try {
      localStorage.setItem(SKILL_STORAGE_KEY, level);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_STORAGE_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setHintVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dismissHint = () => {
    setHintVisible(false);
    try {
      localStorage.setItem(HINT_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) dismissHint();
  };

  return (
    <div className="pointer-events-none fixed bottom-[4.75rem] right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      <AnimatePresence>
        {hintVisible && !open ? (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 10, scale: 0.92, rotateX: -14 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 8, scale: 0.94, rotateX: 10 }}
            transition={{ duration: 0.48, ease: GOOGLE_FLIP_EASE }}
            className="assistant-panel-perspective pointer-events-auto relative mr-1 max-w-[min(calc(100vw-5rem),340px)]"
          >
            <div className="flex items-center gap-2.5 rounded-full border border-border/90 bg-card py-2.5 pl-3 pr-2 shadow-[var(--shadow-lg)]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fef7e0]">
                <Zap className="size-4 fill-[#fbbc04] text-[#f9ab00]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 py-0.5">
                <GoogleFlipText
                  lines={HINT_FLIP_LINES}
                  intervalMs={2800}
                  className="h-5"
                  lineClassName="text-sm font-semibold leading-snug"
                />
              </div>
              <button
                type="button"
                onClick={dismissHint}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Dismiss suggestion"
              >
                <X className="size-4" />
              </button>
            </div>
            <span
              className="absolute -bottom-1.5 right-6 size-3 rotate-45 border-b border-r border-border/90 bg-card"
              aria-hidden
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.section
            key="panel"
            role="dialog"
            aria-label={`${ASSISTANT_TITLE} — ${ASSISTANT_TAGLINE}`}
            initial={{ opacity: 0, y: 14, rotateX: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, rotateX: 12, scale: 0.97 }}
            transition={{ duration: 0.5, ease: GOOGLE_FLIP_EASE }}
            className="assistant-panel-perspective pointer-events-auto flex w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-[var(--shadow-lg)]"
            style={{ maxHeight: "min(78vh, 520px)", transformOrigin: "bottom right" }}
          >
            <header className="flex items-center gap-2.5 border-b border-border bg-gradient-to-r from-accent/80 via-card to-card px-3.5 py-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{ASSISTANT_TITLE}</h2>
                <GoogleFlipText
                  lines={FLIP_TAGLINES}
                  intervalMs={3400}
                  className="mt-0.5 h-4"
                  lineClassName="text-xs font-medium"
                />
              </div>
              {skillLevel ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {SKILL_LEVEL_LABELS[skillLevel]}
                </span>
              ) : null}
            </header>
            <SiteAssistantChat
              skillLevel={skillLevel}
              onSkillLevel={persistSkill}
              onPickSuggestion={() => dismissHint()}
            />
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto">
        <AssistantFab open={open} onToggle={toggle} />
      </div>
    </div>
  );
}
