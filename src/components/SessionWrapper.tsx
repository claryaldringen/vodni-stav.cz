'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

const SessionWrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

export default SessionWrapper;
