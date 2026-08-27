import { useCallback, useEffect, useRef, useState, createElement } from 'react'
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
import { CURATED_KIOSK_ICONS, getKioskIconComponent } from '../lib/kioskIcons'
import type { ServiceDefinition } from '../types/admin'

interface ServiceFormState {
  name: string
  code: string
  prefix: string
  counterNumber: string
  icon: string
  isActive: boolean
  showInKiosk: boolean
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  code: '',
  prefix: '',
  counterNumber: '',
  icon: '',
  isActive: true,
  showInKiosk: true,
}

function slugifyCode(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || ''
  )
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
  const codeAutoRef = useRef(true)

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
    codeAutoRef.current = true
    setFormOpen(true)
  }

  const openEdit = (service: ServiceDefinition) => {
    setEditingId(service.id)
    codeAutoRef.current = false
    setForm({
      name: service.name,
      code: service.code,
      prefix: service.prefix,
      counterNumber: service.counterNumber != null ? String(service.counterNumber) : '',
      icon: service.icon ?? '',
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
        code: form.code.toLowerCase(),
        prefix: form.prefix.toUpperCase(),
        counterNumber: form.counterNumber.trim() !== '' ? Number(form.counterNumber) : null,
        icon: form.icon || null,
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
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => ({
                    ...f,
                    name,
                    code: codeAutoRef.current ? slugifyCode(name) : f.code,
                  }))
                }}
                placeholder="cth. Pengaduan"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="service-code">Kode Layanan</Label>
                <Input
                  id="service-code"
                value={form.code}
                onChange={(e) => {
                  codeAutoRef.current = false
                  setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))
                }}
                  placeholder="cth. pengaduan"
                  required
                  maxLength={50}
                  pattern="[a-z0-9_]+"
                  title="Huruf kecil, angka, dan underscore"
                  className="lowercase"
                />
              </div>
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
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-counter">Nomor Loket (TV)</Label>
              <Input
                id="service-counter"
                type="number"
                min={1}
                max={99}
                value={form.counterNumber}
                onChange={(e) => setForm((f) => ({ ...f, counterNumber: e.target.value }))}
                placeholder="cth. 1"
              />
            </div>
            <p className="-mt-0.5 text-[11px] text-muted-foreground">
              Nomor loket mengaitkan layanan ke kartu TV display; kosongkan bila tidak tampil di TV.
            </p>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="service-icon">Ikon Kiosk</Label>
                <select
                  id="service-icon"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {CURATED_KIOSK_ICONS.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex h-8 w-12 items-center justify-center rounded-lg border border-input text-primary">
                {createElement(getKioskIconComponent(form.icon), {
                  className: 'size-4',
                  'aria-hidden': true,
                })}
              </div>
            </div>
            <div className="space-y-3 pt-1">
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
