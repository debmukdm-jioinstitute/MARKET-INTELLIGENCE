"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NAV_COLUMNS } from "@/lib/nav-columns";

const COLUMNS = NAV_COLUMNS;

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => {
          cancelClose();
          setOpen(true);
        }}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 transition ${open ? "text-gray-900" : "hover:text-gray-900"}`}
      >
        Explore
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="fixed inset-x-0 top-[52px] z-40 border-b border-border bg-white shadow-[var(--shadow-lg)]">
          <div className="animate-dropdown-item mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-6 px-5 py-8 sm:grid-cols-3 lg:grid-cols-5">
            {COLUMNS.map((col, i) => (
              <div key={col.title} className={i > 0 ? "border-border sm:border-l sm:pl-8" : ""}>
                <p className="mb-3 text-[11px] font-bold tracking-wider text-blue-600 uppercase">{col.title}</p>
                <ul className="space-y-0.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="group -mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                      >
                        <span className="text-[13px] font-medium text-gray-900 group-hover:text-blue-600">
                          {item.label}
                        </span>
                        <span className="text-[11.5px] leading-snug text-muted-foreground">{item.desc}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border bg-muted/40 px-5 py-3">
            <p className="mx-auto max-w-6xl text-[12px] text-muted-foreground">
              New to the terminal?{" "}
              <Link href="/signup" className="font-medium text-blue-600 hover:underline underline-offset-4">
                Create a free account →
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
