# Hetzner Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate vodni-stav.cz from Vercel to a self-hosted Hetzner VPS with PostgreSQL, Caddy, systemd, and GitHub Actions CD.

**Architecture:** Remove Inngest (Vercel workaround for long-running cron), replace with 3 standalone TypeScript cron scripts run via systemd timers. Next.js runs as a systemd service behind Caddy reverse proxy. GitHub Actions deploys via SSH on push to main.

**Tech Stack:** Next.js 16, Node.js 20, PostgreSQL 17, Caddy, systemd, GitHub Actions, tsx

**Spec:** `docs/superpowers/specs/2026-04-10-hetzner-migration-design.md`

---

## File Structure

### New files
- `scripts/cron/daily-ingest.ts` — Standalone cron: discover + ingest aktualnich mereni
- `scripts/cron/historical-ingest.ts` — Standalone cron: backfill historickych dat
- `scripts/cron/subscription-notifier.ts` — Standalone cron: expirace predplatneho
- `scripts/cron/retry.ts` — Sdileny retry helper pro cron skripty
- `.github/workflows/deploy.yml` — CD pipeline: SSH deploy na Hetzner
- `deploy/vodnistav.service` — Systemd service pro Next.js
- `deploy/vodnistav-daily-ingest.service` — Systemd oneshot pro daily ingest
- `deploy/vodnistav-daily-ingest.timer` — Systemd timer 23:55 UTC
- `deploy/vodnistav-historical-ingest.service` — Systemd oneshot pro historical ingest
- `deploy/vodnistav-historical-ingest.timer` — Systemd timer 04:00 UTC
- `deploy/vodnistav-subscription-notifier.service` — Systemd oneshot pro notifikace
- `deploy/vodnistav-subscription-notifier.timer` — Systemd timer 08:00 UTC
- `deploy/Caddyfile` — Caddy konfigurace

### Modified files
- `package.json` — Odebrat `inngest`, pridat cron skripty, odebrat `inngest:dev`
- `.env.example` — Odebrat Inngest env vars
- `src/app/api/cron/ingest/route.ts` — Odebrat Inngest import, volat ingest primo
- `src/lib/types.ts` — Overit export `PaymentPlan` (pouziva subscription-notifier)

### Deleted files
- `src/inngest/client.ts`
- `src/inngest/functions.ts`
- `src/app/api/inngest/route.ts`

---

## Task 1: Retry helper

**Files:**
- Create: `scripts/cron/retry.ts`
- Test: `scripts/cron/retry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/cron/retry.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 2)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test scripts/cron/retry.test.ts`
Expected: FAIL — `withRetry` not found

- [ ] **Step 3: Write implementation**

Create `scripts/cron/retry.ts`:

