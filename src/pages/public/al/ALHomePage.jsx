import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLangStore } from '@/store/langStore'
import { GraduationCap, ChevronRight, BookOpen } from 'lucide-react'
import clsx from 'clsx'

export default function ALHomePage() {
  const navigate = useNavigate()
  const { language } = useLangStore()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('al_streams')
      .select('*, al_stream_subjects(al_subjects(id,name,name_si,name_ta))')
      .eq('is_active', true).order('order_index')
      .then(({ data }) => { setStreams(data||[]); setLoading(false) })
  }, [])

  const getName = (s) => {
    if (language === 'sinhala' && s.name_si) return s.name_si
    if (language === 'tamil'   && s.name_ta) return s.name_ta
    return s.name
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <GraduationCap size={32} className="text-white"/>
        </div>
        <h1 className="font-bold text-3xl text-gray-900 mb-2">A/L Learning Hub</h1>
        <p className="text-gray-500">Sri Lanka Advanced Level — Select your stream to begin</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(5).fill(0).map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map(s => {
            const subjects = (s.al_stream_subjects||[]).map(ss=>ss.al_subjects).filter(Boolean)
            return (
              <button key={s.id} onClick={() => navigate(`/al/stream/${s.id}`)}
                className="card p-6 text-left hover:shadow-lg border-2 border-transparent hover:border-opacity-50 transition-all group"
                style={{ borderColor: s.color_hex + '44' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: s.color_hex + '22' }}>
                  <GraduationCap size={22} style={{ color: s.color_hex }}/>
                </div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="font-bold text-lg text-gray-900 leading-snug">{getName(s)}</h2>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-600 shrink-0 mt-0.5 transition-colors"/>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.slice(0,5).map(sub => (
                    <span key={sub.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {language==='sinhala'&&sub.name_si ? sub.name_si : language==='tamil'&&sub.name_ta ? sub.name_ta : sub.name}
                    </span>
                  ))}
                  {subjects.length > 5 && <span className="text-xs text-gray-400">+{subjects.length-5} more</span>}
                </div>
                <p className="text-xs text-gray-400 mt-3">{subjects.length} subjects</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
