import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/ui'
import { BookOpen, Search, ChevronRight } from 'lucide-react'
import { useLangStore } from '@/store/langStore'
import clsx from 'clsx'

const GRADES = [6,7,8,9,10,11]
const STYLE = {
  science:     { emoji:'🔬', bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200'   },
  mathematics: { emoji:'📐', bg:'bg-purple-50', text:'text-purple-700', border:'border-purple-200' },
  sinhala:     { emoji:'📖', bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200'  },
  english:     { emoji:'📝', bg:'bg-sky-50',    text:'text-sky-700',    border:'border-sky-200'    },
  tamil:       { emoji:'📜', bg:'bg-rose-50',   text:'text-rose-700',   border:'border-rose-200'   },
  history:     { emoji:'🏛️', bg:'bg-orange-50', text:'text-orange-700', border:'border-orange-200' },
  geography:   { emoji:'🌍', bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200'  },
  health:      { emoji:'🏃', bg:'bg-pink-50',   text:'text-pink-700',   border:'border-pink-200'   },
  civics:      { emoji:'⚖️', bg:'bg-teal-50',   text:'text-teal-700',   border:'border-teal-200'   },
  religion:    { emoji:'☸️', bg:'bg-yellow-50', text:'text-yellow-700', border:'border-yellow-200' },
  ict:         { emoji:'💻', bg:'bg-cyan-50',   text:'text-cyan-700',   border:'border-cyan-200'   },
  default:     { emoji:'📚', bg:'bg-gray-50',   text:'text-gray-700',   border:'border-gray-200'   },
}

export default function SubjectsPage() {
  const navigate = useNavigate()
  const { language } = useLangStore()
  const [params, setParams] = useSearchParams()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const grade = parseInt(params.get('grade') || '6')

  useEffect(() => { fetchSubjects() }, [grade])

  const fetchSubjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('subjects')
      .select('id, slug, name, description, grade, chapters(id), subject_translations(language, name, description)')
      .eq('grade', grade).eq('is_active', true).order('order_index')
    setSubjects(data || [])
    setLoading(false)
  }

  const filtered = subjects.filter(s => {
    const name = s.subject_translations?.find(row=>row.language===language)?.name || s.subject_translations?.find(row=>row.language==='english')?.name || s.name
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="font-bold text-3xl text-gray-900 mb-2">Browse Subjects</h1>
        <p className="text-gray-500">Government syllabus · All subjects in Sinhala, Tamil & English</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex gap-2 flex-wrap">
          {GRADES.map(g => (
            <button key={g} onClick={() => setParams({ grade: g })}
              className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all border-2',
                grade === g ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                           : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600')}>
              Grade {g}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects…" className="inp pl-9 w-52"/>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton h-40"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects found" desc={`No active subjects for Grade ${grade}.`}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s, i) => {
            const st = STYLE[s.slug] || STYLE.default
            return (
              <div key={s.id} onClick={() => navigate(`/subjects/${s.id}`)}
                className={clsx('group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-up',
                  `s${Math.min(i+1,5)}`, st.bg, st.text, st.border)}>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{st.emoji}</span>
                  <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                </div>
                <h3 className="font-bold text-xl mb-1">{s.subject_translations?.find(row=>row.language===language)?.name || s.subject_translations?.find(row=>row.language==='english')?.name || s.name}</h3>
                {(() => { const desc = s.subject_translations?.find(row=>row.language===language)?.description || s.subject_translations?.find(row=>row.language==='english')?.description || s.description; return desc ? <p className="text-sm opacity-70 line-clamp-2 mb-3">{desc}</p> : null })()} 
                <p className="text-xs font-medium opacity-60 flex items-center gap-1">
                  <BookOpen size={12}/> {s.chapters?.length || 0} chapters
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
