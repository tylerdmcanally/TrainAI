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
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value
  const hasAuthTokens = !!(accessToken || refreshToken)

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
