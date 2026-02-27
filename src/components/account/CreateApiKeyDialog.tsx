'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import type { ApiKeyMode } from '@/src/lib/types';

interface CreateApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateApiKeyDialog = ({ open, onClose, onCreated }: CreateApiKeyDialogProps) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ApiKeyMode>('test');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Zadejte název klíče.');
      return;
    }
    setError('');
    setLoading(true);

    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), mode }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Vytvoření klíče selhalo.');
      return;
    }

    const data = await res.json();
    setCreatedKey(data.fullKey);
    onCreated();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setMode('test');
    setError('');
    setCreatedKey('');
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{createdKey ? 'API klíč vytvořen' : 'Nový API klíč'}</DialogTitle>
      <DialogContent>
        {createdKey ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tento klíč se zobrazí pouze jednou. Zkopírujte si ho nyní.
            </Alert>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}
              >
                {createdKey}
              </Typography>
              <IconButton onClick={handleCopy} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
                Zkopírováno!
              </Typography>
            )}
          </>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              label="Název klíče"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
              helperText="Např. 'Produkce', 'Testování'"
              sx={{ mb: 3 }}
            />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Mód
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => v && setMode(v)}
              fullWidth
              size="small"
            >
              <ToggleButton value="test">Test</ToggleButton>
              <ToggleButton value="live">Live</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {mode === 'test'
                ? 'Testovací klíč vrací fake data. Max 60 požadavků/min. Zdarma.'
                : 'Live klíč vrací reálná data z ČHMÚ.'}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {createdKey ? (
          <Button onClick={handleClose}>Zavřít</Button>
        ) : (
          <>
            <Button onClick={handleClose}>Zrušit</Button>
            <Button onClick={handleCreate} variant="contained" disabled={loading}>
              {loading ? 'Vytvářím...' : 'Vytvořit'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateApiKeyDialog;
