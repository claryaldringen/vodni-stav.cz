import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

const Footer = () => (
  <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', py: 3 }}>
    <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
      Data poskytuje{' '}
      <MuiLink href="https://www.chmi.cz" target="_blank" rel="noopener noreferrer">
        ČHMÚ
      </MuiLink>{' '}
      — Český hydrometeorologický ústav. Tento web není oficiální službou ČHMÚ.
    </Typography>
    <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={0.5}>
      &copy; {new Date().getFullYear()} vodnistav.cz
    </Typography>
    <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={1}>
      <MuiLink href="/zasady-ochrany-soukromi" color="inherit" underline="hover">
        Zásady ochrany soukromí
      </MuiLink>
      {' | '}
      <MuiLink href="/o-projektu" color="inherit" underline="hover">
        O projektu
      </MuiLink>
      {' | '}
      <MuiLink href="/kontakt" color="inherit" underline="hover">
        Kontakt
      </MuiLink>
    </Typography>
  </Box>
);

export default Footer;
