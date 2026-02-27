'use client';

import { signIn } from 'next-auth/react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import AppleIcon from '@mui/icons-material/Apple';
import type { ReactElement } from 'react';

const providerMeta: Record<string, { label: string; icon: ReactElement }> = {
  google: { label: 'Google', icon: <GoogleIcon /> },
  github: { label: 'GitHub', icon: <GitHubIcon /> },
  facebook: { label: 'Facebook', icon: <FacebookIcon /> },
  apple: { label: 'Apple', icon: <AppleIcon /> },
};

interface OAuthButtonsProps {
  enabledProviders: string[];
}

const OAuthButtons = ({ enabledProviders }: OAuthButtonsProps) => {
  if (enabledProviders.length === 0) return null;

  return (
    <Stack spacing={1}>
      {enabledProviders.map((id) => {
        const meta = providerMeta[id];
        if (!meta) return null;
        return (
          <Button
            key={id}
            variant="outlined"
            startIcon={meta.icon}
            onClick={() => signIn(id, { callbackUrl: '/ucet' })}
            fullWidth
          >
            Pokračovat přes {meta.label}
          </Button>
        );
      })}
    </Stack>
  );
};

export default OAuthButtons;
