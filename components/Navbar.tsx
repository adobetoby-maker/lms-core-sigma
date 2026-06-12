import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, ShieldCheck, Users } from 'lucide-react'
import SignOutButton from './SignOutButton'
import MobileNav from './MobileNav'
import brand from '@/lib/brand'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single()

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || user.email
    : user.email

  const hasSvgLogo = brand.logoPath.endsWith('.svg') || brand.logoPath.startsWith('http')
  const lightLogoPath = brand.logoPath.replace('.svg', '-light.svg')

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md relative"
      style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
    >
      <style>{`
        .nav-link { color: var(--text2); }
        .nav-link:hover { color: var(--text); background: var(--bg3); }
        /* Logo variant swap — CSS only, works before JS hydrates */
        [data-mode="light"]  .logo-dark-only  { display: none; }
        [data-mode="dark"]   .logo-light-only { display: none; }
        [data-mode="vericore"] .logo-light-only { display: none; }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href={profile?.is_admin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 group">
            {hasSvgLogo ? (
              <>
                {/* White-text logo — shown on dark backgrounds */}
                <Image
                  src={brand.logoPath}
                  alt={brand.logoAlt}
                  width={130}
                  height={36}
                  className="logo-dark-only transition-opacity group-hover:opacity-80"
                  style={{ objectFit: 'contain', objectPosition: 'left' }}
                  priority
                />
                {/* Dark-text logo — shown on light backgrounds */}
                <Image
                  src={lightLogoPath}
                  alt={brand.logoAlt}
                  width={130}
                  height={36}
                  className="logo-light-only transition-opacity group-hover:opacity-80"
                  style={{ objectFit: 'contain', objectPosition: 'left' }}
                  priority
                />
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity group-hover:opacity-80"
                     style={{ background: 'var(--accent)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent-fg)' }}>{brand.name[0]}</span>
                </div>
                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>{brand.name}</span>
              </>
            )}
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {profile?.is_admin ? (
              <>
                {[
                  { href: '/admin',            label: 'Admin',       Icon: Settings },
                  { href: '/admin/courses',     label: 'Courses',     Icon: null },
                  { href: '/admin/completions', label: 'Completions', Icon: null },
                  { href: '/admin/learners',    label: 'Learners',    Icon: Users },
                  { href: '/admin/compliance',  label: 'Compliance',  Icon: ShieldCheck },
                ].map(({ href, label, Icon }) => (
                  <Link key={href} href={href}
                    className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors">
                    {Icon && <Icon className="w-4 h-4" />}
                    {label}
                  </Link>
                ))}
              </>
            ) : (
              <Link href="/dashboard" className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none" style={{ color: 'var(--text)' }}>{displayName}</p>
              {profile?.is_admin && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>Administrator</p>
              )}
            </div>
            <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--border)' }} />
            <SignOutButton />
            <MobileNav isAdmin={!!profile?.is_admin} />
          </div>
        </div>
      </div>
    </header>
  )
}
