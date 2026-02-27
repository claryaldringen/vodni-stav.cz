'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { getPeriodsForGranularity } from '@/src/lib/granularity';
import type { Granularity, RiverPeriod } from '@/src/lib/types';

interface RiverPeriodSelectorProps {
  granularity: Granularity;
  value: RiverPeriod | null;
  onChange: (p: RiverPeriod) => void;
}

const RiverPeriodSelector = ({ granularity, value, onChange }: RiverPeriodSelectorProps) => {
  const periods = getPeriodsForGranularity(granularity);

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v: RiverPeriod | null) => {
        if (v) onChange(v);
      }}
      size="small"
    >
      {periods.map((p) => (
        <ToggleButton key={p.value} value={p.value}>
          {p.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default RiverPeriodSelector;
