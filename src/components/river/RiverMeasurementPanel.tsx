'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import dynamic from 'next/dynamic';
import GranularitySelector from './GranularitySelector';
import RiverPeriodSelector from './RiverPeriodSelector';
import CustomDatePicker from '../measurement/CustomDatePicker';
import ViewToggle, { type ViewMode } from '../measurement/ViewToggle';
import MeasurementTable from '../measurement/MeasurementTable';

const MeasurementChart = dynamic(() => import('../measurement/MeasurementChart'), { ssr: false });
import MeasurementStatsCard from '../measurement/MeasurementStatsCard';
import { getDefaultPeriod } from '@/src/lib/granularity';
import { granularityForRange } from '@/src/lib/date-range';
import type { DateRange } from '@/src/lib/date-range';
import { formatDischarge } from '@/src/lib/format';
import type { Granularity, Measurement, MeasurementStats, RiverPeriod } from '@/src/lib/types';

interface RiverMeasurementPanelProps {
  riverId: number;
  initialMeasurements: Measurement[];
  initialGranularity: Granularity;
  initialPeriod: RiverPeriod;
  initialStats: MeasurementStats | null;
}

const RiverMeasurementPanel = ({
  riverId,
  initialMeasurements,
  initialGranularity,
  initialPeriod,
  initialStats,
}: RiverMeasurementPanelProps) => {
  const [granularity, setGranularity] = useState<Granularity>(initialGranularity);
  const [period, setPeriod] = useState<RiverPeriod | null>(initialPeriod);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [view, setView] = useState<ViewMode>('chart');
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements);
  const [stats, setStats] = useState<MeasurementStats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (rid: number, g: Granularity, p: RiverPeriod | null, range: DateRange | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params = range
          ? `granularity=${g}&from=${range.from}&to=${range.to}`
          : `granularity=${g}&period=${p ?? '3d'}`;
        const res = await fetch(`/api/rivers/${rid}/measurements?${params}`, {
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
      loadData(riverId, granularity, null, customRange);
    } else {
      const isInitial = granularity === initialGranularity && period === initialPeriod;
      if (!isInitial) {
        loadData(riverId, granularity, period, null);
      }
    }
  }, [granularity, period, customRange, riverId, initialGranularity, initialPeriod, loadData]);

  // Abort pending fetch on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-refresh every 10 minutes (ČHMÚ update interval) — only for relative periods
  useEffect(() => {
    if (customRange) return;
    const interval = setInterval(() => {
      loadData(riverId, granularity, period, null);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [riverId, granularity, period, customRange, loadData]);

  const handleGranularityChange = (g: Granularity) => {
    setError(null);
    setCustomRange(null);
    const newPeriod = getDefaultPeriod(g);
    setGranularity(g);
    setPeriod(newPeriod);

    if (g === initialGranularity && newPeriod === initialPeriod) {
      setMeasurements(initialMeasurements);
      setStats(initialStats);
    }
  };

  const handlePeriodChange = (p: RiverPeriod) => {
    setError(null);
    setCustomRange(null);
    if (p === initialPeriod && granularity === initialGranularity) {
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
    setGranularity(granularityForRange(range));
  };

  const latest = measurements.at(-1) ?? null;

  return (
    <>
      {latest && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ bgcolor: 'success.50', borderColor: 'success.200' }}>
              <CardContent>
                <Typography variant="overline" color="secondary">
                  Průměrný průtok (poslední měření)
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
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <GranularitySelector value={granularity} onChange={handleGranularityChange} />
        <RiverPeriodSelector
          granularity={granularity}
          value={period}
          onChange={handlePeriodChange}
        />
        <CustomDatePicker
          value={customRange}
          onChange={handleCustomRangeChange}
          active={customRange !== null}
          onActivate={() => setPeriod(null)}
          availabilityUrl={`/api/rivers/${riverId}/measurements/availability`}
        />
        <Box sx={{ ml: 'auto' }}>
          <ViewToggle value={view} onChange={setView} />
        </Box>
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

export default RiverMeasurementPanel;
