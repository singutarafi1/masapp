export function getLocalDateString(date: Date = new Date()): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
}

export function formatDetailedTime(timestamp: any): string {
  if (!timestamp) return 'အချိန်မသိရပါ';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(d.getTime())) return 'အချိန်မသိရပါ';
  return (
    d.toLocaleDateString('en-GB') +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
}

export function formatShortDate(timestamp: any): string {
  if (!timestamp) return '-';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return num.toLocaleString() + ' Ks';
}
