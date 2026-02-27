'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { GRANULARITIES } from '@/src/lib/granularity';
import type { Granularity } from '@/src/lib/types';

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (g: Granularity) => void;
}

const GranularitySelector = ({ value, onChange }: GranularitySelectorProps) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v: Granularity | null) => {
      if (v) onChange(v);
    }}
    size="small"
  >
    {GRANULARITIES.map((g) => (
      <ToggleButton key={g.value} value={g.value}>
        {g.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

export default GranularitySelector;
