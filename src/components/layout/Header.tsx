import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AuthNav from '@/src/components/auth/AuthNav';
import MobileNav from './MobileNav';
import { NAV_LINKS } from './nav-links';

const Header = () => (
  <AppBar position="static" elevation={1}>
    <Toolbar>
      <WaterDropIcon sx={{ mr: 1 }} />
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          vodnistav.cz
        </Link>
      </Typography>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
        {NAV_LINKS.map((link) => (
          <Button key={link.href} color="inherit" href={link.href}>
            {link.label}
          </Button>
        ))}
        <AuthNav />
      </Box>
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <MobileNav />
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header;
