'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { NAV_LINKS } from './nav-links';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' || pathname.startsWith('/toky') : pathname.startsWith(href);

const MobileNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const close = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        color="inherit"
        edge="end"
        aria-label="Otevřít menu"
        aria-controls={anchorEl ? 'mobile-nav' : undefined}
        aria-haspopup="true"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <MenuIcon />
      </IconButton>
      <Menu id="mobile-nav" anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        {NAV_LINKS.map((link) => (
          <MenuItem
            key={link.href}
            component="a"
            href={link.href}
            selected={isActive(pathname, link.href)}
            onClick={close}
          >
            {link.label}
          </MenuItem>
        ))}
        <Divider />
        {session?.user ? (
          [
            <MenuItem key="account" component="a" href="/ucet" onClick={close}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              Můj účet
            </MenuItem>,
            <MenuItem key="logout" onClick={() => signOut({ callbackUrl: '/' })}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Odhlásit se
            </MenuItem>,
          ]
        ) : (
          <MenuItem component="a" href="/prihlaseni" onClick={close}>
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            Přihlásit se
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default MobileNav;
