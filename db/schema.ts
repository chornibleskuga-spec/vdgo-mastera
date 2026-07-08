import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// === Work Cases ===
export const workCases = mysqlTable("work_cases", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["active", "saved", "closed"]).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// === Work Assignments ===
export const workAssignments = mysqlTable("work_assignments", {
  id: serial("id").primaryKey(),
  caseId: int("case_id", { unsigned: true }).notNull(),
  workerId: varchar("worker_id", { length: 50 }).notNull(),
});

// === Assigned Addresses ===
export const assignedAddresses = mysqlTable("assigned_addresses", {
  id: serial("id").primaryKey(),
  assignmentId: int("assignment_id", { unsigned: true }).notNull(),
  street: varchar("street", { length: 255 }).notNull(),
  house: varchar("house", { length: 50 }).notNull(),
  apartment: varchar("apartment", { length: 50 }).notNull().default(""),
  timeSlot: mysqlEnum("time_slot", ["I п.д.", "II п.д.", "втд."]).notNull(),
  orderNum: int("order_num", { unsigned: true }).notNull().default(0),
  workType: mysqlEnum("work_type", ["ТО", "З"]).notNull().default("ТО"),
});

// === KPI Duties (дежурства на выходных) ===
export const kpiDuties = mysqlTable("kpi_duties", {
  id: serial("id").primaryKey(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  workerId: varchar("worker_id", { length: 50 }).notNull(),
  dayType: mysqlEnum("day_type", ["saturday", "sunday"]).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// === KPI Cases (saved snapshots) ===
export const kpiCases = mysqlTable("kpi_cases", {
  id: serial("id").primaryKey(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

// === KPI Entries (belongs to saved kpiCases) ===
export const kpiEntries = mysqlTable("kpi_entries", {
  id: serial("id").primaryKey(),
  kpiCaseId: int("kpi_case_id", { unsigned: true }).notNull(),
  workerId: varchar("worker_id", { length: 50 }).notNull(),
  day: int("day").notNull(),
  value: varchar("value", { length: 20 }).notNull(),
});

// === KPI Active Sessions (for real-time collaboration) ===
export const kpiSessions = mysqlTable("kpi_sessions", {
  id: serial("id").primaryKey(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  status: mysqlEnum("status", ["active", "saved"]).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// === KPI Session Entries (real-time collaborative data) ===
export const kpiSessionEntries = mysqlTable("kpi_session_entries", {
  id: serial("id").primaryKey(),
  sessionId: int("session_id", { unsigned: true }).notNull(),
  workerId: varchar("worker_id", { length: 50 }).notNull(),
  day: int("day").notNull(),
  value: varchar("value", { length: 20 }).notNull(),
});

// === Notes ===
export const notes = mysqlTable("notes", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 50 }).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// === Dispatcher Entries ===
export const dispatcherEntries = mysqlTable("dispatcher_entries", {
  id: serial("id").primaryKey(),
  workerName: varchar("worker_name", { length: 100 }).notNull(),
  totalRaw: varchar("total_raw", { length: 50 }).notNull().default(""),
  nextDayRaw: varchar("next_day_raw", { length: 50 }).notNull().default(""),
  date: varchar("date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
