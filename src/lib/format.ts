const TZ = 'Europe/Prague';

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('cs-CZ', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleString('cs-CZ', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatNumber = (value: number | null, decimals = 1): string => {
  if (value === null || value === undefined) return '–';
  return value.toLocaleString('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatWaterLevel = (cm: number | null): string =>
  cm !== null ? `${formatNumber(cm, 0)} cm` : '–';

export const formatDischarge = (m3s: number | null): string =>
  m3s !== null ? `${formatNumber(m3s, 2)} m³/s` : '–';
