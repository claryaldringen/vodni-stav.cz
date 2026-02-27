import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CheckIcon from '@mui/icons-material/Check';

export const metadata: Metadata = {
  title: 'Ceník — Vodní stav',
  description: 'Ceník přístupu k API vodni-stav.cz — test mód zdarma, live data od 10 Kč/měsíc.',
};

const Feature = ({ children }: { children: React.ReactNode }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <CheckIcon fontSize="small" color="success" />
    <Typography variant="body2">{children}</Typography>
  </Stack>
);

const PricingPage = () => (
  <Box>
    <Typography variant="h3" component="h1" gutterBottom>
      Ceník
    </Typography>
    <Typography variant="body1" paragraph color="text.secondary">
      Vyzkoušejte API zdarma s testovacím klíčem. Pro přístup k reálným datům z ČHMÚ přejděte na
      live mód.
    </Typography>

    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      sx={{ mt: 4 }}
      alignItems="stretch"
    >
      {/* Test plan */}
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Test
          </Typography>
          <Typography variant="h3" component="div" gutterBottom>
            Zdarma
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Pro vývoj a testování integrace
          </Typography>
          <Stack spacing={1}>
            <Feature>Fake data s reálnou strukturou</Feature>
            <Feature>5 testovacích stanic, 3 toky</Feature>
            <Feature>Max 60 požadavků / min</Feature>
            <Feature>REST i GraphQL API</Feature>
          </Stack>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" fullWidth href="/registrace">
            Registrovat se
          </Button>
        </CardActions>
      </Card>

      {/* Live plan */}
      <Card
        variant="outlined"
        sx={{ flex: 1, borderColor: 'primary.main', borderWidth: 2 }}
      >
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h5">Live</Typography>
            <Chip label="Doporučeno" color="primary" size="small" />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="h3" component="div">
              10 Kč
            </Typography>
            <Typography variant="body1" color="text.secondary">
              / měsíc
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              nebo{' '}
              <strong>100 Kč / rok</strong>
            </Typography>
            <Chip label="ušetříte 17 %" size="small" color="success" variant="outlined" />
          </Stack>
          <Stack spacing={1}>
            <Feature>Reálná data z ČHMÚ</Feature>
            <Feature>Všechny stanice a toky</Feature>
            <Feature>Bez limitu požadavků</Feature>
            <Feature>REST i GraphQL API</Feature>
          </Stack>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button variant="contained" fullWidth href="/ucet">
            Začít s live daty
          </Button>
        </CardActions>
      </Card>
    </Stack>
  </Box>
);

export default PricingPage;
