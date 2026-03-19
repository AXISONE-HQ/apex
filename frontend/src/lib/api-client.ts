import { getApiBaseUrl, getDefaultApiToken } from "./config";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  headers?: HeadersInit;
  cache?: RequestCache;
  authToken?: string | null;
  orgId?: string | null;
  searchParams?: Record<string, string | number | boolean | null | undefined> | URLSearchParams;
}

export interface ApiErrorShape {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor({ message, status, code, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<TResponse, TBody = unknown>(
  path: string,
  { method = "GET", body, headers, cache = "no-store", authToken, orgId, searchParams }: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const url = buildUrl(path, searchParams);
  const resolvedToken = authToken ?? getDefaultApiToken();

  const response = await fetch(url, {
    method,
    cache,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(orgId ? { "x-org-id": orgId } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw await normalizeError(response);
  }

  return (await safeJson(response)) as TResponse;
}

function buildUrl(path: string, searchParams?: RequestOptions<unknown>["searchParams"]) {
  const baseUrl = path.startsWith("http") ? path : `${getApiBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!searchParams) return baseUrl;
  const url = new URL(baseUrl);
  const params =
    searchParams instanceof URLSearchParams ? searchParams : buildSearchParams(searchParams);
  params.forEach((value, key) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function buildSearchParams(obj?: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  return params;
}

async function normalizeError(response: Response): Promise<ApiError> {
  const payload = (await safeJson(response)) as Record<string, unknown> | null;
  const message =
    (typeof payload?.message === "string" && payload.message) ||
    (typeof payload?.error === "string" && payload.error) ||
    response.statusText ||
    "Request failed";

  const code = typeof payload?.code === "string" ? payload.code : undefined;

  return new ApiError({
    message,
    status: response.status,
    code,
    details: payload,
  });
}

async function safeJson(res: Response) {
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}
