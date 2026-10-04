import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('./data/telemetry.db');

sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite);