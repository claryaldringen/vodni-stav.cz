'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

const AuthNav = () => {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!session?.user) {
    return (
      <Button color="inherit" href="/prihlaseni">
        Přihlásit se
      </Button>
    );
  }

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Avatar
          src={session.user.image ?? undefined}
          alt={session.user.name ?? ''}
          sx={{ width: 32, height: 32 }}
        >
          {session.user.name?.[0]?.toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem href="/ucet" component="a" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Můj účet
        </MenuItem>
        <MenuItem onClick={() => signOut({ callbackUrl: '/' })}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Odhlásit se
        </MenuItem>
      </Menu>
    </>
  );
};

export default AuthNav;
