'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Measurement } from '@/src/lib/types';
import { formatDateTime, formatNumber } from '@/src/lib/format';

interface MeasurementTableProps {
  measurements: Measurement[];
}

const MeasurementTable = ({ measurements }: MeasurementTableProps) => {
  if (measurements.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Žádná data pro zvolené období.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Datum a čas</TableCell>
            <TableCell align="right">Hladina (cm)</TableCell>
            <TableCell align="right">Průtok (m³/s)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {measurements.map((m) => (
            <TableRow key={m.ts} hover>
              <TableCell>{formatDateTime(m.ts)}</TableCell>
              <TableCell align="right">{formatNumber(m.water_level_cm, 0)}</TableCell>
              <TableCell align="right">{formatNumber(m.discharge_m3s, 2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MeasurementTable;
