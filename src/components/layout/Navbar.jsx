import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Menu, X, LogOut, LayoutDashboard, BookOpen, Shield } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { user, role, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const navCls = ({ isActive }) => clsx(
    'px-3 py-2 rounded-lg text-sm font-medium transition-all',
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  )

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-gray-900 text-lg hidden sm:block">
            RevWise<span className="text-blue-600">.lk</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navCls}>Home</NavLink>
          <NavLink to="/subjects" className={navCls}>Subjects</NavLink>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                {role === 'admin' && (
                  <Link to="/admin" className="btn-sm btn-blue gap-1.5">
                    <Shield size={13}/> Admin
                  </Link>
                )}
                {role === 'student' && (
                  <Link to="/dashboard" className="btn-sm btn-white gap-1.5">
                    <LayoutDashboard size={13}/> Dashboard
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{(profile?.full_name || 'U')[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                </div>
                <button onClick={handleSignOut} className="btn-sm btn-ghost" title="Sign out">
                  <LogOut size={15}/>
                </button>
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login" className="btn-sm btn-white">Login</Link>
              <Link to="/register" className="btn-sm btn-blue">Register</Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
          {[{ to:'/', label:'Home', end:true },{ to:'/subjects', label:'Subjects' }].map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={navCls}>
              {label}
            </NavLink>
          ))}
          {user ? (
            <div className="pt-2 space-y-1 border-t border-gray-100">
              {role === 'admin' && <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"><Shield size={15}/> Admin Panel</Link>}
              {role === 'student' && <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"><LayoutDashboard size={15}/> Dashboard</Link>}
              <button onClick={() => { handleSignOut(); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50">
                <LogOut size={15}/> Sign Out
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-md btn-white flex-1 justify-center">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-md btn-blue flex-1 justify-center">Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
