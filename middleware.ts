import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const path = request.nextUrl.pathname
  const isLogin = path === '/auth/login'
  const isCallback = path === '/auth/callback'

  if (!user && !isLogin && !isCallback) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', `${path}${request.nextUrl.search}`)
    const redirect = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (user && isLogin) {
    const next = request.nextUrl.searchParams.get('next')
    const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/'
    const redirect = NextResponse.redirect(new URL(destination, request.url))
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
