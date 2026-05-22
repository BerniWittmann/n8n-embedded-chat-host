/**
 * Resolve the effective greeting from the URL `?greeting=` param and the
 * slug's configured default. Non-empty URL param wins; otherwise default.
 */
export function resolveGreeting(
  urlParam: string | null | undefined,
  defaultGreeting: string,
): string {
  if (typeof urlParam === "string" && urlParam.length > 0) {
    return urlParam;
  }
  return defaultGreeting ?? "";
}
