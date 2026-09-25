import { SiteAssistantConfigError } from "@/lib/ai/omniroute";
import { buildSiteAssistantSystemPrompt } from "@/lib/site-assistant/prompt";
import { selectSiteAssistantTier } from "@/lib/site-assistant/select-tier";
import { ragContextForQuestion } from "@/lib/site-assistant/rag-context";
import { checkSiteAssistantRateLimit } from "@/lib/site-assistant/rate-limit";
import {
  clientNavigateTool,
  clientOpenPaletteTool,
  createServerSiteAssistantTools,
} from "@/lib/site-assistant/tools";
import { getSessionUser } from "@/lib/session";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    if (text?.trim()) return text.trim();
  }
  return "";
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the portal assistant." }, { status: 401 });
  }

  const rateKey = user.email;
  const limited = checkSiteAssistantRateLimit(rateKey);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many assistant requests. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: UIMessage[];
    pathname?: string;
  } | null;

  const messages = body?.messages;
  if (!messages?.length) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const pathname = typeof body?.pathname === "string" ? body.pathname : "/";
  const userQuestion = lastUserText(messages);
  const ragSnippet = userQuestion ? await ragContextForQuestion(userQuestion) : undefined;

  try {
    const system = buildSiteAssistantSystemPrompt(pathname, ragSnippet);
    const tier = await selectSiteAssistantTier(system);

    const result = streamText({
      model: tier.model,
      system,
      messages: await convertToModelMessages(messages),
      tools: {
        ...createServerSiteAssistantTools(),
        navigate: clientNavigateTool,
        open_command_palette: clientOpenPaletteTool,
      },
      stopWhen: stepCountIs(6),
    });

    const response = result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: (error) => {
        console.error("[site-assistant]", tier.label, error);
        return error instanceof Error ? error.message : "Assistant stream failed";
      },
    });

    response.headers.set("X-MI-Assistant-Provider", tier.label);
    return response;
  } catch (e) {
    if (e instanceof SiteAssistantConfigError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Assistant request failed" },
      { status: 502 },
    );
  }
}
