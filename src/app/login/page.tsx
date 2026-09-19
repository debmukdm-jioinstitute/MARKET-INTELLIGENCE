import { AuthForm } from "@/components/marketing/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f3] px-5 py-16">
      <AuthForm mode="login" next={next} />
    </main>
  );
}
