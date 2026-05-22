import { describe, it, expect } from "vitest";
import { parseSlugConfig, getSlugConfig } from "./config";

describe("parseSlugConfig", () => {
  it("parses valid JSON with all fields", () => {
    const raw = JSON.stringify({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: "hi",
        private: true,
      },
    });
    expect(parseSlugConfig(raw)).toEqual({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: "hi",
        private: true,
      },
    });
  });

  it("fills defaults for missing optional fields", () => {
    const raw = JSON.stringify({
      demo: { webhookUrl: "https://example/x" },
    });
    expect(parseSlugConfig(raw)).toEqual({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: "",
        private: false,
      },
    });
  });

  it("returns empty map on invalid JSON", () => {
    expect(parseSlugConfig("not json")).toEqual({});
  });

  it("returns empty map on null/undefined/empty", () => {
    expect(parseSlugConfig(null)).toEqual({});
    expect(parseSlugConfig(undefined)).toEqual({});
    expect(parseSlugConfig("")).toEqual({});
  });

  it("returns empty map when JSON is not an object", () => {
    expect(parseSlugConfig(JSON.stringify([1, 2]))).toEqual({});
    expect(parseSlugConfig(JSON.stringify("string"))).toEqual({});
    expect(parseSlugConfig(JSON.stringify(null))).toEqual({});
  });

  it("drops entries with missing/invalid webhookUrl", () => {
    const raw = JSON.stringify({
      bad1: { defaultGreeting: "x" },
      bad2: { webhookUrl: "" },
      bad3: { webhookUrl: 123 },
      bad4: null,
      bad5: [1, 2],
      good: { webhookUrl: "https://example/x" },
    });
    const out = parseSlugConfig(raw);
    expect(Object.keys(out)).toEqual(["good"]);
  });

  it("ignores wrong-type optional fields, using defaults", () => {
    const raw = JSON.stringify({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: 42,
        private: "yes",
      },
    });
    expect(parseSlugConfig(raw)).toEqual({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: "",
        private: false,
      },
    });
  });
});

describe("getSlugConfig", () => {
  const map = {
    demo: { webhookUrl: "https://example/x", defaultGreeting: "", private: false },
  };

  it("returns the entry for a known slug", () => {
    expect(getSlugConfig(map, "demo")).toBe(map.demo);
  });

  it("returns null for unknown slug", () => {
    expect(getSlugConfig(map, "missing")).toBeNull();
  });

  it("returns null for empty/null slug", () => {
    expect(getSlugConfig(map, "")).toBeNull();
    expect(getSlugConfig(map, null)).toBeNull();
    expect(getSlugConfig(map, undefined)).toBeNull();
  });

  it("does not return inherited properties", () => {
    expect(getSlugConfig(map, "toString")).toBeNull();
  });
});
