import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts'
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
  KeyRoundIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import type { UserRole } from '../types/auth'
import type { User } from '../types/auth'

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'petugas', label: 'Petugas' },
  { value: 'kiosk', label: 'Kiosk' },
  { value: 'tvdisplay', label: 'TV Display' },
]

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  petugas: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  kiosk: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  tvdisplay: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
}

interface AccountFormState {
  name: string
  username: string
  password: string
  role: UserRole
  counterNumber: string
}

const EMPTY_FORM: AccountFormState = {
  name: '',
  username: '',
  password: '',
  role: 'petugas',
  counterNumber: '',
}

export default function AdminAccounts() {
  const { user: currentUser } = useAuthStore()
  const [accounts, setAccounts] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current
    try {
      const data = await getAccounts()
      if (id !== fetchIdRef.current) return
      setAccounts(data)
    } catch {
      if (id !== fetchIdRef.current) return
      toast.error('Gagal memuat daftar akun')
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  const filtered = accounts.filter((account) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      account.name.toLowerCase().includes(q) ||
      account.username.toLowerCase().includes(q) ||
      account.role.includes(q)
    )
  })

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (account: User) => {
    setEditingId(account.id)
    setForm({
      name: account.name,
      username: account.username,
      password: '',
      role: account.role,
      counterNumber: account.counterNumber != null ? String(account.counterNumber) : '',
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const counterNumber =
        form.role === 'petugas' && form.counterNumber.trim() !== ''
          ? Number(form.counterNumber)
          : null

      if (editingId) {
        await updateAccount(editingId, {
          name: form.name,
          username: form.username,
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          counterNumber,
        })
        toast.success('Akun berhasil diperbarui')
      } else {
        await createAccount({
          name: form.name,
          username: form.username,
          password: form.password,
          role: form.role,
          counterNumber,
        })
        toast.success('Akun berhasil dibuat')
      }
      setFormOpen(false)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan akun')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (account: User) => {
    setDeletingId(account.id)
    try {
      await deleteAccount(account.id)
      toast.success('Akun berhasil dihapus')
      await fetchData()
    } catch {
      toast.error('Gagal menghapus akun')
    } finally {
      setDeletingId(null)
    }
  }

  const selectClass =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Akun"
        description="Buat, ubah, dan hapus akun pengguna sistem."
        actions={
          <Button onClick={openCreate}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah Akun
          </Button>
        }
      />

      <Card>
        <CardHeader className="[.border-b]:pb-4">
          <CardTitle>Daftar Akun</CardTitle>
          <CardDescription>
            {loading ? 'Memuat…' : `${filtered.length} dari ${accounts.length} akun`}
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
              placeholder="Cari nama, username, atau role…"
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={search ? 'Tidak ada akun yang cocok' : 'Belum ada akun'}
              description={
                search
                  ? 'Coba kata kunci lain.'
                  : 'Klik "Tambah Akun" untuk membuat akun pertama.'
              }
              compact={!search}
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[1fr_9rem_6rem_10rem] gap-2 border-b border-border px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <span>Akun</span>
                  <span>Role</span>
                  <span>Loket</span>
                  <span className="text-right">Aksi</span>
                </div>
                {filtered.map((account) => (
                  <div
                    key={account.id}
                    className="grid grid-cols-[1fr_9rem_6rem_10rem] items-center gap-2 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {account.name}
                        {account.id === currentUser?.id && (
                          <Badge variant="secondary" className="ml-2">
                            Anda
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        @{account.username}
                      </div>
                    </div>
                    <Badge className={ROLE_BADGE[account.role]}>
                      {ROLE_OPTIONS.find((r) => r.value === account.role)?.label ?? account.role}
                    </Badge>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {account.counterNumber ?? '—'}
                    </span>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${account.name}`}
                        onClick={() => openEdit(account)}
                      >
                        <PencilIcon />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Hapus ${account.name}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={account.id === currentUser?.id}
                            title={
                              account.id === currentUser?.id
                                ? 'Tidak bisa menghapus akun sendiri'
                                : undefined
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hapus Akun?</DialogTitle>
                            <DialogDescription>
                              Akun <strong>@{account.username}</strong> ({account.name}) akan
                              dihapus permanen dan tidak bisa login lagi.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => void handleDelete(account)}
                              disabled={deletingId === account.id}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              {deletingId === account.id ? 'Menghapus…' : 'Ya, Hapus'}
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
            <DialogTitle>{editingId ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Perbarui informasi akun. Biarkan password kosong jika tidak diubah.'
                : 'Buat akun baru dengan role dan akses sesuai kebutuhan.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="account-name">Nama Lengkap</Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth. Budi Santoso"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-username">Username</Label>
              <Input
                id="account-username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="cth. budisubang"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-password">
                Password{' '}
                {editingId && (
                  <span className="font-normal text-muted-foreground">(opsional)</span>
                )}
              </Label>
              <Input
                id="account-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingId ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                required={!editingId}
                minLength={editingId ? undefined : 6}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="account-role">Role</Label>
                <select
                  id="account-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className={selectClass}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="account-counter">Nomor Loket</Label>
                <Input
                  id="account-counter"
                  type="number"
                  min={1}
                  value={form.counterNumber}
                  onChange={(e) => setForm((f) => ({ ...f, counterNumber: e.target.value }))}
                  placeholder={form.role === 'petugas' ? 'cth. 1' : '—'}
                  disabled={form.role !== 'petugas'}
                />
              </div>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <KeyRoundIcon className="mt-px size-3 shrink-0" aria-hidden="true" />
              Akun petugas memerlukan nomor loket untuk pemanggilan antrian.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <RefreshCwIcon className="animate-spin" data-icon="inline-start" />}
                {editingId ? 'Simpan Perubahan' : 'Buat Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
