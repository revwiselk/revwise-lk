import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui'
import { FileText, ChevronRight, ArrowLeft, Download, Search, GraduationCap } from 'lucide-react'
import clsx from 'clsx'

const GRADES = ['6', '7', '8', '9', '10', '11']
const TYPE_LABELS = { past_paper: 'Past Paper', model_paper: 'Model Paper', term_test: 'Term Test', mock_exam: 'Mock Exam', sample: 'Sample' }
const TYPE_ICONS = { past_paper: '📄', model_paper: '📝', term_test: '📋', mock_exam: '📊', sample: '📌' }

const SUBJECT_COLORS = {
  Science: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Mathematics: 'bg-blue-100 text-blue-700 border-blue-200',
  Sinhala: 'bg-amber-100 text-amber-700 border-amber-200',
  English: 'bg-purple-100 text-purple-700 border-purple-200',
  Tamil: 'bg-rose-100 text-rose-700 border-rose-200',
  History: 'bg-orange-100 text-orange-700 border-orange-200',
  Geography: 'bg-teal-100 text-teal-700 border-teal-200',
  Health: 'bg-red-100 text-red-700 border-red-200',
  Civics: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Religion: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ICT: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Art: 'bg-pink-100 text-pink-700 border-pink-200',
}

const SUBJECT_EMOJI = {
  Science: '🔬', Mathematics: '📐', Sinhala: '🅢', English: '🅔', Tamil: '🅣',
  History: '🏛️', Geography: '🌍', Health: '💊', Civics: '⚖️', Religion: '🕌', ICT: '💻', Art: '🎨',
}

