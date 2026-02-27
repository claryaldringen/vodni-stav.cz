import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AuthNav from '@/src/components/auth/AuthNav';

const Header = () => (
  <AppBar position="static" elevation={1}>
    <Toolbar>
      <WaterDropIcon sx={{ mr: 1 }} />
      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          vodni-stav.cz
        </Link>
      </Typography>
      <Button color="inherit" href="/">
        Toky
      </Button>
      <Button color="inherit" href="/stanice">
        Stanice
      </Button>
      <Button color="inherit" href="/cenik">
        Ceník
      </Button>
      <Button color="inherit" href="/dokumentace">
        Dokumentace API
      </Button>
      <AuthNav />
    </Toolbar>
  </AppBar>
);

export default Header;
