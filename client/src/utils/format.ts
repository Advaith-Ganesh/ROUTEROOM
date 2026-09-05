const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dateFormatterWithYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${dateFormatter.format(start)} - ${sameYear ? dateFormatter.format(end) : dateFormatterWithYear.format(end)}, ${end.getFullYear()}`;
}

export function formatMoney(cents: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function formatDay(dateIso: string) {
  return dateFormatterWithYear.format(new Date(dateIso));
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
}
