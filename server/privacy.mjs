import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from "node:crypto";

function validateKey(keyHex) {
  if (typeof keyHex !== "string" || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Invalid key");
  }
}

function validateValue(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid value");
  }
}

export function encryptPII(value, keyHex) {
  validateValue(value);
  validateKey(keyHex);

  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptPII(value, keyHex) {
  validateKey(keyHex);
  if (typeof value !== "string") throw new Error("Invalid encrypted value");

  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted value");

  const [ivB64, tagB64, cipherB64] = parts;
  if (
    !/^[a-zA-Z0-9_-]+$/.test(ivB64) ||
    !/^[a-zA-Z0-9_-]+$/.test(tagB64) ||
    !/^[a-zA-Z0-9_-]+$/.test(cipherB64)
  ) {
    throw new Error("Non-canonical encoding");
  }

  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(cipherB64, "base64url");

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0)
    throw new Error("Invalid encrypted value");
  if (
    [iv, tag, ciphertext].some(
      (bytes, index) => bytes.toString("base64url") !== parts[index],
    )
  )
    throw new Error("Non-canonical encoding");

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function lookupPII(value, keyHex) {
  if (typeof value !== "string") throw new Error("Invalid lookup value");
  validateKey(keyHex);

  const normalized = value.trim().toLowerCase();
  const hmac = createHmac("sha256", Buffer.from(keyHex, "hex"));
  hmac.update(normalized);
  return hmac.digest("hex");
}

export function maskEmail(value) {
  if (typeof value !== "string") return "[redacted]";
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return "[redacted]";
  const domain = value.substring(atIndex + 1);
  return `${value[0]}***@${domain}`;
}

export function redact(input) {
  const SENSITIVE_KEYS = new Set([
    "email",
    "name",
    "fullname",
    "password",
    "token",
    "authorization",
    "cookie",
    "nik",
    "accountnumber",
    "secret",
    "phone",
    "phonenumber",
    "pin",
    "address",
    "apikey",
  ]);
  const EMAIL_REGEX =
    /[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,}/g;
  const ID_CARD_REGEX = /\b\d{16}\b/g;

  function redactText(text) {
    let t = text
      .replace(EMAIL_REGEX, "[REDACTED]")
      .replace(ID_CARD_REGEX, "[REDACTED]");
    t = t.replace(/Bearer [a-zA-Z0-9]+/g, "[REDACTED]");
    t = t.replace(/DEMO-\d+/g, "[REDACTED]");
    return t;
  }

  function recurse(val) {
    if (val === null || typeof val !== "object") {
      return typeof val === "string" ? redactText(val) : val;
    }

    if (Array.isArray(val)) {
      return val.map(recurse);
    }

    const copy = {};
    for (const [k, v] of Object.entries(val)) {
      const kLower = k.toLowerCase();
      if (SENSITIVE_KEYS.has(kLower)) {
        copy[k] = "[REDACTED]";
      } else {
        copy[k] = recurse(v);
      }
    }
    return copy;
  }

  return recurse(input);
}
