import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow all API routes and static assets
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for any Supabase auth cookies
  const cookies = request.cookies
  const hasAuthCookie = cookies.getAll().some(cookie =>
    cookie.name.includes('sb-') && cookie.name.includes('auth-token')
  )

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isHomePage = request.nextUrl.pathname === '/'

  // Allow home and login pages without auth
  if (isHomePage || isLoginPage) {
    // If authenticated and trying to access login, redirect to dashboard
    if (hasAuthCookie && isLoginPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Protect all other routes
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
