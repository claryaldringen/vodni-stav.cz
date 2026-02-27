'use client';

import { useState, useEffect, useCallback } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import PaymentDialog from './PaymentDialog';
import type { SubscriptionInfo } from '@/src/lib/types';

const SubscriptionStatus = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/payments/subscription');
    const data = await res.json();
    setSubscription(data.active ? data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handlePaid = () => {
    fetchSubscription();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Předplatné
        </Typography>

        {loading ? (
          <Skeleton variant="rectangular" height={40} />
        ) : subscription ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label="Aktivní" color="success" size="small" />
              <Typography variant="body2">
                {subscription.plan === 'monthly' ? 'Měsíční' : 'Roční'} plán
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Platné do {formatDate(subscription.expiresAt)}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Nemáte aktivní předplatné. Vaše API klíče fungují v testovacím módu.
            </Typography>
            <Button variant="contained" onClick={() => setDialogOpen(true)} sx={{ alignSelf: 'flex-start' }}>
              Zaplatit
            </Button>
          </Stack>
        )}
      </Paper>

      <PaymentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPaid={handlePaid}
      />
    </>
  );
};

export default SubscriptionStatus;
