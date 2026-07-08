import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { dispatcherEntries } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dispatcherRouter = createRouter({
  // List entries for a date
  list: publicQuery
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(dispatcherEntries)
        .where(eq(dispatcherEntries.date, input.date))
        .orderBy(desc(dispatcherEntries.updatedAt));
    }),

  // Upsert entry (create or update)
  upsert: publicQuery
    .input(z.object({
      workerName: z.string(),
      totalRaw: z.string(),
      nextDayRaw: z.string(),
      date: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Check if entry exists for this worker+date
      const existing = await db.select().from(dispatcherEntries).where(
        and(
          eq(dispatcherEntries.workerName, input.workerName),
          eq(dispatcherEntries.date, input.date)
        )
      );
      if (existing.length > 0) {
        // Update
        await db.update(dispatcherEntries).set({
          totalRaw: input.totalRaw,
          nextDayRaw: input.nextDayRaw,
        }).where(eq(dispatcherEntries.id, existing[0].id));
        const [updated] = await db.select().from(dispatcherEntries).where(eq(dispatcherEntries.id, existing[0].id));
        return updated;
      }
      // Create
      const [result] = await db.insert(dispatcherEntries).values({
        workerName: input.workerName,
        totalRaw: input.totalRaw,
        nextDayRaw: input.nextDayRaw,
        date: input.date,
      });
      const id = Number(result.insertId);
      const [entry] = await db.select().from(dispatcherEntries).where(eq(dispatcherEntries.id, id));
      return entry;
    }),

  // Delete entry
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(dispatcherEntries).where(eq(dispatcherEntries.id, input.id));
      return { success: true };
    }),
});
