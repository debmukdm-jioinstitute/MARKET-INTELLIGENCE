"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { isAllowedHref } from "@/lib/site-assistant/site-map";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

function messageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function SiteAssistantChat() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const [draft, setDraft] = useState("");
  const addToolOutputRef = useRef<
    ((args: { tool: string; toolCallId: string; output: unknown }) => void) | null
  >(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/site-assistant",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: { ...body, messages, id, pathname },
        }),
      }),
    [pathname],
  );

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const submit = addToolOutputRef.current;
      if (!submit) return;

      if (toolCall.toolName === "navigate") {
        const input = toolCall.input as { href?: string; label?: string };
        const href = input.href?.trim() ?? "";
        if (!isAllowedHref(href)) {
          submit({
            tool: "navigate",
            toolCallId: toolCall.toolCallId,
            output: { ok: false, error: "That path is not on the portal allowlist." },
          });
          return;
        }
        router.push(href);
        submit({
          tool: "navigate",
          toolCallId: toolCall.toolCallId,
          output: { ok: true, href, label: input.label ?? href },
        });
        return;
      }

      if (toolCall.toolName === "open_command_palette") {
        setPaletteOpen(true);
        submit({
          tool: "open_command_palette",
          toolCallId: toolCall.toolCallId,
          output: { ok: true },
        });
      }
    },
  });

  addToolOutputRef.current = addToolOutput;

  const busy = status === "streaming" || status === "submitted";

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    await sendMessage({ text });
  }, [draft, busy, sendMessage]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask how to find a feature, where a tool lives, or say &quot;take me to stress backtest&quot;. I can open pages
            and the command palette for symbol search.
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {messageText(m) || (m.role === "assistant" && busy ? "…" : "")}
          </div>
        ))}
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}
      </div>
      <form
        className="flex shrink-0 gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Ask about navigation or tools…"
          className="min-h-[2.75rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send message"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

export function SiteAssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-95 md:bottom-6 md:right-6"
        aria-label="Open portal assistant"
      >
        <MessageCircle className="size-4" />
        Assistant
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background outline-none">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                <div>
                  <Drawer.Title className="text-sm font-semibold">Portal assistant</Drawer.Title>
                  <p className="text-xs text-muted-foreground">Navigation, tools, and product help</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close assistant"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <SiteAssistantChat />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
