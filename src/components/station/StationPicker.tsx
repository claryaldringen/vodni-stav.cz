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
import { slugify } from '@/src/lib/slug';
import type { Station } from '@/src/lib/types';

interface StationPickerProps {
  stations: Station[];
}

const StationPicker = ({ stations }: StationPickerProps) => {
  const [query, setQuery] = useState('');

  const lowerQuery = query.toLowerCase();
  const filtered = query
    ? stations.filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          s.river_name?.toLowerCase().includes(lowerQuery) ||
          s.basin_name?.toLowerCase().includes(lowerQuery),
      )
    : stations;

  return (
    <>
      <TextField
        fullWidth
        placeholder="Hledat stanici, řeku nebo povodí…"
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
          Žádné stanice neodpovídají hledání.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((s) => (
            <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardActionArea component={Link} href={`/stanice/${slugify(s.name)}`}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {s.name}
                    </Typography>
                    {s.river_name && (
                      <Typography variant="body2" color="primary">
                        {s.river_name}
                      </Typography>
                    )}
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
      )}
    </>
  );
};

export default StationPicker;
