import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { LogOut, LayoutDashboard, BookOpen, Shield, Home, Menu, X, ChevronDown } from 'lucide-react'
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
                className={clsx('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-gray-50',
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

        {/* ── Single main row ── */}
        <div className="h-14 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-gray-900 text-base sm:text-lg leading-none">
              RevWise<span className="text-blue-600">.lk</span>
            </span>
          </Link>

          {/* Language — right after logo, always visible */}
          <LangPill/>

          {/* Desktop nav links — center */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <NavLink to="/" end className={navCls}><Home size={14}/>Home</NavLink>
            <NavLink to="/subjects" className={navCls}><BookOpen size={14}/>Subjects</NavLink>
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden"/>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {role === 'admin' && <Link to="/admin" className="btn-sm btn-blue gap-1"><Shield size={13}/>Admin</Link>}
                {role === 'student' && <Link to="/dashboard" className="btn-sm btn-white gap-1"><LayoutDashboard size={13}/>Dashboard</Link>}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{(profile?.full_name||'U')[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate">{profile?.full_name?.split(' ')[0]||'User'}</span>
                </div>
                <button onClick={handleSignOut} className="btn-sm btn-ghost" title="Sign out"><LogOut size={14}/></button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-sm btn-white">Login</Link>
                <Link to="/register" className="btn-sm btn-blue">Register</Link>
              </>
            )}
          </div>

          {/* Mobile: compact auth + hamburger */}
          <div className="md:hidden flex items-center gap-1.5 shrink-0">
            {!user ? (
              <>
                <Link to="/login" className="btn-xs btn-white">Login</Link>
                <Link to="/register" className="btn-xs btn-blue">Register</Link>
              </>
            ) : (
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                {menuOpen ? <X size={19}/> : <Menu size={19}/>}
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav links row — always visible */}
        <div className="md:hidden flex items-center border-t border-gray-100 py-1">
          <NavLink to="/" end className={({ isActive }) => clsx(
            'flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1',
            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          )}><Home size={14}/>Home</NavLink>
          <NavLink to="/subjects" className={({ isActive }) => clsx(
            'flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1',
            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          )}><BookOpen size={14}/>Subjects</NavLink>
          {user && role === 'student' && (
            <NavLink to="/dashboard" className={({ isActive }) => clsx(
              'flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            )}><LayoutDashboard size={14}/>Dashboard</NavLink>
          )}
          {user && role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => clsx(
              'flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            )}><Shield size={14}/>Admin</NavLink>
          )}
        </div>
      </div>

      {/* Mobile user dropdown */}
      {menuOpen && user && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold">{(profile?.full_name||'U')[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{profile?.full_name||'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { handleSignOut(); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={15}/> Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
