'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { formatDischarge } from '@/src/lib/format';
import type { River } from '@/src/lib/types';

interface RiverPickerProps {
  rivers: River[];
}

const RiverPicker = ({ rivers }: RiverPickerProps) => {
  const [query, setQuery] = useState('');

  const lowerQuery = query.toLowerCase();
  const filtered = query
    ? rivers.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.basin_name?.toLowerCase().includes(lowerQuery),
      )
    : rivers;

  return (
    <>
      <TextField
        fullWidth
        placeholder="Hledat tok nebo povodí…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Žádné toky neodpovídají hledání.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((r) => (
            <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardActionArea component={Link} href={`/toky/${r.id}`}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {r.name}
                    </Typography>
                    {r.basin_name && (
                      <Typography variant="caption" color="text.secondary">
                        {r.basin_name}
                      </Typography>
                    )}
                    <Typography variant="body2" color="secondary" sx={{ mt: 0.5 }}>
                      {r.latest_avg_discharge_m3s !== null
                        ? `Ø průtok: ${formatDischarge(r.latest_avg_discharge_m3s)}`
                        : 'Průtok: –'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.station_count} {r.station_count === 1 ? 'stanice' : r.station_count < 5 ? 'stanice' : 'stanic'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
};

export default RiverPicker;
