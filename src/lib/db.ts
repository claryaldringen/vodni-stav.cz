import { Client } from 'pg';

export type Db = Client;

export const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

export const connectDb = async (): Promise<Db> => {
  const url = requireEnv('DATABASE_URL');
  const db = new Client({ connectionString: url });
  await db.connect();
  return db;
};

export const closeDb = async (db: Db): Promise<void> => {
  await db.end();
};
