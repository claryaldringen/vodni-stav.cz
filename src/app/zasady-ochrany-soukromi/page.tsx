import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

export const metadata: Metadata = {
  title: 'Zásady ochrany osobních údajů',
  description: 'Zásady ochrany osobních údajů webu vodnistav.cz.',
};

const PrivacyPolicyPage = () => (
  <Box>
    <Typography variant="h4" component="h1" gutterBottom>
      Zásady ochrany osobních údajů
    </Typography>

    <Typography variant="body2" color="text.secondary" gutterBottom>
      Poslední aktualizace: 3. 3. 2026
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      1. Správce údajů
    </Typography>
    <Typography paragraph>
      Správcem osobních údajů je Martin Zadražil (dále jen &bdquo;správce&ldquo;). Kontaktní e-mail:{' '}
      <MuiLink href="mailto:info@vodnistav.cz">info@vodnistav.cz</MuiLink>.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      2. Jaké údaje sbíráme
    </Typography>
    <Typography paragraph>
      Při používání webu vodnistav.cz můžeme zpracovávat následující údaje:
    </Typography>
    <Box component="ul" sx={{ pl: 3 }}>
      <li>
        <Typography>
          <strong>Registrace a přihlášení</strong> — pokud se zaregistrujete přes Google, GitHub,
          Facebook nebo Apple (prostřednictvím Auth.js), ukládáme vaše jméno, e-mailovou adresu a
          profilový obrázek poskytnutý danou službou.
        </Typography>
      </li>
      <li>
        <Typography>
          <strong>Cookies</strong> — používáme technické cookies nezbytné pro fungování webu
          (session, přihlášení) a analytické/reklamní cookies třetích stran (viz bod 4).
        </Typography>
      </li>
      <li>
        <Typography>
          <strong>Platební údaje</strong> — platby jsou zpracovávány prostřednictvím FIO banky.
          Správce neukládá čísla platebních karet ani jiné citlivé platební údaje.
        </Typography>
      </li>
    </Box>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      3. Účel zpracování
    </Typography>
    <Typography paragraph>
      Osobní údaje zpracováváme za účelem poskytování služeb webu, správy uživatelských účtů,
      zpracování plateb a zlepšování kvality služeb.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      4. Google AdSense a cookies třetích stran
    </Typography>
    <Typography paragraph>
      Na tomto webu využíváme službu Google AdSense pro zobrazování reklam. Google a jeho partneři
      mohou používat cookies k zobrazování reklam na základě předchozích návštěv uživatele na tomto
      nebo jiných webech. Používání reklamních cookies umožňuje společnosti Google a jejím partnerům
      zobrazovat reklamy na základě návštěv uživatelů na tomto webu či jiných webech na internetu.
    </Typography>
    <Typography paragraph>
      Personalizované reklamy můžete zakázat v{' '}
      <MuiLink href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
        Nastavení reklam Google
      </MuiLink>
      . Případně můžete navštívit stránku{' '}
      <MuiLink href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">
        www.aboutads.info
      </MuiLink>{' '}
      pro opt-out z personalizovaných reklam od jiných dodavatelů.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      5. Vaše práva
    </Typography>
    <Typography paragraph>Jako subjekt údajů máte dle GDPR právo na:</Typography>
    <Box component="ul" sx={{ pl: 3 }}>
      <li>
        <Typography>přístup ke svým osobním údajům,</Typography>
      </li>
      <li>
        <Typography>opravu nepřesných údajů,</Typography>
      </li>
      <li>
        <Typography>výmaz osobních údajů (&bdquo;právo být zapomenut&ldquo;),</Typography>
      </li>
      <li>
        <Typography>omezení zpracování,</Typography>
      </li>
      <li>
        <Typography>přenositelnost údajů,</Typography>
      </li>
      <li>
        <Typography>vznesení námitky proti zpracování.</Typography>
      </li>
    </Box>
    <Typography paragraph>
      Pro uplatnění těchto práv nás kontaktujte na{' '}
      <MuiLink href="mailto:info@vodnistav.cz">info@vodnistav.cz</MuiLink>.
    </Typography>

    <Typography variant="h6" component="h2" mt={3} gutterBottom>
      6. Kontakt
    </Typography>
    <Typography paragraph>
      S dotazy ohledně ochrany osobních údajů se na nás můžete obrátit na e-mailu{' '}
      <MuiLink href="mailto:info@vodnistav.cz">info@vodnistav.cz</MuiLink>.
    </Typography>
  </Box>
);

export default PrivacyPolicyPage;
