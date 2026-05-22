# n8n-embedded-chat-host

A small Next.js + TypeScript + Tailwind app deployed to Cloudflare Pages that hosts the `@n8n/chat` embedded widget for one or more n8n workflows. URL path → workflow webhook mapping is supplied as a single Cloudflare env var so new chats can be added or removed without a redeploy.

Live at: `https://chat.bernhardwittmann.com/<slug>?greeting=<optional>`

## How it works

```
GET /<slug>?greeting=hello
  │
  ▼
functions/_middleware.ts
  ├─ asset/api path? → next()
  ├─ unknown slug?   → 404
  ├─ private slug + no/bad Basic auth? → 401
  └─ otherwise → serve SPA shell (out/index.html)
                  │
                  ▼
                app/page.tsx (client)
                  ├─ extractSlug(window.location.pathname)
                  ├─ fetch /api/config/<slug>  ←── functions/api/config/[slug].ts
                  ├─ greeting = ?greeting=… ?? defaultGreeting
                  └─ createChat({ webhookUrl, metadata: { greeting } })
```

Per-slug visibility:
- `private: false` → fully public.
- `private: true` → HTTP Basic Auth via global `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`.

The n8n Chat Trigger workflows are configured with **Authentication = None**; this host is the only auth boundary.

## Configuration

All runtime config lives in three Cloudflare Pages environment variables:

### `SLUG_CONFIG` (JSON string)

```json
{
  "ai-coach": {
    "webhookUrl": "https://berniwittmann.app.n8n.cloud/webhook/.../chat",
    "defaultGreeting": "Hi! I'm your AI work coach…",
    "private": true
  },
  "demo": {
    "webhookUrl": "https://berniwittmann.app.n8n.cloud/webhook/.../chat",
    "defaultGreeting": "",
    "private": false
  }
}
```

Field semantics:

**Required**
- `webhookUrl` (string): the n8n Chat Trigger webhook URL.

