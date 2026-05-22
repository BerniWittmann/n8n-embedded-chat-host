import { describe, it, expect } from "vitest";
import { parseBasicAuth, isAuthorized, timingSafeEqual } from "./auth";

const encode = (user: string, pass: string) =>
  "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

describe("parseBasicAuth", () => {
  it("decodes a valid Basic header", () => {
    expect(parseBasicAuth(encode("admin", "secret"))).toEqual({
      user: "admin",
      pass: "secret",
    });
  });

  it("supports colons in the password", () => {
    expect(parseBasicAuth(encode("admin", "a:b:c"))).toEqual({
      user: "admin",
      pass: "a:b:c",
    });
  });

  it("returns null for missing/empty header", () => {
    expect(parseBasicAuth(null)).toBeNull();
    expect(parseBasicAuth(undefined)).toBeNull();
    expect(parseBasicAuth("")).toBeNull();
  });

  it("returns null for non-Basic schemes", () => {
    expect(parseBasicAuth("Bearer abc")).toBeNull();
  });

  it("returns null for malformed base64", () => {
    expect(parseBasicAuth("Basic !!!not-base64!!!")).toBeNull();
  });

  it("returns null when decoded value has no colon", () => {
    const noColon = "Basic " + Buffer.from("nocolon").toString("base64");
    expect(parseBasicAuth(noColon)).toBeNull();
  });
});

describe("timingSafeEqual", () => {
  it("true for identical strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });
  it("false for different content of same length", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });
  it("false for different length", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
  it("true for both empty", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("isAuthorized", () => {
  it("true with matching creds", () => {
    expect(isAuthorized(encode("admin", "pw"), "admin", "pw")).toBe(true);
  });

  it("false with wrong user", () => {
    expect(isAuthorized(encode("nope", "pw"), "admin", "pw")).toBe(false);
  });

  it("false with wrong pass", () => {
    expect(isAuthorized(encode("admin", "nope"), "admin", "pw")).toBe(false);
  });

  it("false with missing header", () => {
    expect(isAuthorized(null, "admin", "pw")).toBe(false);
  });

  it("false when expected creds are missing", () => {
    expect(isAuthorized(encode("admin", "pw"), "", "pw")).toBe(false);
    expect(isAuthorized(encode("admin", "pw"), "admin", "")).toBe(false);
    expect(isAuthorized(encode("admin", "pw"), undefined, undefined)).toBe(false);
  });

  it("false with malformed header", () => {
    expect(isAuthorized("Basic !!!", "admin", "pw")).toBe(false);
  });
});
