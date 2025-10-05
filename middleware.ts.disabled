import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Skip middleware for public assets and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path === '/favicon.ico' ||
    path === '/manifest.json' ||
    path === '/sw.js' ||
    path === '/offline.html'
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Get auth tokens from cookies (Edge Runtime compatible)
  // Check for Supabase auth cookies - they typically follow the pattern sb-{project-ref}-auth-token
  const allCookies = request.cookies.getAll()
  const supabaseAuthCookie = allCookies.find(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  )
  
  // Check if we have any Supabase authentication cookie
  const hasAuthTokens = !!supabaseAuthCookie

  // Protected routes - require authentication
  if (path.startsWith('/dashboard')) {
    if (!hasAuthTokens) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Auth routes - redirect authenticated users to appropriate dashboard
  if (path.startsWith('/auth') && path !== '/auth/logout') {
    if (hasAuthTokens) {
      // Don't redirect immediately - let client-side handle role-based routing
      // This prevents infinite redirect loops
      return response
    }
  }

  // Root page - redirect authenticated users to dashboard
  if (path === '/' && hasAuthTokens) {
    // Let client-side handle the redirect to appropriate dashboard
    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html).*)',
  ],
}
