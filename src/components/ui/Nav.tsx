'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navLinks = [
  { href: '/broker/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/broker/clients/new', label: 'Add Client', icon: '+' },
  { href: '/broker/archived', label: 'Archived', icon: '○' },
]

export default function Nav({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = email?.slice(0, 2).toUpperCase() ?? 'BR'

  return (
    <aside className="w-60 min-h-screen bg-[#0f172a] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">WireChase</h1>
            <p className="text-white/40 text-xs mt-0.5">Broker Portal</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Menu</p>
        {navLinks.map(link => {
          const active = pathname === link.href || (link.href !== '/broker/dashboard' && pathname.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base w-4 text-center">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 text-xs font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs truncate">{email}</p>
          </div>
          <button onClick={handleLogout} title="Sign out" className="text-white/30 hover:text-red-400 transition text-sm">
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}
