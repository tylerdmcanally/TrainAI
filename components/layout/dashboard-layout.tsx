'use client'

import { MobileSidebar } from './mobile-sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <MobileSidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        {/* Mobile: Add top padding for fixed header */}
        <div className="lg:hidden pt-16">
          {children}
        </div>
        {/* Desktop: No padding needed */}
        <div className="hidden lg:block">
          {children}
        </div>
      </main>
    </div>
  )
}
