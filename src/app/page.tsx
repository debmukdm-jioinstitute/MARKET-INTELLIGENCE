import { LandingPage } from "@/components/marketing/landing-page";

export const revalidate = 3600;

export default function Home() {
  return <LandingPage />;
}
