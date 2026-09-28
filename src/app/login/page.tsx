import { AuthForm } from "@/components/marketing/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Market Intelligence",
  description: "Sign in to your saved watchlists, portfolio, and research desk.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; expired?: string }>;
}) {
  const { next, error, expired } = await searchParams;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-muted px-5 py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(26,115,232,0.06),transparent)]" />
      <AuthForm mode="login" next={next} oauthError={error} sessionExpired={expired === "1"} />
    </main>
  );
}