```typescript
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs = 2000,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[retry] Attempt ${attempt}/${maxAttempts} failed: ${msg}`);

      if (attempt < maxAttempts) {
        const wait = delayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  throw lastError;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test scripts/cron/retry.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/cron/retry.ts scripts/cron/retry.test.ts
git commit -m "feat: add retry helper for cron scripts"
```

---

## Task 2: Daily ingest cron script

**Files:**
- Create: `scripts/cron/daily-ingest.ts`

This script replaces the `dailyIngest` Inngest function from `src/inngest/functions.ts:17-45`. It reuses the same core functions: `runDiscoverIfNeeded` and `ingestNowMeasurements`.

- [ ] **Step 1: Create the script**

Create `scripts/cron/daily-ingest.ts`:

```typescript
import { connectDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';
import { withRetry } from './retry';

const log = (...args: unknown[]) => {
  console.log(new Date().toISOString(), '[daily-ingest]', ...args);
};

const main = async () => {
  log('start');
  const db = await connectDb();

  const discover = await runDiscoverIfNeeded(db);
  if (discover.skipped) log('discover skipped');
  else log('discover done:', discover.details);

  const runId = await recordRunStart(db, 'ingest');

  try {
    const result = await withRetry(
      () => ingestNowMeasurements(db),
      3,
    );
    await recordRunFinish(db, runId, 'ok', result);
    log('done:', result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg });
    log('FAILED:', msg);
    process.exit(1);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Test manually**

Run: `yarn tsx scripts/cron/daily-ingest.ts`
Expected: Script runs, logs discover + ingest results, exits with code 0.

- [ ] **Step 3: Add yarn script**

In `package.json`, add to `"scripts"`:

```json
"cron:daily": "tsx scripts/cron/daily-ingest.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/cron/daily-ingest.ts package.json
git commit -m "feat: add standalone daily ingest cron script"
```

---

## Task 3: Historical ingest cron script

**Files:**
- Create: `scripts/cron/historical-ingest.ts`

This replaces the `historicalIngest` Inngest function from `src/inngest/functions.ts:48-159`. Key difference: on VPS there's no timeout, so instead of self-chaining via Inngest events, we loop through all batches in a single run.

- [ ] **Step 1: Create the script**

Create `scripts/cron/historical-ingest.ts`:

```typescript
import { connectDb } from '@/src/lib/db';
import { discoverHistoricalFiles, ingestHistoricalBatch } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';
import { withRetry } from './retry';

const DEFAULT_HISTORICAL_DAILY = 'https://opendata.chmi.cz/hydrology/historical/data/daily/';
const BATCH_SIZE = 50;

const log = (...args: unknown[]) => {
  console.log(new Date().toISOString(), '[historical-ingest]', ...args);
};

const main = async () => {
  log('start');
  const db = await connectDb();
  const baseUrl = process.env.CHMI_HISTORICAL_DAILY ?? DEFAULT_HISTORICAL_DAILY;

  const allFiles = await discoverHistoricalFiles(baseUrl);
  log('discovered files:', allFiles.length);

  const currentYear = new Date().getFullYear();

  // Zjistit existujici data — kolik dni mame pro kazdy station+rok
  const existing = await db<{ ext_id: string; yr: number; day_count: number }[]>`
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

  // Rozdelit na gap-fill (neuplna data) a backfill (zadna data)
  const gapFill: typeof allFiles = [];
  const backfill: typeof allFiles = [];

  for (const f of allFiles) {
    const key = `${f.stationExtId}_${f.year}`;
    const dayCount = dataMap.get(key);

    if (dayCount === undefined) {
      backfill.push(f);
    } else if (f.year === currentYear) {
      gapFill.push(f);
    } else {
      const daysInYear =
        f.year % 4 === 0 && (f.year % 100 !== 0 || f.year % 400 === 0) ? 366 : 365;
      if (dayCount < daysInYear * 0.9) {
        gapFill.push(f);
      }
    }
  }

  gapFill.sort((a, b) => b.year - a.year);
  backfill.sort((a, b) => b.year - a.year);

  const pending = [...gapFill, ...backfill];
  log('pending files:', pending.length, `(gap-fill: ${gapFill.length}, backfill: ${backfill.length})`);

  if (pending.length === 0) {
    log('all done, nothing to ingest');
    process.exit(0);
  }

  // Nacist mapovani ext_id -> station.id
  const extIds = [...new Set(pending.map((f) => f.stationExtId))];
  const stationRows = await db`
    SELECT id, id_external FROM station WHERE id_external = ANY(${extIds}::TEXT[])
  `;
  const stationIdByExt = new Map<string, number>();
  for (const r of stationRows) {
    stationIdByExt.set(r.id_external as string, r.id as number);
  }

  // Zpracovat po davkach
  const runId = await recordRunStart(db, 'historical');
  let totalUpserted = 0;
  let totalErrors = 0;

  try {
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

      log(`batch ${batchNum}/${totalBatches} (${batch.length} files)`);

      const result = await withRetry(
        () => ingestHistoricalBatch(db, baseUrl, batch, stationIdByExt),
        3,
      );

      totalUpserted += result.upserted;
      totalErrors += result.errors;
      log(`batch ${batchNum} done: upserted=${result.upserted}, errors=${result.errors}`);
    }

    const summary = { totalUpserted, totalErrors, filesProcessed: pending.length };
    await recordRunFinish(db, runId, 'ok', summary);
    log('done:', summary);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg, totalUpserted, totalErrors });
    log('FAILED:', msg);
    process.exit(1);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add yarn script**

In `package.json`, add to `"scripts"`:

```json
"cron:historical": "tsx scripts/cron/historical-ingest.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/cron/historical-ingest.ts package.json
git commit -m "feat: add standalone historical ingest cron script"
```

---

## Task 4: Subscription notifier cron script

**Files:**
- Create: `scripts/cron/subscription-notifier.ts`

This replaces `subscriptionNotifier` from `src/inngest/functions.ts:172-265`. The SQL queries and email logic are extracted directly.

- [ ] **Step 1: Create the script**

Create `scripts/cron/subscription-notifier.ts`:

```typescript
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
```

- [ ] **Step 2: Add yarn script**

In `package.json`, add to `"scripts"`:

```json
"cron:notify": "tsx scripts/cron/subscription-notifier.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/cron/subscription-notifier.ts package.json
git commit -m "feat: add standalone subscription notifier cron script"
```

---

## Task 5: Remove Inngest

**Files:**
- Delete: `src/inngest/client.ts`
- Delete: `src/inngest/functions.ts`
- Delete: `src/app/api/inngest/route.ts`
- Modify: `package.json` — remove `inngest` dependency and `inngest:dev` script
- Modify: `.env.example` — remove Inngest env vars
- Modify: `src/app/api/cron/ingest/route.ts` — remove Inngest, call ingest directly

- [ ] **Step 1: Delete Inngest files**

```bash
rm src/inngest/client.ts src/inngest/functions.ts
rmdir src/inngest
rm src/app/api/inngest/route.ts
rmdir src/app/api/inngest
```

- [ ] **Step 2: Remove inngest from package.json**

In `package.json`, remove from `"dependencies"`:

```json
"inngest": "^3.52.3",
```

Remove from `"scripts"`:

```json
"inngest:dev": "npx inngest-cli@latest dev"
```

- [ ] **Step 3: Remove Inngest env vars from .env.example**

Remove these lines from `.env.example`:

```
# Inngest (na produkci nastaví Vercel integrace automaticky)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

- [ ] **Step 4: Update cron/ingest route**

Replace the contents of `src/app/api/cron/ingest/route.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  if (auth.length !== expected.length) return false;

  const a = new TextEncoder().encode(auth);
  const b = new TextEncoder().encode(expected);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
};

