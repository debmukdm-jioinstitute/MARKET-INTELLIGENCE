"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

import { useAuth } from "@/components/providers/auth-provider";
import { usePushSubscription } from "@/components/layout/push-notifications-toggle";
import { downloadOnboardingFormHtml } from "@/lib/onboarding/render-form-html";
import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { ONBOARDING_DISCLAIMERS } from "@/lib/onboarding/disclaimers";
import type { ProfileDocument } from "@/lib/profile/documents";
import type { ProfileData } from "@/lib/profile/load-profile";
import type { AssistantActionRow } from "@/lib/site-assistant/audit";
import { cn } from "@/lib/utils";
import { Bug, FileText, LogOut, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type ApiProfile = { profile: ProfileData; documents: ProfileDocument[]; founder: { name: string; email: string } };

const fmtDate = (iso: string | null) => {
  if (!iso) return "Not recorded";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) + " IST";
  } catch {
    return iso;
  }
};

const ASSISTANT_ACTION_LABELS: Record<string, string> = {
  add_holding: "Added a holding",
  remove_holding: "Removed a holding",
  create_alert: "Created an alert",
  update_settings: "Updated portfolio settings",
};

const btn = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = cn(btn, "bg-primary text-primary-foreground hover:bg-primary/90");
const btnGhost = cn(btn, "border border-border hover:bg-muted");

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({ on, busy, onChange, label }: { on: boolean; busy?: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50", on ? "bg-primary" : "bg-muted-foreground/30")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function PrefRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function AssistantActivitySection() {
  const [actions, setActions] = useState<AssistantActionRow[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/site-assistant/audit")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load Ask Deb activity");
        return j.actions as AssistantActionRow[];
      })
      .then(setActions)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load Ask Deb activity"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Section
      id="assistant-activity"
      title="Ask Deb activity"
      subtitle="Every change Ask Deb made to your account, on your instruction — what it did, when, and whether it worked."
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Deb only acts on your own account, on your say-so, and asks before removing a holding or changing settings.
        </p>
        <button type="button" className={btnGhost} onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {!error && actions && actions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing yet. Ask Deb to add a holding, create an alert, or change a setting, and it shows up here.
        </p>
      ) : null}

      {actions && actions.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {actions.map((a) => {
            const isOpen = openId === a.id;
            return (
              <li key={a.id} className="py-3 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          a.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                        )}
                      >
                        {a.ok ? "Done" : "Failed"}
                      </span>
                      <p className="text-sm font-medium text-foreground">{ASSISTANT_ACTION_LABELS[a.tool] ?? a.tool}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</span>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setOpenId(isOpen ? null : a.id)}
                    >
                      {isOpen ? "Hide details" : "Details"}
                    </button>
                  </div>
                </div>
                {isOpen ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                    {JSON.stringify(a.params, null, 2)}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}

export function ProfileClient() {
  const { logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "";

  const [data, setData] = useState<ApiProfile | null>(null);
  const [error, setError] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [prefBusy, setPrefBusy] = useState(false);
  const push = usePushSubscription();

  const [letter, setLetter] = useState<{ subject: string; html: string } | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busyDoc, setBusyDoc] = useState("");

  const [bug, setBug] = useState({ title: "", details: "", severity: "medium", pageUrl: from });
  const [bugState, setBugState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load your profile");
        return j as ApiProfile;
      })
      .then((j) => {
        if (cancelled) return;
        setData(j);
        setNewsletter(j.profile.newsletterSubscribed);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load your profile"));
    return () => {
      cancelled = true;
    };
  }, []);

  const changeNewsletter = useCallback(async (next: boolean) => {
    setPrefBusy(true);
    setNewsletter(next);
    try {
      const r = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ newsletter: next }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not save");
    } catch (e) {
      setNewsletter(!next);
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Could not save your preference" });
    } finally {
      setPrefBusy(false);
    }
  }, []);

  const openLetter = async () => {
    setLetterOpen((o) => !o);
    if (letter) return;
    setBusyDoc("founder-letter");
    try {
      const r = await fetch("/api/profile/welcome-letter");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not load the letter");
      setLetter(j);
    } catch (e) {
      setLetterOpen(false);
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Could not load the letter" });
    } finally {
      setBusyDoc("");
    }
  };

  const emailLetter = async () => {
    setBusyDoc("email-letter");
    setNote(null);
    try {
      const r = await fetch("/api/profile/welcome-letter", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not send the email");
      setNote({ tone: "ok", text: `Sent to ${j.sentTo}. Check your inbox (and spam) in a minute.` });
    } catch (e) {
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Could not send the email" });
    } finally {
      setBusyDoc("");
    }
  };

  const downloadHtml = async () => {
    setBusyDoc("form-html");
    try {
      const r = await fetch("/api/onboarding/form");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not build the form");
      downloadOnboardingFormHtml(j as OnboardingFormModel);
    } catch (e) {
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Could not build the form" });
    } finally {
      setBusyDoc("");
    }
  };

  const submitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    setBugState({ status: "sending" });
    try {
      const r = await fetch("/api/bug-report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bug) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not send the report");
      setBugState({ status: "done", message: j.emailed ? "Sent to the founder. Thank you, this genuinely helps." : "Saved. The founder will see it; email delivery is unavailable right now." });
      setBug({ title: "", details: "", severity: "medium", pageUrl: from });
    } catch (err) {
      setBugState({ status: "error", message: err instanceof Error ? err.message : "Could not send the report" });
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }
  if (!data) return <div className="py-12 flex justify-center"><GlassLoader variant="page" message="Loading your investor profile..." detail="Retrieving account settings, portfolio records & API permissions" statusBadge="ACCOUNT SECURITY VERIFIED" icon="shield" /></div>;

  const { profile, documents, founder } = data;
  const initial = (profile.name || profile.email).trim().charAt(0).toUpperCase();
  const mailtoBug = `mailto:${founder.email}?subject=${encodeURIComponent("Bug report: Market Intelligence")}&body=${encodeURIComponent(`What happened:\n\nWhat I expected:\n\nPage: ${from || "(add the page)"}\nAccount: ${profile.email}\n`)}`;
  const mailtoKey = `mailto:${founder.email}?subject=${encodeURIComponent("API key request")}&body=${encodeURIComponent(`Hi ${founder.name.split(" ")[0]}, please issue an API key for the AI assistant and terminal.\nAccount: ${profile.email}`)}`;
  const mailtoDelete = `mailto:${founder.email}?subject=${encodeURIComponent("Account deletion request")}&body=${encodeURIComponent(`Please delete my Market Intelligence account and data.\nAccount: ${profile.email}`)}`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Identity */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">{initial}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-foreground">{profile.name}</h1>
            {profile.role === "admin" ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Admin</span> : null}
            {profile.isPro ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Pro{profile.proExpiresAt ? ` · until ${fmtDate(profile.proExpiresAt)}` : ""}
              </span>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Customer ID</dt>
              <dd className="font-medium text-foreground">{profile.customerId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Member since</dt>
              <dd className="font-medium text-foreground">{fmtDate(profile.memberSince)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sign-in</dt>
              <dd className="font-medium text-foreground">{profile.signInMethod === "google" ? "Google" : profile.signInMethod === "password" ? "Email and password" : "Account"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Privacy accepted</dt>
              <dd className="font-medium text-foreground">{fmtDate(profile.privacyAcceptedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {note ? (
        <p role="status" className={cn("rounded-xl border px-4 py-3 text-sm", note.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}>
          {note.text}
        </p>
      ) : null}

      {/* Documents */}
      <Section id="documents" title="My documents" subtitle="Everything we've given you or that governs your account. Available to every member, including those who joined before this page existed.">
        <ul className="divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {d.kind === "letter" ? (
                    <>
                      <button type="button" onClick={openLetter} className={btnPrimary}>
                        {letterOpen ? "Hide letter" : busyDoc === "founder-letter" ? "Loading…" : "Read letter"}
                      </button>
                      <button type="button" onClick={emailLetter} disabled={busyDoc === "email-letter"} className={btnGhost}>
                        <Mail className="size-4" aria-hidden />
                        {busyDoc === "email-letter" ? "Sending…" : "Email me a copy"}
                      </button>
                    </>
                  ) : null}
                  {d.kind === "form" ? (
                    <>
                      <a href="/api/profile/onboarding-pdf" className={btnPrimary}>
                        Download PDF
                      </a>
                      <button type="button" onClick={downloadHtml} disabled={busyDoc === "form-html"} className={btnGhost}>
                        Download HTML
                      </button>
                    </>
                  ) : null}
                  {d.kind === "link" && d.href ? (
                    <Link href={d.href} className={btnGhost}>
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
              {d.kind === "letter" && letterOpen && letter ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Subject:</span> {letter.subject}
                  </p>
                  <iframe title="Welcome letter from the founder" sandbox="" srcDoc={letter.html} className="h-[640px] w-full bg-white" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <details className="mt-5 rounded-xl border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            <ShieldCheck className="mr-1.5 inline size-4 text-primary" aria-hidden />
            Important disclaimers
          </summary>
          <ul className="mt-3 space-y-3">
            {ONBOARDING_DISCLAIMERS.map((x) => (
              <li key={x.title}>
                <p className="text-sm font-medium text-foreground">{x.title}</p>
                <p className="text-sm text-muted-foreground">{x.body}</p>
              </li>
            ))}
          </ul>
        </details>
      </Section>

      {/* Preferences */}
      <Section id="preferences" title="Preferences" subtitle="Control what we send you.">
        <PrefRow title="Newsletter" desc="Market wrap-ups and product updates by email. You can switch this off any time.">
          <Toggle on={newsletter} busy={prefBusy} onChange={changeNewsletter} label="Newsletter emails" />
        </PrefRow>
        {push.supported ? (
          <PrefRow title="Push notifications" desc="Alerts for market moves, the daily brief and scanner hits on this device.">
            <Toggle on={push.subscribed} busy={push.busy} onChange={() => push.toggle()} label="Push notifications on this device" />
          </PrefRow>
        ) : null}
        <PrefRow title="AI assistant and terminal access" desc="Use your own AI assistant or the mi terminal app with our data. You need an API key from the founder.">
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row">
            <Link href="/help" className={btnGhost}>
              Setup guide
            </Link>
            <a href={mailtoKey} className={btnGhost}>
              Request a key
            </a>
          </div>
        </PrefRow>
        <PrefRow title="Guided tour" desc="Replay the quick tour of the terminal.">
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              try {
                localStorage.removeItem("hasSeenTour");
                sessionStorage.setItem("replayGuidedTour", "true");
              } catch {
                /* ignore */
              }
              router.push("/Home");
            }}
          >
            Replay tour
          </button>
        </PrefRow>
      </Section>

      {/* Ask Deb activity */}
      <AssistantActivitySection />

      {/* Bug report */}
      <Section id="report" title="Found a bug? Email the founder" subtitle={`Your note goes straight to ${founder.name}, who reads every one. Reply to the email you get back and it reaches you directly.`}>
        {bugState.status === "done" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {bugState.message}{" "}
            <button type="button" className="font-medium underline" onClick={() => setBugState({ status: "idle" })}>
              Report another
            </button>
          </div>
        ) : (
          <form onSubmit={submitBug} className="space-y-3">
            <div>
              <label htmlFor="bug-title" className="mb-1 block text-sm font-medium text-foreground">
                What went wrong?
              </label>
              <input
                id="bug-title"
                value={bug.title}
                onChange={(e) => setBug({ ...bug, title: e.target.value })}
                maxLength={120}
                required
                placeholder="e.g. Option chain shows blank for BANKNIFTY"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label htmlFor="bug-details" className="mb-1 block text-sm font-medium text-foreground">
                Details
              </label>
              <textarea
                id="bug-details"
                value={bug.details}
                onChange={(e) => setBug({ ...bug, details: e.target.value })}
                maxLength={4000}
                required
                rows={5}
                placeholder="What did you do, what did you expect, and what happened instead?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="bug-page" className="mb-1 block text-sm font-medium text-foreground">
                  Page (optional)
                </label>
                <input
                  id="bug-page"
                  value={bug.pageUrl}
                  onChange={(e) => setBug({ ...bug, pageUrl: e.target.value })}
                  maxLength={300}
                  placeholder="/markets/india"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label htmlFor="bug-sev" className="mb-1 block text-sm font-medium text-foreground">
                  How bad is it?
                </label>
                <select
                  id="bug-sev"
                  value={bug.severity}
                  onChange={(e) => setBug({ ...bug, severity: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="low">Minor, cosmetic or small annoyance</option>
                  <option value="medium">Something doesn&apos;t work as expected</option>
                  <option value="high">Blocking, I can&apos;t use a feature</option>
                </select>
              </div>
            </div>
            {bugState.status === "error" ? <p className="text-sm text-destructive">{bugState.message}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={bugState.status === "sending"} className={btnPrimary}>
                <Bug className="size-4" aria-hidden />
                {bugState.status === "sending" ? "Sending…" : "Send to the founder"}
              </button>
              <a href={mailtoBug} className="text-sm text-primary hover:underline">
                Or open it in your email app
              </a>
              <span className="text-xs text-muted-foreground">Sent as {profile.email}. We include the browser you&apos;re using.</span>
            </div>
          </form>
        )}
      </Section>

      {/* Account */}
      <Section id="account" title="Account">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnGhost}
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
          <a href={mailtoDelete} className="text-sm text-muted-foreground hover:text-destructive hover:underline">
            Request account deletion
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Deletion requests are handled by the founder by email. Market Intelligence is an educational tool, not investment advice.
        </p>
      </Section>
    </div>
  );
}
