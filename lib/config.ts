export type SlugEntry = {
  webhookUrl: string;
  defaultGreeting: string;
  private: boolean;
};

export type SlugConfigMap = Record<string, SlugEntry>;

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
  for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const webhookUrl = typeof entry.webhookUrl === "string" ? entry.webhookUrl : "";
    if (!webhookUrl) continue;
    const defaultGreeting =
      typeof entry.defaultGreeting === "string" ? entry.defaultGreeting : "";
    const isPrivate =
      typeof entry.private === "boolean" ? entry.private : false;
    out[slug] = { webhookUrl, defaultGreeting, private: isPrivate };
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
