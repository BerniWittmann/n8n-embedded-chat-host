import { describe, it, expect } from "vitest";
import { parseSlugConfig, getSlugConfig, toPublicConfig } from "./config";

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

  it("parses extended UI fields when present", () => {
    const raw = JSON.stringify({
      demo: {
        webhookUrl: "https://example/x",
        title: "Hi",
        subtitle: "Sub",
        footer: "f",
        getStarted: "Go",
        inputPlaceholder: "Type",
        closeButtonTooltip: "x",
        initialMessages: ["Hello", "World"],
        mode: "fullscreen",
        showWelcomeScreen: true,
        allowFileUploads: true,
        allowedFilesMimeTypes: "image/*",
        enableStreaming: true,
      },
    });
    expect(parseSlugConfig(raw)).toEqual({
      demo: {
        webhookUrl: "https://example/x",
        defaultGreeting: "",
        private: false,
        title: "Hi",
        subtitle: "Sub",
        footer: "f",
        getStarted: "Go",
        inputPlaceholder: "Type",
        closeButtonTooltip: "x",
        initialMessages: ["Hello", "World"],
        mode: "fullscreen",
        showWelcomeScreen: true,
        allowFileUploads: true,
        allowedFilesMimeTypes: "image/*",
        enableStreaming: true,
      },
    });
  });

  it("drops non-string initialMessages entries (whole field ignored)", () => {
    const raw = JSON.stringify({
      demo: {
        webhookUrl: "https://example/x",
        initialMessages: ["ok", 42, null],
      },
    });
    const out = parseSlugConfig(raw);
    expect(out.demo.initialMessages).toBeUndefined();
  });

  it("parses n8nAuth and force-promotes slug to private", () => {
    const raw = JSON.stringify({
      demo: {
        webhookUrl: "https://example/x",
        n8nAuth: { user: "admin", pass: "pw" },
        // explicitly public — should be overridden
        private: false,
      },
    });
    expect(parseSlugConfig(raw).demo).toEqual({
      webhookUrl: "https://example/x",
      defaultGreeting: "",
      private: true,
      n8nAuth: { user: "admin", pass: "pw" },
    });
  });

  it("drops n8nAuth when user or pass is missing", () => {
    const raw = JSON.stringify({
      a: { webhookUrl: "https://e/x", n8nAuth: { user: "only" } },
      b: { webhookUrl: "https://e/x", n8nAuth: { pass: "only" } },
      c: { webhookUrl: "https://e/x", n8nAuth: "not-an-object" },
      d: { webhookUrl: "https://e/x", n8nAuth: ["u", "p"] },
    });
    const out = parseSlugConfig(raw);
    expect(out.a.n8nAuth).toBeUndefined();
    expect(out.a.private).toBe(false);
    expect(out.b.n8nAuth).toBeUndefined();
    expect(out.c.n8nAuth).toBeUndefined();
    expect(out.d.n8nAuth).toBeUndefined();
  });

  it("rejects invalid mode values", () => {
    const raw = JSON.stringify({
      demo: { webhookUrl: "https://example/x", mode: "popover" },
    });
    expect(parseSlugConfig(raw).demo.mode).toBeUndefined();
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

describe("toPublicConfig", () => {
  it("strips the private flag", () => {
    const entry = {
      webhookUrl: "https://example/x",
      defaultGreeting: "hi",
      private: true,
      title: "T",
    };
    const out = toPublicConfig(entry);
    expect(out).toEqual({
      webhookUrl: "https://example/x",
      defaultGreeting: "hi",
      title: "T",
    });
    expect("private" in out).toBe(false);
  });
});
