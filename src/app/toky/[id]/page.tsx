import { notFound } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  fetchRiverById,
  fetchRiverMeasurements,
  fetchRiverMeasurementStats,
  fetchStationsByRiverId,
} from '@/src/lib/queries';
import { DEFAULT_GRANULARITY, getDefaultPeriod } from '@/src/lib/granularity';
import { slugify } from '@/src/lib/slug';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import RiverMeasurementPanel from '@/src/components/river/RiverMeasurementPanel';
import { DynamicRiverMap } from '@/src/components/map/DynamicMap';

interface PageProps {
  params: Promise<{ id: string }>;
}

const RiverPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const riverId = Number(id);
  if (Number.isNaN(riverId)) notFound();

  const river = await fetchRiverById(riverId);
  if (!river) notFound();

  const initialGranularity = DEFAULT_GRANULARITY;
  const initialPeriod = getDefaultPeriod(initialGranularity);
  const [measurements, stations, stats] = await Promise.all([
    fetchRiverMeasurements(riverId, initialGranularity, initialPeriod),
    fetchStationsByRiverId(riverId),
    fetchRiverMeasurementStats(riverId, initialGranularity, initialPeriod),
  ]);
  return (
    <>
      <Button href="/" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
        Zpět na seznam toků
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {river.name}
        </Typography>
        {river.basin_name && (
          <Typography variant="body2" color="text.secondary">
            Povodí: {river.basin_name}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {river.station_count}{' '}
          {river.station_count === 1
            ? 'stanice'
            : river.station_count < 5
              ? 'stanice'
              : 'stanic'}
        </Typography>
      </Box>

      {stations.some((s) => s.lat && s.lon) && (
        <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          <DynamicRiverMap
            stations={stations
              .filter((s): s is typeof s & { lat: number; lon: number } => s.lat != null && s.lon != null)
              .map((s) => ({ lat: s.lat, lon: s.lon, name: s.name, slug: slugify(s.name) }))}
            riverId={river.id}
          />
        </Box>
      )}

      <ErrorBoundary>
        <RiverMeasurementPanel
          riverId={river.id}
          initialMeasurements={measurements}
          initialGranularity={initialGranularity}
          initialPeriod={initialPeriod}
          initialStats={stats}
        />
      </ErrorBoundary>

      {stations.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Stanice na toku {river.name}
          </Typography>
          <Grid container spacing={2}>
            {stations.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardActionArea href={`/stanice/${slugify(s.name)}`}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {s.name}
                      </Typography>
                      {s.basin_name && (
                        <Typography variant="caption" color="text.secondary">
                          {s.basin_name}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </>
  );
};

export default RiverPage;
