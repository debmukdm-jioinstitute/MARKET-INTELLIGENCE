import { OnboardingFormClient } from "@/components/onboarding/onboarding-form-client";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata = {
  title: "Customer onboarding · Market Intelligence",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; download?: string }>;
}) {
  const { next, download } = await searchParams;
  const dest = next?.startsWith("/") ? next : "/Home";
  const autoDownload = download === "1";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-muted px-5 py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(26,115,232,0.06),transparent)]" />
      <div className="relative mx-auto w-full max-w-lg rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-lg)]">
        <BrandLogo size="md" priority invertOnDark={false} />
        <h1 className="mt-6 text-2xl font-semibold text-foreground">Your onboarding form</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Auto-filled with your account details, every product feature on the site, subscribed services, and
          disclaimers. Updates when we ship new navigation items.
        </p>
        <div className="mt-8">
          <OnboardingFormClient next={dest} autoDownload={autoDownload} />
        </div>
      </div>
    </main>
  );
}
