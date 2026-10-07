import { AuthForm } from "@/components/marketing/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | Market Intelligence",
  description: "Create a free Market Intelligence account — no brokerage, no card.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; from?: string; ref?: string }>;
}) {
  const { next, error, from, ref } = await searchParams;
  const referralCode = ref && /^[A-Z0-9-]{3,16}$/i.test(ref.trim()) ? ref.trim().toUpperCase() : undefined;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-muted px-5 py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(26,115,232,0.06),transparent)]" />
      <AuthForm
        mode="signup"
        next={next}
        oauthError={error}
        fromDemo={from === "demo"}
        fromLogin={from === "login"}
        referralCode={referralCode}
      />
    </main>
  );
}