export const GET = async (req: Request) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = await connectDb();

  await runDiscoverIfNeeded(db);

  const runId = await recordRunStart(db, 'ingest');
  try {
    const result = await ingestNowMeasurements(db);
    await recordRunFinish(db, runId, 'ok', result);
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
};
```

- [ ] **Step 5: Run yarn install to update lockfile**

```bash
yarn install
```

- [ ] **Step 6: Run lint + typecheck**

```bash
yarn lint && yarn typecheck
```

Expected: No errors. Fix any if they appear.

- [ ] **Step 7: Run tests**

```bash
yarn test
```

Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove Inngest, replace with standalone cron scripts"
```

---

## Task 6: Systemd unit files

**Files:**
- Create: `deploy/vodnistav.service`
- Create: `deploy/vodnistav-daily-ingest.service`
- Create: `deploy/vodnistav-daily-ingest.timer`
- Create: `deploy/vodnistav-historical-ingest.service`
- Create: `deploy/vodnistav-historical-ingest.timer`
- Create: `deploy/vodnistav-subscription-notifier.service`
- Create: `deploy/vodnistav-subscription-notifier.timer`

- [ ] **Step 1: Create Next.js service**

Create `deploy/vodnistav.service`:

```ini
[Unit]
Description=vodnistav.cz Next.js
After=network.target postgresql.service

[Service]
Type=simple
User=vodnistav
WorkingDirectory=/opt/vodnistav
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
EnvironmentFile=/opt/vodnistav/.env
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Create daily ingest timer + service**

Create `deploy/vodnistav-daily-ingest.service`:

```ini
[Unit]
Description=vodnistav.cz daily ingest
After=network.target postgresql.service

