import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { login as loginApi } from '../services/auth'
import { getRoleHome } from '../lib/roles'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { QServeLogo } from '../components/layout/QServeLogo'

const REMEMBER_KEY = 'qserve_remember_username'

export default function Login() {
  const [username, setUsername] = useState(
    () => localStorage.getItem(REMEMBER_KEY) ?? ''
  )
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(
    () => localStorage.getItem(REMEMBER_KEY) !== null
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await loginApi({ username, password })
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, username)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      login(res.user, res.token)
      navigate(getRoleHome(res.user.role))
    } catch {
      setError('Username atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="/assets/Banner QServe.jpeg"
          alt="Banner QServe"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex flex-col items-center text-center">
            <QServeLogo className="mb-6 h-10 w-auto" />
            <h1 className="text-4xl font-bold tracking-tight text-primary">
              Selamat Datang!
            </h1>
            <p className="mt-3 text-base text-[#4a74c0]">
              Login ke Akun Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
              <Input
                id="username"
                className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                type="text"
                placeholder="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                aria-label="Username"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <label className="mt-1 flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 cursor-pointer rounded accent-[var(--primary)]"
              />
              <span className="text-sm text-gray-700">Ingat Login Saya</span>
            </label>

            <Button
              type="submit"
              className="mt-4 h-11 w-full rounded-full font-semibold shadow-sm"
              disabled={loading}
            >
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
