import { connectDb } from '@/src/lib/db';
import { sendEmail } from '@/src/lib/email';
import { expirationWarningEmail, expiredEmail } from '@/src/lib/email-templates';
import type { PaymentPlan } from '@/src/lib/types';

const log = (...args: unknown[]) => {
  console.log(new Date().toISOString(), '[subscription-notifier]', ...args);
};

interface PaymentRow {
  id: number;
  plan: PaymentPlan;
  expires_at: Date;
  user_email: string;
  user_name: string | null;
}

const main = async () => {
  log('start');
  const db = await connectDb();

  // 1. Warnings: monthly 3d, yearly 14d, yearly 3d
  const windows: [string, string, string][] = [
    ['monthly', '3 days', 'warning_3d'],
    ['yearly', '14 days', 'warning_14d'],
    ['yearly', '3 days', 'warning_3d'],
  ];

  let warningSent = 0;

  for (const [plan, interval, type] of windows) {
    const rows = await db<PaymentRow[]>`
      SELECT p.id, p.plan, p.expires_at, u.email AS user_email, u.name AS user_name
      FROM payment p
      JOIN "user" u ON u.id = p.user_id
      WHERE p.plan = ${plan}
        AND p.status = 'paid'
        AND p.expires_at > NOW()
        AND p.expires_at <= NOW() + ${interval}::INTERVAL
        AND NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.payment_id = p.id AND nl.type = ${type}
        )
    `;

    for (const row of rows) {
      const daysLeft = Math.ceil(
        (row.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      const { subject, html } = expirationWarningEmail(
        row.user_name ?? '',
        row.plan,
        row.expires_at,
        daysLeft,
      );
      await sendEmail(row.user_email, subject, html);
      await db`
        INSERT INTO notification_log (payment_id, type)
        VALUES (${row.id}, ${type})
        ON CONFLICT DO NOTHING
      `;
      warningSent++;
    }
  }

  log('warnings sent:', warningSent);

  // 2. Expired: mark as expired + send email
  const expiredRows = await db<PaymentRow[]>`
    SELECT p.id, p.plan, p.expires_at, u.email AS user_email, u.name AS user_name
    FROM payment p
    JOIN "user" u ON u.id = p.user_id
    WHERE p.status = 'paid'
      AND p.expires_at < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM notification_log nl
        WHERE nl.payment_id = p.id AND nl.type = 'expired'
      )
  `;

  let expiredSent = 0;

  for (const row of expiredRows) {
    const { subject, html } = expiredEmail(row.user_name ?? '', row.plan);
    await sendEmail(row.user_email, subject, html);

    await db`UPDATE payment SET status = 'expired' WHERE id = ${row.id}`;
    await db`
      INSERT INTO notification_log (payment_id, type)
      VALUES (${row.id}, ${'expired'})
      ON CONFLICT DO NOTHING
    `;
    expiredSent++;
  }

  log('expired processed:', expiredSent);
  log('done');
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