[Service]
Type=oneshot
User=vodnistav
WorkingDirectory=/opt/vodnistav
ExecStart=/usr/bin/npx tsx scripts/cron/daily-ingest.ts
EnvironmentFile=/opt/vodnistav/.env
Environment=NODE_ENV=production
TimeoutStartSec=600
```

Create `deploy/vodnistav-daily-ingest.timer`:

```ini
[Unit]
Description=Daily ingest from CHMI (23:55 UTC)

[Timer]
OnCalendar=*-*-* 23:55:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 3: Create historical ingest timer + service**

Create `deploy/vodnistav-historical-ingest.service`:

```ini
[Unit]
Description=vodnistav.cz historical ingest
After=network.target postgresql.service

[Service]
Type=oneshot
User=vodnistav
WorkingDirectory=/opt/vodnistav
ExecStart=/usr/bin/npx tsx scripts/cron/historical-ingest.ts
EnvironmentFile=/opt/vodnistav/.env
Environment=NODE_ENV=production
TimeoutStartSec=3600
```

Create `deploy/vodnistav-historical-ingest.timer`:

```ini
[Unit]
Description=Historical ingest from CHMI (04:00 UTC)

[Timer]
OnCalendar=*-*-* 04:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 4: Create subscription notifier timer + service**

Create `deploy/vodnistav-subscription-notifier.service`:

```ini
[Unit]
Description=vodnistav.cz subscription notifier
After=network.target postgresql.service

[Service]
Type=oneshot
User=vodnistav
WorkingDirectory=/opt/vodnistav
ExecStart=/usr/bin/npx tsx scripts/cron/subscription-notifier.ts
EnvironmentFile=/opt/vodnistav/.env
Environment=NODE_ENV=production
TimeoutStartSec=300
```

Create `deploy/vodnistav-subscription-notifier.timer`:

```ini
[Unit]
Description=Subscription notifier (08:00 UTC)

[Timer]
OnCalendar=*-*-* 08:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 5: Commit**

```bash
git add deploy/
git commit -m "feat: add systemd service and timer units for Hetzner"
```

---

## Task 7: Caddy configuration

**Files:**
- Create: `deploy/Caddyfile`

- [ ] **Step 1: Create Caddyfile**

Create `deploy/Caddyfile`:

```caddyfile
vodnistav.cz {
    reverse_proxy localhost:3000
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/Caddyfile
git commit -m "feat: add Caddyfile for Hetzner reverse proxy"
```

---

## Task 8: GitHub Actions deploy pipeline

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --immutable
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test

  deploy:
    needs: ci
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/vodnistav
            git pull origin main
            yarn install --immutable
            yarn build
            sudo systemctl restart vodnistav
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deploy pipeline for Hetzner"
```

---

## Task 9: Server setup (manual — on Hetzner VPS via SSH)

These steps are performed on the Hetzner VPS (204.168.176.128). They are not code changes but operational setup.

- [ ] **Step 1: Create vodnistav user and clone repo**

```bash
ssh root@204.168.176.128

# Create user
sudo useradd -m -s /bin/bash vodnistav
sudo mkdir -p /opt/vodnistav
sudo chown vodnistav:vodnistav /opt/vodnistav

# Clone repo
sudo -u vodnistav git clone https://github.com/<OWNER>/vodni-stav.cz.git /opt/vodnistav

