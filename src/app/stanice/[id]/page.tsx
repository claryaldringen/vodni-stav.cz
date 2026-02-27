import { notFound } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchStationBySlug, fetchMeasurements, fetchMeasurementStats } from '@/src/lib/queries';
import { DEFAULT_PERIOD } from '@/src/lib/periods';
import { ingestStationIfStale } from '@/scripts/ingest/chmi';
import { connectDb } from '@/src/lib/db';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import MeasurementPanel from '@/src/components/measurement/MeasurementPanel';
import { DynamicStationMap } from '@/src/components/map/DynamicMap';

interface PageProps {
  params: Promise<{ id: string }>;
}

const StationPage = async ({ params }: PageProps) => {
  const { id } = await params;

  const station = await fetchStationBySlug(id);
  if (!station) notFound();

  // Fire-and-forget — neblokuje render, data se zobrazí z DB
  connectDb().then((db) => ingestStationIfStale(db, station.id)).catch(() => {});

  const [measurements, stats] = await Promise.all([
    fetchMeasurements(station.id, DEFAULT_PERIOD),
    fetchMeasurementStats(station.id, DEFAULT_PERIOD),
  ]);

  return (
    <>
      <Button href="/stanice" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
        Zpět na seznam stanic
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {station.name}
        </Typography>
        {station.river_name && (
          <Typography variant="h6" color="primary">
            {station.river_name}
            {station.basin_name && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                — {station.basin_name}
              </Typography>
            )}
          </Typography>
        )}
      </Box>

      {station.lat && station.lon && (
        <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          <DynamicStationMap lat={station.lat} lon={station.lon} name={station.name} />
        </Box>
      )}

      <ErrorBoundary>
        <MeasurementPanel
          stationId={station.id}
          initialMeasurements={measurements}
          initialPeriod={DEFAULT_PERIOD}
          initialStats={stats}
        />
      </ErrorBoundary>

      <Card variant="outlined" sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Informace o stanici
          </Typography>
          <Grid container spacing={2}>
            {station.code && (
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Kód stanice (DBC)
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {station.code}
                </Typography>
              </Grid>
            )}
            {station.lat && station.lon && (
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Souřadnice
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {station.lat.toFixed(4)}°N, {station.lon.toFixed(4)}°E
                </Typography>
              </Grid>
            )}
            {station.elevation_m != null && (
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Nadmořská výška
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {station.elevation_m} m n. m.
                </Typography>
              </Grid>
            )}
            {station.meta?.ISFORECAST != null && (
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Předpovědní stanice
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {station.meta.ISFORECAST ? 'Ano' : 'Ne'}
                </Typography>
              </Grid>
            )}
            {station.meta &&
              Object.entries(station.meta)
                .filter(
                  ([key]) =>
                    !['ISFORECAST', 'geometry', 'geometry_fetched_at'].includes(key),
                )
                .map(([key, value]) => (
                  <Grid key={key} size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {key}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {String(value)}
                    </Typography>
                  </Grid>
                ))}
          </Grid>
        </CardContent>
      </Card>
    </>
  );
};

export default StationPage;
