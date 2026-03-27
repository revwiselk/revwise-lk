import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui'
import { FileText, ChevronRight, Search, Filter } from 'lucide-react'
import clsx from 'clsx'

const GRADES   = ['6','7','8','9','10','11']
const TYPES    = [
  { key:'all',         label:'All Types' },
  { key:'past_paper',  label:'Past Papers' },
  { key:'model_paper', label:'Model Papers' },
  { key:'term_test',   label:'Term Tests' },
  { key:'mock_exam',   label:'Mock Exams' },
  { key:'sample',      label:'Sample Papers' },
]
const TYPE_COLORS = {
  past_paper:  'blue',
  model_paper: 'green',
  term_test:   'amber',
  mock_exam:   'red',
  sample:      'gray',
}
const TYPE_LABELS = {
  past_paper:  'Past Paper',
  model_paper: 'Model Paper',
  term_test:   'Term Test',
  mock_exam:   'Mock Exam',
  sample:      'Sample',
}

export default function PapersPage() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [grade, setGrade] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchPapers() }, [])

  const fetchPapers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('papers')
      .select('id, grade, subject, paper_type, year, term, title, description, duration_mins, total_marks')
      .eq('is_active', true)
      .order('grade').order('subject').order('year', { ascending: false })
    setPapers(data || [])
    setLoading(false)
  }

  const filtered = papers.filter(p => {
    if (grade !== 'all' && String(p.grade) !== grade) return false
    if (type !== 'all' && p.paper_type !== type) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return p.title?.toLowerCase().includes(q) || p.subject?.toLowerCase().includes(q)
    }
    return true
  })

  // Group by grade → subject
  const grouped = {}
  filtered.forEach(p => {
    const g = `Grade ${p.grade}`
    if (!grouped[g]) grouped[g] = {}
    if (!grouped[g][p.subject]) grouped[g][p.subject] = []
    grouped[g][p.subject].push(p)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl sm:text-3xl text-gray-900 mb-1">Past Papers</h1>
        <p className="text-gray-500 text-sm">Practice with past papers, model papers & term tests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search papers…"
            className="inp pl-9 w-full"/>
        </div>
        {/* Grade filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto shrink-0">
          <button onClick={() => setGrade('all')}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              grade === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            All
          </button>
          {GRADES.map(g => (
            <button key={g} onClick={() => setGrade(g)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                grade === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              G{g}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all',
              type === t.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="text-gray-300 mx-auto mb-3"/>
          <p className="font-semibold text-gray-500">No papers found</p>
          <p className="text-sm text-gray-400 mt-1">Try changing your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([gradeLabel, subjects]) => (
            <div key={gradeLabel}>
              <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {gradeLabel.replace('Grade ','')}
                </span>
                {gradeLabel}
              </h2>
              <div className="space-y-4">
                {Object.entries(subjects).map(([subject, subPapers]) => (
                  <div key={subject}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{subject}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subPapers.map(p => (
                        <button key={p.id}
                          onClick={() => navigate(`/papers/${p.id}`)}
                          className="card p-4 text-left hover:shadow-md hover:border-blue-200 border-2 border-transparent transition-all group">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge color={TYPE_COLORS[p.paper_type] || 'gray'}>{TYPE_LABELS[p.paper_type]}</Badge>
                            <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors"/>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 group-hover:text-blue-700 transition-colors">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {p.year && <span>{p.year}</span>}
                            {p.term && <span>Term {p.term}</span>}
                            <span>{p.total_marks} marks</span>
                            {p.duration_mins && <span>{p.duration_mins} min</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
