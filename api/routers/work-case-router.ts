import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { workCases, workAssignments, assignedAddresses } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export const workCaseRouter = createRouter({
  // List all cases with their assignments and addresses
  list: publicQuery.query(async () => {
    const db = getDb();
    const cases = await db.select().from(workCases).orderBy(desc(workCases.createdAt));
    const assignments = await db.select().from(workAssignments);
    const addresses = await db.select().from(assignedAddresses);

    return cases.map(c => ({
      ...c,
      assignments: assignments
        .filter(a => a.caseId === c.id)
        .map(a => ({
          ...a,
          addresses: addresses.filter(ad => ad.assignmentId === a.id),
        })),
    }));
  }),

  // Create a new case
  create: publicQuery
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(workCases).values({ date: input.date });
      const id = Number(result.insertId);
      const [newCase] = await db.select().from(workCases).where(eq(workCases.id, id));
      return { ...newCase, assignments: [] };
    }),

  // Change case status
  updateStatus: publicQuery
    .input(z.object({ id: z.number(), status: z.enum(["active", "saved", "closed"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(workCases).set({ status: input.status }).where(eq(workCases.id, input.id));
      return { success: true };
    }),

  // Delete a case (and its assignments/addresses)
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Get assignments to delete their addresses
      const assignments = await db.select().from(workAssignments).where(eq(workAssignments.caseId, input.id));
      for (const a of assignments) {
        await db.delete(assignedAddresses).where(eq(assignedAddresses.assignmentId, a.id));
      }
      await db.delete(workAssignments).where(eq(workAssignments.caseId, input.id));
      await db.delete(workCases).where(eq(workCases.id, input.id));
      return { success: true };
    }),

  // Add assignment (worker) to case
  addAssignment: publicQuery
    .input(z.object({ caseId: z.number(), workerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Check if assignment already exists
      const existing = await db.select().from(workAssignments).where(
        and(eq(workAssignments.caseId, input.caseId), eq(workAssignments.workerId, input.workerId))
      );
      if (existing.length > 0) return { ...existing[0], addresses: [] };

      const [result] = await db.insert(workAssignments).values({
        caseId: input.caseId,
        workerId: input.workerId,
      });
      const id = Number(result.insertId);
      const [assignment] = await db.select().from(workAssignments).where(eq(workAssignments.id, id));
      return { ...assignment, addresses: [] };
    }),

  // Add address to assignment
  addAddress: publicQuery
    .input(z.object({
      assignmentId: z.number(),
      street: z.string(),
      house: z.string(),
      apartment: z.string(),
      timeSlot: z.enum(["I п.д.", "II п.д.", "втд."]),
      orderNum: z.number(),
      workType: z.enum(["ТО", "З"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(assignedAddresses).values({
        assignmentId: input.assignmentId,
        street: input.street,
        house: input.house,
        apartment: input.apartment,
        timeSlot: input.timeSlot,
        orderNum: input.orderNum,
        workType: input.workType ?? "ТО",
      });
      const id = Number(result.insertId);
      const [addr] = await db.select().from(assignedAddresses).where(eq(assignedAddresses.id, id));
      return addr;
    }),

  // Remove address
  removeAddress: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(assignedAddresses).where(eq(assignedAddresses.id, input.id));
      return { success: true };
    }),

  // Edit address
  updateAddress: publicQuery
    .input(z.object({
      id: z.number(),
      street: z.string(),
      house: z.string(),
      apartment: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(assignedAddresses).set({
        street: input.street,
        house: input.house,
        apartment: input.apartment,
      }).where(eq(assignedAddresses.id, input.id));
      return { success: true };
    }),

  // Move address to different worker (swap)
  swapAddress: publicQuery
    .input(z.object({
      addressId: z.number(),
      newAssignmentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(assignedAddresses).set({
        assignmentId: input.newAssignmentId,
      }).where(eq(assignedAddresses.id, input.addressId));
      return { success: true };
    }),
});
