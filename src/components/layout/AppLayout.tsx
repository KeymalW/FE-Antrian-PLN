import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { PageTransition } from './PageTransition'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