export default function PapersPage() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchPapers() }, [])

  const fetchPapers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('papers')
      .select('id, grade, subject, paper_type, year, term, title, description, duration_mins, total_marks, pdf_url')
      .eq('is_active', true)
      .order('grade').order('subject').order('year', { ascending: false })
    setPapers(data || [])
    setLoading(false)
  }

  const subjectsForGrade = (grade) =>
    [...new Set(papers.filter(p => String(p.grade) === String(grade)).map(p => p.subject))].sort()

  const typesForGradeSubject = (grade, subject) =>
    [...new Set(papers.filter(p => String(p.grade) === String(grade) && p.subject === subject).map(p => p.paper_type))].sort()

  const filteredPapers = papers.filter(p => {
    if (String(p.grade) !== String(selectedGrade)) return false
    if (p.subject !== selectedSubject) return false
    if (selectedType && p.paper_type !== selectedType) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return p.title?.toLowerCase().includes(q) || String(p.year || '').includes(q)
    }
    return true
  })

  const countForGrade = (grade) => papers.filter(p => String(p.grade) === String(grade)).length
  const countForSubject = (grade, subject) => papers.filter(p => String(p.grade) === String(grade) && p.subject === subject).length
  const countForType = (grade, subject, type) => papers.filter(p => String(p.grade) === String(grade) && p.subject === subject && p.paper_type === type).length

  // VIEW 1: Grade selection
  if (!selectedGrade) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl text-gray-900">Papers</h1>
        </div>
        <p className="text-gray-500 text-sm ml-[52px]">Select your grade to browse papers by subject and type</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {GRADES.map(grade => {
            const count = countForGrade(grade)
            const subjects = subjectsForGrade(grade)
            return (
              <button key={grade} onClick={() => setSelectedGrade(grade)}
                className={clsx(
                  'card p-5 text-left hover:shadow-lg hover:border-blue-300 border-2 border-transparent transition-all group relative overflow-hidden',
                  count === 0 && 'opacity-40 cursor-not-allowed'
                )}
                disabled={count === 0}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-blue-50 -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500 ease-out" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-black text-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md">
                    {grade}
                  </div>
                  <p className="font-bold text-gray-900 text-base">Grade {grade}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{count} paper{count !== 1 ? 's' : ''}</p>
                  {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subjects.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                          {SUBJECT_EMOJI[s] || '📘'} {s}
                        </span>
                      ))}
                      {subjects.length > 3 && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                          +{subjects.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} className="absolute bottom-4 right-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // VIEW 2: Subjects for chosen grade
  if (selectedGrade && !selectedSubject) {
    const subjects = subjectsForGrade(selectedGrade)
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <button onClick={() => setSelectedGrade(null)} className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium">
            <ArrowLeft size={13} /> Papers
          </button>
          <ChevronRight size={13} className="text-gray-300" />
          <span className="text-gray-900 font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg">Grade {selectedGrade}</span>
        </nav>

        <div className="mb-6">
          <h1 className="font-bold text-2xl text-gray-900 mb-1">Grade {selectedGrade} — Subjects</h1>
          <p className="text-gray-500 text-sm">Choose a subject to see available paper types</p>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-16 card">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No papers for Grade {selectedGrade} yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {subjects.map(subject => {
              const count = countForSubject(selectedGrade, subject)
              const types = typesForGradeSubject(selectedGrade, subject)
              const colorCls = SUBJECT_COLORS[subject] || 'bg-gray-100 text-gray-700 border-gray-200'
              return (
                <button key={subject} onClick={() => setSelectedSubject(subject)}
                  className="card p-5 text-left hover:shadow-lg hover:border-blue-200 border-2 border-transparent transition-all group">
                  <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 border group-hover:scale-110 transition-transform', colorCls)}>
                    {SUBJECT_EMOJI[subject] || '📘'}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">{count} paper{count !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {types.map(type => (
                      <span key={type} className="text-[10px] bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                        {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // VIEW 3: Paper types for grade + subject
  if (selectedGrade && selectedSubject && !selectedType) {
    const types = typesForGradeSubject(selectedGrade, selectedSubject)
    const typeBgMap = {
      past_paper: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      model_paper: 'bg-green-50 border-green-200 hover:border-green-400',
      term_test: 'bg-amber-50 border-amber-200 hover:border-amber-400',
      mock_exam: 'bg-red-50 border-red-200 hover:border-red-400',
      sample: 'bg-gray-50 border-gray-200 hover:border-gray-400',
    }
    const typeGradMap = {
      past_paper: 'from-blue-500 to-blue-700',
      model_paper: 'from-green-500 to-green-700',
      term_test: 'from-amber-500 to-amber-700',
      mock_exam: 'from-red-500 to-red-700',
      sample: 'from-gray-400 to-gray-600',
    }
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <button onClick={() => { setSelectedGrade(null); setSelectedSubject(null) }} className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium">
            <ArrowLeft size={13} /> Papers
          </button>
          <ChevronRight size={13} className="text-gray-300" />
          <button onClick={() => setSelectedSubject(null)} className="hover:text-blue-600 transition-colors">Grade {selectedGrade}</button>
          <ChevronRight size={13} className="text-gray-300" />
          <span className="text-gray-900 font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg">{selectedSubject}</span>
        </nav>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{SUBJECT_EMOJI[selectedSubject] || '📘'}</span>
          <div>
            <h1 className="font-bold text-2xl text-gray-900">{selectedSubject} — Grade {selectedGrade}</h1>
            <p className="text-gray-500 text-sm">Select a paper type to browse</p>
          </div>
        </div>

        {types.length === 0 ? (
          <div className="text-center py-16 card">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No papers available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {types.map(type => {
              const count = countForType(selectedGrade, selectedSubject, type)
              return (
                <button key={type} onClick={() => setSelectedType(type)}
                  className={clsx('card p-6 text-left border-2 transition-all group hover:shadow-lg', typeBgMap[type] || 'bg-gray-50 border-gray-200')}>
                  <div className={clsx('w-14 h-14 rounded-2xl bg-gradient-to-br text-white text-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform', typeGradMap[type] || 'from-gray-400 to-gray-600')}>
                    {TYPE_ICONS[type]}
                  </div>
                  <p className="font-bold text-gray-900 text-lg mb-1">{TYPE_LABELS[type]}</p>
                  <p className="text-gray-500 text-sm">{count} paper{count !== 1 ? 's' : ''} available</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-gray-600">
                    Browse papers <ChevronRight size={13} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // VIEW 4: Papers list for grade + subject + type
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-5 flex-wrap">
        <button onClick={() => { setSelectedGrade(null); setSelectedSubject(null); setSelectedType(null) }}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={13} /> Papers
        </button>
        <ChevronRight size={13} className="text-gray-300" />
        <button onClick={() => { setSelectedSubject(null); setSelectedType(null) }} className="hover:text-blue-600 transition-colors">Grade {selectedGrade}</button>
        <ChevronRight size={13} className="text-gray-300" />
        <button onClick={() => setSelectedType(null)} className="hover:text-blue-600 transition-colors">{selectedSubject}</button>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-gray-900 font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg">{TYPE_LABELS[selectedType]}</span>
      </nav>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{SUBJECT_EMOJI[selectedSubject] || '📘'}</span>
        <div>
          <h1 className="font-bold text-xl text-gray-900">{selectedSubject} — {TYPE_LABELS[selectedType]}</h1>
          <p className="text-gray-400 text-xs">Grade {selectedGrade} · {filteredPapers.length} paper{filteredPapers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or year…" className="inp pl-8 w-full text-sm" />
      </div>

      {filteredPapers.length === 0 ? (
        <div className="text-center py-16 card">
          <FileText size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No papers found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPapers.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-lg">
                {TYPE_ICONS[p.paper_type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.year && <span className="text-xs text-gray-500 font-bold">{p.year}</span>}
                  {p.term && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Term {p.term}</span>}
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{p.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {p.total_marks && <span>{p.total_marks} marks</span>}
                  {p.duration_mins && <span>{p.duration_mins} min</span>}
                  {p.pdf_url && <span className="flex items-center gap-1 text-blue-500"><Download size={10} /> PDF available</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.pdf_url && (
                  <a href={p.pdf_url} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                    onClick={e => e.stopPropagation()}>
                    <Download size={13} /> Download
                  </a>
                )}
                <button onClick={() => navigate(`/papers/${p.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all">
                  Open <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
