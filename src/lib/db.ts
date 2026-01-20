import { Pool } from 'pg';

export type Db = Pool;

export const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const connectDb = async (): Promise<Db> => {
  const url = requireEnv('DATABASE_URL');

  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: url,
      // Neon/Vercel: sslmode=require je v URL; pro jistotu můžeš nechat i ssl:
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  // volitelné: ověř, že pool žije (rychlý ping)
  await global.__pgPool.query('SELECT 1');

  return global.__pgPool;
};

export const closeDb = async (_db: Db): Promise<void> => {
  // Na serverless NEdělej pool.end() po requestu.
  // Nech to běžet, ať se spojení reuseuje mezi invokacemi.
};
