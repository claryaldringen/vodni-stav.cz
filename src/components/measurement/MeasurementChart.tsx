'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Measurement } from '@/src/lib/types';
import { formatDateShort, formatNumber } from '@/src/lib/format';

interface MeasurementChartProps {
  measurements: Measurement[];
}

const MeasurementChart = ({ measurements }: MeasurementChartProps) => {
  const { data, hasWaterLevel, hasDischarge } = useMemo(() => {
    const d = measurements.map((m) => ({
      ts: m.ts,
      label: formatDateShort(m.ts),
      water_level_cm: m.water_level_cm !== null ? Number(m.water_level_cm) : null,
      discharge_m3s: m.discharge_m3s !== null ? Number(m.discharge_m3s) : null,
    }));
    return {
      data: d,
      hasWaterLevel: d.some((p) => p.water_level_cm !== null),
      hasDischarge: d.some((p) => p.discharge_m3s !== null),
    };
  }, [measurements]);

  if (measurements.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Žádná data pro zvolené období.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            stroke="#a1a1aa"
          />
          {hasWaterLevel && (
            <YAxis
              yAxisId="level"
              tick={{ fontSize: 11 }}
              stroke="#2563eb"
              label={{
                value: 'cm',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#2563eb' },
              }}
            />
          )}
          {hasDischarge && (
            <YAxis
              yAxisId="discharge"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="#16a34a"
              label={{
                value: 'm³/s',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 11, fill: '#16a34a' },
              }}
            />
          )}
          <Tooltip
            formatter={(value?: number, name?: string) => {
              if (value === undefined) return ['–', name ?? ''];
              if (name === 'Hladina') return [`${formatNumber(value, 0)} cm`, name];
              return [`${formatNumber(value, 2)} m³/s`, name ?? ''];
            }}
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {hasWaterLevel && (
            <Line
              yAxisId="level"
              type="monotone"
              dataKey="water_level_cm"
              name="Hladina"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {hasDischarge && (
            <Line
              yAxisId="discharge"
              type="monotone"
              dataKey="discharge_m3s"
              name="Průtok"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MeasurementChart;
