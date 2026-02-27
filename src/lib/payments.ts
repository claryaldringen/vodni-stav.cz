import { connectDb, requireEnv } from './db';
import type { Payment, PaymentPlan, SubscriptionInfo } from './types';

const PLAN_AMOUNTS: Record<PaymentPlan, number> = {
  monthly: 10,
  yearly: 100,
};

export const createPayment = async (
  userId: string,
  plan: PaymentPlan,
): Promise<Payment> => {
  const sql = await connectDb();
  const amount = PLAN_AMOUNTS[plan];

  // Reuse existing pending payment for the same plan if it exists
  const [existing] = await sql`
    SELECT * FROM payment
    WHERE user_id = ${userId} AND plan = ${plan} AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (existing) return existing as unknown as Payment;

  // Two-step: insert with placeholder, then set VS based on generated ID
  const [payment] = await sql`
    WITH ins AS (
      INSERT INTO payment (user_id, amount, vs, plan)
      VALUES (${userId}, ${amount}, 'tmp_' || gen_random_uuid(), ${plan})
      RETURNING id
    )
    UPDATE payment
    SET vs = ${requireEnv('APP_ID')} || LPAD(ins.id::TEXT, 8, '0')
    FROM ins
    WHERE payment.id = ins.id
    RETURNING payment.*
  `;

  return payment as unknown as Payment;
};

export const getActiveSubscription = async (
  userId: string,
): Promise<SubscriptionInfo | null> => {
  const sql = await connectDb();

  const [row] = await sql`
    SELECT id, plan, paid_at, expires_at
    FROM payment
    WHERE user_id = ${userId}
      AND status = 'paid'
      AND expires_at > NOW()
    ORDER BY expires_at DESC
    LIMIT 1
  `;

  if (!row) return null;

  return {
    active: true,
    plan: row.plan as PaymentPlan,
    paidAt: (row.paid_at as Date).toISOString(),
    expiresAt: (row.expires_at as Date).toISOString(),
  };
};

export const getLatestPendingPayment = async (
  userId: string,
): Promise<Payment | null> => {
  const sql = await connectDb();

  const [row] = await sql`
    SELECT * FROM payment
    WHERE user_id = ${userId}
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return (row as unknown as Payment) ?? null;
};

export const activatePayment = async (
  paymentId: number,
  fioTxId: string,
): Promise<void> => {
  const sql = await connectDb();

  // Use sql.begin via type assertion — Postgres.js TransactionSql is callable
  // but the TS types don't expose it directly
  await (sql.begin as unknown as (
    fn: (tx: typeof sql) => Promise<void>,
  ) => Promise<void>)(async (tx) => {
    const [payment] = await tx`
      UPDATE payment
      SET status = 'paid',
          fio_transaction_id = ${fioTxId},
          paid_at = NOW(),
          expires_at = CASE
            WHEN plan = 'monthly' THEN NOW() + INTERVAL '1 month'
            WHEN plan = 'yearly' THEN NOW() + INTERVAL '1 year'
          END
      WHERE id = ${paymentId} AND status = 'pending'
      RETURNING user_id
    `;

    if (!payment) return;

    await tx`
      UPDATE api_key
      SET mode = 'live'
      WHERE user_id = ${payment.user_id} AND mode = 'test'
    `;
  });
};
