import type postgres from 'postgres';
import { Db } from '@/src/lib/db';

export const recordRunStart = async (db: Db, kind: 'discover' | 'ingest' | 'historical') => {
  const result = await db`
    INSERT INTO ingest_run (kind, status)
    VALUES (${kind}, 'ok')
    RETURNING id
  `;
  return result[0].id as number;
};

export const recordRunFinish = async (
  db: Db,
  id: number,
  status: 'ok' | 'error',
  details: Record<string, unknown>,
) => {
  await db`
    UPDATE ingest_run
    SET finished_at = NOW(),
        status = ${status},
        details = ${db.json(details as postgres.JSONValue)}
    WHERE id = ${id}
  `;
};
