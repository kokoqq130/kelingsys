async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`读取失败，请稍后重试（${response.status}）`);
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(url: string): Promise<T> {
  return fetchJson<T>(url);
}

export async function apiPost<T>(url: string): Promise<T> {
  return fetchJson<T>(url, { method: 'POST' });
}

export async function jsonGet<T>(url: string): Promise<T> {
  return fetchJson<T>(url);
}
