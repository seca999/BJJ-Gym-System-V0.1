import { GymSettings } from '../types';

/**
 * Standard currency formatting utility for Jordanian Dinar (JOD)
 * Formats numbers nicely with comma grouping and JOD currency unit
 */
export function formatCurrency(amount: number | undefined | null, currency: string = 'JOD'): string {
  const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  // Format standard Jordanian Dinar representation (e.g., "1,800 JOD" or "45.00 JOD")
  const formattedNumber = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const curr = currency && currency !== '$' ? currency : 'JOD';
  return `${formattedNumber} ${curr}`;
}

export function formatJOD(amount: number | undefined | null): string {
  return formatCurrency(amount, 'JOD');
}

export function formatCurrencyPrefix(amount: number | undefined | null, currency: string = 'JOD'): string {
  const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formattedNumber = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const curr = currency && currency !== '$' ? currency : 'JOD';
  return `${curr} ${formattedNumber}`;
}
