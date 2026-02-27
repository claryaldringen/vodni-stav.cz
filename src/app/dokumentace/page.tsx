import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import EndpointCard from '@/src/components/docs/EndpointCard';
import CodeBlock from '@/src/components/docs/CodeBlock';

export const metadata: Metadata = {
  title: 'Dokumentace API — Vodní stav',
  description: 'Dokumentace veřejného REST a GraphQL API pro hydrologická data z ČHMÚ.',
};

const DocsPage = () => (
  <Box>
    <Typography variant="h3" component="h1" gutterBottom>
      Dokumentace API
    </Typography>
    <Typography variant="body1" paragraph>
      Veřejné API aplikace vodni-stav.cz poskytuje přístup k hydrologickým datům z ČHMÚ — vodní
      stavy a průtoky na řekách v České republice. API je dostupné ve dvou variantách: REST a
      GraphQL.
    </Typography>
    <Typography variant="body1" paragraph>
      <strong>Base URL:</strong>{' '}
      <code>https://vodni-stav.cz</code>
    </Typography>

    <Divider sx={{ my: 4 }} />

    {/* ===== Autentizace ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="autentizace">
      Autentizace
    </Typography>
    <Typography variant="body1" paragraph>
      Všechny požadavky na veřejné API vyžadují API klíč zaslaný v hlavičce{' '}
      <code>X-API-Key</code>.
    </Typography>
    <Alert severity="info" sx={{ mb: 2 }}>
      API klíč získáte po{' '}
      <Link href="/registrace" underline="hover">
        registraci
      </Link>{' '}
      v sekci{' '}
      <Link href="/ucet" underline="hover">
        Můj účet
      </Link>
      .
    </Alert>
    <CodeBlock language="bash">{`curl -H "X-API-Key: vsc_váš_klíč" https://vodni-stav.cz/api/v1/stations`}</CodeBlock>

    <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
      Test vs Live mód
    </Typography>
    <Typography variant="body1" paragraph>
      Každý API klíč má nastavený mód — <strong>test</strong> nebo <strong>live</strong>.
      Testovací klíče (výchozí) vrací fake data s reálnou strukturou odpovědí, ideální pro vývoj
      a testování integrace. Mají rate limit 60 požadavků/min. Live klíče vrací skutečná
      hydrologická data z ČHMÚ bez limitu požadavků. Podrobnosti a ceny najdete na stránce{' '}
      <Link href="/cenik" underline="hover">
        Ceník
      </Link>
      .
    </Typography>

    <Divider sx={{ my: 4 }} />

    {/* ===== REST API ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="rest-api">
      REST API
    </Typography>
    <Typography variant="body1" paragraph>
      REST API je dostupné pod prefixem <code>/api/v1/</code>. Všechny odpovědi jsou ve formátu
      JSON s obálkou <code>{'{ "data": ..., "meta": ... }'}</code>.
    </Typography>

    <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
      Stanice
    </Typography>

    <EndpointCard method="GET" path="/api/v1/stations" description="Vrátí seznam všech aktivních měřicích stanic.">
      <Typography variant="subtitle2" gutterBottom>Příklad odpovědi:</Typography>
      <CodeBlock language="json">{`{
  "data": [
    {
      "id": 1,
      "id_external": "123456",
      "code": "ABC",
      "name": "Praha - Chuchle",
      "river_name": "Vltava",
      "basin_name": "Vltava",
      "lat": 50.0,
      "lon": 14.4,
      "elevation_m": 190.0,
      "is_active": true
    }
  ],
  "meta": { "count": 1 }
}`}</CodeBlock>
    </EndpointCard>

    <EndpointCard method="GET" path="/api/v1/stations/:id" description="Vrátí detail jedné stanice.">
      <Typography variant="subtitle2" gutterBottom>Parametry cesty:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parametr</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Popis</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>id</code></TableCell>
              <TableCell>number</TableCell>
              <TableCell>ID stanice</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </EndpointCard>

    <EndpointCard
      method="GET"
      path="/api/v1/stations/:id/measurements"
      description="Vrátí měření dané stanice za zvolené období."
    >
      <Typography variant="subtitle2" gutterBottom>Query parametry:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parametr</TableCell>
              <TableCell>Výchozí</TableCell>
              <TableCell>Popis</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>period</code></TableCell>
              <TableCell>3d</TableCell>
              <TableCell>Relativní období: 24h, 3d, 7d, 30d</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>from</code></TableCell>
              <TableCell>—</TableCell>
              <TableCell>Začátek rozsahu (YYYY-MM-DD). Má přednost před <code>period</code>.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>to</code></TableCell>
              <TableCell>—</TableCell>
              <TableCell>Konec rozsahu (YYYY-MM-DD, exkluzivní). Vyžaduje <code>from</code>.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="subtitle2" gutterBottom>Příklady:</Typography>
      <CodeBlock language="bash">{`# Relativní období
curl -H "X-API-Key: vsc_..." "https://vodni-stav.cz/api/v1/stations/1/measurements?period=7d"

# Konkrétní měsíc
curl -H "X-API-Key: vsc_..." "https://vodni-stav.cz/api/v1/stations/1/measurements?from=2025-01-01&to=2025-02-01"`}</CodeBlock>
    </EndpointCard>

    <EndpointCard
      method="GET"
      path="/api/v1/stations/:id/measurements/availability"
      description="Vrátí přehled dostupných dat — roky a měsíce, pro které existují měření. Volitelně vrátí dostupné dny v konkrétním měsíci."
    >
      <Typography variant="subtitle2" gutterBottom>Query parametry (volitelné):</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parametr</TableCell>
              <TableCell>Popis</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>year</code></TableCell>
              <TableCell>Rok (spolu s <code>month</code> vrátí dostupné dny)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>month</code></TableCell>
              <TableCell>Měsíc (1–12, vyžaduje <code>year</code>)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="subtitle2" gutterBottom>Příklad odpovědi (bez parametrů):</Typography>
      <CodeBlock language="json">{`{
  "data": {
    "years": [2024, 2025, 2026],
    "months": {
      "2024": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "2025": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "2026": [1, 2]
    }
  }
}`}</CodeBlock>
      <Typography variant="subtitle2" gutterBottom>Příklad odpovědi (s year + month):</Typography>
      <CodeBlock language="json">{`{
  "data": {
    "days": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  }
}`}</CodeBlock>
    </EndpointCard>

    <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
      Toky
    </Typography>

    <EndpointCard method="GET" path="/api/v1/rivers" description="Vrátí seznam toků s aktivními stanicemi.">
      <Typography variant="subtitle2" gutterBottom>Příklad odpovědi:</Typography>
      <CodeBlock language="json">{`{
  "data": [
    {
      "id": 1,
      "name": "Vltava",
      "basin_name": "Vltava",
      "station_count": 12,
      "latest_avg_discharge_m3s": 85.5
    }
  ],
  "meta": { "count": 1 }
}`}</CodeBlock>
    </EndpointCard>

    <EndpointCard method="GET" path="/api/v1/rivers/:id" description="Vrátí detail jednoho toku." />

    <EndpointCard
      method="GET"
      path="/api/v1/rivers/:id/measurements"
      description="Vrátí agregovaná měření pro celý tok."
    >
      <Typography variant="subtitle2" gutterBottom>Query parametry:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parametr</TableCell>
              <TableCell>Výchozí</TableCell>
              <TableCell>Popis</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>granularity</code></TableCell>
              <TableCell>hour</TableCell>
              <TableCell>Granularita: 10min, hour, day, month, year</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>period</code></TableCell>
              <TableCell>3d</TableCell>
              <TableCell>Relativní období: 24h, 3d, 7d, 30d, 90d, 1y, 5y, all</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>from</code></TableCell>
              <TableCell>—</TableCell>
              <TableCell>Začátek rozsahu (YYYY-MM-DD). Má přednost před <code>period</code>.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>to</code></TableCell>
              <TableCell>—</TableCell>
              <TableCell>Konec rozsahu (YYYY-MM-DD, exkluzivní). Vyžaduje <code>from</code>.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </EndpointCard>

    <EndpointCard
      method="GET"
      path="/api/v1/rivers/:id/measurements/availability"
      description="Vrátí přehled dostupných dat pro tok — roky a měsíce, volitelně dny."
    >
      <Typography variant="body2" paragraph>
        Funguje stejně jako <code>/api/v1/stations/:id/measurements/availability</code> — viz výše.
      </Typography>
    </EndpointCard>

    <Divider sx={{ my: 4 }} />

    {/* ===== GraphQL ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="graphql">
      GraphQL API
    </Typography>
    <Typography variant="body1" paragraph>
      GraphQL endpoint: <code>POST /api/graphql</code> (s hlavičkou <code>X-API-Key</code>).
      Interaktivní GraphiQL průzkumník je dostupný na <code>GET /api/graphql</code>.
    </Typography>

    <Typography variant="h6" gutterBottom>Schéma</Typography>
    <Typography variant="body1" paragraph>
      SDL schéma si můžete stáhnout na{' '}
      <Link href="/api/graphql/schema" underline="hover">
        <code>GET /api/graphql/schema</code>
      </Link>{' '}
      (bez autentizace). Introspekce je také povolena — GraphQL klienti jako Apollo nebo Relay si
      schéma stáhnou automaticky.
    </Typography>
    <CodeBlock language="bash">{`# Stažení SDL schématu
curl -o schema.graphql https://vodni-stav.cz/api/graphql/schema`}</CodeBlock>

    <Typography variant="subtitle2" gutterBottom>Příklad dotazu:</Typography>
    <CodeBlock language="graphql">{`query {
  stations {
    id
    name
    riverName
    measurements(period: _7D) {
      ts
      waterLevelCm
      dischargeM3s
    }
  }
}`}</CodeBlock>

    <Typography variant="subtitle2" gutterBottom>Dotaz s vlastním rozsahem dat:</Typography>
    <CodeBlock language="graphql">{`query {
  station(id: 1) {
    name
    measurements(from: "2025-01-01", to: "2025-02-01") {
      ts
      waterLevelCm
      dischargeM3s
    }
    availability {
      years
      yearMonths {
        year
        months
      }
    }
  }
}`}</CodeBlock>

    <Typography variant="subtitle2" gutterBottom>Příklad volání:</Typography>
    <CodeBlock language="bash">{`curl -X POST https://vodni-stav.cz/api/graphql \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: vsc_..." \\
  -d '{"query": "{ stations { id name riverName } }"}'`}</CodeBlock>

    <Divider sx={{ my: 4 }} />

    {/* ===== TypeScript typy ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="typescript-typy">
      TypeScript typy
    </Typography>
    <Typography variant="body1" paragraph>
      Pro typově bezpečnou práci s API můžete použít následující TypeScript definice:
    </Typography>

    <Typography variant="h6" gutterBottom>Datové typy</Typography>
    <CodeBlock language="typescript">{`interface Station {
  id: number;
  id_external: string;
  code: string | null;
  name: string;
  river_name: string | null;
  basin_name: string | null;
  lat: number | null;
  lon: number | null;
  elevation_m: number | null;
  is_active: boolean;
}

interface Measurement {
  ts: string;
  water_level_cm: number | null;
  discharge_m3s: number | null;
}

interface River {
  id: number;
  name: string;
  basin_name: string | null;
  station_count: number;
  latest_avg_discharge_m3s: number | null;
}`}</CodeBlock>

    <Typography variant="h6" gutterBottom>Enumy</Typography>
    <CodeBlock language="typescript">{`type Period = '24h' | '3d' | '7d' | '30d';
type Granularity = '10min' | 'hour' | 'day' | 'month' | 'year';
type RiverPeriod = '24h' | '3d' | '7d' | '30d' | '90d' | '1y' | '5y' | 'all';`}</CodeBlock>

    <Typography variant="h6" gutterBottom>Response obálky</Typography>
    <CodeBlock language="typescript">{`interface ApiSuccessResponse<T, M extends Record<string, unknown> = Record<string, never>> {
  data: T;
  meta?: M;
}

interface ApiErrorResponse {
  error: { message: string; status: number };
}

// Konkrétní response typy per endpoint
type StationsResponse = ApiSuccessResponse<Station[], { count: number }>;
type StationResponse = ApiSuccessResponse<Station>;
type StationMeasurementsResponse = ApiSuccessResponse<
  Measurement[],
  { count: number; period: Period; from?: string; to?: string }
>;
type RiversResponse = ApiSuccessResponse<River[], { count: number }>;
type RiverResponse = ApiSuccessResponse<River>;
type RiverMeasurementsResponse = ApiSuccessResponse<
  Measurement[],
  { count: number; granularity: Granularity; period: RiverPeriod; from?: string; to?: string }
>;`}</CodeBlock>

    <Divider sx={{ my: 4 }} />

    {/* ===== Formáty ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="formaty">
      Formáty odpovědí
    </Typography>

    <Typography variant="h6" gutterBottom>Úspěšná odpověď</Typography>
    <CodeBlock language="json">{`{
  "data": [...],
  "meta": {
    "count": 42,
    "period": "3d"
  }
}`}</CodeBlock>

    <Typography variant="h6" gutterBottom>Chybová odpověď</Typography>
    <CodeBlock language="json">{`{
  "error": {
    "message": "Chybí API klíč. Přidejte header X-API-Key.",
    "status": 401
  }
}`}</CodeBlock>

    <Typography variant="body1" paragraph>
      Časové značky (<code>ts</code>) jsou ve formátu ISO 8601 s časovou zónou (UTC).
    </Typography>

    <Divider sx={{ my: 4 }} />

    {/* ===== Příklady ===== */}
    <Typography variant="h4" component="h2" gutterBottom id="priklady">
      Příklady použití
    </Typography>

    <Typography variant="h6" gutterBottom>curl</Typography>
    <CodeBlock language="bash">{`# Seznam stanic
curl -H "X-API-Key: vsc_váš_klíč" https://vodni-stav.cz/api/v1/stations

# Měření stanice za 7 dnů
curl -H "X-API-Key: vsc_váš_klíč" "https://vodni-stav.cz/api/v1/stations/1/measurements?period=7d"

# Měření za leden 2025
curl -H "X-API-Key: vsc_váš_klíč" "https://vodni-stav.cz/api/v1/stations/1/measurements?from=2025-01-01&to=2025-02-01"

# Dostupnost dat stanice
curl -H "X-API-Key: vsc_váš_klíč" https://vodni-stav.cz/api/v1/stations/1/measurements/availability

# Seznam toků
curl -H "X-API-Key: vsc_váš_klíč" https://vodni-stav.cz/api/v1/rivers`}</CodeBlock>

    <Typography variant="h6" gutterBottom>JavaScript (fetch)</Typography>
    <CodeBlock language="javascript">{`const API_KEY = 'vsc_váš_klíč';

const res = await fetch('https://vodni-stav.cz/api/v1/stations', {
  headers: { 'X-API-Key': API_KEY },
});
const { data, meta } = await res.json();
console.log(\`Načteno \${meta.count} stanic\`);`}</CodeBlock>

    <Typography variant="h6" gutterBottom>Python (requests)</Typography>
    <CodeBlock language="python">{`import requests

API_KEY = "vsc_váš_klíč"
headers = {"X-API-Key": API_KEY}

res = requests.get("https://vodni-stav.cz/api/v1/stations", headers=headers)
data = res.json()
print(f"Načteno {data['meta']['count']} stanic")`}</CodeBlock>
  </Box>
);

export default DocsPage;
