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
    case 'Paid':
      return 'ok';
    case 'In Transit':
    case 'Scheduled':
      return 'info';
    case 'Pending':
      return 'warn';
    case 'Cancelled':
    case 'Expired':
    case 'Failed':
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

// "Medium / Brown" → { size: 'Medium', color: 'Brown' } — one product row is
// one size/colour combo, so the storefront can offer a size picker per style.
export const parseVariant = (variant) => {
  const sep = String(variant ?? '').indexOf(' / ');
  if (sep < 0) return { size: String(variant ?? ''), color: '' };
  return { size: String(variant).slice(0, sep), color: String(variant).slice(sep + 3) };
};

// Clothing sizes in retail order (XS…XL), then numeric sizes (30, 32, 34)
// ascending, then anything else alphabetically.
const SIZE_ORDER = ['XS', 'X-Small', 'S', 'Small', 'M', 'Medium', 'L', 'Large', 'XL', 'X-Large'];
export function sizeSort(a, b) {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}