**Core**
- `defaultGreeting` (string, default `""`): used as `metadata.greeting` when the URL has no `?greeting=` query (or it's empty). The workflow reads this to drive a dynamic first response.
- `private` (boolean, default `false`): when true, the slug requires Basic Auth.

**Widget UI (all optional — defaults match n8n Hosted Chat)**
- `title` (string): widget header title.
- `subtitle` (string): widget header subtitle.
- `footer` (string): footer text under the input.
- `getStarted` (string): label of the welcome-screen button.
- `inputPlaceholder` (string): placeholder for the message input.
- `closeButtonTooltip` (string): tooltip for the close button (window mode only).
- `initialMessages` (string[]): bot bubbles shown before the user types anything. Independent from `defaultGreeting` — these are static UI strings; `defaultGreeting` is data sent to the workflow. **Default is `[]` (no static intro)**, not the `@n8n/chat` package default ("Hi there! 👋 My name is Nathan…"). To restore something Nathan-like, set this field explicitly.
- `mode` (`"fullscreen"` \| `"window"`, default `"fullscreen"`): page mode. `fullscreen` fills the viewport (best for a dedicated chat page); `window` floats a launcher button.
- `showWelcomeScreen` (boolean): whether to show the welcome screen with the getStarted button.
- `allowFileUploads` (boolean): enable the file-upload button.
- `allowedFilesMimeTypes` (string): comma-separated MIME types when uploads are allowed.
- `enableStreaming` (boolean): enable streaming responses from the n8n Chat Trigger. Requires the workflow's Chat Trigger response mode to be set to **Streaming response**.
- `n8nAuth` (`{ user, pass }`): Basic Auth credentials forwarded to the n8n Chat Trigger webhook on every request via the `Authorization: Basic` header. Use when the Chat Trigger has **Authentication = Basic Auth** so anyone who guesses the webhook URL can't extract data. **Setting `n8nAuth` automatically forces `private: true`** — the `/api/config/<slug>` endpoint refuses unauthenticated callers, so the credentials never leak. **The same credentials gate the Pages site for this slug** (taking precedence over the global `BASIC_AUTH_*` env vars), so one credential pair covers both the page and the webhook. Don't commit secrets to git; only set this via Cloudflare's Variables and Secrets UI.

Unknown fields are silently ignored. Entries missing `webhookUrl` are silently dropped. Invalid JSON yields an empty map (all paths return 404). Adding a slug = edit this var in the Cloudflare dashboard; the change is effective on the next request.

**How greetings work:**

The effective greeting comes from URL `?greeting=` (if non-empty) or the slug's `defaultGreeting`. It is used in two places:

1. **As `metadata.greeting`** sent to the workflow on every user message (workflows can read `{{ $json.metadata.greeting }}` for context).
2. **As the static initial bot bubble** — when `initialMessages` is not configured for the slug, the greeting becomes a one-element initial messages array, so the user sees it the moment the chat opens.

Resolution priority for the initial bubbles shown on open:

1. `cfg.initialMessages` if defined → use as-is.
2. Else, effective greeting (URL or `defaultGreeting`) if non-empty → `[greeting]`.
3. Else → `[]` (no static bubble).

This suppresses the `@n8n/chat` baked-in placeholder ("Hi there! 👋 My name is Nathan…") in every case.

`showWelcomeScreen` defaults to `false` unless the slug sets `getStarted` or explicitly opts in — the chat lands directly in conversation mode.

### `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` (optional)

Fallback credentials used only by private slugs that don't define their own `n8nAuth`. Set these only if you have private slugs without per-slug credentials.

**Auth resolution per request to a private slug:**
1. If the slug has `n8nAuth` → expected user/pass are `n8nAuth.user` / `n8nAuth.pass`.
2. Otherwise → expected user/pass are `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` env vars.
3. If neither is configured for a private slug → the slug is unreachable (every request returns 401).

This means a slug with `n8nAuth` is fully self-contained: one credential pair gates both the page and the n8n webhook, and you don't need to set the global env vars at all.

## Local development

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs Next.js without Cloudflare Functions, so `/api/config/<slug>` won't exist. Two ways to smoke-test locally:

### Option A — dev mock (no wrangler)

Set `NEXT_PUBLIC_DEV_MOCK_SLUG` etc. in `.env.local`:

```bash
NEXT_PUBLIC_DEV_MOCK_SLUG=ai-coach
NEXT_PUBLIC_DEV_MOCK_WEBHOOK_URL=https://your-n8n/webhook/.../chat
NEXT_PUBLIC_DEV_MOCK_DEFAULT_GREETING=Hi there!
```

Then visit `http://localhost:3000/ai-coach`. The client shell short-circuits the `/api/config` fetch and uses these values instead.

### Option B — wrangler pages dev (full stack)

```bash
pnpm build
npx wrangler pages dev out \
  --binding 'SLUG_CONFIG={"ai-coach":{"webhookUrl":"https://…","defaultGreeting":"hi","private":true}}' \
  --binding BASIC_AUTH_USER=admin \
  --binding BASIC_AUTH_PASSWORD=pw
```

Then `curl -i -u admin:pw http://localhost:8788/ai-coach` returns the SPA shell, and `curl -i -u admin:pw http://localhost:8788/api/config/ai-coach` returns the JSON config.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next dev server on :3000 |
| `pnpm build` | Static export to `out/` |
| `pnpm test` | vitest unit tests for `lib/` |
| `pnpm test:coverage` | tests + coverage (≥90% per file enforced) |
| `pnpm lint` | ESLint (next/core-web-vitals) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm pages:dev` | wrangler pages dev on the `out/` directory |

## Theme

The widget is styled with the [Nord palette](https://www.nordtheme.com). All Nord overrides live in `app/globals.css` as CSS custom properties that map to `@n8n/chat`'s exposed `--chat--*` variables. To change the look, edit those values in one place.

## Repository layout

```
app/                      Next.js App Router shell (client only)
  layout.tsx
  page.tsx                ← reads slug, fetches config, mounts @n8n/chat
  not-found.tsx
  globals.css

components/               (reserved for future shared UI)

functions/                Cloudflare Pages Functions (TypeScript)
  _middleware.ts          ← slug routing + basic auth + SPA-shell serve
  api/config/[slug].ts    ← GET /api/config/<slug> → { webhookUrl, defaultGreeting }

lib/                      Pure logic, fully unit-tested
  config.ts               parseSlugConfig, getSlugConfig
  greeting.ts             resolveGreeting
  auth.ts                 parseBasicAuth, isAuthorized, timingSafeEqual
  slug.ts                 extractSlug
  *.test.ts               vitest specs (≥90% coverage per file)

next.config.ts            output: 'export', static-only
tailwind.config.ts
vitest.config.ts
```

## Deploy (Cloudflare Pages)

One-time setup:

1. Push `main` to `BerniWittmann/n8n-embedded-chat-host` (this repo).
2. In Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick this repo. Settings:
   - **Build command:** `pnpm install && pnpm build`
   - **Output directory:** `out`
   - **Node version:** 20 (env var `NODE_VERSION=20` or via build settings)
4. **Environment variables** (Production):
   - `SLUG_CONFIG` — JSON, see above
   - `BASIC_AUTH_USER`
   - `BASIC_AUTH_PASSWORD`
5. **Custom domain:** add `chat.bernhardwittmann.com`. Since the zone is already on Cloudflare, the DNS record is created and verified automatically.

After the first deploy, every push to `main` triggers a new build.

## Adding a new slug

1. In Cloudflare dashboard → your Pages project → **Settings → Environment variables → SLUG_CONFIG**.
2. Edit the JSON; add a new key:
   ```json
   "new-slug": {
     "webhookUrl": "https://…/webhook/…/chat",
     "defaultGreeting": "",
     "private": false
   }
   ```
3. **Save**. No redeploy required — the next request to `https://chat.bernhardwittmann.com/new-slug` will use the new value.

Adding a private slug uses the same shared `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`. For per-slug credentials, the config schema and middleware would need an extension.

## Configuring an n8n workflow

In the workflow:

1. **Chat Trigger node** → mode = **Embedded Chat**, Authentication = **None**.
2. Copy the resulting webhook URL into your `SLUG_CONFIG` entry's `webhookUrl`.
3. In the workflow body, read the greeting via `{{ $json.metadata.greeting }}` and use it to construct the first response. The metadata is always populated (URL `?greeting=…` wins; otherwise the slug's `defaultGreeting`).
4. Save and activate.

## Testing

`pnpm test:coverage` runs all vitest specs with a v8 coverage gate (≥90% statements/branches/functions/lines per file in `lib/`).

For the Cloudflare Functions, the curl matrix in [`goals/embedded-chat-host/plan.md`](./goals/embedded-chat-host/plan.md) step 4 is the contract. Run it against either `npx wrangler pages dev out` (local) or the live domain (post-deploy).

## License

MIT — see [LICENSE](./LICENSE) if present.
