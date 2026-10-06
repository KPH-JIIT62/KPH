// Every call to the KPH backend goes through apiFetch. It attaches the Firebase ID token as
//   Authorization: Bearer <token>
// so the backend can verify WHO is calling. We never send a user id: the backend works it out from the token.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function apiFetch<T>(path: string, token: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    // fetch only throws when the request never got an answer (server down, offline, CORS blocked).
    throw new ApiError(0, "NETWORK_ERROR", "Couldn’t reach the KPH server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(response.status, error?.code ?? "UNKNOWN", error?.message ?? "Something went wrong.", error?.fields);
  }
  return data as T;
}
