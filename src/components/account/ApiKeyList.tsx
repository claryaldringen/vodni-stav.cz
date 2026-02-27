'use client';

import { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ApiKey } from '@/src/lib/types';

const fetchKeys = async (): Promise<ApiKey[]> => {
  const res = await fetch('/api/keys');
  if (!res.ok) return [];
  const data = await res.json();
  return data.keys;
};

const ApiKeyList = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchKeys().then((data) => {
      if (!cancelled) {
        setKeys(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevoke = async (id: number) => {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = await fetchKeys();
      setKeys(updated);
    }
  };

  if (loading) return <Typography>Načítám...</Typography>;

  if (keys.length === 0) {
    return <Typography color="text.secondary">Zatím nemáte žádné API klíče.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Název</TableCell>
            <TableCell>Prefix</TableCell>
            <TableCell>Vytvořeno</TableCell>
            <TableCell>Poslední použití</TableCell>
            <TableCell align="right">Požadavky</TableCell>
            <TableCell>Stav</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>{key.name}</TableCell>
              <TableCell>
                <code>{key.key_prefix}...</code>
              </TableCell>
              <TableCell>{new Date(key.created_at).toLocaleDateString('cs')}</TableCell>
              <TableCell>
                {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('cs') : '—'}
              </TableCell>
              <TableCell align="right">{key.request_count}</TableCell>
              <TableCell>
                <Chip
                  label={key.is_active ? 'Aktivní' : 'Zrušený'}
                  color={key.is_active ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {key.is_active && (
                  <Button size="small" color="error" onClick={() => handleRevoke(key.id)}>
                    Zrušit
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ApiKeyList;
