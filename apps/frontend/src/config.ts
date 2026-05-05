/** API origin; override via `VITE_API_URL` in `.env` (see Vite env docs). Use `https://` in production; pair with backend TLS (`SSL_CERTFILE` / `SSL_KEYFILE` or a reverse proxy) and `ENFORCE_TLS=1`. */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"

/**
 * In production builds, refuse non-TLS API URLs except loopback (local smoke tests).
 */
export function assertProductionApiUsesTls(): string | null {
  if (!import.meta.env.PROD) return null
  if (API_BASE_URL.startsWith("https:")) return null
  try {
    const { hostname } = new URL(API_BASE_URL)
    if (hostname === "localhost" || hostname === "127.0.0.1") return null
  } catch {
    return "Invalid VITE_API_URL"
  }
  return "Production requires https:// in VITE_API_URL (TLS on the API origin)."
}
