import { PasswordResetForm } from "@/components/marketing/password-reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-muted px-5 py-16">
      <PasswordResetForm token={token} />
    </main>
  );
}
