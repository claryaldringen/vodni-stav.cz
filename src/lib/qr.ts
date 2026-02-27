import { requireEnv } from './db';

export const generateSpdString = (amount: number, vs: string): string => {
  const iban = requireEnv('FIO_ACCOUNT_IBAN');
  return `SPD*1.0*ACC:${iban}*AM:${amount}.00*CC:CZK*X-VS:${vs}*MSG:PREDPLATNE VODNI STAV`;
};
