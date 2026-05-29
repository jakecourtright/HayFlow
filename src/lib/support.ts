// Server-only integration helpers for the Help assistant.
// Imported only by server actions in src/app/actions.ts, so this never ships
// to the client. Both integrations are configured purely by env vars and
// degrade gracefully when those are missing.

import { getKnowledgeBaseText } from "@/lib/help-content";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-3-5-haiku-latest";

export function isAiConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildSystemPrompt(roleLabel: string): string {
    return [
        "You are the in-app help assistant for HayFlow — software hay growers and dealers use to track inventory (bales) and send invoices.",
        `You are talking to ${roleLabel}.`,
        "",
        "Rules:",
        "- Only answer questions about using HayFlow. If asked anything off-topic, gently steer back.",
        "- Be concise and practical: a short paragraph, or short numbered steps. Plain language, warm but direct. No corporate tone. No emoji.",
        "- Base answers ONLY on the knowledge base below. Never invent features, prices, buttons, or pages that aren't described there.",
        "- If you don't know, if it's account-specific, if it's a billing dispute, or if it looks like a bug, say so plainly and tell them to tap \"Reach the team\" to reach a human.",
        "- Never ask for passwords or payment-card numbers.",
        "",
        "=== HayFlow knowledge base ===",
        getKnowledgeBaseText(),
    ].join("\n");
}

/**
 * Ask Claude a help question. Returns a reply string.
 * - No API key → returns a friendly fallback (does NOT throw).
 * - API/network error → throws, so the caller can offer escalation.
 */
export async function askClaude(args: { messages: ChatMessage[]; roleLabel: string }): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return "I'm not fully set up to answer free-form questions yet — but I can still help. Search the guides, or tap “Reach the team” and a human will follow up.";
    }

    const trimmed = args.messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
            max_tokens: 600,
            system: buildSystemPrompt(args.roleLabel),
            messages: trimmed,
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Anthropic API error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = Array.isArray(data?.content)
        ? data.content
              .filter((b: { type?: string }) => b.type === "text")
              .map((b: { text?: string }) => b.text ?? "")
              .join("\n")
              .trim()
        : "";

    return text || "I'm not sure how to answer that one. Try rephrasing, or tap “Reach the team”.";
}

export interface SupportEmailArgs {
    message: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    orgId?: string;
    page?: string;
    transcript?: ChatMessage[];
}

/**
 * Email a support escalation via Resend's REST API (no SDK dependency).
 * Returns true if accepted. No RESEND_API_KEY → returns false (caller still
 * persists the request to the DB, so nothing is lost).
 */
export async function sendSupportEmail(args: SupportEmailArgs): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;

    const to = process.env.SUPPORT_EMAIL_TO || "jake@courtrightent.com";
    const from = process.env.SUPPORT_EMAIL_FROM || "HayFlow Help <onboarding@resend.dev>";

    const lines: string[] = [
        "New HayFlow support request",
        "",
        `From: ${args.fromName || "Unknown user"}${args.fromEmail ? ` <${args.fromEmail}>` : ""}`,
    ];
    if (args.orgId) lines.push(`Org: ${args.orgId}`);
    if (args.page) lines.push(`Page: ${args.page}`);
    lines.push("", "Message:", args.message);

    if (args.transcript && args.transcript.length > 0) {
        lines.push("", "--- Chat transcript ---");
        for (const m of args.transcript) {
            lines.push(`${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
        }
    }

    const subjectBase = args.message.replace(/\s+/g, " ").trim();
    const subject = `HayFlow help: ${subjectBase.slice(0, 60)}${subjectBase.length > 60 ? "…" : ""}`;

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            from,
            to,
            ...(args.replyTo || args.fromEmail ? { reply_to: args.replyTo || args.fromEmail } : {}),
            subject,
            text: lines.join("\n"),
        }),
    });

    return res.ok;
}
