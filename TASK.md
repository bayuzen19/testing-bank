# Task 1: privacy primitives
Create ONLY server/privacy.mjs. Use node:crypto, no third-party dependencies.
Exports:
- encryptPII(value,keyHex): nonempty string value and 64-character hex key required; AES-256-GCM fresh random 12-byte IV; output base64url-packed or dot-separated IV/tag/ciphertext string. No plaintext in output.
- decryptPII(value,keyHex): inverse, authenticated; reject tampering and invalid key/input.
- lookupPII(value,keyHex): HMAC-SHA256 of value.trim().toLowerCase(); same key validation; return 64 lowercase hex chars.
- maskEmail(value): first character of local part + '***@' + domain; e.g demo@example.test -> d***@example.test; missing @ -> '[redacted]'.
- redact(value): recursive objects/arrays, replace values of case-insensitive sensitive keys email,name,fullName,password,token,authorization,cookie,nik,phone,accountNumber,secret with '[REDACTED]'. In other string values redact email addresses and 16-digit identity/card-like values. Preserve non-sensitive numeric status/count. Never mutate input.
Run node --test tests/privacy.test.mjs. If failure fix your module, never tests.
