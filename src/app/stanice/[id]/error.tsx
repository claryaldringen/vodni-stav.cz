'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => (
  <Box sx={{ py: 4 }}>
    <Alert severity="error">
      <AlertTitle>Chyba při načítání stanice</AlertTitle>
      {error.message || 'Nepodařilo se načíst data stanice.'}
      <Box sx={{ mt: 2 }}>
        <Button variant="outlined" size="small" color="error" onClick={reset}>
          Zkusit znovu
        </Button>
        <Button href="/stanice" size="small" sx={{ ml: 1 }}>
          Zpět na seznam
        </Button>
      </Box>
    </Alert>
  </Box>
);

export default ErrorPage;
