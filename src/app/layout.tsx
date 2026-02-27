import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import ThemeRegistry from '@/src/components/ThemeRegistry';
import SessionWrapper from '@/src/components/SessionWrapper';
import Header from '@/src/components/layout/Header';
import Footer from '@/src/components/layout/Footer';
import AdBanner from '@/src/components/layout/AdBanner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Vodní stav — aktuální hladiny a průtoky řek v ČR',
  description:
    'Aktuální vodní stavy a průtoky na řekách v České republice. Data z ČHMÚ aktualizovaná denně.',
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="cs">
    <body className={geistSans.variable}>
      <SessionWrapper>
        <ThemeRegistry>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />

            <AdBanner position="top" />

            <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', gap: 3, py: 3 }}>
              <Box component="main" sx={{ flex: 7, minWidth: 0 }}>
                {children}
              </Box>

              <Box
                component="aside"
                sx={{
                  flex: 3,
                  minWidth: 0,
                  display: { xs: 'none', lg: 'flex' },
                  flexDirection: 'column',
                }}
              >
                <AdBanner position="sidebar" />
              </Box>
            </Container>

            <AdBanner position="bottom" />

            <Footer />
          </Box>
        </ThemeRegistry>
      </SessionWrapper>
    </body>
  </html>
);

export default RootLayout;
