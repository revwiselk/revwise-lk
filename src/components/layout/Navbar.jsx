import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { LogOut, LayoutDashboard, BookOpen, Shield, Home, Menu, X } from 'lucide-react'
import LangSwitcher from '@/components/ui/LangSwitcher'
import clsx from 'clsx'

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

      {/* ── Main row ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">

          {/* Logo — always shows name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-gray-900 text-lg leading-none">
              RevWise<span className="text-blue-600">.lk</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <NavLink to="/" end className={navCls}><Home size={15}/>Home</NavLink>
            <NavLink to="/subjects" className={navCls}><BookOpen size={15}/>Subjects</NavLink>
          </nav>

          {/* Language switcher — desktop */}
          <LangSwitcher/>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {role === 'admin' && (
                  <Link to="/admin" className="btn-sm btn-blue gap-1.5"><Shield size={13}/>Admin</Link>
                )}
                {role === 'student' && (
                  <Link to="/dashboard" className="btn-sm btn-white gap-1.5"><LayoutDashboard size={13}/>Dashboard</Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{(profile?.full_name||'U')[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{profile?.full_name?.split(' ')[0]||'User'}</span>
                </div>
                <button onClick={handleSignOut} className="btn-sm btn-ghost" title="Sign out">
                  <LogOut size={15}/>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-sm btn-white">Login</Link>
                <Link to="/register" className="btn-sm btn-blue">Register</Link>
              </>
            )}
          </div>

          {/* Mobile: auth buttons or menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            {!user && (
              <>
                <Link to="/login" className="btn-xs btn-white">Login</Link>
                <Link to="/register" className="btn-xs btn-blue">Register</Link>
              </>
            )}
            {user && (
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                {menuOpen ? <X size={20}/> : <Menu size={20}/>}
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile: nav links always visible below header ── */}
        <div className="md:hidden flex items-center gap-1 pb-2 border-t border-gray-100 pt-2">
          <LangSwitcher/>
          <NavLink to="/" end
            className={({ isActive }) => clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            )}>
            <Home size={16}/>Home
          </NavLink>
          <NavLink to="/subjects"
            className={({ isActive }) => clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            )}>
            <BookOpen size={16}/>Subjects
          </NavLink>
          {user && role === 'student' && (
            <NavLink to="/dashboard"
              className={({ isActive }) => clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              )}>
              <LayoutDashboard size={16}/>Dashboard
            </NavLink>
          )}
          {user && role === 'admin' && (
            <NavLink to="/admin"
              className={({ isActive }) => clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              )}>
              <Shield size={16}/>Admin
            </NavLink>
          )}
        </div>
      </div>

      {/* Mobile user menu (only when logged in + menu open) */}
      {menuOpen && user && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 animate-fade-in">
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
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
