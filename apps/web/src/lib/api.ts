const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function json<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return json<T>(await fetch(`${API_URL}${path}`, { credentials: "include" }), path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return json<T>(res, path);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<T>(res, path);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", credentials: "include" });
  if (!res.ok && res.status !== 204) throw new Error(`${res.status} on ${path}`);
}

/** Top-level navigation to start the OAuth flow (dev provider by default). */
export const loginUrl = `${API_URL}/auth/dev/login`;
