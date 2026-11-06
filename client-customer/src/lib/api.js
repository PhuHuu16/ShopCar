import { useAuth } from '../stores/auth';

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  fieldErrors() {
    return Object.fromEntries(this.errors.map((e) => [e.field, e.message]));
  }
}

// -- Gọi API --
export async function api(path, { method = 'GET', body, query } = {}) {
  const token = useAuth.getState().token;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    }
    if ([...params].length) url += `?${params}`;
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
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
