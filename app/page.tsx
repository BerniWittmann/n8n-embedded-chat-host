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
        createChat({
          webhookUrl: cfg.webhookUrl,
          mode: cfg.mode ?? "fullscreen",
          target: "#n8n-chat",
          metadata: { greeting },
          ...(cfg.initialMessages
            ? { initialMessages: cfg.initialMessages }
            : {}),
          ...(typeof cfg.showWelcomeScreen === "boolean"
            ? { showWelcomeScreen: cfg.showWelcomeScreen }
            : {}),
          ...(typeof cfg.allowFileUploads === "boolean"
            ? { allowFileUploads: cfg.allowFileUploads }
            : {}),
          ...(cfg.allowedFilesMimeTypes
            ? { allowedFilesMimeTypes: cfg.allowedFilesMimeTypes }
            : {}),
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
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">404</h1>
          <p className="text-neutral-600">This chat does not exist.</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-neutral-600">Please try again later.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div id="n8n-chat" className="min-h-screen" />
    </main>
  );
}
