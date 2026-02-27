import { connectDb, requireEnv } from './db';

const FIO_COOLDOWN_MS = 30_000;

export class RateLimitError extends Error {
  remainingMs: number;

  constructor(remainingMs: number) {
    super(`FIO API rate limit — zkuste za ${Math.ceil(remainingMs / 1000)} s`);
    this.name = 'RateLimitError';
    this.remainingMs = remainingMs;
  }
}

export const getRemainingCooldownMs = async (): Promise<number> => {
  const sql = await connectDb();
  const [row] = await sql`
    SELECT last_fetched_at FROM fio_rate_limit WHERE id = 1
  `;
  if (!row) return 0;

  const elapsed = Date.now() - new Date(row.last_fetched_at as string).getTime();
  return Math.max(0, FIO_COOLDOWN_MS - elapsed);
};

export const canCallFioApi = async (): Promise<boolean> => {
  const remaining = await getRemainingCooldownMs();
  return remaining === 0;
};

interface FioTransaction {
  column1: { value: number } | null; // amount
  column5: { value: string | number } | null; // VS
  column22: { value: number } | null; // transaction ID
}

interface FioResponse {
  accountStatement: {
    transactionList: {
      transaction: FioTransaction[];
    } | null;
  };
}

export const findPaymentInFio = async (
  vs: string,
  expectedAmount: number,
): Promise<string | null> => {
  const remaining = await getRemainingCooldownMs();
  if (remaining > 0) {
    throw new RateLimitError(remaining);
  }

  const sql = await connectDb();
  const token = requireEnv('FIO_API_TOKEN');

  // Update rate limit BEFORE calling API
  await sql`
    UPDATE fio_rate_limit SET last_fetched_at = NOW() WHERE id = 1
  `;

  const dateTo = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const url = `https://fioapi.fio.cz/v1/rest/periods/${token}/${dateFrom}/${dateTo}/transactions.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FIO API error: ${res.status}`);
  }

  const data: FioResponse = await res.json();
  const transactions = data.accountStatement?.transactionList?.transaction ?? [];

  for (const tx of transactions) {
    const txVs = String(tx.column5?.value ?? '');
    const txAmount = tx.column1?.value;
    const txId = tx.column22?.value;

    if (txVs === vs && txAmount === expectedAmount && txId != null) {
      return String(txId);
    }
  }

  return null;
};
