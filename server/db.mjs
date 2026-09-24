import pg from "pg";
import { readFile } from "node:fs/promises";
export function createPool(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL required");
  return new pg.Pool({ connectionString: url, max: 10 });
}
export async function migrate(pool) {
  await pool.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}
