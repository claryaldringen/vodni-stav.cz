'use client';

import { useState } from 'react';
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
import type { PaymentPlan } from '@/src/lib/types';

type Step = 'select' | 'qr' | 'verifying' | 'success' | 'not_found';

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
  const [step, setStep] = useState<Step>('select');
  const [plan, setPlan] = useState<PaymentPlan>('monthly');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [vs, setVs] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');

  const handleCreatePayment = async () => {
    setError('');
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Vytvoření platby selhalo.');
      return;
    }

    const data = await res.json();
    setVs(data.vs);
    setAmount(data.amount);

    const dataUrl = await QRCode.toDataURL(data.spdString, { width: 256, margin: 2 });
    setQrDataUrl(dataUrl);
    setStep('qr');
  };

  const handleVerify = async () => {
    setStep('verifying');
    setError('');

    const res = await fetch('/api/payments/verify', { method: 'POST' });
    const data = await res.json();

    if (res.status === 429) {
      setError(data.error || 'Příliš mnoho pokusů.');
      setStep('not_found');
      return;
    }

    if (!res.ok) {
      setError(data.error || 'Ověření selhalo.');
      setStep('not_found');
      return;
    }

    if (data.status === 'paid') {
      setStep('success');
      onPaid();
    } else {
      setStep('not_found');
    }
  };

  const handleClose = () => {
    setStep('select');
    setPlan('monthly');
    setQrDataUrl('');
    setVs('');
    setAmount(0);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {step === 'success' ? 'Platba přijata' : 'Zaplatit předplatné'}
      </DialogTitle>
      <DialogContent>
        {step === 'select' && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Zvolte plán
            </Typography>
            <ToggleButtonGroup
              value={plan}
              exclusive
              onChange={(_, v) => v && setPlan(v)}
              fullWidth
              size="small"
            >
              <ToggleButton value="monthly">Měsíční — 10 Kč</ToggleButton>
              <ToggleButton value="yearly">Roční — 100 Kč</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {plan === 'yearly' ? 'Ušetříte 17 % oproti měsíčnímu plánu.' : 'Platba jednorázově na 1 měsíc.'}
            </Typography>
          </>
        )}

        {step === 'qr' && (
          <Box sx={{ textAlign: 'center' }}>
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
              Naskenujte QR kód v bankovní aplikaci. Po odeslání platby klikněte na tlačítko níže.
            </Typography>
          </Box>
        )}

        {step === 'verifying' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Ověřuji platbu...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {step === 'success' && (
          <Alert severity="success">
            Platba byla úspěšně přijata! Vaše API klíče byly přepnuty na live mód.
            Plán: {PLAN_LABELS[plan]}.
          </Alert>
        )}

        {step === 'not_found' && (
          <>
            {error ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Platba zatím nebyla nalezena. Zkontrolujte, zda jste ji odeslali se správným VS ({vs}) a částkou ({amount} Kč).
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {step === 'select' && (
          <>
            <Button onClick={handleClose}>Zrušit</Button>
            <Button onClick={handleCreatePayment} variant="contained">
              Zobrazit QR kód
            </Button>
          </>
        )}
        {step === 'qr' && (
          <>
            <Button onClick={handleClose}>Zrušit</Button>
            <Button onClick={handleVerify} variant="contained">
              Právě jsem zaplatil
            </Button>
          </>
        )}
        {step === 'verifying' && (
          <Button disabled>Ověřuji...</Button>
        )}
        {step === 'success' && (
          <Button onClick={handleClose} variant="contained">
            Zavřít
          </Button>
        )}
        {step === 'not_found' && (
          <>
            <Button onClick={handleClose}>Zavřít</Button>
            <Button onClick={handleVerify} variant="contained">
              Zkusit znovu
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
