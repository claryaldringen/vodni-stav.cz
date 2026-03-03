import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

export const metadata: Metadata = {
  title: 'O projektu',
  description: 'Informace o projektu vodnistav.cz — agregátor hydrologických dat z ČHMÚ.',
};

const AboutPage = () => (
  <Box>
    <Typography variant="h4" component="h1" gutterBottom>
      O projektu
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      Co je vodnistav.cz
    </Typography>
    <Typography paragraph>
      Vodnistav.cz je agregátor hydrologických dat z Českého hydrometeorologického ústavu (ČHMÚ).
      Cílem projektu je zpřístupnit aktuální informace o vodních stavech a průtocích na řekách
      v České republice v přehledné a uživatelsky přívětivé podobě.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      Zdroj dat
    </Typography>
    <Typography paragraph>
      Veškerá hydrologická data pocházejí z otevřených dat{' '}
      <MuiLink href="https://www.chmi.cz" target="_blank" rel="noopener noreferrer">
        ČHMÚ
      </MuiLink>
      . Data jsou aktualizována denně. Tento web není oficiální službou ČHMÚ.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      Provozovatel
    </Typography>
    <Typography paragraph>
      Projekt provozuje Martin Zadražil.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      Kontakt
    </Typography>
    <Typography paragraph>
      E-mail: <MuiLink href="mailto:info@vodnistav.cz">info@vodnistav.cz</MuiLink>
    </Typography>
  </Box>
);

export default AboutPage;
