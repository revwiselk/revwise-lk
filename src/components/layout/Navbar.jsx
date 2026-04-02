import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { LogOut, LayoutDashboard, BookOpen, Shield, Home, GraduationCap, FileText, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const LANGS = [
  { key: 'english', short: 'EN', native: 'English' },
  { key: 'sinhala', short: 'සි',  native: 'සිංහල'  },
  { key: 'tamil',   short: 'த',   native: 'தமிழ்'  },
]

function LangPill() {
  const { language, setLanguage } = useLangStore()
  const [open, setOpen] = useState(false)
  const cur = LANGS.find(l => l.key === language) || LANGS[0]
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all text-xs font-semibold text-gray-700">
        <span>{cur.native}</span>
        <ChevronDown size={11} className={clsx('transition-transform', open && 'rotate-180')}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[110px]">
            {LANGS.map(l => (
              <button key={l.key} onClick={() => { setLanguage(l.key); setOpen(false) }}
                className={clsx('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50',
                  language === l.key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700')}>
                <span className="text-base leading-none w-5 text-center">{l.short}</span>
                <span>{l.native}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, role, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const handleSignOut = async () => { await signOut(); navigate('/') }

  const navCls = ({ isActive }) => clsx(
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  )

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-gray-900 text-base hidden sm:block">RevWise<span className="text-blue-600">.lk</span></span>
          </Link>

          <LangPill/>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            <NavLink to="/" end className={navCls}><Home size={14}/>Home</NavLink>
            <NavLink to="/subjects" className={navCls}><BookOpen size={14}/>Subjects</NavLink>
            <NavLink to="/al" className={navCls}><GraduationCap size={14}/>A/L</NavLink>
            <NavLink to="/papers" className={navCls}><FileText size={14}/>Papers</NavLink>
          </nav>

          <div className="flex-1"/>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {role === 'admin' && (
                  <button onClick={() => navigate('/admin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50">
                    <Shield size={13}/> Admin
                  </button>
                )}
                <button onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">
                  <LayoutDashboard size={13}/> Dashboard
                </button>
                <button onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600">
                  <LogOut size={13}/> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Login</Link>
                <Link to="/register" className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Register</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1" onClick={() => setMenuOpen(false)}>
            <NavLink to="/" end className={navCls}><Home size={14}/>Home</NavLink>
            <NavLink to="/subjects" className={navCls}><BookOpen size={14}/>Subjects</NavLink>
            <NavLink to="/al" className={navCls}><GraduationCap size={14}/>A/L</NavLink>
            <NavLink to="/papers" className={navCls}><FileText size={14}/>Papers</NavLink>
            {user ? (
              <>
                {role === 'admin' && <NavLink to="/admin" className={navCls}><Shield size={14}/>Admin</NavLink>}
                <NavLink to="/dashboard" className={navCls}><LayoutDashboard size={14}/>Dashboard</NavLink>
                <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full">
                  <LogOut size={14}/>Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navCls}>Login</NavLink>
                <NavLink to="/register" className={navCls}>Register</NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
