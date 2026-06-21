import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";

const algorithm = "aes-256-gcm";

function getKey() {
  const encoded = process.env.TOKEN_ENCRYPTION_KEY;

  if (!encoded) {
    if (process.env.NODE_ENV === "test") {
      return Buffer.alloc(32, 7);
    }

    throw new Error("TOKEN_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }

  return key;
}

export function encryptToken(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(cipherText: string) {
  try {
    const [ivEncoded, tagEncoded, encryptedEncoded] = cipherText.split(".");

    if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
      throw new Error("Invalid token payload");
    }

    const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ORPCError("TOKEN_DECRYPTION_FAILED", {
      message: "Could not decrypt stored Railway token",
    });
  }
}
