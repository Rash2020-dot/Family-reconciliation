export function isEffectivelyZero(val: number): boolean {
  return !Number.isFinite(val) || val === 0 || Math.abs(val) < 0.0001;
}

export function formatInteger(val: number): string {
  if (!Number.isFinite(val)) return '0';
  return Math.round(val).toLocaleString(undefined);
}

export function formatDecimal(val: number, maxDecimals = 4): string {
  if (isEffectivelyZero(val)) return '—';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatCurrency(val: number, maxDecimals = 4): string {
  if (isEffectivelyZero(val)) return '—';
  return (
    '€' +
    val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    })
  );
}

export function formatKpiCurrency(val: number, signed = false): string {
  const safe = Number.isFinite(val) ? val : 0;
  const formatted = Math.abs(safe).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (signed) {
    if (safe > 0) return `+€${formatted}`;
    if (safe < 0) return `-€${formatted}`;
  }
  return `€${formatted}`;
}

export function formatSignedCurrency(val: number): string {
  if (isEffectivelyZero(val)) return '—';
  const formatted = Math.abs(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return val < 0 ? `-€${formatted}` : `+€${formatted}`;
}

export function formatSignedInteger(val: number): string {
  if (isEffectivelyZero(val)) return '0';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toLocaleString()}`;
}

export function formatSignedDecimal(val: number): string {
  if (isEffectivelyZero(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

export function formatSignedPercent(val: number): string {
  if (isEffectivelyZero(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}
