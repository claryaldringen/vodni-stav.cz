import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

const NotFound = () => (
  <Box sx={{ py: 8, textAlign: 'center' }}>
    <Typography variant="h3" fontWeight={700} gutterBottom>
      404
    </Typography>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      Stránka nenalezena
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      Stránka, kterou hledáte, neexistuje nebo byla přesunuta.
    </Typography>
    <Button href="/" variant="contained">
      Zpět na úvodní stránku
    </Button>
  </Box>
);

export default NotFound;
