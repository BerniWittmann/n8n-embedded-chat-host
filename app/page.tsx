"use client";

import { useEffect, useState } from "react";
import { extractSlug } from "@/lib/slug";
import { resolveGreeting } from "@/lib/greeting";

type ConfigResponse = {
  webhookUrl: string;
  defaultGreeting: string;
  title?: string;
  subtitle?: string;
  footer?: string;
  getStarted?: string;
  inputPlaceholder?: string;
  closeButtonTooltip?: string;
  initialMessages?: string[];
  mode?: "window" | "fullscreen";
  showWelcomeScreen?: boolean;
  allowFileUploads?: boolean;
  allowedFilesMimeTypes?: string;
  enableStreaming?: boolean;
  n8nAuth?: { user: string; pass: string };
};

type Status = "loading" | "ready" | "not-found" | "error";

// Defaults that mirror n8n's Hosted Chat look. Any field in the slug
// config overrides the corresponding default.
const I18N_DEFAULTS = {
  title: "Hi there! 👋",
  subtitle: "Start a chat. We're here to help you 24/7.",
  footer: "",
  getStarted: "New Conversation",
  inputPlaceholder: "Type your question..",
  closeButtonTooltip: "",
};

export default function HomePage() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    const slug = extractSlug(window.location.pathname);
    if (!slug) {
      setStatus("not-found");
      return;
    }

    (async () => {
      try {
        let cfg: ConfigResponse;
        // Dev-only fallback so `pnpm dev` works without wrangler.
        // In production the Cloudflare Function serves this endpoint.
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_MOCK_SLUG === slug
        ) {
          cfg = {
            webhookUrl: process.env.NEXT_PUBLIC_DEV_MOCK_WEBHOOK_URL ?? "",
            defaultGreeting:
              process.env.NEXT_PUBLIC_DEV_MOCK_DEFAULT_GREETING ?? "",
          };
        } else {
          const res = await fetch(`/api/config/${encodeURIComponent(slug)}`);
          if (res.status === 404) {
            if (!cancelled) setStatus("not-found");
            return;
          }
          if (!res.ok) {
            if (!cancelled) setStatus("error");
            return;
          }
          cfg = (await res.json()) as ConfigResponse;
        }

        const urlGreeting = new URLSearchParams(window.location.search).get(
          "greeting",
        );
        const greeting = resolveGreeting(urlGreeting, cfg.defaultGreeting);

        const { createChat } = await import("@n8n/chat");
        // Resolve the static intro bubbles shown when the chat opens.
        // Priority:
        //   1. cfg.initialMessages (explicit array)
        //   2. [greeting] when greeting is non-empty
        //   3. [] (empty — suppresses the @n8n/chat baked-in "Nathan" default)
        // `metadata.greeting` is still forwarded for workflows that
        // explicitly read it from the chat trigger payload.
        const initialMessages: string[] =
          cfg.initialMessages ?? (greeting ? [greeting] : []);

        // Forward Basic Auth to the n8n Chat Trigger webhook when configured.
        const webhookConfig = cfg.n8nAuth
          ? {
              method: "POST" as const,
              headers: {
                Authorization:
                  "Basic " + btoa(`${cfg.n8nAuth.user}:${cfg.n8nAuth.pass}`),
              },
            }
          : undefined;

        createChat({
          webhookUrl: cfg.webhookUrl,
          ...(webhookConfig ? { webhookConfig } : {}),
          mode: cfg.mode ?? "fullscreen",
          target: "#n8n-chat",
          metadata: { greeting },
          initialMessages,
          ...(typeof cfg.showWelcomeScreen === "boolean"
            ? { showWelcomeScreen: cfg.showWelcomeScreen }
            : {}),
          // Skip the welcome screen entirely when neither it nor a getStarted
          // label is configured — default landing is the chat itself.
          ...(typeof cfg.showWelcomeScreen !== "boolean" && !cfg.getStarted
            ? { showWelcomeScreen: false }
            : {}),
          ...(typeof cfg.allowFileUploads === "boolean"
            ? { allowFileUploads: cfg.allowFileUploads }
            : {}),
          ...(cfg.allowedFilesMimeTypes
            ? { allowedFilesMimeTypes: cfg.allowedFilesMimeTypes }
            : {}),
          ...(typeof cfg.enableStreaming === "boolean"
            ? { enableStreaming: cfg.enableStreaming }
            : {}),
          afterMessageSent: () => {
            // The widget auto-grows the textarea up to 480px via inline
            // `style.height` but only resets that on input/focus/mousedown,
            // never after a successful send. Reset it ourselves so the
            // input snaps back to a single-line resting state.
            const ta = document.querySelector<HTMLTextAreaElement>(
              '#n8n-chat textarea[data-test-id="chat-input"]',
            );
            if (ta) ta.style.height = "var(--chat--textarea--height)";
          },
          i18n: {
            en: {
              title: cfg.title ?? I18N_DEFAULTS.title,
              subtitle: cfg.subtitle ?? I18N_DEFAULTS.subtitle,
              footer: cfg.footer ?? I18N_DEFAULTS.footer,
              getStarted: cfg.getStarted ?? I18N_DEFAULTS.getStarted,
              inputPlaceholder:
                cfg.inputPlaceholder ?? I18N_DEFAULTS.inputPlaceholder,
              closeButtonTooltip:
                cfg.closeButtonTooltip ?? I18N_DEFAULTS.closeButtonTooltip,
            },
          },
        });
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "not-found") {
    return (
      <ErrorScreen
        code="404"
        title="This chat does not exist."
        subtitle="Check the URL or contact whoever shared this link with you."
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorScreen
        code="500"
        title="Something went wrong."
        subtitle="Please try again in a moment."
      />
    );
  }

  return (
    <main className="h-full w-full flex justify-center bg-[var(--nord0)] sm:p-4">
      <div
        id="n8n-chat"
        className="w-full max-w-3xl h-full overflow-hidden bg-[var(--nord0)] sm:rounded-lg sm:shadow-2xl sm:shadow-black/40 sm:border sm:border-[var(--nord2)]"
      />
    </main>
  );
}

function ErrorScreen({
  code,
  title,
  subtitle,
}: {
  code: string;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="h-full w-full flex items-center justify-center px-6 bg-[var(--nord0)] text-[var(--nord6)]">
      <div className="flex flex-col items-center text-center max-w-xl">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-20 h-20 sm:w-24 sm:h-24 text-[var(--nord13,#ebcb8b)] mb-6"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h1 className="text-7xl sm:text-8xl font-bold tracking-tight text-[var(--nord6)] mb-4">
          {code}
        </h1>
        <p className="text-2xl sm:text-3xl font-semibold text-[var(--nord6)] mb-3">
          {title}
        </p>
        <p className="text-base sm:text-lg text-[var(--nord4)]">{subtitle}</p>
      </div>
    </main>
  );
}
