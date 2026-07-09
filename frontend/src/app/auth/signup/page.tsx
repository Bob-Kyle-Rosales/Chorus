// frontend/src/app/auth/signup/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, easeOut } from "framer-motion"
import { api, ApiError } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { AuthBrandPanel } from "@/components/AuthBrandPanel"

const formContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const formItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
}

// Literal hex mirrors --chorus-border/--chorus-gold (globals.css) — framer-motion
// can't tween a whileFocus animation between unresolved CSS custom properties,
// so these must stay literal. Update alongside the token if it ever changes.
const inputBaseStyle = {
  background: "var(--chorus-bg)",
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "#2a3644",
  color: "var(--chorus-text)",
}
const inputFocusGlow = { borderColor: "#c9a24a", boxShadow: "0 0 0 3px rgba(201,162,74,0.15)" }

export default function SignUpPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < 8
  const confirmMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    try {
      const data = await api.post<{ access_token: string }>("/auth/register", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email,
        password,
      })
      useAuthStore.setState({ accessToken: data.access_token })
      const user = await api.get<{
        id: string
        first_name: string
        last_name: string
        email: string
      }>("/auth/me")
      setAuth(user, data.access_token)
      router.push("/home")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen" style={{ background: "var(--chorus-bg)" }}>
      <AuthBrandPanel variant="signup" />

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-10">
          <Link
            href="/"
            className="block text-3xl tracking-wide transition-opacity hover:opacity-70"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Chorus
          </Link>

          <div className="space-y-8">
            <div>
              <h1
                className="text-2xl font-medium"
                style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
              >
                Create account
              </h1>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5"
              variants={formContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={formItem} className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="firstName"
                    className="font-mono text-sm tracking-widest uppercase"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    First name
                  </label>
                  <motion.input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    autoFocus
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full rounded px-5 py-3.5 text-base outline-none"
                    style={inputBaseStyle}
                    whileFocus={inputFocusGlow}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="lastName"
                    className="font-mono text-sm tracking-widest uppercase"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    Last name
                  </label>
                  <motion.input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full rounded px-5 py-3.5 text-base outline-none"
                    style={inputBaseStyle}
                    whileFocus={inputFocusGlow}
                  />
                </div>
              </motion.div>

              <motion.div variants={formItem} className="space-y-2">
                <label
                  htmlFor="email"
                  className="font-mono text-sm tracking-widest uppercase"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  Email
                </label>
                <motion.input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full rounded px-5 py-3.5 text-base outline-none"
                  style={inputBaseStyle}
                  whileFocus={inputFocusGlow}
                />
              </motion.div>

              <motion.div variants={formItem} className="space-y-2">
                <label
                  htmlFor="password"
                  className="font-mono text-sm tracking-widest uppercase"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <motion.input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded px-5 py-3.5 pr-16 text-base outline-none"
                    style={inputBaseStyle}
                    whileFocus={inputFocusGlow}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {passwordTooShort && (
                  <p className="text-sm text-destructive">At least 8 characters</p>
                )}
              </motion.div>

              <motion.div variants={formItem} className="space-y-2">
                <label
                  htmlFor="confirm"
                  className="font-mono text-sm tracking-widest uppercase"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  Confirm password
                </label>
                <div className="relative">
                  <motion.input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full rounded px-5 py-3.5 pr-16 text-base outline-none"
                    style={inputBaseStyle}
                    whileFocus={inputFocusGlow}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
                {confirmMismatch && (
                  <p className="text-sm text-destructive">Passwords don&apos;t match</p>
                )}
              </motion.div>

              {error && (
                <p className="rounded border border-destructive/30 bg-destructive/10 px-5 py-3.5 text-base text-destructive">
                  {error}
                </p>
              )}

              <motion.button
                variants={formItem}
                type="submit"
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded py-3.5 text-base font-medium disabled:opacity-50"
                style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
              >
                {loading ? "Creating account…" : "Create account"}
              </motion.button>
            </motion.form>

            <p className="text-center text-base" style={{ color: "var(--chorus-muted)" }}>
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="transition-opacity hover:opacity-80"
                style={{ color: "var(--chorus-gold)" }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
