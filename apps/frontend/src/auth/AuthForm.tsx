import { useState, type FormEvent } from "react"
import { API_BASE_URL, assertProductionApiUsesTls } from "../config"
import { sha256HexUtf8 } from "./passwordDigest"

type Mode = "login" | "register"

async function errorMessageFromResponse(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (
      data &&
      typeof data === "object" &&
      "detail" in data &&
      data.detail !== undefined
    ) {
      const d = (data as { detail: unknown }).detail
      if (typeof d === "string") return d
      if (Array.isArray(d))
        return d
          .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as { msg: unknown }).msg) : String(item)))
          .join(", ")
    }
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`
}

export function AuthForm(props: { onAuthed: (accessToken: string) => void }) {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const prodTls = assertProductionApiUsesTls()
    if (prodTls) {
      setError(prodTls)
      return
    }
    setPending(true)
    const path = mode === "login" ? "/auth/login" : "/auth/register"
    let password_digest: string
    try {
      password_digest = await sha256HexUtf8(password)
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : "Could not hash password")
      return
    }
    const body =
      mode === "login"
        ? { email, password_digest }
        : { email, username, password_digest }
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError(await errorMessageFromResponse(res))
        return
      }
      const data = (await res.json()) as { access_token?: string }
      if (!data.access_token) {
        setError("Missing access_token in response")
        return
      }
      props.onAuthed(data.access_token)
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div>
        <button type="button" onClick={() => setMode("login")}>
          Login
        </button>
        <button type="button" onClick={() => setMode("register")}>
          Register
        </button>
      </div>
      <div>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </label>
      </div>
      {mode === "register" ? (
        <div>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              required
            />
          </label>
        </div>
      ) : null}
      <div>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
          />
        </label>
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  )
}
