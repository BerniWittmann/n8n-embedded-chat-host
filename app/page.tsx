"use client";

import { useEffect, useState } from "react";
import { extractSlug } from "@/lib/slug";
import { resolveGreeting } from "@/lib/greeting";

type ConfigResponse = {
  webhookUrl: string;
  defaultGreeting: string;
};

type Status = "loading" | "ready" | "not-found" | "error";

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
          metadata: { greeting },
          target: "#n8n-chat",
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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div id="n8n-chat" className="w-full max-w-2xl" />
    </main>
  );
}
