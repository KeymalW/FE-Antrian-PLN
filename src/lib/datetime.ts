function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateParts(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

function toTimeParts(date: Date): string {
  return `${pad(date.getHours())}.${pad(date.getMinutes())}`
}

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  // String tanggal-saja dianggap waktu lokal (bukan UTC) agar tidak bergeser hari.
  const normalized =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const date = normalized instanceof Date ? normalized : new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateId(value: string | Date | null | undefined): string {
  const date = parse(value)
  return date ? toDateParts(date) : '-'
}

export function formatTimeId(value: string | Date | null | undefined): string {
  const date = parse(value)
  return date ? toTimeParts(date) : '-'
}

export function formatDateTimeId(value: string | Date | null | undefined): string {
  const date = parse(value)
  return date ? `${toDateParts(date)} ${toTimeParts(date)}` : '-'
}

/** Rentang Senin–Jumat minggu berjalan, cth. "17/08/2026 – 21/08/2026". */
export function getWeekRangeLabel(now: Date = new Date()): string {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  const day = monday.getDay()
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day))

  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)

  return `${toDateParts(monday)} – ${toDateParts(friday)}`
}
