import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, Badge } from '@/components/ui'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen, ChevronDown, ChevronRight, ChevronLeft,
  HelpCircle, Lock, ArrowLeft, CheckCircle2, Circle,
  ZoomIn, ZoomOut, X, Zap, RotateCcw, Play,
  BookMarked, Lightbulb, AlertCircle, Star, List, FileText
} from 'lucide-react'
import clsx from 'clsx'

const LANG_LABELS = { english: 'English', sinhala: 'සිංහල', tamil: 'தமிழ்' }

function toEmbed(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/)
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : url
}

// ── Parse markdown into topic sections by ## headings ─────────────────────
function parseSections(md) {
  if (!md?.trim()) return []
  const lines = md.split('\n')
  const out = []; let cur = null
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    if (h1) {
      if (cur) out.push(cur)
      cur = { type: 'intro', title: h1[1], content: '' }
    } else if (h2) {
      if (cur) out.push(cur)
      cur = { type: 'topic', title: h2[1], content: '', icon: detectIcon(h2[1]) }
    } else {
      if (!cur) cur = { type: 'intro', title: 'Introduction', content: '' }
      cur.content += line + '\n'
    }
  }
  if (cur) out.push(cur)
  return out.filter(s => s.content.trim() || s.title.trim())
}

function detectIcon(t) {
  t = t.toLowerCase()
  if (t.includes('definition') || t.includes('what') || t.includes('intro') || t.includes('overview') || t.includes('meaning')) return 'lightbulb'
  if (t.includes('example') || t.includes('practice') || t.includes('exercise')) return 'star'
  if (t.includes('important') || t.includes('note') || t.includes('remember') || t.includes('key') || t.includes('summary')) return 'alert'
  if (t.includes('formula') || t.includes('equation') || t.includes('law')) return 'list'
  return 'book'
}

const ICON_MAP = {
  book:      { I: BookMarked,  active: 'bg-blue-600 text-white',   idle: 'bg-blue-50 text-blue-700 hover:bg-blue-100',   dot: 'bg-blue-500'   },
  lightbulb: { I: Lightbulb,  active: 'bg-amber-500 text-white',  idle: 'bg-amber-50 text-amber-700 hover:bg-amber-100',  dot: 'bg-amber-500'  },
  star:      { I: Star,        active: 'bg-purple-600 text-white', idle: 'bg-purple-50 text-purple-700 hover:bg-purple-100', dot: 'bg-purple-500' },
  alert:     { I: AlertCircle, active: 'bg-red-500 text-white',    idle: 'bg-red-50 text-red-700 hover:bg-red-100',      dot: 'bg-red-500'    },
  list:      { I: List,        active: 'bg-green-600 text-white',  idle: 'bg-green-50 text-green-700 hover:bg-green-100',  dot: 'bg-green-500'  },
}

// ── Zoomable image ─────────────────────────────────────────────────────────
function ZImg({ src, alt }) {
  const [open, setOpen] = useState(false)
  const [z, setZ] = useState(1)
  return (
    <>
      <figure className="my-4">
        <img src={src} alt={alt || ''} onClick={() => setOpen(true)}
          className="rounded-xl max-w-full shadow-sm border border-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
          onError={e => { e.target.style.display = 'none' }} />
        {alt && <figcaption className="text-xs text-center text-gray-400 mt-2 italic">{alt}</figcaption>}
      </figure>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => { setOpen(false); setZ(1) }}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={src} alt={alt} className="max-h-[80vh] max-w-[90vw] rounded-xl"
              style={{ transform: `scale(${z})`, transition: 'transform .2s' }} />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 rounded-xl p-2">
              <button onClick={() => setZ(s => Math.max(0.5, s - .25))} className="p-2 rounded-lg text-white hover:bg-white/20"><ZoomOut size={15} /></button>
              <span className="px-2 py-2 text-white text-xs">{Math.round(z * 100)}%</span>
              <button onClick={() => setZ(s => Math.min(3, s + .25))} className="p-2 rounded-lg text-white hover:bg-white/20"><ZoomIn size={15} /></button>
            </div>
            <button onClick={() => { setOpen(false); setZ(1) }}
              className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white"><X size={17} /></button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Code block ─────────────────────────────────────────────────────────────
function CodeBlock({ inline, className, children }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')
  if (inline) return <code className="bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded text-sm font-mono">{code}</code>
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-gray-400 text-xs">{className?.replace('language-', '') || 'code'}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm font-mono m-0"><code>{code}</code></pre>
    </div>
  )
}

