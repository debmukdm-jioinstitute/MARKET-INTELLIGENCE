"use client";

import type { ComponentType } from "react";
import {
  US,
  CA,
  BR,
  MX,
  CL,
  GB,
  DE,
  FR,
  EU,
  JP,
  HK,
  CN,
  SG,
  AU,
  KR,
  TW,
  ID,
  MY,
  NZ,
  IN,
} from "country-flag-icons/react/3x2";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const FLAG_BY_CODE: Record<string, ComponentType<any>> = {
  US,
  CA,
  BR,
  MX,
  CL,
  GB,
  DE,
  FR,
  EU,
  JP,
  HK,
  CN,
  SG,
  AU,
  KR,
  TW,
  ID,
  MY,
  NZ,
  IN,
};

const CODE_BY_COUNTRY: Record<string, string> = {
  "United States": "US",
  Canada: "CA",
  Brazil: "BR",
  Mexico: "MX",
  Chile: "CL",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Eurozone: "EU",
  Japan: "JP",
  "Hong Kong": "HK",
  China: "CN",
  Singapore: "SG",
  Australia: "AU",
  "South Korea": "KR",
  Taiwan: "TW",
  Indonesia: "ID",
  Malaysia: "MY",
  "New Zealand": "NZ",
  India: "IN",
};

export function CountryFlag({
  country,
  code,
  className,
  isDecorative = true,
}: {
  country?: string;
  code?: string;
  className?: string;
  isDecorative?: boolean;
}) {
  const resolvedCode = (code || (country ? CODE_BY_COUNTRY[country] : undefined))?.toUpperCase();
  const FlagComponent = resolvedCode ? FLAG_BY_CODE[resolvedCode] : null;

  if (FlagComponent) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-[#151515]/15 shadow-2xs",
          "h-[21px] w-[32px]",
          className,
        )}
        aria-hidden={isDecorative ? "true" : undefined}
        aria-label={!isDecorative ? country || resolvedCode : undefined}
      >
        <FlagComponent className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[3px] border border-[#151515]/15 bg-[#EFEFEA] text-[#62656B]",
        "h-[21px] w-[32px]",
        className,
      )}
      aria-hidden={isDecorative ? "true" : undefined}
      aria-label={!isDecorative ? country || "Global" : undefined}
      title={country || "Global"}
    >
      <Globe className="size-3.5 stroke-[1.75]" />
    </span>
  );
}
