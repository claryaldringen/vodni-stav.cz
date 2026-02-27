'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TableChartIcon from '@mui/icons-material/TableChart';

export type ViewMode = 'chart' | 'table';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v: ViewMode | null) => {
      if (v) onChange(v);
    }}
    size="small"
  >
    <ToggleButton value="chart">
      <ShowChartIcon fontSize="small" sx={{ mr: 0.5 }} />
      Graf
    </ToggleButton>
    <ToggleButton value="table">
      <TableChartIcon fontSize="small" sx={{ mr: 0.5 }} />
      Tabulka
    </ToggleButton>
  </ToggleButtonGroup>
);

export default ViewToggle;
