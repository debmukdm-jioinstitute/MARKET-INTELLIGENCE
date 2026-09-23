"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIpoDetail } from "@/hooks/use-ipo-list";
import { fmtInr } from "@/lib/format-india";

const TIMELINE_LABELS: { key: string; label: string }[] = [
  { key: "preApplyStartDate", label: "Pre-apply opens" },
  { key: "applicationStartDate", label: "Bidding opens" },
  { key: "applicationEndDate", label: "Bidding closes" },
  { key: "allotmentDate", label: "Allotment" },
  { key: "refundInitiationDate", label: "Refunds initiated" },
  { key: "listingDate", label: "Listing date" },
];

export function IpoDetailSheet({
  ipoId,
  open,
  onOpenChange,
}: {
  ipoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { detail, loading, error } = useIpoDetail(ipoId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail?.name ?? "IPO detail"}</SheetTitle>
          <SheetDescription>{detail?.industry}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {loading && !detail ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {detail ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat k="Price band" v={`${fmtInr(detail.minPrice)}–${fmtInr(detail.maxPrice)}`} />
                <Stat k="Cut-off price" v={detail.cutOffPrice != null ? fmtInr(detail.cutOffPrice) : "—"} />
                <Stat k="Lot size" v={detail.lotSize?.toLocaleString("en-IN") ?? "—"} />
                <Stat k="Min quantity" v={detail.minimumQuantity?.toLocaleString("en-IN") ?? "—"} />
                <Stat k="Face value" v={detail.faceValue != null ? fmtInr(detail.faceValue) : "—"} />
                <Stat k="Issue size" v={`₹${detail.issueSize} Cr`} />
                <Stat k="Exchange" v={detail.listingExchange ?? "—"} />
                <Stat k="Subscription" v={detail.totalSubscription ? `${detail.totalSubscription}x` : "—"} />
              </dl>

              <Accordion type="single" collapsible defaultValue="timeline">
                <AccordionItem value="timeline">
                  <AccordionTrigger>Timeline</AccordionTrigger>
                  <AccordionContent>
                    <dl className="space-y-1 text-sm">
                      {TIMELINE_LABELS.map(({ key, label }) => {
                        const value = detail.timeline[key as keyof typeof detail.timeline];
                        return value ? <Stat key={key} k={label} v={value} /> : null;
                      })}
                    </dl>
                  </AccordionContent>
                </AccordionItem>
                {detail.registrar ? (
                  <AccordionItem value="registrar">
                    <AccordionTrigger>Registrar</AccordionTrigger>
                    <AccordionContent>
                      <dl className="space-y-1 text-sm">
                        <Stat k="Name" v={detail.registrar.name} />
                        {detail.registrar.contactName ? (
                          <Stat k="Contact" v={detail.registrar.contactName} />
                        ) : null}
                        {detail.registrar.contactNumber ? (
                          <Stat k="Phone" v={detail.registrar.contactNumber} />
                        ) : null}
                        {detail.registrar.email ? <Stat k="Email" v={detail.registrar.email} /> : null}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                {detail.drhpUrl || detail.rhpUrl ? (
                  <AccordionItem value="docs">
                    <AccordionTrigger>Prospectus</AccordionTrigger>
                    <AccordionContent className="space-y-1 text-sm">
                      {detail.drhpUrl ? (
                        <a href={detail.drhpUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                          DRHP
                        </a>
                      ) : null}
                      {detail.rhpUrl ? (
                        <a href={detail.rhpUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                          RHP
                        </a>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
              </Accordion>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
