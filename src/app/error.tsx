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
      <AlertTitle>Chyba při načítání stránky</AlertTitle>
      {error.message || 'Nastala neočekávaná chyba.'}
      <Box sx={{ mt: 2 }}>
        <Button variant="outlined" size="small" color="error" onClick={reset}>
          Zkusit znovu
        </Button>
      </Box>
    </Alert>
  </Box>
);

export default ErrorPage;
