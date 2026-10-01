"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TelegramAlertsSetupPanel } from "@/components/telegram/telegram-alerts-setup-panel";
import { cn } from "@/lib/utils";

interface TelegramModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TelegramOneClickModal({ trigger, open, onOpenChange }: TelegramModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const showModal = isControlled ? open : internalOpen;
  const setShowModal = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden border border-border/80 bg-card p-0 shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />

        <div className="relative z-10 shrink-0 border-b border-border/60 bg-card/95 px-5 py-4 sm:px-6 sm:py-5 backdrop-blur-sm">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-start gap-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sky-500/25 bg-sky-500/10 p-2 shadow-inner">
                <Image src="/integrations/telegram-logo.png" alt="" width={36} height={36} className="object-contain" />
                <span className="absolute bottom-0.5 right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">Instant Telegram alerts</DialogTitle>
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                    1-click
                  </span>
                </div>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  Breaking catalysts, options flow, and morning briefs on your phone — same stream as Yearly plan marketing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
          <TelegramAlertsSetupPanel
            onHelpClick={() => {
              setShowModal(false);
              window.location.href = "/help#telegram";
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TelegramOneClickButton({ className }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-full border border-sky-500/40 bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-transparent px-4 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 backdrop-blur-md transition-all hover:border-sky-500 hover:bg-sky-500/20 hover:scale-[1.02] active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
          className,
        )}
      >
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-sky-500" />
        </span>
        <Image src="/integrations/telegram-logo.png" alt="" width={16} height={16} className="shrink-0 object-contain" />
        <span>Telegram Bot · 1-click setup</span>
      </button>

      <TelegramOneClickModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
