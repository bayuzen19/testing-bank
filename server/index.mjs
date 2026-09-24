import express from "express";
import { createBank } from "./app.mjs";
if (process.env.DEMO_MODE !== "true")
  throw new Error("This build is restricted to synthetic DEMO_MODE");
const bank = await createBank({
  databaseUrl: process.env.DATABASE_URL,
  piiKey: process.env.PII_KEY_HEX,
  lookupKey: process.env.LOOKUP_KEY_HEX,
  origin: process.env.APP_ORIGIN,
  secureCookie: process.env.SECURE_COOKIE === "true",
  log: (x) => console.log(JSON.stringify(x)),
});
bank.app.use(express.static("dist", { index: false }));
bank.app.get("/{*path}", (req, res) =>
  res.sendFile("index.html", { root: "dist" }),
);
const server = bank.app.listen(
  Number(process.env.PORT || 4100),
  "0.0.0.0",
  () => console.log("Bank PoC API ready"),
);
process.on("SIGTERM", () =>
  server.close(async () => {
    await bank.close();
    process.exit(0);
  }),
);
