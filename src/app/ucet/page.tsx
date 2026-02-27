'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import AddIcon from '@mui/icons-material/Add';
import ApiKeyList from '@/src/components/account/ApiKeyList';
import CreateApiKeyDialog from '@/src/components/account/CreateApiKeyDialog';
import SubscriptionStatus from '@/src/components/account/SubscriptionStatus';

const AccountPage = () => {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!session?.user) {
    return <Typography>Načítám...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Můj účet
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Profil
        </Typography>
        <Typography>
          <strong>Jméno:</strong> {session.user.name ?? '—'}
        </Typography>
        <Typography>
          <strong>Email:</strong> {session.user.email}
        </Typography>
      </Paper>

      <SubscriptionStatus />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">API klíče</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nový klíč
        </Button>
      </Box>

      <ApiKeyList key={refreshKey} />

      <CreateApiKeyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};

export default AccountPage;
