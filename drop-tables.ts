import { getDb } from "./api/queries/connection";

async function main() {
  const db = getDb();
  await db.execute("DROP TABLE IF EXISTS kpi_entries");
  await db.execute("DROP TABLE IF EXISTS kpi_session_entries");
  await db.execute("DROP TABLE IF EXISTS kpi_sessions");
  await db.execute("DROP TABLE IF EXISTS kpi_cases");
  await db.execute("DROP TABLE IF EXISTS assigned_addresses");
  await db.execute("DROP TABLE IF EXISTS work_assignments");
  await db.execute("DROP TABLE IF EXISTS work_cases");
  await db.execute("DROP TABLE IF EXISTS notes");
  await db.execute("DROP TABLE IF EXISTS kpi_duties");
  await db.execute("DROP TABLE IF EXISTS dispatcher_entries");
  console.log("All tables dropped");
}

main().catch(console.error);
