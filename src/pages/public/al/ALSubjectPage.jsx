import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { ArrowLeft, ChevronRight, ChevronDown, BookOpen, Zap, HelpCircle, Play, CheckCircle2, Circle, RotateCcw, Menu } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function FlashcardDeck({ subUnitId, language, onComplete }) {
  const [cards, setCards] = useState([])
  const [queue, setQueue] = useState([])
  const [known, setKnown] = useState([])
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setKnown([]); setFlipped(false); setQueue([])
    supabase.from('al_flashcards').select('*').eq('sub_unit_id', subUnitId).eq('language', language).order('order_index')
      .then(({ data }) => {
        if (data?.length) { setCards(data); setQueue(data.map((_, i) => i)); setLoading(false) }
        else supabase.from('al_flashcards').select('*').eq('sub_unit_id', subUnitId).eq('language', 'english').order('order_index')
          .then(({ data: d }) => { const arr = d || []; setCards(arr); setQueue(arr.map((_, i) => i)); setLoading(false) })
      })
  }, [subUnitId, language])

  if (loading) return <div className="skeleton h-48 rounded-2xl" />
  if (!cards.length) return (
    <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <Zap size={28} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">No flashcards yet</p>
      {onComplete && <button onClick={onComplete} className="mt-3 btn-sm bg-blue-600 text-white rounded-lg px-4 py-1">Next →</button>}
    </div>
  )
  if (queue.length === 0) return (
    <div className="text-center py-10 bg-green-50 rounded-2xl border-2 border-green-200">
      <div className="text-4xl mb-2">🎉</div>
      <p className="font-bold text-lg text-gray-900">All {cards.length} done!</p>
      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => { setKnown([]); setQueue(cards.map((_, i) => i)); setFlipped(false) }} className="btn-md bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-2"><RotateCcw size={14} />Again</button>
        {onComplete && <button onClick={onComplete} className="btn-md bg-blue-600 text-white px-4 py-2 rounded-xl">Quiz →</button>}
      </div>
    </div>
  )
  const card = cards[queue[0]]
  const progress = Math.round((known.length / cards.length) * 100)
  const skip = () => { setQueue(q => { const [f, ...r] = q; return [...r, f] }); setFlipped(false) }
  const gotIt = () => { setKnown(k => [...k, queue[0]]); setQueue(q => q.slice(1)); setFlipped(false) }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{known.length}/{cards.length} known</span><span>{queue.length} left</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: progress + '%' }} />
      </div>
      <div onClick={() => setFlipped(!flipped)} className={clsx('min-h-[180px] rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all', flipped ? 'bg-green-50 border-2 border-green-300' : 'bg-blue-50 border-2 border-blue-200 hover:border-blue-400')}>
        {!flipped ? (
          <div className="w-full">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Term</p>
            <p className="font-bold text-xl text-gray-900">{card.term}</p>
            <p className="text-xs text-gray-400 mt-4">Tap to reveal</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-3">Definition</p>
            <p className="text-gray-800 text-base leading-relaxed">{card.definition}</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={gotIt} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><CheckCircle2 size={16} />Got it!</button>
        <button onClick={skip} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><ChevronRight size={16} />Skip</button>
      </div>
    </div>
  )
}

