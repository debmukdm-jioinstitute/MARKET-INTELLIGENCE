import { AuthForm } from "@/components/marketing/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-black px-5 py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,159,10,0.1),transparent)]" />
      <AuthForm mode="signup" next={next} />
    </main>
  );
}
