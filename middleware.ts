import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check if user has auth cookie
  const authToken = request.cookies.get('sb-access-token') ||
                    request.cookies.get('sb-ohuezxanactnsamrepva-auth-token')

  const isPublic = request.nextUrl.pathname.startsWith('/login') ||
                   request.nextUrl.pathname.startsWith('/api') ||
                   request.nextUrl.pathname === '/'

  // Redirect to login if no auth token and not on public route
  if (!authToken && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if has auth token and on login page
  if (authToken && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
