import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Badge, Btn, Field } from '@/components/ui'
import { ArrowLeft, Clock, FileText, Award, BookOpen, Lock, Play,
         CheckCircle2, Download, Timer, AlertCircle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const TYPE_LABELS = { past_paper:'Past Paper', model_paper:'Model Paper', term_test:'Term Test', mock_exam:'Mock Exam', sample:'Sample' }
const TYPE_COLORS = { past_paper:'blue', model_paper:'green', term_test:'amber', mock_exam:'red', sample:'gray' }
const SECTION_TYPE_LABELS = { mcq:'MCQ', short_answer:'Short Answer', essay:'Essay', structured:'Structured', fill_blank:'Fill Blank', true_false:'True/False' }

export default function PaperDetailPage() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  // Timer setup
  const [showTimerSetup, setShowTimerSetup] = useState(false)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerMins, setTimerMins] = useState('')

  useEffect(() => { fetchPaper() }, [paperId])

  const fetchPaper = async () => {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      supabase.from('papers').select('*').eq('id', paperId).single(),
      supabase.from('paper_sections')
        .select('id, order_index, title, section_type, marks, instructions, paper_questions(id)')
        .eq('paper_id', paperId).order('order_index'),
    ])
    if (pRes.data) {
      setPaper(pRes.data)
      // Pre-fill timer with paper's default if set
      if (pRes.data.duration_mins) setTimerMins(String(pRes.data.duration_mins))
    }
    setSections(sRes.data || [])
    if (user) {
      const { data: attData } = await supabase
        .from('paper_attempts')
        .select('id, submitted_at, score, max_score, passed, time_taken_seconds')
        .eq('paper_id', paperId).eq('user_id', user.id)
        .order('submitted_at', { ascending: false }).limit(5)
      setAttempts(attData || [])
    }
    setLoading(false)
  }

  const totalQ = sections.reduce((s, sec) => s + (sec.paper_questions?.length || 0), 0)
  const hasMCQ = sections.some(s => s.section_type === 'mcq' || s.section_type === 'true_false')

  const startPaper = () => {
    // Encode timer setting into URL query params
    const mins = timerEnabled && parseInt(timerMins) > 0 ? parseInt(timerMins) : null
    const url = `/papers/${paperId}/attempt` + (mins ? `?timer=${mins}` : '')
    navigate(url)
  }

  const fmtTime = (secs) => {
    if (!secs) return '—'
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}
    </div>
  )
  if (!paper) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-gray-500">Paper not found.</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/papers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors">
        <ArrowLeft size={14}/> Papers
      </button>

      {/* Paper header */}
      <div className="card p-5 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <Badge color={TYPE_COLORS[paper.paper_type] || 'gray'}>{TYPE_LABELS[paper.paper_type]}</Badge>
          <div className="flex gap-2 flex-wrap">
            {paper.year && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{paper.year}</span>}
            {paper.term && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Term {paper.term}</span>}
          </div>
        </div>
        <h1 className="font-bold text-xl sm:text-2xl text-gray-900 mb-1">{paper.title}</h1>
        <p className="text-gray-500 text-sm mb-4">{paper.subject} · Grade {paper.grade}</p>
        {paper.description && <p className="text-gray-600 text-sm mb-4">{paper.description}</p>}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon:Award,    label:'Marks',     value:paper.total_marks },
            { icon:Clock,    label:'Duration',  value:paper.duration_mins ? `${paper.duration_mins} min` : '—' },
            { icon:FileText, label:'Questions', value:totalQ },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <s.icon size={16} className="text-blue-500 mx-auto mb-1"/>
              <p className="font-bold text-lg text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections list */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-sm text-gray-700">{sections.length} Section{sections.length !== 1 ? 's' : ''}</p>
        </div>
        {sections.map((sec, i) => (
          <div key={sec.id} className={clsx('flex items-center gap-4 px-5 py-3.5', i > 0 && 'border-t border-gray-100')}>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              {String.fromCharCode(65 + i)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{sec.title}</p>
              <p className="text-xs text-gray-400">{SECTION_TYPE_LABELS[sec.section_type]} · {sec.paper_questions?.length || 0} questions · {sec.marks} marks</p>
            </div>
            <Badge color={sec.section_type==='mcq'?'blue':sec.section_type==='essay'?'purple':'gray'}>
              {SECTION_TYPE_LABELS[sec.section_type]}
            </Badge>
          </div>
        ))}
      </div>

      {/* Past attempts */}
      {user && attempts.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-sm text-gray-700">Your Attempts</p>
          </div>
          {attempts.map((a, i) => (
            <div key={a.id} className={clsx('flex items-center gap-3 px-5 py-3', i > 0 && 'border-t border-gray-100')}>
              <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                a.passed ? 'bg-green-500' : 'bg-red-400')}>
                {a.passed ? '✓' : i+1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.score}/{a.max_score} marks</p>
                <p className="text-xs text-gray-400">
                  {new Date(a.submitted_at).toLocaleDateString()} · {fmtTime(a.time_taken_seconds)}
                </p>
              </div>
              <span className={clsx('bdg text-xs', a.passed ? 'bdg-green' : 'bdg-red')}>
                {a.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="space-y-3">

        {/* PDF Download — prominent if available */}
        {paper.pdf_url && (
          <a href={paper.pdf_url} download target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 hover:border-blue-300 transition-all">
            <Download size={18}/>
            Download PDF Paper
          </a>
        )}

        {hasMCQ ? (
          user ? (
            !showTimerSetup ? (
              <button onClick={() => setShowTimerSetup(true)}
                className="btn-lg btn-blue w-full justify-center gap-2">
                <Play size={18}/> Start Paper
              </button>
            ) : (
              /* Timer setup panel */
              <div className="card p-5 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Timer size={18} className="text-blue-600"/>
                  <h3 className="font-bold text-gray-900">Timer Settings</h3>
                </div>

                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <div onClick={() => setTimerEnabled(!timerEnabled)}
                    className={clsx('w-11 h-6 rounded-full transition-all relative',
                      timerEnabled ? 'bg-blue-600' : 'bg-gray-200')}>
                    <div className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                      timerEnabled ? 'left-6' : 'left-1')}/>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Enable countdown timer</span>
                </label>

                {timerEnabled && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Set time limit (minutes)</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min="1" max="300"
                        value={timerMins}
                        onChange={e => setTimerMins(e.target.value)}
                        placeholder={paper.duration_mins ? String(paper.duration_mins) : '60'}
                        className="inp w-28 text-center font-bold text-lg"
                      />
                      <span className="text-sm text-gray-500">minutes</span>
                    </div>
                    {paper.duration_mins && (
                      <p className="text-xs text-gray-400 mt-1">Suggested: {paper.duration_mins} min</p>
                    )}
                  </div>
                )}

                {!timerEnabled && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-gray-400"/>
                      No time limit — you can take as long as you need
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setShowTimerSetup(false)} className="btn-md btn-white flex-1">
                    Cancel
                  </button>
                  <button onClick={startPaper} className="btn-md btn-blue flex-1 gap-2">
                    <Play size={15}/> Begin Paper
                  </button>
                </div>
              </div>
            )
          ) : (
            <Link to="/login" className="btn-lg btn-blue w-full justify-center gap-2">
              <Lock size={16}/> Login to Attempt
            </Link>
          )
        ) : (
          <div className="card p-4 text-center">
            <BookOpen size={24} className="text-gray-300 mx-auto mb-2"/>
            <p className="text-sm text-gray-500 font-medium">Written Paper</p>
            <p className="text-xs text-gray-400 mt-1">Use as a study guide. Download PDF if available.</p>
          </div>
        )}

        <Link to={`/papers/${paperId}/view`}
          className="btn-md btn-white w-full justify-center gap-2">
          <FileText size={15}/> View Questions
        </Link>
      </div>
    </div>
  )
}