// ── Markdown component map ─────────────────────────────────────────────────
const MD = {
  img:        ({ src, alt }) => <ZImg src={src} alt={alt} />,
  code:       (p) => <CodeBlock {...p} />,
  table:      ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-gray-200"><table className="w-full text-sm">{children}</table></div>,
  thead:      ({ children }) => <thead className="bg-blue-50">{children}</thead>,
  th:         ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-blue-800 border-b-2 border-blue-200">{children}</th>,
  td:         ({ children }) => <td className="px-4 py-2.5 border-b border-gray-100 text-gray-700">{children}</td>,
  blockquote: ({ children }) => <div className="my-4 rounded-xl border-l-4 border-blue-400 bg-blue-50 px-5 py-3 text-blue-800 text-sm leading-relaxed">{children}</div>,
  h3:         ({ children }) => <h3 className="text-base font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2"><span className="w-1 h-4 bg-blue-400 rounded-full inline-block" />{children}</h3>,
  h4:         ({ children }) => <h4 className="text-sm font-bold text-gray-700 mt-4 mb-1">{children}</h4>,
  ul:         ({ children }) => <ul className="space-y-2 my-3">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-inside space-y-2 my-3 text-gray-700">{children}</ol>,
  li:         ({ children }) => <li className="flex items-start gap-2 text-gray-700"><span className="text-blue-400 mt-1.5 shrink-0 text-xs">▸</span><span className="leading-relaxed">{children}</span></li>,
  p:          ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold text-gray-900 bg-yellow-50 px-0.5 rounded">{children}</strong>,
  em:         ({ children }) => <em className="italic text-gray-600">{children}</em>,
  a:          ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{children}</a>,
  hr:         () => <hr className="my-5 border-gray-200" />,
}

