import { describe, it, expect } from "vitest";
import { extractSlug } from "./slug";

describe("extractSlug", () => {
  it("returns the first segment for /demo", () => {
    expect(extractSlug("/demo")).toBe("demo");
  });

  it("returns null for /", () => {
    expect(extractSlug("/")).toBeNull();
  });

  it("returns null for multi-segment paths", () => {
    expect(extractSlug("/demo/extra")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractSlug("")).toBeNull();
  });

  it("strips trailing slash", () => {
    expect(extractSlug("/demo/")).toBe("demo");
  });

  it("handles slugs with hyphens", () => {
    expect(extractSlug("/ai-coach")).toBe("ai-coach");
  });

  it("returns null when only slashes", () => {
    expect(extractSlug("//")).toBeNull();
  });
});
