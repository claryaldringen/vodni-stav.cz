'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import type { PaymentPlan } from '@/src/lib/types';

type OverlayState = 'none' | 'verifying' | 'success' | 'not_found';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}

const PLAN_LABELS: Record<PaymentPlan, string> = {
  monthly: '10 Kč / měsíc',
  yearly: '100 Kč / rok',
};

const PaymentDialog = ({ open, onClose, onPaid }: PaymentDialogProps) => {
  const [plan, setPlan] = useState<PaymentPlan>('monthly');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [vs, setVs] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>('none');

  const createPayment = useCallback(async (selectedPlan: PaymentPlan) => {
    setError('');
    setQrLoading(true);
    setQrDataUrl('');

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Vytvoření platby selhalo.');
      setQrLoading(false);
      return;
    }

    const data = await res.json();
    setVs(data.vs);
    setAmount(data.amount);

    const dataUrl = await QRCode.toDataURL(data.spdString, { width: 256, margin: 2 });
    setQrDataUrl(dataUrl);
    setQrLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      createPayment(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePlanChange = (_: unknown, value: PaymentPlan | null) => {
    if (!value || value === plan) return;
    setPlan(value);
    setOverlay('none');
    createPayment(value);
  };

  const handleVerify = async () => {
    setOverlay('verifying');
    setError('');

    const res = await fetch('/api/payments/verify', { method: 'POST' });
    const data = await res.json();

    if (res.status === 429) {
      setError(data.error || 'Příliš mnoho pokusů.');
      setOverlay('not_found');
      return;
    }

    if (!res.ok) {
      setError(data.error || 'Ověření selhalo.');
      setOverlay('not_found');
      return;
    }

    if (data.status === 'paid') {
      setOverlay('success');
      onPaid();
    } else {
      setOverlay('not_found');
    }
  };

  const handleClose = () => {
    setPlan('monthly');
    setQrDataUrl('');
    setVs('');
    setAmount(0);
    setError('');
    setOverlay('none');
    setQrLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {overlay === 'success' ? 'Platba přijata' : 'Zaplatit předplatné'}
      </DialogTitle>
      <DialogContent>
        {overlay === 'verifying' ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Ověřuji platbu...
            </Typography>
            <LinearProgress />
          </Box>
        ) : overlay === 'success' ? (
          <Alert severity="success">
            Platba byla úspěšně přijata! Plán: {PLAN_LABELS[plan]}.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity={overlay === 'not_found' ? 'warning' : 'error'} sx={{ mb: 2 }}>
                {overlay === 'not_found' && !error
                  ? `Platba zatím nebyla nalezena. Zkontrolujte, zda jste ji odeslali se správným VS (${vs}) a částkou (${amount} Kč).`
                  : error}
              </Alert>
            )}

            {overlay === 'not_found' && !error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Platba zatím nebyla nalezena. Zkontrolujte, zda jste ji odeslali se správným VS (
                {vs}) a částkou ({amount} Kč).
              </Alert>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Zvolte plán
            </Typography>
            <ToggleButtonGroup
              value={plan}
              exclusive
              onChange={handlePlanChange}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="monthly">Měsíční — 10 Kč</ToggleButton>
              <ToggleButton value="yearly">Roční — 100 Kč</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              {plan === 'yearly'
                ? 'Ušetříte 17 % oproti měsíčnímu plánu.'
                : 'Platba jednorázově na 1 měsíc.'}
            </Typography>

            <Box sx={{ textAlign: 'center' }}>
              {qrLoading ? (
                <Box sx={{ py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : qrDataUrl ? (
                <>
                  <Box
                    component="img"
                    src={qrDataUrl}
                    alt="QR platba"
                    sx={{ width: 256, height: 256, mx: 'auto', mb: 2 }}
                  />
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Částka:</strong> {amount} Kč
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>VS:</strong> {vs}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Naskenujte QR kód v bankovní aplikaci. Po odeslání platby klikněte na tlačítko
                    níže.
                  </Typography>
                </>
              ) : null}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {overlay === 'verifying' ? (
          <Button disabled>Ověřuji...</Button>
        ) : overlay === 'success' ? (
          <Button onClick={handleClose} variant="contained">
            Zavřít
          </Button>
        ) : (
          <>
            <Button onClick={handleClose}>Zavřít</Button>
            <Button
              onClick={handleVerify}
              variant="contained"
              disabled={qrLoading || !qrDataUrl}
            >
              Právě jsem zaplatil
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