// ── Notes viewer with topic pills ──────────────────────────────────────────
function NotesViewer({ content }) {
  const sections = parseSections(content)
  const [activeTopic, setActiveTopic] = useState(0)

  if (!sections.length) return (
    <EmptyState icon={FileText} title="Notes coming soon" desc="Notes haven't been published yet." />
  )

  const active = sections[activeTopic]
  const st = ICON_MAP[active?.icon] || ICON_MAP.book
  const Icon = st.I

  return (
    <div className="flex flex-col gap-4">
      {/* Topic pill selector */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s, i) => {
          const sst = ICON_MAP[s.icon] || ICON_MAP.book
          const SIcon = sst.I
          const isActive = activeTopic === i
          return (
            <button key={i} onClick={() => setActiveTopic(i)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border-2',
                isActive
                  ? `${sst.active} border-transparent shadow-sm scale-105`
                  : `${sst.idle} border-transparent`
              )}>
              <SIcon size={14} />
              {s.title || `Topic ${i + 1}`}
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-1" />}
            </button>
          )
        })}
      </div>

      {/* Active topic content */}
      <div className={clsx(
        'card overflow-hidden animate-fade-in',
      )} key={activeTopic}>
        {/* Topic header */}
        <div className={clsx('flex items-center gap-3 px-6 py-4 border-b border-gray-100',
          activeTopic === 0 ? 'bg-blue-50' : 'bg-gray-50')}>
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', st.active)}>
            <Icon size={17} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{active.title}</p>
            <p className="text-xs text-gray-400">
              Topic {activeTopic + 1} of {sections.length}
            </p>
          </div>
          {/* prev / next within topics */}
          <div className="ml-auto flex items-center gap-1">
            <button disabled={activeTopic === 0}
              onClick={() => setActiveTopic(i => i - 1)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-all">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-gray-400 px-1">{activeTopic + 1}/{sections.length}</span>
            <button disabled={activeTopic === sections.length - 1}
              onClick={() => setActiveTopic(i => i + 1)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
            {active.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// ── Video player ───────────────────────────────────────────────────────────
function VideoPlayer({ url }) {
  const isFile = /\.(mp4|webm|ogg)$/i.test(url)
  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 shadow-lg">
      {isFile
        ? <video controls className="w-full max-h-96" src={url} />
        : <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe src={toEmbed(url)} className="absolute inset-0 w-full h-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Lesson video" />
          </div>
      }
    </div>
  )
}

// ── Flashcard deck ─────────────────────────────────────────────────────────
function FlashcardDeck({ unitId, language }) {
  const [cards, setCards]   = useState([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx]       = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown]   = useState([])
  const [hint, setHint]     = useState(false)

  useEffect(() => {
    setLoading(true); setIdx(0); setFlipped(false); setKnown([]); setHint(false)
    supabase.from('flashcards').select('*').eq('unit_id', unitId).eq('language', language).order('order_index')
      .then(({ data }) => {
        if (data?.length) { setCards(data); setLoading(false) }
        else supabase.from('flashcards').select('*').eq('unit_id', unitId).eq('language', 'english').order('order_index')
          .then(({ data: d }) => { setCards(d || []); setLoading(false) })
      })
  }, [unitId, language])

  if (loading) return <div className="skeleton h-56 rounded-2xl" />

  if (!cards.length) return (
    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <Zap size={32} className="text-gray-300 mb-3" />
      <p className="font-semibold text-gray-500">No flashcards yet</p>
      <p className="text-sm text-gray-400 mt-1">The teacher hasn't added flashcards for this unit.</p>
    </div>
  )

  const remaining = cards.filter((_, i) => !known.includes(i))

  if (!remaining.length) return (
    <div className="flex flex-col items-center justify-center py-12 bg-green-50 rounded-2xl border-2 border-green-200 text-center">
      <div className="text-5xl mb-3">🎉</div>
      <p className="font-bold text-xl text-gray-900">All {cards.length} cards mastered!</p>
      <p className="text-gray-500 text-sm mt-1">Excellent! You've reviewed all the key terms.</p>
      <button onClick={() => { setKnown([]); setIdx(0); setFlipped(false); setHint(false) }}
        className="btn-md btn-blue mt-4 gap-2"><RotateCcw size={15} /> Start Over</button>
    </div>
  )

  const card = remaining[idx % remaining.length]
  const origIdx = cards.indexOf(card)
  const progress = Math.round((known.length / cards.length) * 100)

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" />{known.length} known</span>
        <span>{remaining.length} remaining</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: progress + '%' }} />
      </div>

      {/* Card flip */}
      <div onClick={() => { setFlipped(!flipped); setHint(false) }}
        className={clsx(
          'min-h-[220px] rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-200',
          flipped
            ? 'bg-green-50 border-2 border-green-300 shadow-md'
            : 'bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md'
        )}>
        {!flipped ? (
          <div className="w-full">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Term</p>
            <p className="font-bold text-2xl text-gray-900 leading-snug">{card.term}</p>
            {card.hint && !hint && (
              <button onClick={e => { e.stopPropagation(); setHint(true) }}
                className="mt-4 text-xs text-blue-500 hover:underline">Show hint</button>
            )}
            {hint && <p className="mt-3 text-sm text-blue-700 bg-white/80 rounded-xl px-4 py-2">{card.hint}</p>}
            <p className="text-xs text-gray-400 mt-6">Tap card to reveal definition</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4">Definition</p>
            <p className="text-gray-800 text-lg leading-relaxed">{card.definition}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={() => { setKnown(k => [...k, origIdx]); setIdx(i => i + 1); setFlipped(false); setHint(false) }}
          className="btn-lg btn-green flex-1 gap-2"><CheckCircle2 size={18} /> Got it!</button>
        <button onClick={() => { setIdx(i => i + 1); setFlipped(false); setHint(false) }}
          className="btn-lg btn-white flex-1 gap-2"><ChevronRight size={18} /> Skip</button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SubjectDetailPage() {
  const { subjectId } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [subject, setSubject]         = useState(null)
  const [chapters, setChapters]       = useState([])
  const [expanded, setExpanded]       = useState({})
  const [activeUnit, setActiveUnit]   = useState(null)
  const [tab, setTab]                 = useState('video') // video | notes | flashcards | quiz
  const [activeLang, setActiveLang]   = useState('english')
  const [unitContent, setUnitContent] = useState([])
  const [quiz, setQuiz]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [completed, setCompleted]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('q_done_' + subjectId) || '[]') } catch { return [] }
  })

  const allUnits = chapters.flatMap(c => c.units)
  const unitIdx  = allUnits.findIndex(u => u.id === activeUnit)

  useEffect(() => { fetchSubject() }, [subjectId])
  useEffect(() => { if (activeUnit) fetchUnit(activeUnit) }, [activeUnit])

  const fetchSubject = async () => {
    setLoading(true)
    const [sRes, cRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('id', subjectId).single(),
      supabase.from('chapters')
        .select('id,title,order_index,units(id,title,order_index,is_active)')
        .eq('subject_id', subjectId).eq('is_active', true).order('order_index'),
    ])
    if (sRes.data) setSubject(sRes.data)
    const chaps = (cRes.data || []).map(c => ({
      ...c, units: (c.units || []).filter(u => u.is_active).sort((a, b) => a.order_index - b.order_index)
    }))
    setChapters(chaps)
    if (chaps[0]?.units[0]) { setExpanded({ [chaps[0].id]: true }); setActiveUnit(chaps[0].units[0].id) }
    setLoading(false)
  }

  const fetchUnit = async (unitId) => {
    setContentLoading(true)
    const [cRes, qRes] = await Promise.all([
      supabase.from('unit_content').select('*').eq('unit_id', unitId),
      supabase.from('quizzes')
        .select('id,pass_mark_percent,time_limit_seconds,is_active,questions(id)')
        .eq('unit_id', unitId).eq('is_active', true).maybeSingle(),
    ])
    setUnitContent(cRes.data || [])
    setQuiz(qRes.data || null)
    // default tab: video if has video, else notes
    const hasVideo = cRes.data?.some(c => c.video_url?.trim())
    setTab(hasVideo ? 'video' : 'notes')
    setContentLoading(false)
  }

  const toggleDone = (id) => {
    const next = completed.includes(id) ? completed.filter(x => x !== id) : [...completed, id]
    setCompleted(next)
    localStorage.setItem('q_done_' + subjectId, JSON.stringify(next))
  }

  const goUnit = (unit) => {
    setActiveUnit(unit.id)
    const ch = chapters.find(c => c.units.some(u => u.id === unit.id))
    if (ch) setExpanded(p => ({ ...p, [ch.id]: true }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cur   = unitContent.find(c => c.language === activeLang) || unitContent.find(c => c.language === 'english') || unitContent[0]
  const langs = unitContent.map(c => c.language)
  const unitTitle = allUnits.find(u => u.id === activeUnit)?.title
  const donePct   = allUnits.length
    ? Math.round((completed.filter(id => allUnits.some(u => u.id === id)).length / allUnits.length) * 100) : 0

  const hasVideo = !!cur?.video_url
  const TABS = [
    { key: 'video',      icon: Play,        label: 'Video',      show: hasVideo },
    { key: 'notes',      icon: BookOpen,    label: 'Notes'       },
    { key: 'flashcards', icon: Zap,         label: 'Flashcards'  },
    { key: 'quiz',       icon: HelpCircle,  label: 'Quiz',       badge: quiz?.questions?.length, disabled: !quiz },
  ].filter(t => t.show !== false)

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex gap-6">
        <div className="w-72 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        <div className="flex-1 space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft size={14} /> Subjects
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{subject?.name}</span>
        <Badge color="blue">Grade {subject?.grade}</Badge>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
            <h1 className="font-bold text-xl mb-1">{subject?.name}</h1>
            {subject?.description && <p className="text-blue-200 text-sm line-clamp-2 mb-3">{subject.description}</p>}
            <div className="flex gap-4 text-sm text-blue-200 mb-3">
              <span>{chapters.length} chapters</span><span>{allUnits.length} units</span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-blue-200 mb-1"><span>Progress</span><span>{donePct}%</span></div>
              <div className="h-2 bg-blue-900/50 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: donePct + '%' }} />
              </div>
            </div>
          </div>

          {chapters.map((ch, ci) => (
            <div key={ch.id} className="card overflow-hidden">
              <button onClick={() => setExpanded(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{ci + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ch.title}</p>
                  <p className="text-xs text-gray-400">{ch.units.length} units</p>
                </div>
                <ChevronDown size={14} className={clsx('text-gray-400 transition-transform shrink-0', expanded[ch.id] && 'rotate-180')} />
              </button>
              {expanded[ch.id] && (
                <div className="border-t border-gray-100">
                  {ch.units.map((unit, ui) => {
                    const isActive = activeUnit === unit.id
                    const isDone   = completed.includes(unit.id)
                    return (
                      <button key={unit.id} onClick={() => goUnit(unit)}
                        className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2',
                          isActive ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50 hover:border-gray-300')}>
                        <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                          isDone ? 'bg-green-500' : isActive ? 'bg-blue-600' : 'bg-gray-200')}>
                          {isDone
                            ? <CheckCircle2 size={11} className="text-white" />
                            : <span className={clsx('text-xs font-bold', isActive ? 'text-white' : 'text-gray-500')}>{ui + 1}</span>}
                        </div>
                        <span className={clsx('text-sm truncate flex-1',
                          isActive ? 'text-blue-700 font-medium' : isDone ? 'text-green-700' : 'text-gray-600')}>
                          {unit.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* ── Main content ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!activeUnit ? (
            <EmptyState icon={BookOpen} title="Select a unit" desc="Choose a unit from the sidebar to start learning." />
          ) : contentLoading ? (
            <div className="space-y-4">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
          ) : (
            <div className="space-y-4 animate-fade-in">

              {/* Unit header */}
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                      {chapters.find(c => c.units.some(u => u.id === activeUnit))?.title}
                    </p>
                    <h2 className="font-bold text-xl text-gray-900">{unitTitle}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Language switcher */}
                    {langs.length > 1 && langs.map(lang => (
                      <button key={lang} onClick={() => setActiveLang(lang)}
                        className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          activeLang === lang ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                        {LANG_LABELS[lang]}
                      </button>
                    ))}
                    {/* Mark done */}
                    <button onClick={() => toggleDone(activeUnit)}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                        completed.includes(activeUnit) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {completed.includes(activeUnit) ? <><CheckCircle2 size={12} /> Done!</> : <><Circle size={12} /> Mark Done</>}
                    </button>
                  </div>
                </div>

                {/* Main tab bar */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => !t.disabled && setTab(t.key)}
                      disabled={t.disabled}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all',
                        tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                        t.disabled && 'opacity-40 cursor-not-allowed'
                      )}>
                      <t.icon size={15} />
                      <span className="hidden sm:inline">{t.label}</span>
                      {t.badge > 0 && <span className="bdg-blue text-xs">{t.badge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TAB: Video ── */}
              {tab === 'video' && cur?.video_url && (
                <div className="card p-1 overflow-hidden animate-fade-in">
                  <VideoPlayer url={cur.video_url} />
                </div>
              )}

              {/* ── TAB: Notes (with topic pills) ── */}
              {tab === 'notes' && (
                <div className="card p-6 animate-fade-in">
                  <NotesViewer content={cur?.note_content || ''} />
                </div>
              )}

              {/* ── TAB: Flashcards ── */}
              {tab === 'flashcards' && (
                <div className="card p-6 animate-fade-in">
                  <FlashcardDeck unitId={activeUnit} language={activeLang} />
                </div>
              )}

              {/* ── TAB: Quiz ── */}
              {tab === 'quiz' && quiz && (
                <div className="card p-6 animate-fade-in">
                  <h3 className="font-bold text-xl text-gray-900 mb-1">Quiz</h3>
                  <p className="text-gray-500 text-sm mb-5">{unitTitle}</p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Questions', value: quiz.questions?.length || 0 },
                      { label: 'Pass mark',  value: `${quiz.pass_mark_percent}%` },
                      { label: 'Time',       value: quiz.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} min` : 'Unlimited' },
                    ].map(info => (
                      <div key={info.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                        <div className="font-bold text-2xl text-gray-900">{info.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{info.label}</div>
                      </div>
                    ))}
                  </div>
                  {user
                    ? <Link to={`/quiz/${quiz.id}`} className="btn-lg btn-blue w-full justify-center gap-2">
                        Start Quiz <ChevronRight size={18} />
                      </Link>
                    : <div className="text-center space-y-3">
                        <p className="text-sm text-gray-500">Login to take the quiz and save your score</p>
                        <Link to="/login" className="btn-lg btn-blue gap-2 inline-flex">
                          <Lock size={16} /> Login to Start
                        </Link>
                      </div>
                  }
                </div>
              )}

              {/* Prev / Next unit */}
              <div className="flex gap-3">
                {unitIdx > 0 && (
                  <button onClick={() => goUnit(allUnits[unitIdx - 1])}
                    className="btn-md btn-white gap-2 flex-1 justify-center min-w-0">
                    <ChevronLeft size={15} /><span className="truncate">{allUnits[unitIdx - 1].title}</span>
                  </button>
                )}
                {unitIdx < allUnits.length - 1 && (
                  <button onClick={() => { toggleDone(activeUnit); goUnit(allUnits[unitIdx + 1]) }}
                    className="btn-md btn-blue gap-2 flex-1 justify-center min-w-0">
                    <span className="truncate">{allUnits[unitIdx + 1].title}</span><ChevronRight size={15} />
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
