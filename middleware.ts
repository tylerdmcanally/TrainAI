import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for public assets and API routes
  const path = request.nextUrl.pathname
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication and role-based routing
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get user's role from database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // No profile found - redirect to login
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const isOwner = profile.role === 'owner'
    const path = request.nextUrl.pathname

    // Role-based routing
    if (isOwner) {
      // Owner trying to access employee dashboard (not /dashboard/employees!)
      if (path === '/dashboard/employee' || path.startsWith('/dashboard/employee/')) {
        return NextResponse.redirect(new URL('/dashboard/owner', request.url))
      }
      // Owner accessing generic /dashboard
      if (path === '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard/owner', request.url))
      }
    } else {
      // Employee trying to access owner routes
      if (path.startsWith('/dashboard/owner') ||
          path.startsWith('/dashboard/training/create') ||
          path.startsWith('/dashboard/employees')) {
        return NextResponse.redirect(new URL('/dashboard/employee', request.url))
      }
      // Employee accessing generic /dashboard
      if (path === '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard/employee', request.url))
      }
    }
  }

  // Auth routes - only redirect if user has a complete profile
  if (request.nextUrl.pathname.startsWith('/auth')) {
    if (user) {
      // Check if user has a complete profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // Only redirect if profile exists AND no error
      if (profile && !error) {
        const redirectUrl = profile.role === 'owner'
          ? '/dashboard/owner'
          : '/dashboard/employee'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }

      // If no profile or error, let them stay on auth page to complete signup
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
  ],
}
