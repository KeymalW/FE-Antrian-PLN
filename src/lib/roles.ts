import type { UserRole } from '../types/auth'

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  petugas: '/petugas',
  kiosk: '/kiosk',
  tvdisplay: '/monitor',
}

export function getRoleHome(role: UserRole): string {
  return ROLE_HOME[role]
}