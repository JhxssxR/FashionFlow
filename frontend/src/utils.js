// Shared formatting helpers and chart palette for every dashboard.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
    case 'Shipped':
    case 'Out for Delivery':
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

// Client-side report exports — no backend round-trip. Cells keep raw numbers
// (Excel sums them; PDFs print them as-is).
const exportCell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  return String(v);
};

export function downloadPdf(filename, title, columns, rows) {
  const doc = new jsPDF({ unit: 'pt' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 40, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(`FashionFlow · ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`, 40, 60);
  autoTable(doc, {
    startY: 76,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => exportCell(r[c.key]))),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [13, 13, 13], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 249] }
  });
  doc.save(filename);
}

export function downloadExcel(filename, columns, rows) {
  const data = rows.map((r) =>
    Object.fromEntries(columns.map((c) => [c.label, exportCell(r[c.key])]))
  );
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = columns.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
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

// Display-only swatch colours for the storefront colour picker. Names must
// match the colour half of Product.Variant ("Small / Blue" → "Blue").
export const COLOR_HEX = {
  Brown: '#8b5e3c', Blue: '#3b5b8c', Black: '#141414', Beige: '#d4c5a9',
  Emerald: '#0e6b52', Red: '#c0392b', Ivory: '#f3ede1', Blush: '#eec3c3',
  Lavender: '#b48ad4', Indigo: '#46527a', White: '#ffffff', Grey: '#9aa0a6',
  Olive: '#6b7042'
};

// Known colours get their solid swatch; anything else (Multi, Floral…) gets a
// multitone disc.
export const swatchStyle = (color) =>
  COLOR_HEX[color]
    ? { background: COLOR_HEX[color] }
    : { background: 'conic-gradient(#e8b4b8, #b6d0b6, #b8c4e0, #e8d4a8, #e8b4b8)' };

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
