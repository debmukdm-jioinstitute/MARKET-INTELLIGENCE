"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { MobileNav } from "@/components/marketing/mobile-nav";
import Link from "next/link";

export function LandingHeader() {
  return (
    <>
      <div className="border-b border-[#dcd6cc] bg-[#f7f4ef] py-2.5 text-center">
        <p className="text-sm text-[#3d3d3d]">
          Free to start · No card needed ·{" "}
          <Link href="#pricing" className="font-medium text-[#141414] underline underline-offset-4">
            See plans →
          </Link>
        </p>
      </div>
      <header className="sticky top-0 z-30 border-b border-[#dcd6cc] bg-[#f7f4ef]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLogo size="md" priority invertOnDark={false} />
            <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b6b6b] sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#0d6b5c]" aria-hidden />
              Sourced data
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-[#3d3d3d] md:flex">
            <Link href="/research" className="hover:text-[#141414]">
              Research
            </Link>
            <Link href="/markets/india" className="hover:text-[#141414]">
              Markets
            </Link>
            <Link href="/portfolio" className="hover:text-[#141414]">
              Portfolio
            </Link>
            <Link href="/methodology" className="hover:text-[#141414]">
              Methodology
            </Link>
            <Link
              href="/signup"
              className="rounded-none bg-[#141414] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
            >
              Start free
            </Link>
          </nav>
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </header>
    </>
  );
}
