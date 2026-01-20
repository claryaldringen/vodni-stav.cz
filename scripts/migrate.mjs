#!/usr/bin/env node

import { config } from 'dotenv-safe';

config({ allowEmptyValues: true });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const LOCK_ID = 424242; // libovolné konstantní číslo

const log = (...args) => {
  console.log(new Date().toISOString(), ...args);
};

const main = async () => {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await db.connect();

  try {
    log('Acquiring advisory lock...');
    await db.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

    await db.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                                                             filename TEXT PRIMARY KEY,
                                                             applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

    const applied = new Set(
      (await db.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename),
    );

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        log(`Skipping ${file}`);
        continue;
      }

      log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await db.query('BEGIN');
        await db.query(sql);
        await db.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [file]);
        await db.query('COMMIT');
        log(`Applied ${file}`);
      } catch (err) {
        await db.query('ROLLBACK');
        throw new Error(`Migration ${file} failed:\n${err.message}`);
      }
    }

    log('Migrations complete');
  } finally {
    log('Releasing advisory lock');
    await db.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    await db.end();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
