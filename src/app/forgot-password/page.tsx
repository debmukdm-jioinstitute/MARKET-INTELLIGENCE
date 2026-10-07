import { PasswordResetForm } from "@/components/marketing/password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-muted px-5 py-16">
      <PasswordResetForm />
    </main>
  );
}
