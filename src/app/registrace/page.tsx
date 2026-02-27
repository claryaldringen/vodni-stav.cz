import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import RegisterForm from '@/src/components/auth/RegisterForm';
import OAuthButtons from '@/src/components/auth/OAuthButtons';
import { getEnabledOAuthProviders } from '@/src/lib/auth/providers';

export const metadata: Metadata = {
  title: 'Registrace — Vodní stav',
};

const RegisterPage = () => {
  const enabledProviders = getEnabledOAuthProviders();
  const hasOAuth = enabledProviders.length > 0;

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registrace
      </Typography>

      {hasOAuth && <OAuthButtons enabledProviders={enabledProviders} />}

      {hasOAuth && <Divider sx={{ my: 3 }}>nebo</Divider>}

      <RegisterForm />

      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
        Už máte účet?{' '}
        <Link href="/prihlaseni" underline="hover">
          Přihlaste se
        </Link>
      </Typography>
    </Box>
  );
};

export default RegisterPage;
