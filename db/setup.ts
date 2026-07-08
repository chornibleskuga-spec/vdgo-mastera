import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

async function setup() {
  const db = getDb();
  console.log("Creating tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS work_cases (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(50) NOT NULL,
      status ENUM('active', 'saved', 'closed') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS work_assignments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      case_id INT UNSIGNED NOT NULL,
      worker_id VARCHAR(50) NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS assigned_addresses (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT UNSIGNED NOT NULL,
      street VARCHAR(255) NOT NULL,
      house VARCHAR(50) NOT NULL,
      apartment VARCHAR(50) NOT NULL DEFAULT '',
      time_slot ENUM('I п.д.', 'II п.д.', 'втд.') NOT NULL,
      order_num INT UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kpi_cases (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      month INT NOT NULL,
      year INT NOT NULL,
      label VARCHAR(255) NOT NULL,
      saved_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kpi_entries (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      kpi_case_id INT UNSIGNED NOT NULL,
      worker_id VARCHAR(50) NOT NULL,
      day INT NOT NULL,
      value VARCHAR(20) NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kpi_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      month INT NOT NULL,
      year INT NOT NULL,
      status ENUM('active', 'saved') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kpi_session_entries (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id INT UNSIGNED NOT NULL,
      worker_id VARCHAR(50) NOT NULL,
      day INT NOT NULL,
      value VARCHAR(20) NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log("All tables created successfully!");
  process.exit(0);
}

setup().catch(e => {
  console.error(e);
  process.exit(1);
});
