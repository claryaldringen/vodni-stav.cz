# Migrace vodni-stav.cz z Vercelu na Hetzner VPS

## Motivace

Vercel není ideální pro aplikaci s long-running cron joby a background procesy. Přesun na vlastní VPS odstraní limity na dobu běhu, zjednoduší architekturu (odstranění Inngest workaroundu) a sníží provozní náklady.

## Cílová infrastruktura

| Komponenta | Řešení |
|---|---|
| Server | Hetzner VPS (204.168.176.128, Ubuntu) |
| Reverse proxy + HTTPS | Caddy (už nainstalovaný, automatický Let's Encrypt) |
| Runtime | Node.js, Next.js jako systemd service (`next start`) |
| Databáze | PostgreSQL na tom samém VPS (už nainstalovaný) |
| Cron joby | Systemd timery |
| Deploy | GitHub Actions → SSH → build & restart |
| Doména | DNS přepojení `vodnistav.cz` na Hetzner IP |

## Změny v kódu

### 1. Odstranění Inngest

Smazat:
- `src/inngest/client.ts`
- `src/inngest/functions.ts`
- `src/app/api/inngest/route.ts`
- Závislost `inngest` z `package.json`

Inngest sloužil jako workaround pro Vercel limity (max 60s execution, žádný nativní cron). Na VPS není potřeba.

### 2. Standalone cron skripty

Nahrazení 3 Inngest funkcí standalone skripty v `scripts/cron/`:

#### `scripts/cron/daily-ingest.ts`
- **Plán:** 23:55 UTC denně
- **Logika:** Discover stanic (`runDiscoverIfNeeded`) + ingest aktuálních měření (`ingestNowMeasurements`)
- **Retry:** 3 pokusy s exponenciálním backoffem
- **Audit:** `recordRunStart` / `recordRunFinish` (stávající mechanismus)

#### `scripts/cron/historical-ingest.ts`
- **Plán:** 04:00 UTC denně
- **Logika:** Discover historických souborů, najít pending (gap-fill + backfill), zpracovat po dávkách 50 souborů v cyklu (bez self-chainingu — na VPS nemáme timeout)
- **Retry:** 3 pokusy per dávka
- **Audit:** `recordRunStart` / `recordRunFinish`

#### `scripts/cron/subscription-notifier.ts`
- **Plán:** 08:00 UTC denně
- **Logika:** Varování o expiraci předplatného (3d/14d), označení expirovaných plateb, rozeslání e-mailů
- **Retry:** 1 pokus
- **Audit:** Zápis do `notification_log` (stávající mechanismus)

Všechny skripty budou spouštěny přes `tsx scripts/cron/<name>.ts` a budou importovat stávající funkce z `scripts/ingest/` a `src/lib/`.

### 3. Zjednodušení `/api/cron/ingest`

Ponechat jako volitelný manuální HTTP trigger (užitečný pro debugging/testování). Odebrat Inngest trigger, volat přímo ingest logiku. Na VPS už není potřeba jako primární cron mechanismus.

## Serverová konfigurace

### Systemd service pro Next.js

```ini
# /etc/systemd/system/vodnistav.service
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

[Install]
WantedBy=multi-user.target
```

### Systemd timery

```ini
# /etc/systemd/system/vodnistav-daily-ingest.timer
[Unit]
Description=Daily ingest from CHMI

[Timer]
OnCalendar=*-*-* 23:55:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/vodnistav-daily-ingest.service
[Unit]
Description=Daily ingest from CHMI

[Service]
Type=oneshot
User=vodnistav
WorkingDirectory=/opt/vodnistav
ExecStart=/usr/bin/npx tsx scripts/cron/daily-ingest.ts
EnvironmentFile=/opt/vodnistav/.env
```

Analogicky pro `historical-ingest` (04:00 UTC) a `subscription-notifier` (08:00 UTC).

### Caddy konfigurace

```caddyfile
vodnistav.cz {
    reverse_proxy localhost:3000
}
```

### PostgreSQL

- Databáze `hydro` na localhostu
- Migrace: `yarn migrate` (stávající skript)
- `DATABASE_URL=postgres://vodnistav@localhost:5432/hydro`

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: 204.168.176.128
          username: vodnistav
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/vodnistav
            git pull origin main
            yarn install --frozen-lockfile
            yarn build
            sudo systemctl restart vodnistav
```

## Co zůstává beze změny

- **Frontend** — veškerý kód stránek, komponent, stylů
- **API routes** — všechny `/api/*` endpointy (kromě Inngest)
- **Middleware** — auth middleware (`src/middleware.ts`)
- **Auth** — NextAuth.js s OAuth providery (jen aktualizovat redirect URI)
- **DB driver** — `postgres` (Postgres.js) — jen změna `DATABASE_URL`
- **SMTP** — nodemailer + Seznam EmailProfi
- **GraphQL** — graphql-yoga endpoint

## Migrační kroky (pořadí)

1. Připravit kódové změny (odstranit Inngest, vytvořit cron skripty)
2. Nastavit PostgreSQL na Hetzneru (databáze, migrace, seed dat z Neonu)
3. Nastavit Next.js systemd service
4. Nakonfigurovat Caddy
5. Nastavit systemd timery pro cron joby
6. Nastavit GitHub Actions deploy pipeline
7. Aktualizovat OAuth redirect URI u providerů (Google, GitHub, Facebook, Apple)
8. Přepojit DNS
9. Ověřit funkčnost (web, API, cron, auth, platby, e-maily)
10. Vypnout Vercel projekt

## Rizika

- **Výpadek při přepojení DNS** — minimalizovat TTL předem
- **Data migrace z Neonu** — `pg_dump` / `pg_restore`, ověřit konzistenci
- **OAuth callback URL** — musí být aktualizovány před přepojením DNS
- **Firewall** — ověřit otevřené porty (80, 443, 5432 jen localhost)
