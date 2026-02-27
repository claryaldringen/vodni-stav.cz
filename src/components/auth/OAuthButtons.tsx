'use client';

import { signIn } from 'next-auth/react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import AppleIcon from '@mui/icons-material/Apple';

const providers = [
  { id: 'google', label: 'Google', icon: <GoogleIcon /> },
  { id: 'github', label: 'GitHub', icon: <GitHubIcon /> },
  { id: 'facebook', label: 'Facebook', icon: <FacebookIcon /> },
  { id: 'apple', label: 'Apple', icon: <AppleIcon /> },
] as const;

const OAuthButtons = () => (
  <Stack spacing={1}>
    {providers.map((p) => (
      <Button
        key={p.id}
        variant="outlined"
        startIcon={p.icon}
        onClick={() => signIn(p.id, { callbackUrl: '/ucet' })}
        fullWidth
      >
        Pokračovat přes {p.label}
      </Button>
    ))}
  </Stack>
);

export default OAuthButtons;
