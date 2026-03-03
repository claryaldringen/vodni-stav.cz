import type { Metadata } from 'next';
import Script from 'next/script';
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
  metadataBase: new URL('https://vodnistav.cz'),
  title: {
    default: 'Vodní stav — aktuální hladiny a průtoky řek v ČR',
    template: '%s | Vodní stav',
  },
  description:
    'Aktuální vodní stavy a průtoky na řekách v České republice. Data z ČHMÚ aktualizovaná denně.',
  openGraph: {
    title: 'Vodní stav — aktuální hladiny a průtoky řek v ČR',
    description:
      'Aktuální vodní stavy a průtoky na řekách v České republice. Data z ČHMÚ aktualizovaná denně.',
    locale: 'cs_CZ',
    type: 'website',
    siteName: 'Vodní stav',
  },
  twitter: {
    card: 'summary',
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="cs">
    <head>
      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      )}
    </head>
    <body className={geistSans.variable}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Vodní stav',
            url: 'https://vodnistav.cz',
          }),
        }}
      />
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
