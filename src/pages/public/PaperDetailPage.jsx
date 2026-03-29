import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Badge, Btn, Field } from '@/components/ui'
import { ArrowLeft, Clock, FileText, Award, BookOpen, Lock, Play,
         CheckCircle2, Download, Timer, AlertCircle, ChevronRight,
         ChevronDown, ChevronUp, Globe, Video, X } from 'lucide-react'
import clsx from 'clsx'

const TYPE_LABELS = { past_paper:'Past Paper', model_paper:'Model Paper', term_test:'Term Test', mock_exam:'Mock Exam', sample:'Sample' }
const TYPE_COLORS = { past_paper:'blue', model_paper:'green', term_test:'amber', mock_exam:'red', sample:'gray' }
const SECTION_TYPE_LABELS = { mcq:'MCQ', short_answer:'Short Answer', essay:'Essay', structured:'Structured', fill_blank:'Fill Blank', true_false:'True/False' }

const VIDEO_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'si', label: 'Sinhala', flag: '🇱🇰', nativeLabel: 'සිංහල' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳', nativeLabel: 'தமிழ்' },
]

export default function PaperDetailPage() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTimerSetup, setShowTimerSetup] = useState(false)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerMins, setTimerMins] = useState('')
  // Attempts dropdown
  const [attemptsOpen, setAttemptsOpen] = useState(false)
  // Video modal
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [selectedVideoLang, setSelectedVideoLang] = useState('en')

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
      if (pRes.data.duration_mins) setTimerMins(String(pRes.data.duration_mins))
    }
    setSections(sRes.data || [])
    if (user) {
      const { data: attData } = await supabase
        .from('paper_attempts')
        .select('id, submitted_at, score, max_score, passed, time_taken_seconds')
        .eq('paper_id', paperId).eq('user_id', user.id)
        .order('submitted_at', { ascending: false }).limit(10)
      setAttempts(attData || [])
    }
    setLoading(false)
  }

  const totalQ = sections.reduce((s, sec) => s + (sec.paper_questions?.length || 0), 0)
  const hasMCQ = sections.some(s => s.section_type === 'mcq' || s.section_type === 'true_false')

  const startPaper = () => {
    const mins = timerEnabled && parseInt(timerMins) > 0 ? parseInt(timerMins) : null
    const url = `/papers/${paperId}/attempt` + (mins ? `?timer=${mins}` : '')
    navigate(url)
  }

  const fmtTime = (secs) => {
    if (!secs) return '—'
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // Get video URL based on language (paper fields: video_url_en, video_url_si, video_url_ta or fallback)
  const getVideoUrl = (lang) => {
    if (!paper) return null
    return paper[`video_url_${lang}`] || paper.video_url || null
  }

  const handleDownload = async (e, url, title) => {
    e.preventDefault()
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${title || 'paper'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
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

  const currentVideoUrl = getVideoUrl(selectedVideoLang)
  const bestAttempt = attempts.length > 0 ? attempts.reduce((best, a) => (!best || a.score > best.score) ? a : best, null) : null

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

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon:Award,    label:'Marks',     value:paper.total_marks || '—' },
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

      {/* ── Your Attempts — Dropdown ── */}
      {user && attempts.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <button
            onClick={() => setAttemptsOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <p className="font-semibold text-sm text-gray-700">Your Attempts</p>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{attempts.length}</span>
              {bestAttempt && (
                <span className="text-xs text-gray-400">
                  Best: <span className="font-semibold text-gray-700">{bestAttempt.score}/{bestAttempt.max_score}</span>
                </span>
              )}
            </div>
            {attemptsOpen
              ? <ChevronUp size={16} className="text-gray-400"/>
              : <ChevronDown size={16} className="text-gray-400"/>
            }
          </button>

          {attemptsOpen && (
            <div className="divide-y divide-gray-100">
              {attempts.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                    a.passed ? 'bg-green-500' : 'bg-red-400')}>
                    {a.passed ? '✓' : i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.score}/{a.max_score} marks</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.submitted_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                      {' · '}{fmtTime(a.time_taken_seconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                      a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                      {a.passed ? 'Passed' : 'Failed'}
                    </span>
                    {/* Score bar */}
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full', a.passed ? 'bg-green-500' : 'bg-red-400')}
                        style={{ width: `${Math.min(100, Math.round((a.score / a.max_score) * 100))}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Explanation Video ── */}
      {(paper.video_url || paper.video_url_en || paper.video_url_si || paper.video_url_ta) && (
        <div className="card overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Video size={15} className="text-purple-500"/>
            <p className="font-semibold text-sm text-gray-700">Explanation Video</p>
          </div>
          <div className="p-5">
            {/* Language selector */}
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
              <Globe size={12}/> Select your language:
            </p>
            <div className="flex gap-2 mb-4">
              {VIDEO_LANGUAGES.map(lang => {
                const hasVideo = !!(paper[`video_url_${lang.code}`] || (lang.code === 'en' && paper.video_url))
                return (
                  <button
                    key={lang.code}
                    onClick={() => { setSelectedVideoLang(lang.code); setShowVideoModal(true) }}
                    disabled={!hasVideo}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      selectedVideoLang === lang.code && showVideoModal
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50',
                      !hasVideo && 'opacity-40 cursor-not-allowed'
                    )}>
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400">Click a language to watch the explanation video</p>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && currentVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowVideoModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-purple-500"/>
                <span className="font-semibold text-gray-900 text-sm">
                  Explanation — {VIDEO_LANGUAGES.find(l => l.code === selectedVideoLang)?.nativeLabel}
                </span>
              </div>
              {/* Language switch buttons inside modal */}
              <div className="flex items-center gap-2">
                {VIDEO_LANGUAGES.map(lang => {
                  const hasVideo = !!(paper[`video_url_${lang.code}`] || (lang.code === 'en' && paper.video_url))
                  if (!hasVideo) return null
                  return (
                    <button key={lang.code}
                      onClick={() => setSelectedVideoLang(lang.code)}
                      className={clsx('text-sm px-2.5 py-1 rounded-lg border transition-all',
                        selectedVideoLang === lang.code
                          ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-gray-200 text-gray-500 hover:border-purple-300'
                      )}>
                      {lang.flag} {lang.nativeLabel}
                    </button>
                  )
                })}
                <button onClick={() => setShowVideoModal(false)}
                  className="ml-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <X size={16}/>
                </button>
              </div>
            </div>
            <div className="aspect-video bg-black">
              {currentVideoUrl.includes('youtube.com') || currentVideoUrl.includes('youtu.be') ? (
                <iframe
                  src={currentVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen/>
              ) : (
                <video src={currentVideoUrl} controls className="w-full h-full" autoPlay/>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="space-y-3">
        {/* PDF Download */}
        {paper.pdf_url && (
          <button
            onClick={(e) => handleDownload(e, paper.pdf_url, paper.title)}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 hover:border-blue-300 transition-all group">
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform"/>
            Download PDF Paper
          </button>
        )}

        {hasMCQ ? (
          user ? (
            !showTimerSetup ? (
              <button onClick={() => setShowTimerSetup(true)}
                className="btn-lg btn-blue w-full justify-center gap-2">
                <Play size={18}/> Start Paper
              </button>
            ) : (
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
                        className="inp w-28 text-center font-bold text-lg"/>
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
                  <button onClick={() => setShowTimerSetup(false)} className="btn-md btn-white flex-1">Cancel</button>
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
