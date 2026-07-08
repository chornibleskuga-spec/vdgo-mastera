import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { kpiDuties } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const dutyRouter = createRouter({
  // List duties for month/year
  list: publicQuery
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(kpiDuties).where(
        and(eq(kpiDuties.month, input.month), eq(kpiDuties.year, input.year))
      );
    }),

  // Toggle duty for a worker on a specific day type and week
  toggle: publicQuery
    .input(z.object({
      month: z.number(),
      year: z.number(),
      workerId: z.string(),
      dayType: z.enum(["saturday", "sunday"]),
      weekNum: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Check if already exists
      const existing = await db.select().from(kpiDuties).where(
        and(
          eq(kpiDuties.month, input.month),
          eq(kpiDuties.year, input.year),
          eq(kpiDuties.workerId, input.workerId),
          eq(kpiDuties.dayType, input.dayType),
          eq(kpiDuties.weekNum, input.weekNum)
        )
      );
      if (existing.length > 0) {
        // Remove (toggle off)
        await db.delete(kpiDuties).where(eq(kpiDuties.id, existing[0].id));
        return { action: "removed", id: existing[0].id };
      }
      // Count current duties for this dayType+weekNum
      const currentCount = await db.select().from(kpiDuties).where(
        and(
          eq(kpiDuties.month, input.month),
          eq(kpiDuties.year, input.year),
          eq(kpiDuties.dayType, input.dayType),
          eq(kpiDuties.weekNum, input.weekNum)
        )
      );
      if (currentCount.length >= 2) {
        return { action: "full", message: "Уже 2 слесаря на этот день" };
      }
      const [result] = await db.insert(kpiDuties).values({
        month: input.month,
        year: input.year,
        workerId: input.workerId,
        dayType: input.dayType,
        weekNum: input.weekNum,
      });
      return { action: "added", id: Number(result.insertId) };
    }),

  // Clear all duties for month/year
  clear: publicQuery
    .input(z.object({ month: z.number(), year: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(kpiDuties).where(
        and(eq(kpiDuties.month, input.month), eq(kpiDuties.year, input.year))
      );
      return { success: true };
    }),
});
