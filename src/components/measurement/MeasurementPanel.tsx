'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import PeriodSelector from './PeriodSelector';
import CustomDatePicker from './CustomDatePicker';
import ViewToggle, { type ViewMode } from './ViewToggle';
import MeasurementChart from './MeasurementChart';
import MeasurementTable from './MeasurementTable';
import MeasurementStatsCard from './MeasurementStatsCard';
import { formatWaterLevel, formatDischarge } from '@/src/lib/format';
import type { DateRange } from '@/src/lib/date-range';
import type { Measurement, MeasurementStats, Period } from '@/src/lib/types';

interface MeasurementPanelProps {
  stationId: number;
  initialMeasurements: Measurement[];
  initialPeriod: Period;
  initialStats: MeasurementStats | null;
}

const MeasurementPanel = ({
  stationId,
  initialMeasurements,
  initialPeriod,
  initialStats,
}: MeasurementPanelProps) => {
  const [period, setPeriod] = useState<Period | null>(initialPeriod);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [view, setView] = useState<ViewMode>('chart');
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements);
  const [stats, setStats] = useState<MeasurementStats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (sid: number, p: Period | null, range: DateRange | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params = range
          ? `from=${range.from}&to=${range.to}`
          : `period=${p ?? '3d'}`;
        const res = await fetch(`/api/stations/${sid}/measurements?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Server vrátil chybu (${res.status})`);
        }
        const json = await res.json();
        setMeasurements(json.measurements);
        if (json.stats) setStats(json.stats);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Neznámá chyba';
        setError(`Nepodařilo se načíst data: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (customRange) {
      loadData(stationId, null, customRange);
    } else if (period !== initialPeriod) {
      loadData(stationId, period, null);
    }
  }, [period, customRange, stationId, initialPeriod, loadData]);

  // Abort pending fetch on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-refresh every 10 minutes (ČHMÚ update interval) — only for relative periods
  useEffect(() => {
    if (customRange) return;
    const interval = setInterval(() => {
      loadData(stationId, period, null);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stationId, period, customRange, loadData]);

  const handlePeriodChange = (p: Period) => {
    setError(null);
    setCustomRange(null);
    if (p === initialPeriod) {
      setMeasurements(initialMeasurements);
      setStats(initialStats);
      setPeriod(p);
      return;
    }
    setPeriod(p);
  };

  const handleCustomRangeChange = (range: DateRange) => {
    setError(null);
    setPeriod(null);
    setCustomRange(range);
  };

  const latest = measurements.at(-1) ?? null;

  return (
    <>
      {latest && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.200' }}>
              <CardContent>
                <Typography variant="overline" color="primary">
                  Aktuální hladina
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.dark">
                  {formatWaterLevel(latest.water_level_cm)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ bgcolor: 'success.50', borderColor: 'success.200' }}>
              <CardContent>
                <Typography variant="overline" color="secondary">
                  Aktuální průtok
                </Typography>
                <Typography variant="h4" fontWeight={700} color="secondary.dark">
                  {formatDischarge(latest.discharge_m3s)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {stats && <MeasurementStatsCard stats={stats} />}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <PeriodSelector value={period} onChange={handlePeriodChange} />
          <CustomDatePicker
            value={customRange}
            onChange={handleCustomRangeChange}
            active={customRange !== null}
            onActivate={() => setPeriod(null)}
            availabilityUrl={`/api/stations/${stationId}/measurements/availability`}
          />
        </Box>
        <ViewToggle value={view} onChange={setView} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : view === 'chart' ? (
        <MeasurementChart measurements={measurements} />
      ) : (
        <MeasurementTable measurements={measurements} />
      )}
    </>
  );
};

export default MeasurementPanel;
