export interface BrandingConfig {
  app: {
    name: string
    tagline: string
  }
  logos: {
    login: string
    admin: string
  }
}

export const BRANDING: BrandingConfig = {
  app: {
    name: 'QServe',
    tagline: 'Queue Management System',
  },
  logos: {
    login: '/assets/Logo QServe.png',
    admin: '/assets/logo-pln.png',
  },
}
