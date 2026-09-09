import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { PageHeader } from '../components/admin/PageHeader'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Building2Icon, RefreshCwIcon } from 'lucide-react'
import { Button } from '../components/ui/button'

interface TenantRow {
  id: number
  slug: string
  name: string
  created_at: string
  users_count: number
  services_count: number
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_API_URL.endsWith('/tenants')
        ? import.meta.env.VITE_API_URL
        : `${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/api/tenants`
      const r2 = await fetch(url)
      const j = await r2.json()
      setTenants(j.data ?? [])
    } catch {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/tenants`)
        const j = await r.json()
        setTenants(j.data ?? [])
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void fetchTenants(), 0)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Daftar Perusahaan"
        description="Daftar perusahaan terdaftar di QServe.com — tiap perusahaan terisolasi"
        actions={
          <Button variant="outline" onClick={() => void fetchTenants()} disabled={loading}>
            <RefreshCwIcon className={loading ? 'animate-spin' : ''} data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2Icon className="size-4 text-muted-foreground" />
            Tenant Terdaftar ({tenants.length})
          </CardTitle>
          <CardDescription>Data diambil dari GET /api/tenants — limit via MAX_TENANTS env (0=unlimited)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Belum ada tenant</div>
          ) : (
            <div className="overflow-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[3rem_1fr_12rem_6rem_6rem] gap-2 border-b border-border px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>ID</span>
                  <span>Nama Perusahaan</span>
                  <span>Slug</span>
                  <span>Users</span>
                  <span>Layanan</span>
                </div>
                {tenants.map((t) => (
                  <div key={t.id} className="grid grid-cols-[3rem_1fr_12rem_6rem_6rem] items-center gap-2 border-b border-border/70 px-3 py-3 last:border-0">
                    <span className="text-sm font-medium">{t.id}</span>
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    <Badge variant="secondary" className="w-fit font-mono text-xs">{t.slug}</Badge>
                    <span className="text-sm tabular-nums">{t.users_count}</span>
                    <span className="text-sm tabular-nums">{t.services_count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">
        Tiap perusahaan memiliki layanan, antrian, dan pengaturan terpisah.
      </p>
    </div>
  )
}
