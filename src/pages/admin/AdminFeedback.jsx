import { useEffect, useState } from 'react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { EmptyState } from '@/components/ui'
import { MessageSquare, CheckCircle2, Clock, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TYPES = ['all', 'quiz', 'general', 'bug', 'suggestion']

export default function AdminFeedback() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')       // all | unresolved | resolved
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    const { data } = await supabaseAdmin
      .from('feedback')
      .select('*, units(title)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const markResolved = async (id, resolved) => {
    const { error } = await supabaseAdmin
      .from('feedback')
      .update({ is_resolved: resolved })
      .eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(resolved ? 'Marked as resolved' : 'Marked as unresolved')
    setItems(prev => prev.map(f => f.id === id ? { ...f, is_resolved: resolved } : f))
  }

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return
    await supabaseAdmin.from('feedback').delete().eq('id', id)
    toast.success('Deleted')
    setItems(prev => prev.filter(f => f.id !== id))
  }

  const filtered = items
    .filter(f => filter === 'all' ? true : filter === 'resolved' ? f.is_resolved : !f.is_resolved)
    .filter(f => typeFilter === 'all' ? true : f.feedback_type === typeFilter)

  const unresolved = items.filter(f => !f.is_resolved).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900">Feedback</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unresolved} unresolved · {items.length} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { v:'all',        label:`All (${items.length})` },
            { v:'unresolved', label:`Unresolved (${unresolved})` },
            { v:'resolved',   label:'Resolved' },
          ].map(opt => (
            <button key={opt.v} onClick={() => setFilter(opt.v)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === opt.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_,i) => <div key={i} className="skeleton h-24"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback" desc="No feedback matching your filters."/>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => (
            <div key={f.id} className={clsx('card p-5 border-l-4 animate-fade-up',
              f.is_resolved ? 'border-green-400 opacity-70' : 'border-blue-500')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={clsx('bdg', f.feedback_type === 'bug' ? 'bdg-red' : f.feedback_type === 'suggestion' ? 'bdg-cyan' : 'bdg-blue')}>
                      {f.feedback_type}
                    </span>
                    {f.units?.title && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        📝 {f.units.title}
                      </span>
                    )}
                    {f.is_resolved && (
                      <span className="bdg-green">✓ Resolved</span>
                    )}
                    {/* Star rating */}
                    {f.rating > 0 && (
                      <span className="text-amber-400 text-xs">{'★'.repeat(f.rating)}{'☆'.repeat(5-f.rating)}</span>
                    )}
                  </div>

                  {/* Body */}
                  <p className="text-gray-800 text-sm leading-relaxed mb-3">{f.body}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11}/>
                      {new Date(f.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </span>
                    {f.name && <span>From: <strong className="text-gray-600">{f.name}</strong></span>}
                    {f.email && <span>· {f.email}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => markResolved(f.id, !f.is_resolved)}
                    className={clsx('btn-sm gap-1.5 text-xs',
                      f.is_resolved ? 'btn-white' : 'btn-green')}>
                    <CheckCircle2 size={12}/>
                    {f.is_resolved ? 'Unresolve' : 'Resolve'}
                  </button>
                  <button onClick={() => deleteFeedback(f.id)}
                    className="btn-sm btn-white text-xs text-red-500 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
