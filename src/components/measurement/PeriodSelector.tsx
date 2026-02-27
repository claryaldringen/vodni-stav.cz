'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { PERIODS } from '@/src/lib/periods';
import type { Period } from '@/src/lib/types';

interface PeriodSelectorProps {
  value: Period | null;
  onChange: (period: Period) => void;
}

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v: Period | null) => {
      if (v) onChange(v);
    }}
    size="small"
  >
    {PERIODS.map((p) => (
      <ToggleButton key={p.value} value={p.value}>
        {p.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

export default PeriodSelector;
