"use client";

import {
  MI_CONTENT_SAVED,
  MI_EDIT_QUERY,
  MI_REQUEST_SLOTS,
  MI_SELECT_SLOT,
  MI_SLOTS,
  type MiSelectSlotMessage,
} from "@/lib/site-content";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export function LiveEditOverlay() {
  const searchParams = useSearchParams();
  const editMode = searchParams.get(MI_EDIT_QUERY) === "1";

  const notifySlots = useCallback(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-mi-slot]");
    const slots = Array.from(nodes).map((el) => ({
      slotKey: el.dataset.miSlot ?? "",
      field: el.dataset.miField ?? "text",
      label: el.dataset.miLabel ?? el.dataset.miSlot ?? "Content",
      text: (el.textContent ?? "").trim(),
    }));
    window.parent.postMessage({ type: MI_SLOTS, slots }, window.location.origin);
  }, []);

  useEffect(() => {
    if (!editMode) return;

    document.documentElement.classList.add("mi-live-edit");
    notifySlots();

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-mi-slot]");
      if (!target?.dataset.miSlot) return;
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll("[data-mi-slot]").forEach((el) => el.classList.remove("mi-slot-selected"));
      target.classList.add("mi-slot-selected");
      const msg: MiSelectSlotMessage = {
        type: MI_SELECT_SLOT,
        slotKey: target.dataset.miSlot,
        field: target.dataset.miField ?? "text",
        label: target.dataset.miLabel ?? target.dataset.miSlot,
        value: (target.textContent ?? "").trim(),
      };
      window.parent.postMessage(msg, window.location.origin);
    };

    const observer = new MutationObserver(() => notifySlots());
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    document.addEventListener("click", onClick, true);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === MI_CONTENT_SAVED) {
        void fetch("/api/portal/content", { cache: "no-store" })
          .then(() => {
            window.dispatchEvent(new CustomEvent(MI_CONTENT_SAVED, { bubbles: true }));
          })
          .catch(() => {});
      }
      if (event.data?.type === MI_REQUEST_SLOTS) {
        notifySlots();
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      document.documentElement.classList.remove("mi-live-edit");
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMessage);
    };
  }, [editMode, notifySlots]);

  if (!editMode) return null;

  return (
    <style>{`
      .mi-live-edit [data-mi-slot] {
        cursor: pointer;
        outline: 2px dashed transparent;
        outline-offset: 4px;
        border-radius: 4px;
        transition: outline-color 0.15s ease, background 0.15s ease;
      }
      .mi-live-edit [data-mi-slot]:hover {
        outline-color: rgb(59 130 246 / 0.55);
        background: rgb(59 130 246 / 0.06);
      }
      .mi-live-edit [data-mi-slot].mi-slot-selected {
        outline-color: rgb(37 99 235);
        background: rgb(59 130 246 / 0.12);
      }
      .mi-live-edit [data-mi-slot] {
        position: relative;
        z-index: 40;
      }
      .mi-live-edit .site-assistant-widget {
        pointer-events: none !important;
        opacity: 0.25;
      }
    `}</style>
  );
}
