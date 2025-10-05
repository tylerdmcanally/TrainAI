'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'

interface UseAuthGuardOptions {
  requiredRole?: 'owner' | 'employee'
  redirectTo?: string
  allowUnauthenticated?: boolean
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { requiredRole, redirectTo, allowUnauthenticated = false } = options
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) {
      setIsChecking(true)
      return
    }

    // If authentication is required but user is not logged in
    if (!allowUnauthenticated && !user) {
      setIsAuthorized(false)
      setIsChecking(false)
      router.push(redirectTo || '/auth/login')
      return
    }

    // If user is logged in but role is required
    if (user && requiredRole && profile?.role !== requiredRole) {
      setIsAuthorized(false)
      setIsChecking(false)
      
      // Redirect to appropriate dashboard based on user's actual role
      if (profile?.role === 'owner') {
        router.push('/dashboard/owner')
      } else if (profile?.role === 'employee') {
        router.push('/dashboard/employee')
      } else {
        router.push('/dashboard')
      }
      return
    }

    // User is authorized
    setIsAuthorized(true)
    setIsChecking(false)
  }, [user, profile, loading, requiredRole, redirectTo, allowUnauthenticated, router])

  return {
    user,
    profile,
    loading: isChecking,
    isAuthorized,
    isOwner: profile?.role === 'owner',
    isEmployee: profile?.role === 'employee'
  }
}

// Higher-order component for easy usage
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: UseAuthGuardOptions = {}
) {
  const WrappedComponent = (props: P) => {
    const { isAuthorized, loading } = useAuthGuard(options)
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }
    
    if (!isAuthorized) {
      return null // Will redirect automatically
    }
    
    return <Component {...props} />
  }

  WrappedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
