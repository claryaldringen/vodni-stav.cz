import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import LoginForm from '@/src/components/auth/LoginForm';
import OAuthButtons from '@/src/components/auth/OAuthButtons';

export const metadata: Metadata = {
  title: 'Přihlášení — Vodní stav',
};

const LoginPage = () => (
  <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
    <Typography variant="h4" component="h1" gutterBottom>
      Přihlášení
    </Typography>

    <OAuthButtons />

    <Divider sx={{ my: 3 }}>nebo</Divider>

    <LoginForm />

    <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
      Nemáte účet?{' '}
      <Link href="/registrace" underline="hover">
        Zaregistrujte se
      </Link>
    </Typography>
  </Box>
);

export default LoginPage;
