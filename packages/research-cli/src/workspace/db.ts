import Database from "better-sqlite3";

export type ResearchDatabase = Database.Database;

export function openResearchDb(path: string): ResearchDatabase {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
