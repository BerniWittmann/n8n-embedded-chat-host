import { describe, it, expect } from "vitest";
import { resolveGreeting } from "./greeting";

describe("resolveGreeting", () => {
  it("uses URL param when non-empty", () => {
    expect(resolveGreeting("hi", "hello")).toBe("hi");
  });

  it("falls back to default when URL param is empty string", () => {
    expect(resolveGreeting("", "hello")).toBe("hello");
  });

  it("falls back to default when URL param is null", () => {
    expect(resolveGreeting(null, "hello")).toBe("hello");
  });

  it("falls back to default when URL param is undefined", () => {
    expect(resolveGreeting(undefined, "hello")).toBe("hello");
  });

  it("returns empty string when both are empty/null", () => {
    expect(resolveGreeting(null, "")).toBe("");
    expect(resolveGreeting("", "")).toBe("");
  });

  it("handles missing default gracefully", () => {
    // @ts-expect-error testing runtime guard
    expect(resolveGreeting(null, undefined)).toBe("");
  });
});
