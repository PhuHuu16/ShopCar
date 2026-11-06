import { useAuth } from '../stores/auth';

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors || [];
  }

  fieldErrors() {
    const result = {};
    for (const e of this.errors) result[e.field] ??= e.message;
    return result;
  }
}

function buildUrl(path, query) {
  let url = `/api/admin${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    }
    if ([...params].length) url += `?${params}`;
  }
  return url;
}

// -- Gọi API quản trị --
export async function api(path, { method = 'GET', body, query, form } = {}) {
  const token = useAuth.getState().token;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined)
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) useAuth.getState().logout();
    throw new ApiError(res.status, data?.message || 'Có lỗi xảy ra, vui lòng thử lại', data?.errors);
  }
  return data;
}

export const SHOP_URL = import.meta.env.DEV ? 'http://localhost:5173' : '';
