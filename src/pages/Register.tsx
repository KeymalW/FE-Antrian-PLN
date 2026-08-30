import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, UserRound } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { register as registerApi } from '../services/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { QServeLogo } from '../components/layout/QServeLogo'

export default function Register() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      const res = await registerApi({
        name: name.trim(),
        username: username.trim(),
        password,
        password_confirmation: confirm,
      })
      login(res.user, res.token)
      navigate('/admin')
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        'Gagal mendaftar. Coba lagi.'
      if (msg.toLowerCase().includes('admin sudah ada')) {
        setError('Admin sudah ada. Silakan login atau hubungi admin untuk membuat akun baru.')
      } else {
        setError(msg)
      }
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
          <div className="mb-8 flex flex-col items-center text-center">
            <QServeLogo className="mb-6 h-10 w-auto" />
            <h1 className="text-3xl font-bold tracking-tight text-primary">Daftar Admin</h1>
            <p className="mt-2 text-sm text-[#4a74c0]">
              Buat akun admin pertama — setelah itu kelola layanan & akun lain dari dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
              <Input
                id="name"
                className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                type="text"
                placeholder="Nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
                aria-label="Nama lengkap"
              />
            </div>

            <div>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
                <Input
                  id="username"
                  className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  autoComplete="username"
                  aria-label="Username"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Huruf/angka, dash/underscore, min 3 karakter</p>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                type="password"
                placeholder="Password (min 6 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                aria-label="Password"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-gray-400" />
              <Input
                id="confirm"
                className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                type="password"
                placeholder="Konfirmasi password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                aria-label="Konfirmasi password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 h-11 w-full rounded-full font-semibold shadow-sm" disabled={loading}>
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? 'Mendaftar...' : 'Daftar sebagai Admin'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            Halaman ini hanya aktif jika belum ada admin. Setelah admin pertama dibuat, pendaftaran akan terkunci.
          </p>
        </div>
      </div>
    </div>
  )
}
