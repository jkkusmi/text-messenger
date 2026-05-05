/**
 * SHA-256 of the UTF-8 password, as lowercase hex (64 characters).
 * Matches server expectations in `RegisterRequest` / `LoginRequest`.
 */
export async function sha256HexUtf8(password: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Web Crypto API is unavailable (use https:// or http://localhost).",
    )
  }
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded)
  const bytes = new Uint8Array(hashBuffer)
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0")
  }
  return hex
}
