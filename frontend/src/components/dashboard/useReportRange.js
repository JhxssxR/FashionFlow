import React from 'react';

// Shared report date-range state (defaults to the last `defaultDays` days).
// `query` drops straight into the range-aware summary endpoints
// (from/to, capped server-side); empty inputs fall back to `days`.
export function useReportRange(defaultDays = 14) {
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [today] = React.useState(() => toISO(new Date()));
  const [to, setTo] = React.useState(() => toISO(new Date()));
  const [from, setFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - (defaultDays - 1));
    return toISO(d);
  });
  const reset = () => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - (defaultDays - 1));
    setTo(toISO(t));
    setFrom(toISO(f));
  };
  const query = from && to ? `from=${from}&to=${to}` : `days=${defaultDays}`;
  return { from, to, today, setFrom, setTo, reset, query };
}
