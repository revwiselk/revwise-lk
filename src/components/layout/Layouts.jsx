import { useState } from 'react'
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, BookOpen, Users, MessageSquare,
  LogOut, Menu, X, ChevronLeft, Shield, BarChart2
} from 'lucide-react'
import clsx from 'clsx'

const ADMIN_NAV = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/admin/subjects',  icon: BookOpen,        label: 'Curriculum'  },
  { to: '/admin/students',  icon: Users,           label: 'Students'    },
  { to: '/admin/feedback',  icon: MessageSquare,   label: 'Feedback'    },
  { to: '/admin/analytics', icon: BarChart2,        label: 'Analytics'  },
]

function AdminSidebar({ collapsed, onClose }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-gray-100', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">Q</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">RevWise.lk</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Shield size={9}/> Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {ADMIN_NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact} onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}>
            <Icon size={18} className="shrink-0"/>
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Profile + sign out */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <div className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{(profile?.full_name || 'A')[0].toUpperCase()}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{profile?.full_name || 'Admin'}</p>
              <p className="text-xs text-blue-600">{profile?.email || ''}</p>
            </div>
          )}
        </div>
        <button onClick={handleSignOut}
          className={clsx('flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all', collapsed && 'justify-center')}>
          <LogOut size={16}/>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1"><Outlet/></main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <p className="text-gray-400 text-xs">© {new Date().getFullYear()} RevWise.lk — Sri Lanka Government Syllabus · Grade 6–11</p>
      </footer>
    </div>
  )
}

export function AdminLayout() {
  const { user, role } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace/>
  if (role !== 'admin') return <Navigate to="/" replace/>

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col shrink-0 transition-all duration-200 relative',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <AdminSidebar collapsed={collapsed}/>
        </div>
        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-700 z-10">
          <ChevronLeft size={12} className={clsx('transition-transform', collapsed && 'rotate-180')}/>
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)}/>
          <aside className="relative w-64 h-full shadow-xl">
            <AdminSidebar collapsed={false} onClose={() => setMobileOpen(false)}/>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <Menu size={20}/>
          </button>
          <span className="font-bold text-gray-900">Admin Panel</span>
        </header>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

export function StudentLayout() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace/>
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8"><Outlet/></main>
    </div>
  )
}

export function AuthGuard() {
  const { user, role } = useAuthStore()
  if (user && role === 'admin') return <Navigate to="/admin" replace/>
  if (user) return <Navigate to="/dashboard" replace/>
  return <Outlet/>
}
