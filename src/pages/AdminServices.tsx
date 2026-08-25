import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from '../services/serviceCatalog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { PageHeader } from '../components/admin/PageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog'
import {
  ClipboardListIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import type { ServiceDefinition } from '../types/admin'

interface ServiceFormState {
  name: string
  prefix: string
  isActive: boolean
  showInKiosk: boolean
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  prefix: '',
  isActive: true,
  showInKiosk: true,
}

export default function AdminServices() {
  const [services, setServices] = useState<ServiceDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current
    try {
      const data = await getServices()
      if (id !== fetchIdRef.current) return
      setServices(data)
    } catch {
      if (id !== fetchIdRef.current) return
      toast.error('Gagal memuat daftar layanan')
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  const filtered = services.filter((service) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return service.name.toLowerCase().includes(q) || service.prefix.toLowerCase().includes(q)
  })

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (service: ServiceDefinition) => {
    setEditingId(service.id)
    setForm({
      name: service.name,
      prefix: service.prefix,
      isActive: service.isActive,
      showInKiosk: service.showInKiosk,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        prefix: form.prefix.toUpperCase(),
        isActive: form.isActive,
        showInKiosk: form.showInKiosk,
      }

      if (editingId) {
        await updateService(editingId, payload)
        toast.success('Layanan berhasil diperbarui')
      } else {
        await createService(payload)
        toast.success('Layanan berhasil dibuat')
      }
      setFormOpen(false)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan layanan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (service: ServiceDefinition) => {
    setDeletingId(service.id)
    try {
      await deleteService(service.id)
      toast.success('Layanan berhasil dihapus')
      await fetchData()
    } catch {
      toast.error('Gagal menghapus layanan')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Layanan"
        description="Buat, ubah, dan hapus jenis layanan antrian."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Tambah Layanan
          </Button>
        }
      />

      <Card>
        <CardHeader className="[.border-b]:pb-4">
          <CardTitle>Daftar Layanan</CardTitle>
          <CardDescription>
            {loading ? 'Memuat…' : `${filtered.length} dari ${services.length} layanan`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xs">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau prefix…"
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardListIcon}
              title={search ? 'Tidak ada layanan yang cocok' : 'Belum ada layanan'}
              description={
                search
                  ? 'Coba kata kunci lain.'
                  : 'Klik "Tambah Layanan" untuk membuat layanan pertama.'
              }
              compact={!search}
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[1fr_7rem_8rem_10rem_10rem] gap-2 border-b border-border px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <span>Layanan</span>
                  <span>Prefix</span>
                  <span>Status</span>
                  <span>Tampil di Kiosk</span>
                  <span className="text-right">Aksi</span>
                </div>
                {filtered.map((service) => (
                  <div
                    key={service.id}
                    className="grid grid-cols-[1fr_7rem_8rem_10rem_10rem] items-center gap-2 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="min-w-0 truncate text-sm font-medium text-foreground">
                      {service.name}
                    </div>
                    <Badge variant="secondary" className="justify-center tabular-nums">
                      {service.prefix}
                    </Badge>
                    {service.isActive ? (
                      <Badge className="w-fit bg-green-50 text-green-700 ring-1 ring-green-200">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                    {service.showInKiosk ? (
                      <Badge className="w-fit bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                        Ya
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit text-muted-foreground">
                        Tidak
                      </Badge>
                    )}
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${service.name}`}
                        onClick={() => openEdit(service)}
                      >
                        <PencilIcon />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Hapus ${service.name}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2Icon />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hapus Layanan?</DialogTitle>
                            <DialogDescription>
                              Layanan <strong>{service.name}</strong> ({service.prefix}) akan
                              dihapus permanen dari daftar layanan.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => void handleDelete(service)}
                              disabled={deletingId === service.id}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              {deletingId === service.id ? 'Menghapus…' : 'Ya, Hapus'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form tambah/edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Layanan' : 'Tambah Layanan Baru'}</DialogTitle>
            <DialogDescription>
              Prefix digunakan sebagai awalan nomor tiket (cth. G → G-001).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="service-name">Nama Layanan</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth. Pengaduan"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="service-prefix">Prefix Tiket</Label>
                <Input
                  id="service-prefix"
                  value={form.prefix}
                  onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                  placeholder="cth. G"
                  required
                  maxLength={3}
                  className="uppercase"
                />
              </div>
              <div className="space-y-3 pt-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="size-4 accent-primary"
                  />
                  Layanan aktif
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showInKiosk}
                    onChange={(e) => setForm((f) => ({ ...f, showInKiosk: e.target.checked }))}
                    className="size-4 accent-primary"
                  />
                  Tampil di kiosk
                </label>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Layanan nonaktif tidak muncul sebagai pilihan tiket baru, tetapi riwayatnya tetap
              tersimpan.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
                {editingId ? 'Simpan Perubahan' : 'Buat Layanan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
