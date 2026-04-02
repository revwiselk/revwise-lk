import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLangStore } from '@/store/langStore'
import { ArrowLeft, ChevronRight, BookOpen, GraduationCap } from 'lucide-react'
import clsx from 'clsx'

export default function ALStreamPage() {
  const { streamId } = useParams()
  const navigate = useNavigate()
  const { language } = useLangStore()
  const [stream, setStream] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('al_streams').select('*').eq('id',streamId).single(),
      supabase.from('al_stream_subjects')
        .select('is_core, al_subjects(*, al_chapters(id))')
        .eq('stream_id',streamId).order('order_index'),
    ]).then(([sRes, ssRes]) => {
      if (sRes.data) setStream(sRes.data)
      setSubjects((ssRes.data||[]).map(ss=>({...ss.al_subjects, is_core:ss.is_core})).filter(Boolean))
      setLoading(false)
    })
  }, [streamId])

  const getName = (s, field='name') => {
    if (!s) return ''
    if (language==='sinhala' && s[field+'_si']) return s[field+'_si']
    if (language==='tamil'   && s[field+'_ta']) return s[field+'_ta']
    return s[field] || ''
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
  if (!stream) return <div className="text-center py-20 text-gray-500">Stream not found.</div>

  const core = subjects.filter(s => s.is_core)
  const optional = subjects.filter(s => !s.is_core)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => navigate('/al')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowLeft size={14}/> A/L
      </button>

      {/* Stream header */}
      <div className="card p-6 mb-6" style={{ borderLeft: `4px solid ${stream.color_hex}` }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: stream.color_hex+'22' }}>
            <GraduationCap size={22} style={{ color: stream.color_hex }}/>
          </div>
          <div>
            <h1 className="font-bold text-2xl text-gray-900">{getName(stream)}</h1>
            {stream.description && <p className="text-gray-500 text-sm mt-1">{stream.description}</p>}
          </div>
        </div>
      </div>

      {/* Core Subjects */}
      {core.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">⭐</span>
            Core Subjects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {core.map(sub => (
              <button key={sub.id} onClick={() => navigate(`/al/subject/${sub.id}`)}
                className="card p-4 text-left hover:shadow-md border-2 border-transparent hover:border-opacity-40 transition-all group"
                style={{ borderColor: sub.color_hex+'44' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sub.color_hex+'22' }}>
                    <BookOpen size={16} style={{ color: sub.color_hex }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{getName(sub)}</p>
                    {sub.name_si && language !== 'sinhala' && <p className="text-xs text-gray-400">{sub.name_si}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{sub.al_chapters?.length||0} chapters</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-600 shrink-0 transition-colors"/>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional Subjects */}
      {optional.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">○</span>
            Optional Subjects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {optional.map(sub => (
              <button key={sub.id} onClick={() => navigate(`/al/subject/${sub.id}`)}
                className="card p-4 text-left hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100">
                    <BookOpen size={16} className="text-gray-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{getName(sub)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub.al_chapters?.length||0} chapters</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-600 shrink-0 transition-colors"/>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
