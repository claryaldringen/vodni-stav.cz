import postgres from 'postgres';

export type Db = postgres.Sql;

export const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

declare global {
  var __sql: Db | undefined;
}

export const connectDb = async (): Promise<Db> => {
  const url = requireEnv('DATABASE_URL');

  if (!global.__sql) {
    global.__sql = postgres(url, {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }

  return global.__sql;
};
