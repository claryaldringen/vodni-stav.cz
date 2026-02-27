'use client';

import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#2e7d32' },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
  },
});

interface ThemeRegistryProps {
  children: ReactNode;
}

const ThemeRegistry = ({ children }: ThemeRegistryProps) => (
  <AppRouterCacheProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  </AppRouterCacheProvider>
);

export default ThemeRegistry;
