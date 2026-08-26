import Database from "better-sqlite3";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data/cnce.sqlite");
  await mkdir(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.exec(await readFile(path.join(process.cwd(), "db/migrations/0000_initial.sql"), "utf8"));
  db.close();
  console.log(JSON.stringify({ event: "database_migrated", databasePath }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
