export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const TOKEN_STORAGE_KEY = "harkkalogi_auth_token";
export const USER_STORAGE_KEY = "harkkalogi_auth_user";

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data && typeof data === "object") {
      const details = (data as { details?: Array<{ message?: string }> }).details;
      if (Array.isArray(details) && details.length > 0) {
        const detailMessages = details.map((d) => d.message).filter(Boolean);
        if (detailMessages.length > 0) {
          errorMessage = detailMessages.join(". ");
        } else if ("error" in data && typeof (data as { error: unknown }).error === "string") {
          errorMessage = (data as { error: string }).error;
        }
      } else if ("error" in data && typeof (data as { error: unknown }).error === "string") {
        errorMessage = (data as { error: string }).error;
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

