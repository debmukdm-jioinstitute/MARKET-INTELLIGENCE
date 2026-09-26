import { AuthForm } from "@/components/marketing/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-muted px-5 py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(26,115,232,0.06),transparent)]" />
      <AuthForm mode="signup" next={next} oauthError={error} />
    </main>
  );
}
