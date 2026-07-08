import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

async function reset() {
  const db = getDb();
  console.log("Dropping all tables...");

  await db.execute(sql`DROP TABLE IF EXISTS kpi_session_entries`);
  await db.execute(sql`DROP TABLE IF EXISTS kpi_sessions`);
  await db.execute(sql`DROP TABLE IF EXISTS kpi_entries`);
  await db.execute(sql`DROP TABLE IF EXISTS kpi_cases`);
  await db.execute(sql`DROP TABLE IF EXISTS assigned_addresses`);
  await db.execute(sql`DROP TABLE IF EXISTS work_assignments`);
  await db.execute(sql`DROP TABLE IF EXISTS work_cases`);
  await db.execute(sql`DROP TABLE IF EXISTS notes`);

  console.log("All tables dropped. Run db:push to recreate.");
  process.exit(0);
}

reset().catch(e => {
  console.error(e);
  process.exit(1);
});
