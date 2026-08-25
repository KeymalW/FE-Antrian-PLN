import type { UserRole } from './auth'

export interface Account {
  id: string
  username: string
  name: string
  role: UserRole
  counterNumber: number | null
}

export interface CreateAccountInput {
  name: string
  username: string
  password: string
  role: UserRole
  counterNumber: number | null
}

export interface UpdateAccountInput {
  name?: string
  username?: string
  password?: string
  role?: UserRole
  counterNumber?: number | null
}

import type { ServiceGroup } from '../lib/serviceTypes'

export interface ServiceDefinition {
  id: string
  name: string
  code: string
  prefix: string
  counterNumber: number | null
  icon: string | null
  serviceGroup: ServiceGroup
  isActive: boolean
  showInKiosk: boolean
}

export interface CreateServiceInput {
  name: string
  code: string
  prefix: string
  counterNumber: number | null
  icon: string | null
  serviceGroup: ServiceGroup
  isActive: boolean
  showInKiosk: boolean
}

export type UpdateServiceInput = Partial<CreateServiceInput>

export interface GeneralSettings {
  institutionName: string
  logoUrl: string
}

export interface TicketTextSettings {
  headerText: string
  subHeaderText: string
  footerMessage: string
}

export interface KioskTextSettings {
  welcomeText: string
  subtitleText: string
  hintText: string
  footerText: string
}
