import { inngest } from '@/src/inngest/client';
import { connectDb } from '@/src/lib/db';
import {
  discoverHistoricalFiles,
  ingestHistoricalBatch,
  ingestNowMeasurements,
  runDiscoverIfNeeded,
} from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';
import { sendEmail } from '@/src/lib/email';
import { expirationWarningEmail, expiredEmail } from '@/src/lib/email-templates';
import type { PaymentPlan } from '@/src/lib/types';

const DEFAULT_HISTORICAL_DAILY = 'https://opendata.chmi.cz/hydrology/historical/data/daily/';
const HISTORICAL_BATCH_SIZE = 50;

export const dailyIngest = inngest.createFunction(
  {
    id: 'daily-ingest',
    retries: 3,
  },
  [{ cron: 'TZ=UTC 55 23 * * *' }, { event: 'ingest/manual' }],
  async ({ step }) => {
    const discover = await step.run('discover', async () => {
      const db = await connectDb();
      return runDiscoverIfNeeded(db);
    });

    const ingest = await step.run('ingest-measurements', async () => {
      const db = await connectDb();
      const runId = await recordRunStart(db, 'ingest');

      try {
        const result = await ingestNowMeasurements(db);
        await recordRunFinish(db, runId, 'ok', result);
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordRunFinish(db, runId, 'error', { error: msg });
        throw e;
      }
    });

    return { discover, ingest };
  },
);

export const historicalIngest = inngest.createFunction(
  {
    id: 'historical-ingest',
    retries: 3,
  },
  [{ cron: 'TZ=UTC 0 4 * * *' }, { event: 'ingest/historical' }],
  async ({ step }) => {
    const baseUrl = process.env.CHMI_HISTORICAL_DAILY ?? DEFAULT_HISTORICAL_DAILY;

    const allFiles = await step.run('discover', async () => {
      return discoverHistoricalFiles(baseUrl);
    });

    const pending = await step.run('find-pending', async () => {
      const db = await connectDb();
      const currentYear = new Date().getFullYear();

      // Pro každý station+year spočítáme kolik dní máme vs kolik bychom měli mít
      const existing = await db<
        { ext_id: string; yr: number; day_count: number }[]
      >`
        SELECT
          s.id_external AS ext_id,
          EXTRACT(YEAR FROM m.ts)::INT AS yr,
          COUNT(DISTINCT m.ts::DATE)::INT AS day_count
        FROM measurement m
        JOIN station s ON s.id = m.station_id
        WHERE m.source = 'chmi_daily'
        GROUP BY s.id_external, EXTRACT(YEAR FROM m.ts)
      `;

      const dataMap = new Map<string, number>();
      for (const r of existing) {
        dataMap.set(`${r.ext_id}_${r.yr}`, r.day_count);
      }

      // Rozdělíme soubory do dvou skupin:
      // 1) gap-fill: rok s neúplnými daty nebo aktuální rok (data stále přibývají)
      // 2) backfill: rok bez jakýchkoli dat
      const gapFill: typeof allFiles = [];
      const backfill: typeof allFiles = [];

      for (const f of allFiles) {
        const key = `${f.stationExtId}_${f.year}`;
        const dayCount = dataMap.get(key);

        if (dayCount === undefined) {
          // Žádná data — čistý backfill
          backfill.push(f);
        } else if (f.year === currentYear) {
          // Aktuální rok — vždy aktualizovat (data přibývají)
          gapFill.push(f);
        } else {
          // Historický rok — kontrola úplnosti (365/366 dní)
          const daysInYear = f.year % 4 === 0 && (f.year % 100 !== 0 || f.year % 400 === 0)
            ? 366
            : 365;
          // Tolerujeme malou odchylku (některé stanice neměří každý den)
          if (dayCount < daysInYear * 0.9) {
            gapFill.push(f);
          }
          // Jinak kompletní — přeskočíme
        }
      }

      // Priorita: nejdřív mezery (novější roky napřed), pak backfill
      gapFill.sort((a, b) => b.year - a.year);
      backfill.sort((a, b) => b.year - a.year);

      return [...gapFill, ...backfill].slice(0, HISTORICAL_BATCH_SIZE);
    });

    if (pending.length === 0) {
      return { status: 'all_done', totalFiles: allFiles.length };
    }

    const result = await step.run('ingest-batch', async () => {
      const db = await connectDb();
      const runId = await recordRunStart(db, 'historical');

      try {
        // Načteme mapování ext_id → station.id
        const extIds = [...new Set(pending.map((f) => f.stationExtId))];
        const stationRows = await db`
          SELECT id, id_external FROM station WHERE id_external = ANY(${extIds}::TEXT[])
        `;
        const stationIdByExt = new Map<string, number>();
        for (const r of stationRows) {
          stationIdByExt.set(r.id_external as string, r.id as number);
        }

        const res = await ingestHistoricalBatch(db, baseUrl, pending, stationIdByExt);
        await recordRunFinish(db, runId, 'ok', res);
        return res;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordRunFinish(db, runId, 'error', { error: msg });
        throw e;
      }
    });

    // Self-chain: pokud zbývají další soubory, triggernem další run
    const totalPending = allFiles.length - pending.length; // zbytek
    if (totalPending > 0) {
      await step.sendEvent('chain-next-batch', {
        name: 'ingest/historical',
        data: {},
      });
    }

    return { status: 'batch_done', batch: pending.length, remaining: totalPending, result };
  },
);

// --- Subscription expiration notifier ---

interface PaymentRow {
  id: number;
  plan: PaymentPlan;
  expires_at: Date;
  user_email: string;
  user_name: string | null;
}

export const subscriptionNotifier = inngest.createFunction(
  {
    id: 'subscription-notifier',
    retries: 1,
  },
  { cron: 'TZ=UTC 0 8 * * *' },
  async ({ step }) => {
    // 1. Warnings: monthly 3d, yearly 14d, yearly 3d
    const warnings = await step.run('send-warnings', async () => {
      const db = await connectDb();
      let sent = 0;

      // Each window: [plan, interval, notification type]
      const windows: [string, string, string][] = [
        ['monthly', '3 days', 'warning_3d'],
        ['yearly', '14 days', 'warning_14d'],
        ['yearly', '3 days', 'warning_3d'],
      ];

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
          sent++;
        }
      }

      return { sent };
    });

    // 2. Expired: mark as expired + send email
    const expired = await step.run('handle-expired', async () => {
      const db = await connectDb();

      const rows = await db<PaymentRow[]>`
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

      let sent = 0;

      for (const row of rows) {
        const { subject, html } = expiredEmail(row.user_name ?? '', row.plan);
        await sendEmail(row.user_email, subject, html);

        await db`UPDATE payment SET status = 'expired' WHERE id = ${row.id}`;
        await db`
          INSERT INTO notification_log (payment_id, type)
          VALUES (${row.id}, ${'expired'})
          ON CONFLICT DO NOTHING
        `;
        sent++;
      }

      return { sent };
    });

    return { warnings, expired };
  },
);
