'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getCurrentPositionWithRetry, roundCoordinate } from '@/src/lib/geo';
import {
  formatDateTime,
  formatDischarge,
  formatDistance,
  formatWaterLevel,
} from '@/src/lib/format';
import type { NearestKind, NearestResult } from '@/src/lib/types';

type PanelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; nearest: NearestResult | null }
  | { status: 'error'; message: string }
  | { status: 'hidden' };

const TEXTS: Record<
  NearestKind,
  { title: string; prompt: string; loading: string; empty: string; fetchError: string }
> = {
  station: {
    title: 'Nejbližší stanice',
    prompt: 'Podle vaší polohy najdeme nejbližší měřicí stanici.',
    loading: 'Hledám nejbližší stanici…',
    empty: 'Ve vašem okolí (do 100 km) není žádná stanice.',
    fetchError: 'Nejbližší stanici se nepodařilo načíst.',
  },
  river: {
    title: 'Nejbližší tok',
    prompt: 'Podle vaší polohy najdeme nejbližší tok s měřicí stanicí.',
    loading: 'Hledám nejbližší tok…',
    empty: 'Ve vašem okolí (do 100 km) není žádný sledovaný tok.',
    fetchError: 'Nejbližší tok se nepodařilo načíst.',
  },
};

const LOCATION_ERROR =
  'Zařízení teď nedokáže určit vaši polohu. Zkontrolujte, že máte zapnuté polohové služby, a zkuste to znovu.';

// GeolocationPositionError.PERMISSION_DENIED
const PERMISSION_DENIED = 1;

const STAGE_COLORS: Record<string, 'success' | 'warning' | 'error'> = {
  normal: 'success',
  drought: 'warning',
  spa1: 'warning',
  spa2: 'warning',
  spa3: 'error',
  spa4: 'error',
};

interface NearestPanelProps {
  kind: NearestKind;
}

const NearestPanel = ({ kind }: NearestPanelProps) => {
  const [state, setState] = useState<PanelState>({ status: 'idle' });
  const texts = TEXTS[kind];

  const locate = useCallback(async () => {
    setState({ status: 'loading' });

    let coords: GeolocationCoordinates;
    try {
      ({ coords } = await getCurrentPositionWithRetry(navigator.geolocation, {
        timeout: 10_000,
        maximumAge: 10 * 60 * 1000,
      }));
    } catch (error) {
      const denied = (error as GeolocationPositionError).code === PERMISSION_DENIED;
      setState(denied ? { status: 'hidden' } : { status: 'error', message: LOCATION_ERROR });
      return;
    }

    try {
      const params = new URLSearchParams({
        kind,
        lat: String(roundCoordinate(coords.latitude)),
        lon: String(roundCoordinate(coords.longitude)),
      });
      const res = await fetch(`/api/nearest?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { nearest } = (await res.json()) as { nearest: NearestResult | null };
      setState({ status: 'done', nearest });
    } catch {
      setState({ status: 'error', message: texts.fetchError });
    }
  }, [kind, texts]);

  // Když uživatel polohu už dřív povolil, hledáme rovnou; o povolení se ptáme až po kliknutí.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'hidden' });
      return;
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((permission) => {
        if (permission.state === 'granted') locate();
        else if (permission.state === 'denied') setState({ status: 'hidden' });
      })
      .catch(() => {
        // Permissions API není všude – necháme tlačítko
      });
  }, [locate]);

  if (state.status === 'hidden') return null;

  if (state.status === 'done' && state.nearest) {
    const { nearest } = state;
    const target = kind === 'river' && nearest.river ? nearest.river : nearest.station;
    const subtitle =
      kind === 'river' ? `u stanice ${nearest.station.name}` : (nearest.river?.name ?? null);

    return (
      <Card variant="outlined" sx={{ mb: 3, borderColor: 'primary.main' }}>
        <CardActionArea component={Link} href={target.href}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                color="primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1.5 }}
              >
                <MyLocationIcon sx={{ fontSize: 16 }} />
                {texts.title} · {formatDistance(nearest.distanceKm)}
              </Typography>
              <Typography variant="h6" fontWeight={700} noWrap>
                {target.name}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
              {nearest.latest ? (
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mt: 1 }}
                >
                  {nearest.latest.water_level_cm !== null && (
                    <Typography variant="body1" fontWeight={600}>
                      {formatWaterLevel(nearest.latest.water_level_cm)}
                    </Typography>
                  )}
                  {nearest.latest.discharge_m3s !== null && (
                    <Typography variant="body1" fontWeight={600}>
                      {formatDischarge(nearest.latest.discharge_m3s)}
                    </Typography>
                  )}
                  {nearest.stage && (
                    <Chip
                      size="small"
                      label={nearest.stage.label}
                      color={STAGE_COLORS[nearest.stage.key] ?? 'default'}
                      variant={nearest.stage.key === 'normal' ? 'outlined' : 'filled'}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(nearest.latest.ts)}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Zatím bez aktuálního měření.
                </Typography>
              )}
            </Box>
            <ChevronRightIcon color="action" />
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }

  const message =
    state.status === 'loading'
      ? texts.loading
      : state.status === 'error'
        ? state.message
        : state.status === 'done'
          ? texts.empty
          : texts.prompt;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}
      >
        {state.status === 'loading' ? (
          <CircularProgress size={24} />
        ) : (
          <MyLocationIcon color="primary" />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{texts.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
        {(state.status === 'idle' || state.status === 'error') && (
          <Button variant="outlined" size="small" onClick={locate} sx={{ flexShrink: 0 }}>
            {state.status === 'error' ? 'Zkusit znovu' : 'Najít'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default NearestPanel;
