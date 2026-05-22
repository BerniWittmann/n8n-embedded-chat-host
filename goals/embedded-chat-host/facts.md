# Facts

- The project is a Next.js (App Router) app written in TypeScript and styled with Tailwind, configured for static export (`output: 'export'`), with the same baseline setup as the ava-music repo.
- The app is deployed to Cloudflare Pages, served from the custom domain `chat.bernhardwittmann.com`.
- Routing is path-based: visiting `/<slug>` mounts the embedded chat configured for that slug. The root path `/` returns a 404 (or simple 'not found' page). Unknown slugs return a 404.
- Slug-to-workflow configuration is supplied at runtime via a single Cloudflare env var containing JSON (e.g. `SLUG_CONFIG`). Adding, removing, or editing a slug requires only updating that env var — no code change or redeploy.
- Each slug entry in the config has: `webhookUrl` (n8n chat webhook), `defaultGreeting` (string, may be empty), and `private` (boolean, default `false`).
- When a user opens `/<slug>?greeting=<value>`, the `<value>` is URL-decoded and passed to the embedded chat as `createChat({ metadata: { greeting } })`. The greeting is never shown as a chat message.
- When `?greeting=` is missing or empty, the slug's configured `defaultGreeting` is used instead. The chat always loads with some greeting value in metadata.
- `createChat` is called with `webhookUrl` taken from the slug config (not hardcoded in source).
- The n8n Chat Trigger nodes that this host serves have Authentication set to None; the host page is the only auth boundary.
- A Cloudflare Pages Function middleware enforces HTTP Basic Auth only on slugs whose config has `private: true`. Public slugs are reachable without credentials; private slugs return 401 with `WWW-Authenticate: Basic` until valid credentials are provided.
- Basic auth username and password are stored as Cloudflare env vars (e.g. `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`) and use the same credentials as the n8n instance's basic auth.
- Public static assets (favicon, CSS, JS chunks) are reachable without auth so that the page can load before the user sees the basic-auth prompt only on private slugs.
- The chat page renders the @n8n/chat widget centered on a neutral background matching the current n8n hosted chat look, with no extra page chrome (no header, nav, or footer).
- The page is responsive: the chat widget is usable on mobile widths (≤375px) and on desktop without horizontal scrolling.
- Unit tests cover: (a) parsing `SLUG_CONFIG` JSON into typed config, (b) resolving a slug to its config, (c) computing the effective greeting from URL param + config default, (d) deciding public vs private based on the slug.
- Source lives in a public GitHub repository named `n8n-embedded-chat-host` under the BerniWittmann account, with a README describing setup, env var format, and deploy instructions.
- Pushes to `main` automatically build and deploy to Cloudflare Pages via Cloudflare's GitHub integration (no separate GitHub Actions deploy job needed).
- The existing workflow (`vzXTteUPEAbSzHwk`) is migrated from Hosted Chat to Embedded Chat: its Chat Trigger has Authentication = None, and a slug entry pointing at its webhook URL is added to `SLUG_CONFIG`. The workflow reads the greeting from the chat trigger's metadata to produce a dynamic first response.
