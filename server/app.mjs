import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  randomBytes,
  randomUUID,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  encryptPII,
  decryptPII,
  lookupPII,
  maskEmail,
  redact,
} from "./privacy.mjs";
import { createPool, migrate } from "./db.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex");
export const error = (status, code) =>
  Object.assign(new Error(code), { status, code });
function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
function passwordOK(password, stored) {
  const [salt, value] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(value, "hex"));
}
const safeAmount = (v) =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 1000000000;

export async function createBank({
  databaseUrl,
  piiKey,
  lookupKey,
  origin = "http://localhost:5174",
  secureCookie = false,
  log = () => {},
} = {}) {
  if (
    !/^[a-f0-9]{64}$/i.test(piiKey || "") ||
    !/^[a-f0-9]{64}$/i.test(lookupKey || "") ||
    piiKey === lookupKey
  )
    throw new Error("Two independent 32-byte keys required");
  const pool = createPool(databaseUrl);
  await migrate(pool);
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Request-ID", randomUUID());
    next();
  });
  app.use(express.json({ limit: "8kb", strict: true }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
    }),
  );
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 60000,
      limit: 40,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "AUTH_RATE_LIMIT" },
    }),
  );
  app.use("/api", (req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      if (req.get("origin") !== origin)
        return res.status(403).json({ error: "ORIGIN_REJECTED" });
      if (!req.is("application/json"))
        return res.status(415).json({ error: "JSON_REQUIRED" });
    }
    next();
  });
  const audit = async (actor, event, reference = null, client = pool) => {
    await client.query(
      "INSERT INTO audit_events(id,actor_ref,event,reference) VALUES($1,$2,$3,$4)",
      [randomUUID(), hash(actor), event, reference],
    );
    log(redact({ event, actor_ref: hash(actor), reference }));
  };
  const cookie = (token, age = 1800) =>
    "bank_session=" +
    token +
    "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" +
    age +
    (secureCookie ? "; Secure" : "");
  const newSession = async (user, res) => {
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(24).toString("hex");
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')",
      [hash(token), user, csrf],
    );
    res.set("Set-Cookie", cookie(token));
    return csrf;
  };
  const auth = async (req, res, next) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("bank_session="))
      ?.slice(13);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return res.status(401).json({ error: "LOGIN_REQUIRED" });
    const { rows } = await pool.query(
      "SELECT s.*,u.name_cipher,u.email_cipher,u.marketing,u.consent_version FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()",
      [hash(token)],
    );
    if (!rows.length) return res.status(401).json({ error: "LOGIN_REQUIRED" });
    req.user = rows[0];
    if (
      ["POST", "PATCH", "DELETE"].includes(req.method) &&
      req.get("x-csrf-token") !== req.user.csrf
    )
      return res.status(403).json({ error: "CSRF_REJECTED" });
    next();
  };
  app.get("/api/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", mode: "synthetic-poc" });
  });
  app.post("/api/auth/register", async (req, res) => {
    const {
      name,
      email,
      password,
      consentVersion,
      marketing = false,
    } = req.body;
    if (
      typeof name !== "string" ||
      !/^Demo [A-Za-z ]{1,45}$/.test(name) ||
      typeof email !== "string" ||
      !/^demo[a-z0-9.+_-]*@example\.test$/i.test(email)
    )
      throw error(400, "SYNTHETIC_IDENTITY_REQUIRED");
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128 ||
      consentVersion !== "2026-09-24" ||
      typeof marketing !== "boolean"
    )
      throw error(400, "INVALID_REGISTRATION");
    const id = randomUUID(),
      account = "DEMO-" + randomBytes(6).toString("hex").toUpperCase();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO users(id,email_lookup,email_cipher,name_cipher,password_hash,consent_version,marketing) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          lookupPII(email, lookupKey),
          encryptPII(email.toLowerCase(), piiKey),
          encryptPII(name, piiKey),
          passwordHash(password),
          consentVersion,
          marketing,
        ],
      );
      await client.query(
        "INSERT INTO accounts(id,user_id,label,balance) VALUES($1,$2,$3,5000000)",
        [account, id, "Tabungan iB • Demo"],
      );
      await audit(id, "ACCOUNT_OPENED", null, client);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      if (e.code === "23505") throw error(409, "ACCOUNT_UNAVAILABLE");
      throw e;
    } finally {
      client.release();
    }
    const csrf = await newSession(id, res);
    res.status(201).json({ csrf });
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (
      typeof email !== "string" ||
      email.length > 120 ||
      typeof password !== "string" ||
      password.length > 128
    )
      throw error(400, "INVALID_LOGIN");
    const { rows } = await pool.query(
      "SELECT id,password_hash FROM users WHERE email_lookup=$1",
      [lookupPII(email, lookupKey)],
    );
    if (!rows.length) {
      scryptSync(password, "constant-invalid-user-salt", 64);
      throw error(401, "INVALID_CREDENTIALS");
    }
    if (!passwordOK(password, rows[0].password_hash))
      throw error(401, "INVALID_CREDENTIALS");
    const csrf = await newSession(rows[0].id, res);
    await audit(rows[0].id, "LOGIN_SUCCEEDED");
    res.json({ csrf });
  });
  app.get("/api/session", auth, async (req, res) =>
    res.json({
      name: decryptPII(req.user.name_cipher, piiKey),
      email: maskEmail(decryptPII(req.user.email_cipher, piiKey)),
      csrf: req.user.csrf,
      marketing: req.user.marketing,
      consentVersion: req.user.consent_version,
    }),
  );
  app.post("/api/auth/logout", auth, async (req, res) => {
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
      req.user.token_hash,
    ]);
    res.set("Set-Cookie", cookie("", 0));
    res.json({ ok: true });
  });
  app.get("/api/accounts", auth, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id,label,balance FROM accounts WHERE user_id=$1",
      [req.user.user_id],
    );
    res.json(
      rows.map((x) => ({
        ...x,
        balance: Number(x.balance),
        maskedNumber: "•••• " + x.id.slice(-4),
      })),
    );
  });
  app.get("/api/beneficiaries", auth, (req, res) =>
    res.json([
      { id: "DEMO-1001", label: "Demo Yayasan Pendidikan" },
      { id: "DEMO-1002", label: "Demo Keluarga" },
    ]),
  );
  app.get("/api/transfers", auth, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT t.id,t.amount,t.created_at,a.label AS recipient FROM transfers t JOIN accounts a ON a.id=t.destination WHERE t.user_id=$1 ORDER BY t.created_at DESC LIMIT 50",
      [req.user.user_id],
    );
    res.json(
      rows.map((x) => ({
        ...x,
        amount: Number(x.amount),
        status: "COMPLETED",
      })),
    );
  });
  app.get("/api/transfers/:id", auth, async (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) throw error(404, "NOT_FOUND");
    const { rows } = await pool.query(
      "SELECT id,amount,created_at FROM transfers WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.user_id],
    );
    if (!rows.length) throw error(404, "NOT_FOUND");
    res.json({
      ...rows[0],
      amount: Number(rows[0].amount),
      status: "COMPLETED",
    });
  });
  app.post("/api/transfers", auth, async (req, res) => {
    const { destination, amount } = req.body,
      key = req.get("idempotency-key");
    if (
      !safeAmount(amount) ||
      !["DEMO-1001", "DEMO-1002"].includes(destination) ||
      !key ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(key)
    )
      throw error(400, "INVALID_TRANSFER");
    const client = await pool.connect(),
      requestHash = hash(destination + ":" + amount);
    try {
      await client.query("BEGIN");
      const {
        rows: [source],
      } = await client.query(
        "SELECT id,balance FROM accounts WHERE user_id=$1 FOR UPDATE",
        [req.user.user_id],
      );
      const {
        rows: [previous],
      } = await client.query(
        "SELECT id,request_hash FROM transfers WHERE user_id=$1 AND idem_key=$2",
        [req.user.user_id, key],
      );
      if (previous) {
        if (previous.request_hash !== requestHash)
          throw error(409, "IDEMPOTENCY_CONFLICT");
        await client.query("COMMIT");
        return res.json({
          id: previous.id,
          status: "COMPLETED",
          replayed: true,
        });
      }
      if (BigInt(source.balance) < BigInt(amount))
        throw error(409, "INSUFFICIENT_FUNDS");
      const id = randomUUID();
      await client.query("UPDATE accounts SET balance=balance-$1 WHERE id=$2", [
        amount,
        source.id,
      ]);
      await client.query("UPDATE accounts SET balance=balance+$1 WHERE id=$2", [
        amount,
        destination,
      ]);
      await client.query(
        "INSERT INTO transfers(id,user_id,source,destination,amount,idem_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          req.user.user_id,
          source.id,
          destination,
          amount,
          key,
          requestHash,
        ],
      );
      await audit(req.user.user_id, "TRANSFER_COMPLETED", id, client);
      await client.query("COMMIT");
      res.status(201).json({ id, status: "COMPLETED", replayed: false });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });
  app.patch("/api/privacy/consent", auth, async (req, res) => {
    if (typeof req.body.marketing !== "boolean")
      throw error(400, "INVALID_CONSENT");
    await pool.query("UPDATE users SET marketing=$1 WHERE id=$2", [
      req.body.marketing,
      req.user.user_id,
    ]);
    await audit(
      req.user.user_id,
      "MARKETING_CONSENT_CHANGED",
      (req.body.marketing ? "granted:" : "withdrawn:") +
        req.user.consent_version,
    );
    res.json({ marketing: req.body.marketing });
  });
  app.post("/api/privacy/export", auth, async (req, res) => {
    const {
      rows: [user],
    } = await pool.query(
      "SELECT password_hash,created_at FROM users WHERE id=$1",
      [req.user.user_id],
    );
    if (
      typeof req.body.password !== "string" ||
      req.body.password.length > 128 ||
      !passwordOK(req.body.password, user.password_hash)
    )
      throw error(401, "REAUTHENTICATION_REQUIRED");
    await audit(req.user.user_id, "PERSONAL_DATA_EXPORTED");
    res.set(
      "Content-Disposition",
      'attachment; filename="data-demo-saya.json"',
    );
    res.json({
      name: decryptPII(req.user.name_cipher, piiKey),
      email: decryptPII(req.user.email_cipher, piiKey),
      createdAt: user.created_at,
      consentVersion: req.user.consent_version,
      marketing: req.user.marketing,
      scope:
        "Own profile data only. Other access requests require privacy review.",
    });
  });
  app.post("/api/privacy/requests", auth, async (req, res) => {
    if (!["access", "correction", "erasure"].includes(req.body.type))
      throw error(400, "INVALID_PRIVACY_REQUEST");
    const id = randomUUID();
    await pool.query(
      "INSERT INTO privacy_requests(id,user_id,type) VALUES($1,$2,$3)",
      [id, req.user.user_id, req.body.type],
    );
    await audit(req.user.user_id, "PRIVACY_REQUEST_RECEIVED", id);
    res
      .status(202)
      .json({
        id,
        status: "received",
        message:
          "Permintaan tercatat. Pemenuhan memerlukan verifikasi dan peninjauan kewajiban retensi.",
      });
  });
  app.get("/api/privacy/requests", auth, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id,type,status,created_at FROM privacy_requests WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.user_id],
    );
    res.json(rows);
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  app.use((e, req, res, next) => {
    const status =
      Number.isInteger(e.status) && e.status >= 400 && e.status < 500
        ? e.status
        : 500;
    log(
      redact({
        event: "REQUEST_FAILED",
        status,
        code: e.code && typeof e.code === "string" ? e.code : "INTERNAL_ERROR",
      }),
    );
    res
      .status(status)
      .json({
        error: status === 500 ? "INTERNAL_ERROR" : e.code || "INVALID_REQUEST",
      });
  });
  return { app, pool, close: () => pool.end() };
}
