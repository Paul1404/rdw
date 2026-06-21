import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "../src/server/security/tokens.server";

process.env.NODE_ENV = "test";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");

describe("token encryption", () => {
  it("round trips a token", () => {
    const encrypted = encryptToken("secret-token");

    expect(decryptToken(encrypted)).toBe("secret-token");
  });

  it("uses different ciphertext for the same input", () => {
    const first = encryptToken("secret-token");
    const second = encryptToken("secret-token");

    expect(first).not.toBe(second);
  });

  it("fails on tampered ciphertext", () => {
    const encrypted = encryptToken("secret-token");
    const tampered = `${encrypted.slice(0, -2)}aa`;

    expect(() => decryptToken(tampered)).toThrow("Could not decrypt stored Railway token");
  });
});
