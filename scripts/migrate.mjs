#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const LOCK_ID = 424242; // libovolné konstantní číslo

const log = (...args) => {
  console.log(new Date().toISOString(), ...args);
};

const main = async () => {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    log('Acquiring advisory lock...');
    await sql`SELECT pg_advisory_lock(${LOCK_ID})`;

    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const applied = new Set(
      (await sql`SELECT filename FROM schema_migrations`).map((r) => r.filename),
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
      const migrationSql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await sql.begin(async (tx) => {
          await tx.unsafe(migrationSql);
          await tx`INSERT INTO schema_migrations(filename) VALUES (${file})`;
        });
        log(`Applied ${file}`);
      } catch (err) {
        throw new Error(`Migration ${file} failed:\n${err.message}`);
      }
    }

    log('Migrations complete');
  } finally {
    log('Releasing advisory lock');
    await sql`SELECT pg_advisory_unlock(${LOCK_ID})`;
    await sql.end();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
