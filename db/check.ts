import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

async function check() {
  const db = getDb();
  const tables = await db.execute(sql`SHOW TABLES`);
  console.log("Tables in database:", tables);

  // Try to describe assigned_addresses
  try {
    const desc = await db.execute(sql`DESCRIBE assigned_addresses`);
    console.log("assigned_addresses schema:", desc);
  } catch {
    console.log("assigned_addresses does not exist");
  }

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
