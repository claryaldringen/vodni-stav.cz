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
      &copy; {new Date().getFullYear()} vodni-stav.cz
    </Typography>
  </Box>
);

export default Footer;
