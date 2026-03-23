export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`读取失败，请稍后重试（${response.status}）`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`提交失败，请稍后重试（${response.status}）`);
  }

  return response.json() as Promise<T>;
}
