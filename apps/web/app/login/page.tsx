"use client"

import { useState, useEffect } from "react"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || loading) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const params = new URLSearchParams(window.location.search)
        window.location.href = params.get("from") ?? "/"
      } else {
        setError("Incorrect password")
        setPassword("")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div data-mounted={mounted} className="login-card w-full max-w-xs px-8 py-10">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-white tracking-tight">Veronica</h1>
          <p className="mt-1 text-zinc-500 text-sm">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors duration-150"
            />
            {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="login-btn w-full py-2.5 bg-white text-zinc-950 text-sm font-medium rounded-lg disabled:opacity-40"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  )
}
