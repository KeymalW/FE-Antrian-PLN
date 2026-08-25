import type { LucideIcon } from 'lucide-react'
import {
  MegaphoneIcon,
  PlugZapIcon,
  WrenchIcon,
  ZapIcon,
  FileTextIcon,
  CreditCardIcon,
  PrinterIcon,
  MonitorIcon,
  PhoneIcon,
  Building2Icon,
  WifiIcon,
  HelpCircleIcon,
  TicketIcon,
  ShieldAlertIcon,
  ClipboardCheckIcon,
  IdCardIcon,
} from 'lucide-react'

/** Ikon terkurasi yang bisa dipilih admin untuk kartu layanan di Kiosk. */
export const CURATED_KIOSK_ICONS: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'megaphone', label: 'Pengaduan / Pengumuman' },
  { name: 'plug-zap', label: 'Daya Baru / Migrasi' },
  { name: 'wrench', label: 'Servis Teknis' },
  { name: 'zap', label: 'Listrik / Daya' },
  { name: 'file-text', label: 'Dokumen / Formulir' },
  { name: 'credit-card', label: 'Pembayaran / Tagihan' },
  { name: 'printer', label: 'Cetak / Perangkat' },
  { name: 'monitor', label: 'Layanan Digital' },
  { name: 'phone', label: 'Bantuan via Telepon' },
  { name: 'building-2', label: 'Kantor / Instansi' },
  { name: 'wifi', label: 'Internet / Jaringan' },
  { name: 'help-circle', label: 'Informasi Umum' },
  { name: 'ticket', label: 'Tiket / Antrian' },
  { name: 'shield-alert', label: 'Keamanan / Penertiban' },
  { name: 'clipboard-check', label: 'Verifikasi / Pemeriksaan' },
  { name: 'id-card', label: 'Identitas / Registrasi' },
]

const COMPONENTS: Record<string, LucideIcon> = {
  megaphone: MegaphoneIcon,
  'plug-zap': PlugZapIcon,
  wrench: WrenchIcon,
  zap: ZapIcon,
  'file-text': FileTextIcon,
  'credit-card': CreditCardIcon,
  printer: PrinterIcon,
  monitor: MonitorIcon,
  phone: PhoneIcon,
  'building-2': Building2Icon,
  wifi: WifiIcon,
  'help-circle': HelpCircleIcon,
  ticket: TicketIcon,
  'shield-alert': ShieldAlertIcon,
  'clipboard-check': ClipboardCheckIcon,
  'id-card': IdCardIcon,
}

export function getKioskIconComponent(name: string | null | undefined): LucideIcon {
  return (name && COMPONENTS[name]) || TicketIcon
}
