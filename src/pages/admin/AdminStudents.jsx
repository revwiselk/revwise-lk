import { useEffect, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { EmptyState, Badge } from '@/components/ui'
import { Users, Search, Download } from 'lucide-react'
import clsx from 'clsx'

const GRADES = [6,7,8,9,10,11]

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [grade, setGrade] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest') // newest | name | grade

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    const { data } = await supabaseAdmin
      .from('student_profiles')
      .select('id, full_name, grade, school_name, district, medium, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    setStudents(data || [])
    setLoading(false)
  }

  const filtered = students
    .filter(s => grade === 'all' || s.grade === parseInt(grade))
    .filter(s => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.school_name?.toLowerCase().includes(q) ||
        s.district?.toLowerCase().includes(q) ||
        s.medium?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name||'').localeCompare(b.full_name||'')
      if (sortBy === 'grade') return a.grade - b.grade
      return new Date(b.created_at) - new Date(a.created_at) // newest
    })

  const exportCSV = () => {
    const rows = [
      ['Name','Grade','Medium','School','District','Joined'],
      ...filtered.map(s => [
        s.full_name, s.grade, s.medium, s.school_name||'', s.district||'',
        new Date(s.created_at).toLocaleDateString()
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Grade distribution
  const gradeCounts = GRADES.map(g => ({
    grade: g,
    count: students.filter(s => s.grade === g).length,
  }))

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} registered students</p>
        </div>
        <button onClick={exportCSV} className="btn-sm btn-white gap-1.5">
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* Grade distribution mini chart */}
      {!loading && students.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Students by Grade</p>
          <div className="flex items-end gap-2 h-16">
            {gradeCounts.map(g => {
              const max = Math.max(...gradeCounts.map(x => x.count), 1)
              const h = Math.round((g.count / max) * 100)
              return (
                <div key={g.grade} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{g.count}</span>
                  <div className="w-full bg-blue-100 rounded-t-sm transition-all duration-500"
                    style={{ height: `${Math.max(h, g.count > 0 ? 8 : 0)}%` }}/>
                  <span className="text-xs text-gray-400">Gr.{g.grade}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, school, district…" className="inp pl-9 w-64"/>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setGrade('all')}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', grade==='all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            All
          </button>
          {GRADES.map(g => (
            <button key={g} onClick={() => setGrade(String(g))}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', grade===String(g) ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              G{g}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="inp w-36 text-sm py-2">
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="grade">By grade</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array(8).fill(0).map((_,i) => <div key={i} className="skeleton h-14"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No students found" desc="Try adjusting your filters."/>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{filtered.length} students</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Student','Grade','Medium','School','District','Joined'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 text-xs font-bold">{(s.full_name||'?')[0].toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="bdg-blue">Grade {s.grade}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{s.medium}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.school_name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.district || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
