export function parseAnyDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val.toMillis === 'function') return new Date(val.toMillis());
  if (val.seconds !== undefined && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  if (val._seconds !== undefined && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000);
  }
  if (typeof val === 'number') return new Date(val);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getLocalDateString(date: Date = new Date()): string {
  const d = parseAnyDate(date);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

export function formatDetailedTime(timestamp: any): string {
  if (!timestamp) return 'အချိန်မသိရပါ';
  const d = parseAnyDate(timestamp);
  return (
    d.toLocaleDateString('en-GB') +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
}

export function formatShortDate(timestamp: any): string {
  if (!timestamp) return '-';
  const d = parseAnyDate(timestamp);
  return d.toLocaleDateString('en-GB');
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return num.toLocaleString() + ' Ks';
}
