const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const DEFAULT_API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? null;
const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "00000000-0000-0000-0000-000000000001";

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL.replace(/\/$/, "");
}

export function getDefaultOrgId() {
  return DEFAULT_ORG_ID;
}

export function getDefaultApiToken() {
  return DEFAULT_API_TOKEN;
}
