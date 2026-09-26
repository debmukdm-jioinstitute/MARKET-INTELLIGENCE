import { ONBOARDING_DISCLAIMERS } from "@/lib/onboarding/disclaimers";
import {
  getOnboardingCatalogVersion,
  listPlatformCapabilities,
  listProductFeatures,
  listSubscribedServices,
} from "@/lib/onboarding/product-catalog";
import type { SessionUser } from "@/lib/auth";

export type OnboardingFormModel = {
  catalogVersion: string;
  generatedAt: string;
  siteUrl: string;
  customer: {
    name: string;
    email: string;
    customerId: string;
    role: string;
    accountOpenedAt: string | null;
    privacyAcceptedAt: string | null;
  };
  productFeatures: ReturnType<typeof listProductFeatures>;
  subscribedServices: ReturnType<typeof listSubscribedServices>;
  platformCapabilities: ReturnType<typeof listPlatformCapabilities>;
  disclaimers: typeof ONBOARDING_DISCLAIMERS;
  legalLinks: { privacy: string; terms: string };
};

type DbUser = {
  created_at?: Date | string;
  privacy_accepted_at?: Date | string | null;
};

export function buildCustomerId(email: string, createdAt?: Date | string | null): string {
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "USER";
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `MI-${local}-${year}`;
}

export function buildOnboardingFormModel(
  user: SessionUser,
  dbUser: DbUser | null,
  enabledFlags: Record<string, boolean>,
  siteUrl: string,
): OnboardingFormModel {
  const features = listProductFeatures();
  const created = dbUser?.created_at ? new Date(dbUser.created_at).toISOString() : null;
  const privacy = dbUser?.privacy_accepted_at ? new Date(dbUser.privacy_accepted_at).toISOString() : null;

  return {
    catalogVersion: getOnboardingCatalogVersion(),
    generatedAt: new Date().toISOString(),
    siteUrl,
    customer: {
      name: user.name,
      email: user.email,
      customerId: buildCustomerId(user.email, dbUser?.created_at),
      role: user.role,
      accountOpenedAt: created,
      privacyAcceptedAt: privacy,
    },
    productFeatures: features,
    subscribedServices: listSubscribedServices(features),
    platformCapabilities: listPlatformCapabilities(enabledFlags),
    disclaimers: ONBOARDING_DISCLAIMERS,
    legalLinks: {
      privacy: `${siteUrl}/privacy`,
      terms: `${siteUrl}/terms`,
    },
  };
}