# Install Node.js 20 (if not present)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
```

- [ ] **Step 2: Setup PostgreSQL database**

```bash
sudo -u postgres createuser vodnistav
sudo -u postgres createdb -O vodnistav hydro

# Verify
sudo -u vodnistav psql -d hydro -c "SELECT 1;"
```

- [ ] **Step 3: Create .env file**

```bash
sudo -u vodnistav nano /opt/vodnistav/.env
```

Paste environment variables (from `.env.example`, fill with production values). Key changes:
- `DATABASE_URL=postgres://vodnistav@localhost:5432/hydro`
- Remove `INNGEST_*` variables

- [ ] **Step 4: Build and run migrations**

```bash
cd /opt/vodnistav
sudo -u vodnistav yarn install --immutable
sudo -u vodnistav yarn build
sudo -u vodnistav yarn migrate
```

- [ ] **Step 5: Migrate data from Neon**

On the current machine (with access to Neon), export:

```bash
pg_dump "$NEON_DATABASE_URL" --data-only --no-owner --no-acl > neon-dump.sql
```

On the Hetzner VPS:

```bash
sudo -u vodnistav psql -d hydro < neon-dump.sql
```

- [ ] **Step 6: Install systemd units**

```bash
sudo cp /opt/vodnistav/deploy/vodnistav.service /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-daily-ingest.service /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-daily-ingest.timer /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-historical-ingest.service /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-historical-ingest.timer /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-subscription-notifier.service /etc/systemd/system/
sudo cp /opt/vodnistav/deploy/vodnistav-subscription-notifier.timer /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now vodnistav
sudo systemctl enable --now vodnistav-daily-ingest.timer
sudo systemctl enable --now vodnistav-historical-ingest.timer
sudo systemctl enable --now vodnistav-subscription-notifier.timer
```

Verify:

```bash
sudo systemctl status vodnistav
sudo systemctl list-timers --all | grep vodnistav
curl -s http://localhost:3000/api/health
```

- [ ] **Step 7: Configure Caddy**

```bash
sudo cp /opt/vodnistav/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Verify: `curl -s https://vodnistav.cz/api/health` (after DNS change)

- [ ] **Step 8: Allow deploy user to restart service**

Create sudoers rule so the deploy user can restart the service without password:

```bash
echo "vodnistav ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart vodnistav" | sudo tee /etc/sudoers.d/vodnistav
```

- [ ] **Step 9: Set GitHub Actions secrets**

In the GitHub repo settings, add these secrets:
- `DEPLOY_HOST` = `204.168.176.128`
- `DEPLOY_USER` = `vodnistav`
- `DEPLOY_SSH_KEY` = SSH private key for the `vodnistav` user

---

## Task 10: DNS and OAuth switchover

- [ ] **Step 1: Lower DNS TTL**

At least 24h before switching, lower TTL for `vodnistav.cz` to 60s (at your DNS provider).

- [ ] **Step 2: Update DNS A record**

Point `vodnistav.cz` A record to `204.168.176.128`.

- [ ] **Step 3: Update OAuth redirect URIs**

In each OAuth provider's console, update callback URLs:
- Google: `https://vodnistav.cz/api/auth/callback/google`
- GitHub: `https://vodnistav.cz/api/auth/callback/github`
- Facebook: `https://vodnistav.cz/api/auth/callback/facebook`
- Apple: `https://vodnistav.cz/api/auth/callback/apple`

- [ ] **Step 4: Verify everything works**

```bash
# Web loads
curl -s -o /dev/null -w "%{http_code}" https://vodnistav.cz

# API health
curl -s https://vodnistav.cz/api/health

# Cron trigger
curl -s -H "Authorization: Bearer $CRON_SECRET" https://vodnistav.cz/api/cron/ingest

# Timers active
ssh vodnistav@204.168.176.128 "sudo systemctl list-timers --all | grep vodnistav"
```

- [ ] **Step 5: Disable Vercel project**

Once everything is confirmed working, disable the Vercel deployment.
