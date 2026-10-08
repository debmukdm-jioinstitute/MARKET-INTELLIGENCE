"use client";

import { GoogleSignInButton } from "@/components/marketing/google-sign-in-button";
import { PrivacyAcceptanceField } from "@/components/marketing/privacy-acceptance-field";
import { useAuth } from "@/components/providers/auth-provider";
import { prefetchIndiaDashboard } from "@/hooks/use-india-dashboard";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useMemo, useRef, useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured on this server yet.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Try again or use email.",
  google_state_invalid: "Google sign-in expired. Try again.",
  google_missing_code: "Google sign-in incomplete. Try again.",
  accounts_unavailable: "Accounts are not available on this deployment.",
  privacy_required: "Accept the Privacy Policy and Terms below, then try Google or email sign-up again.",
};

function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={error ? "text-sm font-medium text-destructive" : "text-sm font-medium text-foreground"}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({
  mode,
  next = "/Home",
  oauthError,
  sessionExpired,
  fromDemo,
  fromLogin,
  referralCode,
}: {
  mode: "login" | "signup";
  next?: string;
  oauthError?: string | null;
  sessionExpired?: boolean;
  fromDemo?: boolean;
  fromLogin?: boolean;
  /** Referral code from ?ref= — carried into Google OAuth. */
  referralCode?: string;
}) {
  const { login, signup, enterGuest, isGuest, guestAllowed, verifySignup, resendSignupOtp } = useAuth();
  const router = useRouter();
  const dest = next.startsWith("/") ? next : "/Home";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [pending, setPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(true);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const otpBusy = useRef(false);

  useEffect(() => {
    void prefetchIndiaDashboard();
    void fetch("/api/homedashboard/headlines", { cache: "no-store" }).catch(() => {});
  }, []);
  const privacyRef = useRef<HTMLInputElement>(null);
  const isSignup = mode === "signup";
  const showDemoMigration = isSignup && (fromDemo || isGuest);
  const awaitingOtp = isSignup && Boolean(otpEmail);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (mode !== "signup") return;
    try {
      const raw = sessionStorage.getItem("mi_signup_prefill");
      if (!raw) return;
      sessionStorage.removeItem("mi_signup_prefill");
      const parsed = JSON.parse(raw) as { email?: string; password?: string };
      if (parsed.email) setEmail(parsed.email);
      if (parsed.password) setPassword(parsed.password);
    } catch {
      /* ignore corrupt prefill */
    }
  }, [mode]);

  const oauthMessage = useMemo(
    () => (oauthError ? (OAUTH_ERRORS[oauthError] ?? "Sign-in error.") : ""),
    [oauthError],
  );

  function validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Enter an email address in the form name@example.com.";
    }
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setEmailError("");
    setPrivacyError("");

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      emailRef.current?.focus();
      return;
    }

    if (isSignup && !acceptPrivacy) {
      setPrivacyError("You must accept the Privacy Policy and Terms to create an account.");
      privacyRef.current?.focus();
      return;
    }

    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        const result = await signup({
          name: String(data.get("name") ?? name).trim() || "Investor",
          email: email.trim(),
          password: String(data.get("password") ?? password),
          acceptPrivacy: true,
        });
        if (result.pending) {
          setOtpEmail(email.trim().toLowerCase());
          setOtpCode("");
          setResendIn(45);
          setPending(false);
          return;
        }
      } else {
        const loginPassword = String(data.get("password") ?? password);
        try {
          await login({
            email: email.trim(),
            password: loginPassword,
          });
        } catch (loginErr) {
          const code =
            loginErr instanceof Error
              ? (loginErr as Error & { code?: string }).code
              : undefined;
          if (code === "account_not_found") {
            try {
              sessionStorage.setItem(
                "mi_signup_prefill",
                JSON.stringify({ email: email.trim(), password: loginPassword }),
              );
            } catch {
              /* storage full / private mode */
            }
            router.push(
              `/signup?next=${encodeURIComponent(dest)}&from=login`,
            );
            return;
          }
          throw loginErr;
        }
      }
      if (isSignup) {
        router.push(`/onboarding?next=${encodeURIComponent(dest)}&download=1`);
      } else {
        router.push(dest);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(message);
      if (/email|account|password/i.test(message)) {
        emailRef.current?.focus();
      }
    } finally {
      setPending(false);
    }
  }

  async function onContinueDemo() {
    setFormError("");
    setGuestPending(true);
    try {
      await enterGuest();
      router.push(dest);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not start demo session.");
    } finally {
      setGuestPending(false);
    }
  }

  function onGoogleBlocked() {
    setPrivacyError("Accept the Privacy Policy and Terms below before continuing with Google.");
    privacyRef.current?.focus();
  }

  async function submitOtp(code: string) {
    if (!otpEmail || code.length !== 6 || pending || otpBusy.current) return;
    otpBusy.current = true;
    setPending(true);
    setFormError("");
    try {
      await verifySignup({ email: otpEmail, code });
      router.push(`/onboarding?next=${encodeURIComponent(dest)}&download=1`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not verify that code.");
      otpRef.current?.focus();
    } finally {
      otpBusy.current = false;
      setPending(false);
    }
  }

  async function onResendCode() {
    if (!otpEmail || resendIn > 0 || pending) return;
    setFormError("");
    setPending(true);
    try {
      await resendSignupOtp(otpEmail);
      setResendIn(45);
      setOtpCode("");
      otpRef.current?.focus();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setPending(false);
    }
  }

  const submitLabel = pending
    ? isSignup
      ? "Creating your account…"
      : "Signing you in…"
    : isSignup
      ? "Start free"
      : "Continue with email";

  return (
    <div className="relative mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-lg)]">
      <BrandLogo size="md" priority />

      {sessionExpired && mode === "login" ? (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground" role="status">
          <p className="font-semibold">Your session expired</p>
          <p className="mt-1 text-muted-foreground">
            Your saved watchlists and desk are still on your account. Sign in again and we will return you to where you left off.
          </p>
        </div>
      ) : null}

      <h1 className="mt-8 text-[28px] leading-tight font-semibold text-foreground">
        {awaitingOtp ? "Check your email" : mode === "signup" ? "Create a free account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {awaitingOtp
          ? `Enter the 6-digit code we sent to ${otpEmail}. Check spam and Promotions if it is not in your inbox within a minute.`
          : mode === "signup"
            ? "Open a virtual desk in seconds. No brokerage. No card."
            : "Continue to your saved watchlists and research."}
      </p>

      {showDemoMigration && !awaitingOtp ? (
        <div className="mt-4 rounded-lg border border-blue-600/20 bg-blue-600/5 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold text-blue-700">Saving after demo</p>
          <p className="mt-1 text-muted-foreground">
            Guest mode does not save anything. After sign-up, your watchlists, portfolio holdings, and alert rules will save to this account.
          </p>
        </div>
      ) : null}

      {fromLogin && isSignup && !awaitingOtp ? (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground" role="status">
          <p className="font-semibold text-foreground">Create your account</p>
          <p className="mt-1 text-muted-foreground">
            We did not find an account for that email. Your details are filled in below — accept the terms and finish sign-up.
          </p>
        </div>
      ) : null}

      {awaitingOtp ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitOtp(otpCode);
          }}
        >
          <AuthField id="auth-otp" label="Verification code" error={formError || undefined}>
            <input
              ref={otpRef}
              id="auth-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(next);
                if (formError) setFormError("");
                if (next.length === 6) void submitOtp(next);
              }}
              aria-invalid={Boolean(formError)}
              className={`${inputClass} tracking-[0.4em] tabular-nums`}
              placeholder="000000"
            />
          </AuthField>
          <button
            type="submit"
            disabled={pending || otpCode.length !== 6}
            aria-busy={pending}
            className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] transition hover:bg-primary/90 hover:shadow-[var(--shadow-md)] disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Verify email"}
          </button>
          <div className="flex flex-col items-center gap-2 pt-1 text-sm text-muted-foreground">
            <button
              type="button"
              disabled={pending || resendIn > 0}
              onClick={() => void onResendCode()}
              className="font-semibold text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOtpEmail(null);
                setOtpCode("");
                setFormError("");
              }}
              className="underline-offset-4 hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      ) : (
        <>
      <div className={`space-y-3 ${isSignup ? "mt-6" : "mt-8"}`}>
        <GoogleSignInButton
          next={dest}
          disabled={pending || guestPending}
          privacyAccepted={isSignup ? acceptPrivacy : undefined}
          onPrivacyRequired={isSignup ? onGoogleBlocked : undefined}
          referralCode={isSignup ? referralCode : undefined}
        />
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
        {mode === "signup" ? (
          <AuthField id="auth-name" label="Full name">
            <input
              id="auth-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={inputClass}
              placeholder="Your name"
            />
          </AuthField>
        ) : null}

        <AuthField id="auth-email" label="Email address" error={emailError || undefined}>
          <input
            ref={emailRef}
            id="auth-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            autoComplete="email"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "auth-email-error" : undefined}
            className={inputClass}
            placeholder="name@example.com"
          />
        </AuthField>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            {!isSignup ? (
              <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            ) : null}
          </div>
          <input
            id="auth-password"
            name="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputClass}
            placeholder={isSignup ? "At least 6 characters" : "Your password"}
          />
        </div>

        {isSignup ? (
          <div className="pt-1">
            <PrivacyAcceptanceField
              id="accept-privacy"
              checked={acceptPrivacy}
              onChange={(checked) => {
                setAcceptPrivacy(checked);
                if (checked) setPrivacyError("");
              }}
              inputRef={privacyRef}
            />
            {privacyError ? (
              <p className="mt-1.5 text-sm text-destructive" role="alert">
                {privacyError}
              </p>
            ) : null}
          </div>
        ) : null}

        {oauthMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {oauthMessage}
          </p>
        ) : null}
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] transition hover:bg-primary/90 hover:shadow-[var(--shadow-md)] disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </form>

      {mode === "login" && guestAllowed ? (
        <div className="mt-6 rounded-xl border-2 border-primary/15 bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">Just exploring?</p>
          <p className="mt-1 text-sm text-muted-foreground">Browse live market data as a guest — no account required.</p>
          <button
            type="button"
            disabled={guestPending || pending}
            aria-busy={guestPending}
            onClick={() => void onContinueDemo()}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full border-2 border-primary bg-white text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-50"
          >
            {guestPending ? "Opening demo…" : "Continue to demo"}
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(dest)}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(dest)}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              Create a free account
            </Link>
          </>
        )}
      </p>
        </>
      )}
    </div>
  );
}
