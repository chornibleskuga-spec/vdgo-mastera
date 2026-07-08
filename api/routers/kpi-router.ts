import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { kpiCases, kpiEntries, kpiSessions, kpiSessionEntries } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export const kpiRouter = createRouter({
  // List all saved KPI cases
  list: publicQuery.query(async () => {
    const db = getDb();
    const cases = await db.select().from(kpiCases).orderBy(desc(kpiCases.savedAt));
    const entries = await db.select().from(kpiEntries);

    return cases.map(c => ({
      ...c,
      entries: entries.filter(e => e.kpiCaseId === c.id),
    }));
  }),

  // Create a saved KPI case (manual save)
  create: publicQuery
    .input(z.object({
      month: z.number(),
      year: z.number(),
      entries: z.array(z.object({
        workerId: z.string(),
        day: z.number(),
        value: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const label = `${input.month}.${input.year}`;
      const [result] = await db.insert(kpiCases).values({
        month: input.month,
        year: input.year,
        label,
      });
      const kpiCaseId = Number(result.insertId);

      if (input.entries.length > 0) {
        await db.insert(kpiEntries).values(
          input.entries.map(e => ({
            kpiCaseId,
            workerId: e.workerId,
            day: e.day,
            value: e.value,
          }))
        );
      }

      const [newCase] = await db.select().from(kpiCases).where(eq(kpiCases.id, kpiCaseId));
      const caseEntries = await db.select().from(kpiEntries).where(eq(kpiEntries.kpiCaseId, kpiCaseId));
      return { ...newCase, entries: caseEntries };
    }),

  // Delete a saved KPI case
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(kpiEntries).where(eq(kpiEntries.kpiCaseId, input.id));
      await db.delete(kpiCases).where(eq(kpiCases.id, input.id));
      return { success: true };
    }),

  // ===== REAL-TIME COLLABORATIVE KPI SESSIONS =====

  // Get active session with entries (creates one if none exists)
  getActive: publicQuery.query(async () => {
    const db = getDb();
    // Find active session
    let [session] = await db.select().from(kpiSessions)
      .where(eq(kpiSessions.status, "active"))
      .orderBy(desc(kpiSessions.createdAt))
      .limit(1);

    // Create one if none exists
    if (!session) {
      const now = new Date();
      const [result] = await db.insert(kpiSessions).values({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        status: "active",
      });
      const sessionId = Number(result.insertId);
      [session] = await db.select().from(kpiSessions).where(eq(kpiSessions.id, sessionId));
    }

    const entries = await db.select().from(kpiSessionEntries)
      .where(eq(kpiSessionEntries.sessionId, session.id));

    return {
      ...session,
      entries: entries.map(e => ({
        workerId: e.workerId,
        day: e.day,
        value: e.value,
      })),
    };
  }),

  // Upsert entry in active session (called on every cell change)
  upsertEntry: publicQuery
    .input(z.object({
      sessionId: z.number(),
      workerId: z.string(),
      day: z.number(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Update session updatedAt
      await db.update(kpiSessions)
        .set({ updatedAt: new Date() })
        .where(eq(kpiSessions.id, input.sessionId));

      // Check if entry exists
      const existing = await db.select().from(kpiSessionEntries)
        .where(
          and(
            eq(kpiSessionEntries.sessionId, input.sessionId),
            eq(kpiSessionEntries.workerId, input.workerId),
            eq(kpiSessionEntries.day, input.day)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db.update(kpiSessionEntries)
          .set({ value: input.value })
          .where(eq(kpiSessionEntries.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(kpiSessionEntries).values({
          sessionId: input.sessionId,
          workerId: input.workerId,
          day: input.day,
          value: input.value,
        });
      }

      return { success: true };
    }),

  // Delete entry from active session (called when cell is cleared)
  deleteEntry: publicQuery
    .input(z.object({
      sessionId: z.number(),
      workerId: z.string(),
      day: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(kpiSessionEntries)
        .where(
          and(
            eq(kpiSessionEntries.sessionId, input.sessionId),
            eq(kpiSessionEntries.workerId, input.workerId),
            eq(kpiSessionEntries.day, input.day)
          )
        );
      return { success: true };
    }),

  // Save active session as a permanent KPI case
  saveSession: publicQuery
    .input(z.object({
      sessionId: z.number(),
      month: z.number(),
      year: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get all entries from session
      const entries = await db.select().from(kpiSessionEntries)
        .where(eq(kpiSessionEntries.sessionId, input.sessionId));

      // Create saved KPI case
      const label = `${input.month}.${input.year}`;
      const [result] = await db.insert(kpiCases).values({
        month: input.month,
        year: input.year,
        label,
      });
      const kpiCaseId = Number(result.insertId);

      // Copy entries
      if (entries.length > 0) {
        await db.insert(kpiEntries).values(
          entries.map(e => ({
            kpiCaseId,
            workerId: e.workerId,
            day: e.day,
            value: e.value,
          }))
        );
      }

      // Delete old session entries
      await db.delete(kpiSessionEntries)
        .where(eq(kpiSessionEntries.sessionId, input.sessionId));

      // Mark session as saved (don't delete, just mark)
      await db.update(kpiSessions)
        .set({ status: "saved" })
        .where(eq(kpiSessions.id, input.sessionId));

      // Create new active session
      await db.insert(kpiSessions).values({
        month: input.month,
        year: input.year,
        status: "active",
      });

      return { success: true, kpiCaseId };
    }),
});
