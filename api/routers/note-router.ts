import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { notes } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const noteRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(notes).orderBy(desc(notes.createdAt));
  }),

  create: publicQuery
    .input(z.object({ date: z.string(), text: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(notes).values({
        date: input.date,
        text: input.text,
      });
      const id = Number(result.insertId);
      const [note] = await db.select().from(notes).where(eq(notes.id, id));
      return note;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(notes).where(eq(notes.id, input.id));
      return { success: true };
    }),
});
