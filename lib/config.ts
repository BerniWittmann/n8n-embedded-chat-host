export type SlugEntry = {
  webhookUrl: string;
  defaultGreeting: string;
  private: boolean;
  /** Optional UI/widget options forwarded to `createChat`. All optional. */
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
  /**
   * Optional Basic Auth credentials forwarded to the n8n Chat Trigger
   * webhook on every request. Setting this field implicitly forces the
   * slug to `private: true` so the config endpoint cannot leak the
   * credentials to unauthenticated callers.
   */
  n8nAuth?: { user: string; pass: string };
};

export type SlugConfigMap = Record<string, SlugEntry>;

function pickString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function pickBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function pickStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((x): x is string => typeof x === "string");
  return arr.length === v.length ? arr : undefined;
}

function pickMode(v: unknown): "window" | "fullscreen" | undefined {
  return v === "window" || v === "fullscreen" ? v : undefined;
}

function pickN8nAuth(v: unknown): { user: string; pass: string } | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const obj = v as Record<string, unknown>;
  const user = typeof obj.user === "string" ? obj.user : undefined;
  const pass = typeof obj.pass === "string" ? obj.pass : undefined;
  if (!user || !pass) return undefined;
  return { user, pass };
}

/**
 * Parse the `SLUG_CONFIG` env var (JSON) into a typed map.
 * Returns an empty map on invalid JSON or non-object input.
 * Fills in defaults: `defaultGreeting=""`, `private=false`.
 * Entries missing a non-empty `webhookUrl` are dropped.
 */
export function parseSlugConfig(raw: string | null | undefined): SlugConfigMap {
  if (!raw || typeof raw !== "string") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const out: SlugConfigMap = {};
  for (const [slug, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const webhookUrl = pickString(entry.webhookUrl) ?? "";
    if (!webhookUrl) continue;
    const result: SlugEntry = {
      webhookUrl,
      defaultGreeting: pickString(entry.defaultGreeting) ?? "",
      private: pickBool(entry.private) ?? false,
    };

    const title = pickString(entry.title);
    if (title !== undefined) result.title = title;
    const subtitle = pickString(entry.subtitle);
    if (subtitle !== undefined) result.subtitle = subtitle;
    const footer = pickString(entry.footer);
    if (footer !== undefined) result.footer = footer;
    const getStarted = pickString(entry.getStarted);
    if (getStarted !== undefined) result.getStarted = getStarted;
    const inputPlaceholder = pickString(entry.inputPlaceholder);
    if (inputPlaceholder !== undefined)
      result.inputPlaceholder = inputPlaceholder;
    const closeButtonTooltip = pickString(entry.closeButtonTooltip);
    if (closeButtonTooltip !== undefined)
      result.closeButtonTooltip = closeButtonTooltip;
    const initialMessages = pickStringArray(entry.initialMessages);
    if (initialMessages !== undefined) result.initialMessages = initialMessages;
    const mode = pickMode(entry.mode);
    if (mode !== undefined) result.mode = mode;
    const showWelcomeScreen = pickBool(entry.showWelcomeScreen);
    if (showWelcomeScreen !== undefined)
      result.showWelcomeScreen = showWelcomeScreen;
    const allowFileUploads = pickBool(entry.allowFileUploads);
    if (allowFileUploads !== undefined)
      result.allowFileUploads = allowFileUploads;
    const allowedFilesMimeTypes = pickString(entry.allowedFilesMimeTypes);
    if (allowedFilesMimeTypes !== undefined)
      result.allowedFilesMimeTypes = allowedFilesMimeTypes;
    const enableStreaming = pickBool(entry.enableStreaming);
    if (enableStreaming !== undefined) result.enableStreaming = enableStreaming;
    const n8nAuth = pickN8nAuth(entry.n8nAuth);
    if (n8nAuth !== undefined) {
      result.n8nAuth = n8nAuth;
      // Hard invariant: credentials require gating. The /api/config
      // endpoint only enforces auth for private slugs, so forcing
      // private here prevents accidental credential exposure.
      result.private = true;
    }

    out[slug] = result;
  }
  return out;
}

/**
 * Look up a slug. Returns null when not present.
 */
export function getSlugConfig(
  map: SlugConfigMap,
  slug: string | null | undefined,
): SlugEntry | null {
  if (!slug) return null;
  return Object.prototype.hasOwnProperty.call(map, slug) ? map[slug] : null;
}

/**
 * Strip server-only fields (`private`) from an entry to produce the
 * public response body returned by `/api/config/<slug>`.
 */
export function toPublicConfig(entry: SlugEntry): Omit<SlugEntry, "private"> {
  const { private: _omit, ...rest } = entry;
  void _omit;
  return rest;
}
