import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { workCases, kpiCases, notes } from "@db/schema";
import { sql } from "drizzle-orm";

export const syncRouter = createRouter({
  // Returns the latest updatedAt timestamp across all tables
  // Frontend polls this to detect changes
  timestamp: publicQuery.query(async () => {
    const db = getDb();
    const [workCaseTs] = await db.select({
      max: sql<string>`MAX(${workCases.updatedAt})`,
    }).from(workCases);
    const [kpiCaseTs] = await db.select({
      max: sql<string>`MAX(${kpiCases.savedAt})`,
    }).from(kpiCases);
    const [noteTs] = await db.select({
      max: sql<string>`MAX(${notes.createdAt})`,
    }).from(notes);

    return {
      workCase: workCaseTs.max ? new Date(workCaseTs.max).getTime() : 0,
      kpiCase: kpiCaseTs.max ? new Date(kpiCaseTs.max).getTime() : 0,
      note: noteTs.max ? new Date(noteTs.max).getTime() : 0,
      serverTime: Date.now(),
    };
  }),
});
