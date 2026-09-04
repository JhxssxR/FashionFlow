import { useEffect, useState, useCallback } from 'react';

// Same-origin API client (production serves the SPA from the same app;
// in dev, Vite's server.proxy forwards /api to the backend — see vite.config.js).
const AUTH_KEY = 'ff_auth';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export async function api(path, { method = 'GET', body } = {}) {
  const auth = getAuth();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (res.status === 401 && auth) {
    // Expired/invalid token: drop it and bounce to the login page.
    clearAuth();
    window.location.hash = 'login';
    throw new ApiError('Your session expired — please sign in again.', 401);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new ApiError(data?.message || data?.title || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

// Fetch-on-mount hook: re-runs when any entry of `deps` changes, ignores
// stale responses, and surfaces errors for inline display.
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await api(path));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => {
    let stale = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api(path);
        if (!stale) {
          setData(d);
          setError('');
        }
      } catch (e) {
        if (!stale) setError(e.message);
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, error, loading, reload: load };
}
