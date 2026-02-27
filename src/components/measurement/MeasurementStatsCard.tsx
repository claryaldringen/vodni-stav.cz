'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { formatNumber } from '@/src/lib/format';
import type { MeasurementStats, ValueStats } from '@/src/lib/types';

interface StatRowProps {
  label: string;
  value: string;
}

const StatRow = ({ label, value }: StatRowProps) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value}
    </Typography>
  </Box>
);

interface StatsCardProps {
  title: string;
  stats: ValueStats;
  unit: string;
  decimals: number;
  color: 'primary' | 'success';
}

const StatsCard = ({ title, stats, unit, decimals, color }: StatsCardProps) => (
  <Card variant="outlined" sx={{ bgcolor: `${color}.50`, borderColor: `${color}.200` }}>
    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
      <Typography variant="overline" color={color === 'primary' ? 'primary' : 'secondary'}>
        {title}
      </Typography>
      <StatRow label="Minimum" value={`${formatNumber(stats.min, decimals)} ${unit}`} />
      <StatRow label="Maximum" value={`${formatNumber(stats.max, decimals)} ${unit}`} />
      <StatRow label="Průměr" value={`${formatNumber(stats.avg, decimals)} ${unit}`} />
      <StatRow label="Medián" value={`${formatNumber(stats.median, decimals)} ${unit}`} />
      <StatRow
        label="Max. změna"
        value={
          stats.max_change !== null ? `${formatNumber(stats.max_change, decimals)} ${unit}` : '–'
        }
      />
    </CardContent>
  </Card>
);

interface MeasurementStatsCardProps {
  stats: MeasurementStats;
}

const MeasurementStatsCard = ({ stats }: MeasurementStatsCardProps) => {
  if (!stats.water_level_cm && !stats.discharge_m3s) return null;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.water_level_cm && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatsCard
            title="Statistiky hladiny"
            stats={stats.water_level_cm}
            unit="cm"
            decimals={0}
            color="primary"
          />
        </Grid>
      )}
      {stats.discharge_m3s && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatsCard
            title="Statistiky průtoku"
            stats={stats.discharge_m3s}
            unit="m³/s"
            decimals={2}
            color="success"
          />
        </Grid>
      )}
    </Grid>
  );
};

export default MeasurementStatsCard;
