const base = '/api';

async function req(path, options = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadFiles(files) {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const res = await fetch(base + '/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { paths: [...] }
}

export const api = {
  stats: () => req('/stats'),
  today: (date) => req('/reviews/today' + (date ? `?date=${date}` : '')),
  byDate: (date) => req(`/reviews/by-date?date=${date}`),
  month: (year, month) => req(`/reviews/month?year=${year}&month=${month}`),
  complete: (id, feedback) => req(`/reviews/${id}/complete`, { method: 'POST', body: JSON.stringify({ feedback }) }),
  postpone: (id) => req(`/reviews/${id}/postpone`, { method: 'POST' }),
  reset: (id) => req(`/reviews/${id}/reset`, { method: 'POST' }),
  batches: () => req('/batches'),
  batch: (id) => req(`/batches/${id}`),
  createBatch: (data) => req('/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => req(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id) => req(`/batches/${id}`, { method: 'DELETE' }),
};

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diffDays(fromDate, toDate) {
  const a = new Date(fromDate + 'T00:00:00');
  const b = new Date(toDate + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