export default function ALSubjectPage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { language } = useLangStore()

  const [subject, setSubject] = useState(null)
  const [chapters, setChapters] = useState([])
  const [expandedCh, setExpandedCh] = useState({})
  const [expandedUnit, setExpandedUnit] = useState({})
  const [activeSubUnit, setActiveSubUnit] = useState(null)
  const [content, setContent] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [tab, setTab] = useState('notes')
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    supabase.from('al_subjects').select('*').eq('id', subjectId).single()
      .then(({ data }) => setSubject(data))
    supabase.from('al_chapters')
      .select('*, al_units(*, al_sub_units(id,order_index,title,title_si,title_ta,is_active))')
      .eq('subject_id', subjectId).eq('is_active', true).order('order_index')
      .then(({ data }) => {
        const chs = (data || []).map(c => ({ ...c, al_units: (c.al_units || []).sort((a, b) => a.order_index - b.order_index).map(u => ({ ...u, al_sub_units: (u.al_sub_units || []).sort((a, b) => a.order_index - b.order_index).filter(s => s.is_active) })) }))
        setChapters(chs); setLoading(false)
      })
    if (user) {
      supabase.from('al_unit_progress').select('sub_unit_id').eq('user_id', user.id).eq('completed', true)
        .then(({ data }) => setCompleted((data || []).map(p => p.sub_unit_id)))
    }
  }, [subjectId, user])

  const fetchSubUnitContent = async (suId) => {
    setContentLoading(true); setActiveSubUnit(suId)
    const [cRes, qRes] = await Promise.all([
      supabase.from('al_unit_content').select('*').eq('sub_unit_id', suId),
      supabase.from('al_quizzes').select('*,al_questions(id)').eq('sub_unit_id', suId).eq('is_active', true).maybeSingle(),
    ])
    const cur = (cRes.data || []).find(c => c.language === language) || (cRes.data || []).find(c => c.language === 'english') || (cRes.data || [])[0]
    setContent({ all: cRes.data || [], cur })
    setQuiz(qRes.data)
    setTab(cur?.video_url ? 'video' : 'notes')
    setContentLoading(false)
    // Small delay to ensure the content area is rendered before scrolling on mobile
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const toggleDone = async (suId) => {
    const isDone = completed.includes(suId)
    const next = isDone ? completed.filter(x => x !== suId) : [...completed, suId]
    setCompleted(next)
    if (user) {
      if (!isDone) await supabase.from('al_unit_progress').upsert({ user_id: user.id, sub_unit_id: suId, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'user_id,sub_unit_id' })
      else await supabase.from('al_unit_progress').update({ completed: false }).eq('user_id', user.id).eq('sub_unit_id', suId)
    }
  }

  const getName = (obj, field = 'title') => {
    if (!obj) return ''
    if (language === 'sinhala' && obj[field + '_si']) return obj[field + '_si']
    if (language === 'tamil' && obj[field + '_ta']) return obj[field + '_ta']
    return obj[field] || obj.name || ''
  }

  const allSubUnits = chapters.flatMap(c => c.al_units.flatMap(u => u.al_sub_units))
  const donePct = allSubUnits.length > 0 ? Math.round((completed.filter(id => allSubUnits.some(s => s.id === id)).length / allSubUnits.length) * 100) : 0

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={14} /> Back to Subjects
        </button>
        {activeSubUnit && (
          <button onClick={() => setActiveSubUnit(null)} className="lg:hidden flex items-center gap-1.5 text-sm font-bold text-blue-600">
            <Menu size={14} /> Curriculum
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Hidden on mobile when content is active */}
        <aside className={clsx(
          "w-full lg:w-72 xl:w-80 shrink-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-all",
          activeSubUnit ? "hidden lg:flex lg:flex-col" : "flex flex-col"
        )} style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '20px' }}>
          
          <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <h1 className="font-bold text-base mb-1">{getName(subject, 'name')}</h1>
            <div className="flex justify-between text-xs text-blue-100 mb-2">
              <span>{chapters.length} chapters</span><span>{donePct}% done</span>
            </div>
            <div className="h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: donePct + '%' }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
            {chapters.map((ch, ci) => (
              <div key={ch.id} className="rounded-xl overflow-hidden border border-gray-100">
                <button onClick={() => setExpandedCh(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-white hover:bg-gray-50 transition-colors">
                  <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{ci + 1}</div>
                  <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{getName(ch)}</span>
                  <ChevronDown size={12} className={clsx('text-gray-400 transition-transform', expandedCh[ch.id] && 'rotate-180')} />
                </button>
                {expandedCh[ch.id] && ch.al_units.map((unit) => (
                  <div key={unit.id} className="border-t border-gray-50">
                    <button onClick={() => setExpandedUnit(p => ({ ...p, [unit.id]: !p[unit.id] }))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 pl-6 transition-colors">
                      <span className="text-xs text-gray-600 flex-1 truncate font-medium">{getName(unit)}</span>
                      <ChevronDown size={11} className={clsx('text-gray-400 transition-transform', expandedUnit[unit.id] && 'rotate-180')} />
                    </button>
                    {expandedUnit[unit.id] && unit.al_sub_units.map((su) => {
                      const isDone = completed.includes(su.id)
                      const isActive = activeSubUnit === su.id
                      return (
                        <button key={su.id} onClick={() => fetchSubUnitContent(su.id)}
                          className={clsx('w-full flex items-center gap-2 px-3 py-2 text-left text-xs pl-10 border-t border-gray-50 transition-all', isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-50')}>
                          {isDone ? <CheckCircle2 size={11} className="text-green-500 shrink-0" /> : <Circle size={11} className="text-gray-300 shrink-0" />}
                          <span className="truncate">{getName(su)}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Content Area: Hidden on mobile when no unit is selected */}
        <div className={clsx("flex-1 min-w-0", !activeSubUnit && "hidden lg:block")} ref={contentRef}>
          {!activeSubUnit ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <BookOpen size={48} className="text-blue-100 mx-auto mb-4" />
              <h2 className="font-bold text-xl text-gray-900 mb-2">{getName(subject, 'name')}</h2>
              <p className="text-gray-500 text-sm mb-6">Select a sub-unit from the curriculum to start learning.</p>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xl font-bold text-gray-900">{chapters.length}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Chapters</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xl font-bold text-gray-900">{allSubUnits.length}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Sub-units</p>
                </div>
              </div>
            </div>
          ) : contentLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-32 rounded-2xl" />
              <div className="skeleton h-64 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-4 pb-10">
              {/* Header Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-bold text-lg text-gray-900 leading-tight">
                    {getName(allSubUnits.find(s => s.id === activeSubUnit) || {})}
                  </h2>
                  <button onClick={() => toggleDone(activeSubUnit)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
                      completed.includes(activeSubUnit) ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white shadow-md shadow-blue-100')}>
                    {completed.includes(activeSubUnit) ? <><CheckCircle2 size={13} /> Completed</> : <><Circle size={13} /> Mark Done</>}
                  </button>
                </div>

                {/* Tabs Wrapper with Horizontal Scroll on Mobile */}
                <div className="flex overflow-x-auto no-scrollbar -mx-1 p-1">
                  <div className="flex flex-1 gap-1 bg-gray-100 p-1 rounded-2xl min-w-max sm:min-w-0">
                    {[
                      { key: 'video', icon: Play, label: 'Video', show: !!content?.cur?.video_url },
                      { key: 'notes', icon: BookOpen, label: 'Notes' },
                      { key: 'flashcards', icon: Zap, label: 'Cards' },
                      { key: 'quiz', icon: HelpCircle, label: `Quiz`, disabled: !quiz || !quiz.al_questions?.length },
                    ].filter(t => t.show !== false).map((t) => (
                      <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
                        className={clsx('flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                          t.disabled && 'opacity-40 cursor-not-allowed')}>
                        <t.icon size={14} className="shrink-0" />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="transition-all duration-300">
                {tab === 'video' && content?.cur?.video_url && (
                  <div className="bg-black rounded-2xl overflow-hidden shadow-lg shadow-gray-200" style={{ aspectRatio: '16/9' }}>
                    <iframe src={content.cur.video_url.includes('youtube.com/embed') ? content.cur.video_url : `https://www.youtube.com/embed/${content.cur.video_url.match(/[?&]v=([^&]+)/)?.[1] || ''}`}
                      className="w-full h-full" allowFullScreen title="Lesson" />
                  </div>
                )}

                {tab === 'notes' && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
                    {content?.cur?.note_content ? (
                      <div className="prose prose-sm sm:prose-base max-w-none prose-blue prose-headings:font-bold prose-a:text-blue-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.cur.note_content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-400">
                        <BookOpen size={40} className="mx-auto mb-3 text-gray-200" />
                        <p>No notes available for this section.</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'flashcards' && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <FlashcardDeck subUnitId={activeSubUnit} language={language} onComplete={() => setTab('quiz')} />
                  </div>
                )}

                {tab === 'quiz' && quiz && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle size={32} className="text-blue-600" />
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 mb-1">Knowledge Check</h3>
                    <p className="text-sm text-gray-500 mb-6">{quiz.al_questions?.length} questions · Pass mark: {quiz.pass_mark_percent}%</p>
                    <a href={`/al/quiz/${quiz.id}`} className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                      Start Quiz <ChevronRight size={18} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}