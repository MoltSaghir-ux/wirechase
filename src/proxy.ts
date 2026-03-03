import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Not logged in → send to login (except public routes)
  if (!user && path.startsWith('/broker')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in user trying to access /login → go to dashboard (or onboard)
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/broker/dashboard', request.url))
  }

  // For broker routes: check onboarding completion (has brokerage_id)
  if (user && path.startsWith('/broker') && path !== '/onboard') {
    const { data: broker } = await supabase
      .from('brokers')
      .select('brokerage_id')
      .eq('id', user.id)
      .single()

    // No broker record OR broker has no brokerage → force onboard
    if (!broker || !broker.brokerage_id) {
      return NextResponse.redirect(new URL('/onboard', request.url))
    }
  }

  // Already onboarded user hitting /onboard → go to dashboard
  if (user && path === '/onboard') {
    const { data: broker } = await supabase
      .from('brokers')
      .select('brokerage_id')
      .eq('id', user.id)
      .single()

    if (broker?.brokerage_id) {
      return NextResponse.redirect(new URL('/broker/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/broker/:path*', '/login', '/onboard', '/join/:path*'],
}
