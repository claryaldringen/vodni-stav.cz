import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktní informace webu vodnistav.cz.',
};

const ContactPage = () => (
  <Box>
    <Typography variant="h4" component="h1" gutterBottom>
      Kontakt
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      Provozovatel
    </Typography>
    <Typography paragraph>Martin Zadražil</Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      E-mail
    </Typography>
    <Typography paragraph>
      <MuiLink href="mailto:info@vodnistav.cz">info@vodnistav.cz</MuiLink>
    </Typography>
  </Box>
);

export default ContactPage;
