'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { DateRange } from '@/src/lib/date-range';
import {
  dateRangeForDay,
  dateRangeForMonth,
  dateRangeForYear,
  parseDateRange,
} from '@/src/lib/date-range';

interface CustomDatePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  active: boolean;
  onActivate: () => void;
  availabilityUrl: string;
}

interface Availability {
  years: number[];
  months: Record<number, number[]>;
}

const MONTH_NAMES = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];

/**
 * Vrátí položky od min(available) do max(available).
 * Položky s daty jsou enabled, mezery (gaps) jsou disabled.
 */
const withDisabledGaps = (available: number[], from: number, to: number) => {
  if (available.length === 0) return [];
  const set = new Set(available);
  const min = Math.max(from, Math.min(...available));
  const max = Math.min(to, Math.max(...available));
  const items: { value: number; disabled: boolean }[] = [];
  for (let v = min; v <= max; v++) {
    items.push({ value: v, disabled: !set.has(v) });
  }
  return items;
};

const TAB_DAY = 0;
const TAB_MONTH = 1;
const TAB_YEAR = 2;
const TAB_RANGE = 3;

const CustomDatePicker = ({
  value,
  onChange,
  active,
  onActivate,
  availabilityUrl,
}: CustomDatePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tab, setTab] = useState(TAB_DAY);

  // Availability
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  // Den tab
  const [dayYear, setDayYear] = useState(new Date().getFullYear());
  const [dayMonth, setDayMonth] = useState(new Date().getMonth() + 1);
  const [dayDay, setDayDay] = useState(new Date().getDate());

  // Měsíc tab
  const [monthYear, setMonthYear] = useState(new Date().getFullYear());
  const [monthMonth, setMonthMonth] = useState(new Date().getMonth() + 1);

  // Rok tab
  const [yearValue, setYearValue] = useState(new Date().getFullYear());

  // Období tab (od/do)
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  // Fetch availability při prvním otevření popoveru
  useEffect(() => {
    if (!anchorEl || availability) return;
    fetch(availabilityUrl)
      .then((r) => r.json())
      .then((data: Availability) => {
        setAvailability(data);
        if (data.years.length > 0) {
          const lastYear = data.years[data.years.length - 1];
          const lastMonths = data.months[lastYear] ?? [];
          const lastMonth = lastMonths[lastMonths.length - 1] ?? 1;
          setDayYear(lastYear);
          setDayMonth(lastMonth);
          setMonthYear(lastYear);
          setMonthMonth(lastMonth);
          setYearValue(lastYear);
          const firstYear = data.years[0];
          const firstMonths = data.months[firstYear] ?? [];
          const firstMonth = firstMonths[0] ?? 1;
          setRangeFrom(`${firstYear}-${String(firstMonth).padStart(2, '0')}-01`);
          setRangeTo(`${lastYear}-${String(lastMonth).padStart(2, '0')}-01`);
        }
      })
      .catch(() => {});
  }, [anchorEl, availability, availabilityUrl]);

  // Fetch dostupných dnů pro Den tab
  useEffect(() => {
    if (tab !== TAB_DAY || !anchorEl || !availability) return;
    setLoadingDays(true);
    setAvailableDays([]);
    fetch(`${availabilityUrl}?year=${dayYear}&month=${dayMonth}`)
      .then((r) => r.json())
      .then((data: { days: number[] }) => {
        const days = data.days ?? [];
        setAvailableDays(days);
        setDayDay((prev) => {
          if (days.length > 0 && !days.includes(prev)) return days[days.length - 1];
          return prev;
        });
      })
      .catch(() => {})
      .finally(() => setLoadingDays(false));
  }, [tab, dayYear, dayMonth, anchorEl, availability, availabilityUrl]);

  // Computed items pro selecty
  const yearItems = availability
    ? withDisabledGaps(availability.years, availability.years[0], availability.years.at(-1)!)
    : [];

  const monthItemsFor = (year: number) => {
    const months = availability?.months[year] ?? [];
    return withDisabledGaps(months, 1, 12);
  };

  const daysInMonth = new Date(dayYear, dayMonth, 0).getDate();
  const dayItems = withDisabledGaps(availableDays, 1, daysInMonth);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    onActivate();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleDayYearChange = (year: number) => {
    setDayYear(year);
    const months = availability?.months[year] ?? [];
    if (months.length > 0 && !months.includes(dayMonth)) {
      setDayMonth(months[months.length - 1]);
    }
  };

  const handleMonthYearChange = (year: number) => {
    setMonthYear(year);
    const months = availability?.months[year] ?? [];
    if (months.length > 0 && !months.includes(monthMonth)) {
      setMonthMonth(months[months.length - 1]);
    }
  };

  // Min/max date pro Období tab (z availability dat)
  const minDate = availability && availability.years.length > 0
    ? (() => {
        const y = availability.years[0];
        const m = (availability.months[y] ?? [1])[0];
        return `${y}-${String(m).padStart(2, '0')}-01`;
      })()
    : '';
  const maxDate = new Date().toISOString().slice(0, 10);

  const customRange = parseDateRange(rangeFrom, rangeTo);

  const handleConfirm = () => {
    let range: DateRange;
    if (tab === TAB_DAY) {
      const dateStr = `${dayYear}-${String(dayMonth).padStart(2, '0')}-${String(dayDay).padStart(2, '0')}`;
      range = dateRangeForDay(dateStr);
    } else if (tab === TAB_MONTH) {
      range = dateRangeForMonth(monthYear, monthMonth);
    } else if (tab === TAB_YEAR) {
      range = dateRangeForYear(yearValue);
    } else {
      range = customRange!;
    }
    onChange(range);
    handleClose();
  };

  const canConfirm = (() => {
    if (!availability) return false;
    if (tab === TAB_DAY) return availableDays.includes(dayDay);
    if (tab === TAB_MONTH) return (availability.months[monthYear] ?? []).includes(monthMonth);
    if (tab === TAB_YEAR) return availability.years.includes(yearValue);
    return customRange !== null;
  })();

  // Label pro toggle button
  const label = (() => {
    if (!active || !value) return null;
    const from = new Date(value.from);
    const to = new Date(value.to);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      return from.toLocaleDateString('cs-CZ');
    }
    if (from.getDate() === 1 && to.getDate() === 1 && diffDays >= 28 && diffDays <= 31) {
      return `${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`;
    }
    if (
      from.getMonth() === 0 &&
      from.getDate() === 1 &&
      to.getMonth() === 0 &&
      to.getDate() === 1
    ) {
      return `${from.getFullYear()}`;
    }
    return `${from.toLocaleDateString('cs-CZ')} – ${to.toLocaleDateString('cs-CZ')}`;
  })();

  const noData = availability && availability.years.length === 0;

  return (
    <>
      <ToggleButton
        value="custom"
        selected={active}
        onChange={handleClick}
        size="small"
        sx={{ gap: 0.5 }}
      >
        <CalendarMonthIcon fontSize="small" />
        {label ?? 'Vlastní'}
      </ToggleButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Den" />
            <Tab label="Měsíc" />
            <Tab label="Rok" />
            <Tab label="Období" />
          </Tabs>

          {!availability ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : noData ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Žádná data nejsou k dispozici.
            </Typography>
          ) : (
            <>
              {tab === TAB_DAY && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      label="Rok"
                      value={dayYear}
                      onChange={(e) => handleDayYearChange(Number(e.target.value))}
                      size="small"
                      sx={{ width: 100 }}
                    >
                      {yearItems.map((item) => (
                        <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                          {item.value}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Měsíc"
                      value={dayMonth}
                      onChange={(e) => setDayMonth(Number(e.target.value))}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      {monthItemsFor(dayYear).map((item) => (
                        <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                          {MONTH_NAMES[item.value - 1]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  {loadingDays ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : (
                    <TextField
                      select
                      label="Den"
                      value={dayDay}
                      onChange={(e) => setDayDay(Number(e.target.value))}
                      size="small"
                      fullWidth
                    >
                      {dayItems.map((item) => (
                        <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                          {item.value}.
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
              )}

              {tab === TAB_MONTH && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    select
                    label="Měsíc"
                    value={monthMonth}
                    onChange={(e) => setMonthMonth(Number(e.target.value))}
                    size="small"
                    sx={{ flex: 1 }}
                  >
                    {monthItemsFor(monthYear).map((item) => (
                      <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                        {MONTH_NAMES[item.value - 1]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Rok"
                    value={monthYear}
                    onChange={(e) => handleMonthYearChange(Number(e.target.value))}
                    size="small"
                    sx={{ width: 100 }}
                  >
                    {yearItems.map((item) => (
                      <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                        {item.value}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {tab === TAB_YEAR && (
                <TextField
                  select
                  label="Rok"
                  value={yearValue}
                  onChange={(e) => setYearValue(Number(e.target.value))}
                  size="small"
                  fullWidth
                >
                  {yearItems.map((item) => (
                    <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.value}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {tab === TAB_RANGE && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    type="date"
                    label="Od"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { inputProps: { min: minDate, max: rangeTo || maxDate } },
                    }}
                  />
                  <TextField
                    type="date"
                    label="Do"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { inputProps: { min: rangeFrom || minDate, max: maxDate } },
                    }}
                  />
                </Box>
              )}

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                Potvrdit
              </Button>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default CustomDatePicker;
