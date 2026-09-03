// Mock data for the role dashboards, grounded in the IT15 data dictionary
// (Users, Employees, Products, Inventory, Suppliers, Purchasing, Sales,
// Customers, Loyalty, Reports). Seeded so numbers stay stable between
// reloads — swap for real API calls once the C# backend exists.

// Fixed "today" keeps every dashboard and screenshot stable.
const TODAY = new Date(2026, 8, 4); // September 4, 2026

export const peso = (n) =>
  '₱' + Math.round(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

export const peso2 = (n) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Deterministic pseudo-random generator (stable between reloads).
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function dayLabel(date) {
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ---------- Role credentials (from the project documentation) ----------
export const ROLE_CREDENTIALS = [
  { role: 'admin', label: 'Administrator', email: 'admin@fashionflow.com', password: '@dm1n!@#' },
  { role: 'inventory', label: 'Inventory Manager', email: 'inventman@fashionflow.com', password: 'inv3ntm4n!@#' },
  { role: 'purchasing', label: 'Purchasing Officer', email: 'purchase@fashionflow.com', password: 'purch453!@#' },
  { role: 'sales', label: 'Sales Staff', email: 'sales@fashionflow.com', password: 's4l3sPOS!@#' },
  { role: 'customer', label: 'Customer', email: 'customer@fashionflow.com', password: 'cust0m3r!@#' },
  { role: 'accountant', label: 'Accountant', email: 'accountan@fashionflow.com', password: 'acc0unt4n!@#' },
  { role: 'supplier', label: 'Supplier', email: 'supplier@fashionflow.com', password: 'suppl13r!@#' }
];

export function findRoleByEmail(email) {
  const normalised = (email || '').trim().toLowerCase();
  return ROLE_CREDENTIALS.find((c) => c.email === normalised) || null;
}

// ---------- Current user personas ----------
export const USERS = {
  admin: { name: 'Alex Tan', role: 'System Administrator', email: 'admin@fashionflow.com', initials: 'AT' },
  inventory: { name: 'Mara Villanueva', role: 'Inventory Manager', email: 'inventman@fashionflow.com', initials: 'MV' },
  purchasing: { name: 'Carlo Reyes', role: 'Purchasing Officer', email: 'purchase@fashionflow.com', initials: 'CR' },
  sales: { name: 'Jasmine Cruz', role: 'Sales Staff — POS Operator', email: 'sales@fashionflow.com', initials: 'JC' },
  customer: { name: 'Bea Mendoza', role: 'Loyal Customer', email: 'customer@fashionflow.com', initials: 'BM' },
  accountant: { name: 'Pia Santos', role: 'Accountant', email: 'accountan@fashionflow.com', initials: 'PS' },
  supplier: { name: 'Marco Lim', role: 'Supplier — Denim Republic PH', email: 'supplier@fashionflow.com', initials: 'ML' }
};

// ---------- Products (mirrors the storefront catalog) ----------
export const PRODUCTS = [
  { id: 1, name: 'Linen Blazer', category: 'Outerwear', variant: 'Medium / Brown', price: 7480, stock: 34 },
  { id: 2, name: 'Midi Wrap Dress', category: 'Dresses', variant: 'Small / Blue', price: 9220, stock: 12 },
  { id: 3, name: 'Wide Leg Trousers', category: 'Bottoms', variant: 'Medium / Multi', price: 5160, stock: 6 },
  { id: 4, name: 'Faux Leather Jacket', category: 'Outerwear', variant: 'Large / Brown', price: 11540, stock: 21 },
  { id: 5, name: 'Silk Slip Dress', category: 'Dresses', variant: 'Small / Floral', price: 8640, stock: 27 },
  { id: 6, name: 'Floral Wrap Maxi Dress', category: 'Dresses', variant: 'Medium / Ivory', price: 9480, stock: 4 },
  { id: 7, name: 'Tulle Midi Dress', category: 'Dresses', variant: 'Small / Blush', price: 10980, stock: 9 },
  { id: 8, name: 'Chambray Shirt', category: 'Shirts', variant: 'Large / Indigo', price: 4980, stock: 42 },
  { id: 9, name: 'Essential Crew Tee', category: 'Tops', variant: 'Medium / White', price: 2490, stock: 86 },
  { id: 10, name: 'Straight Denim', category: 'Bottoms', variant: '32 / Indigo', price: 5980, stock: 18 },
  { id: 11, name: 'Sherpa Denim Jacket', category: 'Outerwear', variant: 'Medium / Indigo', price: 10480, stock: 3 },
  { id: 12, name: 'Quilted Bomber Jacket', category: 'Outerwear', variant: 'Large / Black', price: 9980, stock: 15 }
];

// ---------- 30-day sales + traffic series ----------
export function buildDailySeries(days = 30) {
  const rand = seeded(2026);
  const series = [];
  let base = 42000;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(TODAY);
    date.setDate(date.getDate() - i);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const revenue = Math.round(base * (weekend ? 1.45 : 1) * (0.82 + rand() * 0.5));
    const orders = Math.max(6, Math.round(revenue / 1600));
    base += 380; // gentle upward trend
    series.push({
      date: dayLabel(date),
      fullDate: date.toISOString().slice(0, 10),
      revenue,
      orders,
      visitors: Math.round(orders * (11 + rand() * 5)),
      expenses: Math.round(revenue * (0.52 + rand() * 0.12))
    });
  }
  return series;
}

export const DAILY = buildDailySeries(30);
export const TODAY_ROW = DAILY[DAILY.length - 1];
export const YESTERDAY_ROW = DAILY[DAILY.length - 2];

export function sumRange(key, days) {
  return DAILY.slice(-days).reduce((sum, d) => sum + d[key], 0);
}

// ---------- POS hourly sales (today) ----------
export const HOURLY_SALES = (() => {
  const rand = seeded(77);
  return [
    { hour: '10 AM', sales: 12400, transactions: 5 },
    { hour: '11 AM', sales: 18900, transactions: 8 },
    { hour: '12 NN', sales: 31500, transactions: 13 },
    { hour: '1 PM', sales: 26800, transactions: 11 },
    { hour: '2 PM', sales: 19200, transactions: 8 },
    { hour: '3 PM', sales: 22100, transactions: 9 },
    { hour: '4 PM', sales: 28700, transactions: 12 },
    { hour: '5 PM', sales: 35400, transactions: 15 },
    { hour: '6 PM', sales: 41800, transactions: 18 },
    { hour: '7 PM', sales: 38900, transactions: 16 }
  ].map((h) => ({ ...h, sales: Math.round(h.sales * (0.9 + rand() * 0.2)) }));
})();

// ---------- Recent POS transactions ----------
export const RECENT_TRANSACTIONS = [
  { id: 'POS-1042', time: '7:42 PM', customer: 'Bea Mendoza', items: 3, total: 12480, payment: 'GCash', loyalty: '+124' },
  { id: 'POS-1041', time: '7:15 PM', customer: 'Walk-in', items: 1, total: 5160, payment: 'Cash', loyalty: '—' },
  { id: 'POS-1040', time: '6:58 PM', customer: 'Rina Dela Cruz', items: 4, total: 22340, payment: 'Maya', loyalty: '+223' },
  { id: 'POS-1039', time: '6:31 PM', customer: 'Walk-in', items: 2, total: 14960, payment: 'Card', loyalty: '—' },
  { id: 'POS-1038', time: '5:47 PM', customer: 'Jun Manalo', items: 2, total: 8970, payment: 'GCash', loyalty: '+90' },
  { id: 'POS-1037', time: '5:12 PM', customer: 'Kat Lorenzo', items: 5, total: 31250, payment: 'Card', loyalty: '+313' }
];

// ---------- Inventory ----------
export const LOW_STOCK = PRODUCTS.filter((p) => p.stock <= 12).sort((a, b) => a.stock - b.stock);
export const OUT_OF_SOON = LOW_STOCK.filter((p) => p.stock <= 6);

export const INVENTORY_MOVEMENTS = (() => {
  const rand = seeded(31);
  return DAILY.slice(-14).map((d, i) => ({
    date: d.date,
    stockIn: Math.round(60 + rand() * 90),
    stockOut: Math.round(45 + rand() * 80 + (i % 5) * 8)
  }));
})();

export const STOCK_BY_CATEGORY = (() => {
  const map = {};
  PRODUCTS.forEach((p) => {
    map[p.category] = (map[p.category] || 0) + p.stock;
  });
  return Object.entries(map).map(([category, stock]) => ({ category, stock }));
})();

export const WAREHOUSES = [
  { name: 'Main Warehouse — Quezon City', skus: 148, utilisation: 78 },
  { name: 'BGC Boutique Stockroom', skus: 64, utilisation: 52 },
  { name: 'Cebu Hub', skus: 37, utilisation: 34 }
];

// ---------- Suppliers ----------
export const SUPPLIERS = [
  { id: 1, name: 'Denim Republic PH', contact: 'Marco Lim', email: 'supplier@fashionflow.com', category: 'Denim & Bottoms', rating: 4.8, onTime: 96 },
  { id: 2, name: 'Manila Textile Hub', contact: 'Lorna Bautista', email: 'lorna@manilatextile.ph', category: 'Fabrics', rating: 4.6, onTime: 92 },
  { id: 3, name: 'Cebu Garments Co.', contact: 'Paolo Escaño', email: 'paolo@cebugarments.com', category: 'Tops & Tees', rating: 4.4, onTime: 88 },
  { id: 4, name: 'Baguio Weaves', contact: 'Aileen Kim', email: 'aileen@baguioweaves.ph', category: 'Outerwear', rating: 4.9, onTime: 98 },
  { id: 5, name: 'Davao Apparel Supply', contact: 'Rico Dizon', email: 'rico@davaoapparel.com', category: 'Dresses', rating: 4.2, onTime: 84 }
];

// ---------- Purchase orders ----------
export const PURCHASE_ORDERS = [
  { id: 'PO-2026-0188', supplier: 'Denim Republic PH', items: 'Sherpa Denim Jacket ×40', amount: 148000, status: 'Pending', date: 'Sep 3, 2026', eta: 'Sep 10' },
  { id: 'PO-2026-0187', supplier: 'Baguio Weaves', items: 'Linen Blazer ×25', amount: 96500, status: 'In Transit', date: 'Sep 2, 2026', eta: 'Sep 6' },
  { id: 'PO-2026-0186', supplier: 'Cebu Garments Co.', items: 'Essential Crew Tee ×120', amount: 86400, status: 'Delivered', date: 'Aug 30, 2026', eta: 'Sep 2' },
  { id: 'PO-2026-0185', supplier: 'Manila Textile Hub', items: 'Silk fabric rolls ×18', amount: 121300, status: 'Delivered', date: 'Aug 28, 2026', eta: 'Sep 1' },
  { id: 'PO-2026-0184', supplier: 'Davao Apparel Supply', items: 'Tulle Midi Dress ×30', amount: 104400, status: 'Pending', date: 'Aug 27, 2026', eta: 'Sep 12' },
  { id: 'PO-2026-0183', supplier: 'Denim Republic PH', items: 'Straight Denim ×60', amount: 138600, status: 'Cancelled', date: 'Aug 25, 2026', eta: '—' }
];

// ---------- Customers (CRM) ----------
export const CRM_CUSTOMERS = [
  { id: 1, name: 'Kat Lorenzo', email: 'kat.lorenzo@gmail.com', orders: 14, spent: 148300, points: 3240, tier: 'Gold' },
  { id: 2, name: 'Bea Mendoza', email: 'customer@fashionflow.com', orders: 11, spent: 96450, points: 1240, tier: 'Gold' },
  { id: 3, name: 'Rina Dela Cruz', email: 'rina.dc@outlook.com', orders: 9, spent: 74200, points: 890, tier: 'Silver' },
  { id: 4, name: 'Jun Manalo', email: 'junmanalo@yahoo.com', orders: 6, spent: 41200, points: 410, tier: 'Silver' },
  { id: 5, name: 'Sofy Andrade', email: 'sofy.andrade@gmail.com', orders: 3, spent: 18800, points: 180, tier: 'Bronze' },
  { id: 6, name: 'Miko Tan', email: 'miko.tan@gmail.com', orders: 2, spent: 12480, points: 120, tier: 'Bronze' }
];

// ---------- Promotions ----------
export const PROMOTIONS = [
  { code: 'SCHOOL15', description: '15% off all bottoms', validity: 'Until Aug 31', uses: 142, status: 'Expired' },
  { code: 'FF200', description: '₱200 off orders ₱2,000+', validity: 'Until Sep 15', uses: 318, status: 'Active' },
  { code: 'CLEAR30', description: '30% off clearance', validity: 'Until Aug 20', uses: 96, status: 'Expired' },
  { code: 'BER2026', description: '₱500 off for loyalty Gold tier', validity: 'Sep 15 – Dec 31', uses: 41, status: 'Scheduled' }
];

// ---------- Employees (admin) ----------
export const EMPLOYEES = [
  { name: 'Alex Tan', role: 'System Administrator', email: 'admin@fashionflow.com', status: 'Active' },
  { name: 'Mara Villanueva', role: 'Inventory Manager', email: 'inventman@fashionflow.com', status: 'Active' },
  { name: 'Carlo Reyes', role: 'Purchasing Officer', email: 'purchase@fashionflow.com', status: 'Active' },
  { name: 'Jasmine Cruz', role: 'Sales Staff', email: 'sales@fashionflow.com', status: 'Active' },
  { name: 'Pia Santos', role: 'Accountant', email: 'accountan@fashionflow.com', status: 'Active' },
  { name: 'Marco Lim', role: 'Supplier', email: 'supplier@fashionflow.com', status: 'Active' },
  { name: 'Lorna Bautista', role: 'Supplier', email: 'lorna@manilatextile.ph', status: 'Invited' }
];

export const USERS_BY_ROLE = [
  { role: 'Customers', value: 1284 },
  { role: 'Sales Staff', value: 6 },
  { role: 'Inventory', value: 4 },
  { role: 'Purchasing', value: 3 },
  { role: 'Accounting', value: 2 },
  { role: 'Suppliers', value: 9 },
  { role: 'Admins', value: 1 }
];

export const SYSTEM_LOGS = [
  { time: 'Today 7:42 PM', user: 'sales@fashionflow.com', action: 'POS sale POS-1042 completed — ₱12,480', type: 'Sales' },
  { time: 'Today 6:58 PM', user: 'sales@fashionflow.com', action: 'POS sale POS-1040 completed — ₱22,340', type: 'Sales' },
  { time: 'Today 5:04 PM', user: 'inventman@fashionflow.com', action: 'Stock adjustment: Floral Wrap Maxi Dress set to 4 units', type: 'Inventory' },
  { time: 'Today 3:21 PM', user: 'purchase@fashionflow.com', action: 'PO-2026-0188 created for Denim Republic PH', type: 'Purchasing' },
  { time: 'Today 1:47 PM', user: 'supplier@fashionflow.com', action: 'Delivery status updated: PO-2026-0187 → In Transit', type: 'Supplier' },
  { time: 'Today 11:15 AM', user: 'accountan@fashionflow.com', action: 'August VAT report generated', type: 'Reports' },
  { time: 'Yesterday 9:32 PM', user: 'admin@fashionflow.com', action: 'User account invited: lorna@manilatextile.ph', type: 'System' },
  { time: 'Yesterday 4:08 PM', user: 'admin@fashionflow.com', action: 'System setting changed: loyalty earn rate → 1 pt / ₱100', type: 'System' }
];

// ---------- Finance (accountant) ----------
export const REVENUE_VS_EXPENSES = DAILY.slice(-14).map((d) => ({
  date: d.date,
  revenue: d.revenue,
  expenses: d.expenses,
  profit: d.revenue - d.expenses
}));

export const MONTHLY_FINANCE = [
  { month: 'Apr', revenue: 812000, expenses: 445000 },
  { month: 'May', revenue: 934000, expenses: 498000 },
  { month: 'Jun', revenue: 1042000, expenses: 551000 },
  { month: 'Jul', revenue: 1186000, expenses: 604000 },
  { month: 'Aug', revenue: 1268000, expenses: 631000 },
  { month: 'Sep (to date)', revenue: 512000, expenses: 268000 }
];

export const EXPENSE_BREAKDOWN = [
  { name: 'Inventory Purchasing', value: 38 },
  { name: 'Payroll', value: 24 },
  { name: 'Rent & Utilities', value: 16 },
  { name: 'Logistics', value: 12 },
  { name: 'Marketing', value: 10 }
];

export const RECEIVABLES = PURCHASE_ORDERS.filter((p) => p.status !== 'Delivered' && p.status !== 'Cancelled').map((p) => ({
  id: p.id,
  party: p.supplier,
  due: p.eta,
  amount: p.amount
}));

// ---------- Supplier portal ----------
export const SUPPLIER_INCOMING_POS = PURCHASE_ORDERS.filter((p) => p.supplier === 'Denim Republic PH');

export const SUPPLIER_DELIVERY_HISTORY = [
  { id: 'PO-2026-0186', items: 'Essential Crew Tee ×120', delivered: 'Sep 2, 2026', amount: 86400, status: 'Delivered' },
  { id: 'PO-2026-0179', items: 'Straight Denim ×45', delivered: 'Aug 21, 2026', amount: 103950, status: 'Delivered' },
  { id: 'PO-2026-0171', items: 'Sherpa Denim Jacket ×25', delivered: 'Aug 12, 2026', amount: 92500, status: 'Delivered' },
  { id: 'PO-2026-0164', items: 'Straight Denim ×30', delivered: 'Aug 3, 2026', amount: 69300, status: 'Delivered' }
];

export const SUPPLIER_CATALOG = [
  { name: 'Straight Denim', variant: 'Sizes 28–36', unitCost: 2310, moq: 30, leadTime: '7 days' },
  { name: 'Sherpa Denim Jacket', variant: 'S / M / L', unitCost: 3700, moq: 20, leadTime: '10 days' },
  { name: 'Chambray Shirt', variant: 'S–XXL', unitCost: 1620, moq: 40, leadTime: '8 days' }
];

// ---------- Customer dashboard ----------
export const CUSTOMER_ORDERS = [
  { id: 'FF-10241', date: 'Sep 3, 2026', items: 'Linen Blazer, Wide Leg Trousers, Essential Crew Tee', total: 12480, status: 'Delivered', points: 124 },
  { id: 'FF-10198', date: 'Aug 24, 2026', items: 'Silk Slip Dress', total: 8640, status: 'Delivered', points: 86 },
  { id: 'FF-10155', date: 'Aug 12, 2026', items: 'Midi Wrap Dress, Essential Crew Tee ×2', total: 14200, status: 'Delivered', points: 142 },
  { id: 'FF-10093', date: 'Jul 29, 2026', items: 'Faux Leather Jacket', total: 11540, status: 'Delivered', points: 115 },
  { id: 'FF-10041', date: 'Jul 8, 2026', items: 'Chambray Shirt', total: 6480, status: 'Delivered', points: 65 }
];

export const CUSTOMER_PROMOS = PROMOTIONS.filter((p) => p.status === 'Active');

export const CUSTOMER_TIER = {
  name: 'Gold',
  points: 1240,
  nextTier: 'Platinum',
  pointsToNext: 760,
  perks: ['Free shipping always', 'Early access to drops', 'Birthday voucher']
};

// ---------- Charts palette ----------
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
