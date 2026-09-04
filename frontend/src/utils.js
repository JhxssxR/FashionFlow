// Shared formatting helpers and chart palette for every dashboard.

export const peso = (n) =>
  '₱' + Math.round(Number(n) || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

export const peso2 = (n) =>
  '₱' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (n) => (Number(n) || 0).toLocaleString('en-PH');

export const CHART_COLORS = {
  gold: '#cda858',
  dark: '#0d0d0d',
  purple: '#7b5eea',
  green: '#3f9e6c',
  red: '#c0564f',
  grid: '#ececec'
};

export function statusTone(status) {
  switch (status) {
    case 'Delivered':
    case 'Active':
    case 'Completed':
    case 'Confirmed':
      return 'ok';
    case 'In Transit':
    case 'Scheduled':
      return 'info';
    case 'Pending':
      return 'warn';
    case 'Cancelled':
    case 'Expired':
      return 'bad';
    default:
      return 'neutral';
  }
}

// "2026-09-04" → "Sep 4, 2026" without Date parsing surprises.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function fmtTime(value) {
  return new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function initialsOf(name = '') {
  const parts = name.split(' ').filter(Boolean);
  return parts.length === 0 ? '?' : parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
