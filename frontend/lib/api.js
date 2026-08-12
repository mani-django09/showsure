// Tiny API client — all requests go through Next rewrites to the backend.
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bs_token') : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function fmtTime(min) {
  const h24 = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m} ${ampm}`;
}

export const fmtMoney = (cents) => `$${(cents / 100).toFixed(2)}`;
