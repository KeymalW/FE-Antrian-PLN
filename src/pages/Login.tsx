import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login as loginApi } from '../services/auth'
import { getRoleHome } from '../lib/roles'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Spinner } from '../components/ui/spinner'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      login(res.user, res.token)
      navigate(getRoleHome(res.user.role))
    } catch {
      setError('Username atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-sm px-4">
      <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl">
        <CardContent>
          <h1 className="mb-6 text-center text-2xl font-bold">
            Login Petugas
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                className="bg-muted/50"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                className="bg-muted/50"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full font-bold hover:shadow-md active:scale-[0.98]" disabled={loading}>
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
