import { Db } from '@/src/lib/db';

export const recordRunStart = async (db: Db, kind: 'discover' | 'ingest') => {
  const res = await db.query(
    `
    INSERT INTO ingest_run (kind, status)
    VALUES ($1, 'ok')
    RETURNING id
    `,
    [kind],
  );
  return res.rows[0].id as number;
};

export const recordRunFinish = async (
  db: Db,
  id: number,
  status: 'ok' | 'error',
  details: Record<string, any>,
) => {
  await db.query(
    `
    UPDATE ingest_run
    SET finished_at = NOW(),
        status = $2,
        details = $3
    WHERE id = $1
    `,
    [id, status, details],
  );
};
