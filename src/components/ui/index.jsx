import clsx from 'clsx'

export function Btn({ children, variant = 'blue', size = 'md', className, loading, ...p }) {
  const v = { blue:'btn-blue', white:'btn-white', outline:'btn-outline', ghost:'btn-ghost', red:'btn-red', green:'btn-green' }
  const s = { xs:'btn-xs', sm:'btn-sm', md:'btn-md', lg:'btn-lg' }
  return (
    <button disabled={loading || p.disabled} className={clsx(v[variant], s[size], className)} {...p}>
      {loading && <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, icon: Icon, type = 'text', className, ...p }) {
  return (
    <div className="w-full">
      {label && <label className="lbl">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}
        <input type={type} className={clsx('inp', Icon && 'pl-9', error && 'inp-error', className)} {...p}/>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function Sel({ label, error, children, className, ...p }) {
  return (
    <div className="w-full">
      {label && <label className="lbl">{label}</label>}
      <select className={clsx('inp', error && 'inp-error', className)} {...p}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Txt({ label, error, hint, className, ...p }) {
  return (
    <div className="w-full">
      {label && <label className="lbl">{label}</label>}
      <textarea className={clsx('inp resize-y min-h-[90px]', error && 'inp-error', className)} {...p}/>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const w = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full animate-scale-in max-h-[92vh] flex flex-col', w[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto scroll-thin flex-1">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const c = { blue:'bdg-blue', green:'bdg-green', amber:'bdg-amber', red:'bdg-red', gray:'bdg-gray', cyan:'bdg-cyan' }
  return <span className={c[color] || 'bdg-gray'}>{children}</span>
}

export function Skeleton({ className }) { return <div className={clsx('skeleton', className)}/> }

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><Icon size={24} className="text-gray-400"/></div>}
      <p className="font-semibold text-gray-700 mb-1">{title}</p>
      {desc && <p className="text-sm text-gray-400 max-w-xs">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgBar({ value, max, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={clsx('prog-track', className)}>
      <div className="prog-fill" style={{ width: `${pct}%` }}/>
    </div>
  )
}

export function PageHead({ title, sub, action, crumb }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        {crumb && <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{crumb}</p>}
        <h1 className="font-bold text-2xl sm:text-3xl text-gray-900">{title}</h1>
        {sub && <p className="text-gray-500 mt-1 text-sm">{sub}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  )
}
