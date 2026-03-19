import { useEffect, useState, useRef } from 'react'
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
  BookMarked, Lightbulb, AlertCircle, Star, List, FileText, Trophy
} from 'lucide-react'
import clsx from 'clsx'

const LANG_LABELS = { english:'English', sinhala:'සිංහල', tamil:'தமிழ்' }

function toEmbed(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/)
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : url
}

function parseSections(md) {
  if (!md?.trim()) return []
  const lines = md.split('\n')
  const out = []; let cur = null
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/); const h2 = line.match(/^##\s+(.+)/)
    if (h1) { if(cur) out.push(cur); cur={type:'intro',title:h1[1],content:''} }
    else if (h2) { if(cur) out.push(cur); cur={type:'topic',title:h2[1],content:'',icon:detectIcon(h2[1])} }
    else { if(!cur) cur={type:'intro',title:'Introduction',content:''}; cur.content+=line+'\n' }
  }
  if (cur) out.push(cur)
  return out.filter(s=>s.content.trim()||s.title.trim())
}
function detectIcon(t) {
  t=t.toLowerCase()
  if(t.includes('definition')||t.includes('what')||t.includes('intro')||t.includes('overview')) return 'lightbulb'
  if(t.includes('example')||t.includes('practice')) return 'star'
  if(t.includes('important')||t.includes('note')||t.includes('remember')||t.includes('key')||t.includes('summary')) return 'alert'
  if(t.includes('formula')||t.includes('equation')||t.includes('law')) return 'list'
  return 'book'
}
const IC={
  book:     {I:BookMarked, a:'bg-blue-600 text-white',   idle:'bg-blue-50 text-blue-700 hover:bg-blue-100'},
  lightbulb:{I:Lightbulb, a:'bg-amber-500 text-white',  idle:'bg-amber-50 text-amber-700 hover:bg-amber-100'},
  star:     {I:Star,       a:'bg-purple-600 text-white', idle:'bg-purple-50 text-purple-700 hover:bg-purple-100'},
  alert:    {I:AlertCircle,a:'bg-red-500 text-white',    idle:'bg-red-50 text-red-700 hover:bg-red-100'},
  list:     {I:List,       a:'bg-green-600 text-white',  idle:'bg-green-50 text-green-700 hover:bg-green-100'},
}

function ZImg({src,alt}){
  const [open,setOpen]=useState(false); const [z,setZ]=useState(1)
  return(
    <>
      <figure className="my-4">
        <img src={src} alt={alt||''} onClick={()=>setOpen(true)}
          className="rounded-xl max-w-full shadow-sm border border-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
          onError={e=>{e.target.style.display='none'}}/>
        {alt&&<figcaption className="text-xs text-center text-gray-400 mt-2 italic">{alt}</figcaption>}
      </figure>
      {open&&(
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={()=>{setOpen(false);setZ(1)}}>
          <div className="relative" onClick={e=>e.stopPropagation()}>
            <img src={src} alt={alt} className="max-h-[80vh] max-w-[90vw] rounded-xl" style={{transform:`scale(${z})`,transition:'transform .2s'}}/>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 rounded-xl p-2">
              <button onClick={()=>setZ(s=>Math.max(0.5,s-.25))} className="p-2 rounded-lg text-white hover:bg-white/20"><ZoomOut size={15}/></button>
              <span className="px-2 py-2 text-white text-xs">{Math.round(z*100)}%</span>
              <button onClick={()=>setZ(s=>Math.min(3,s+.25))} className="p-2 rounded-lg text-white hover:bg-white/20"><ZoomIn size={15}/></button>
            </div>
            <button onClick={()=>{setOpen(false);setZ(1)}} className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white"><X size={17}/></button>
          </div>
        </div>
      )}
    </>
  )
}

function CodeBlock({inline,className,children}){
  const [copied,setCopied]=useState(false); const code=String(children).replace(/\n$/,'')
  if(inline) return <code className="bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded text-sm font-mono">{code}</code>
  return(
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-gray-400 text-xs">{className?.replace('language-','')||'code'}</span>
        <button onClick={()=>{navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000)}}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">{copied?'✓ Copied!':'Copy'}</button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm font-mono m-0"><code>{code}</code></pre>
    </div>
  )
}

const MD={
  img:({src,alt})=><ZImg src={src} alt={alt}/>,code:(p)=><CodeBlock {...p}/>,
  table:({children})=><div className="overflow-x-auto my-4 rounded-xl border border-gray-200"><table className="w-full text-sm">{children}</table></div>,
  thead:({children})=><thead className="bg-blue-50">{children}</thead>,
  th:({children})=><th className="px-4 py-2.5 text-left font-semibold text-blue-800 border-b-2 border-blue-200">{children}</th>,
  td:({children})=><td className="px-4 py-2.5 border-b border-gray-100 text-gray-700">{children}</td>,
  blockquote:({children})=><div className="my-4 rounded-xl border-l-4 border-blue-400 bg-blue-50 px-5 py-3 text-blue-800 text-sm leading-relaxed">{children}</div>,
  h3:({children})=><h3 className="text-base font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2"><span className="w-1 h-4 bg-blue-400 rounded-full inline-block"/>{children}</h3>,
  h4:({children})=><h4 className="text-sm font-bold text-gray-700 mt-4 mb-1">{children}</h4>,
  ul:({children})=><ul className="space-y-2 my-3">{children}</ul>,
  ol:({children})=><ol className="list-decimal list-inside space-y-2 my-3 text-gray-700">{children}</ol>,
  li:({children})=><li className="flex items-start gap-2 text-gray-700"><span className="text-blue-400 mt-1.5 shrink-0 text-xs">▸</span><span className="leading-relaxed">{children}</span></li>,
  p:({children})=><p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  strong:({children})=><strong className="font-semibold text-gray-900 bg-yellow-50 px-0.5 rounded">{children}</strong>,
  em:({children})=><em className="italic text-gray-600">{children}</em>,
  a:({href,children})=><a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{children}</a>,
  hr:()=><hr className="my-5 border-gray-200"/>,
}

// ── Notes viewer ───────────────────────────────────────────────────────────
function NotesViewer({content, onComplete}){
  const sections = parseSections(content)
  const [idx,setIdx] = useState(0)
  const contentRef = useRef(null)

  useEffect(()=>{ if(contentRef.current) contentRef.current.scrollIntoView({behavior:'smooth',block:'start'}) },[idx])

  if(!sections.length) return <EmptyState icon={FileText} title="Notes coming soon" desc="Notes haven't been published yet."/>

  const cur = sections[idx]
  const st = IC[cur?.icon]||IC.book
  const Icon = st.I
  const isLast = idx === sections.length-1

  const goNext = () => {
    if(isLast) { onComplete && onComplete() }
    else { setIdx(i=>i+1) }
  }
  const goPrev = () => setIdx(i=>Math.max(0,i-1))

  return (
    <div>
      {/* Topic selector — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4 -mx-1 px-1">
        {sections.map((s,i)=>{
          const sst=IC[s.icon]||IC.book; const SIcon=sst.I; const isActive=idx===i
          return(
            <button key={i} onClick={()=>setIdx(i)}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border-2',
                isActive?`${sst.a} border-transparent shadow-sm`:`${sst.idle} border-transparent`)}>
              <SIcon size={12}/><span className="whitespace-nowrap">{s.title||`Topic ${i+1}`}</span>
            </button>
          )
        })}
      </div>

      {/* Content card */}
      <div ref={contentRef} className="card overflow-hidden animate-fade-in" key={idx}>
        {/* Header */}
        <div className={clsx('flex items-center gap-3 px-5 py-3 border-b border-gray-100',
          idx===0?'bg-blue-50':'bg-gray-50')}>
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',st.a)}>
            <Icon size={17}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{cur.title}</p>
            <p className="text-xs text-gray-400">Topic {idx+1} of {sections.length}</p>
          </div>
          {/* Mini progress dots */}
          <div className="flex gap-1 shrink-0">
            {sections.map((_,i)=>(
              <div key={i} onClick={()=>setIdx(i)}
                className={clsx('rounded-full cursor-pointer transition-all',
                  i<idx?'w-4 h-2 bg-blue-300':i===idx?'w-6 h-2 bg-blue-600':'w-2 h-2 bg-gray-200')}/>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{cur.content}</ReactMarkdown>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-5 pb-5 pt-2 border-t border-gray-100">
          <button onClick={goPrev} disabled={idx===0}
            className="btn-sm btn-white gap-1.5 disabled:opacity-30">
            <ChevronLeft size={14}/> Prev
          </button>
          <span className="text-xs text-gray-400">{idx+1} / {sections.length}</span>
          <button onClick={goNext}
            className={clsx('btn-sm gap-1.5', isLast?'btn-blue':'btn-blue')}>
            {isLast ? <><Zap size={14}/> Flashcards</> : <>Next <ChevronRight size={14}/></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Video player ───────────────────────────────────────────────────────────
function VideoPlayer({url}){
  const isFile=/\.(mp4|webm|ogg)$/i.test(url)
  return(
    <div className="rounded-2xl overflow-hidden bg-gray-900 shadow-lg">
      {isFile?<video controls className="w-full max-h-80" src={url}/>
        :<div className="relative" style={{paddingBottom:'56.25%'}}>
          <iframe src={toEmbed(url)} className="absolute inset-0 w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Lesson video"/>
        </div>}
    </div>
  )
}

// ── Flashcard deck ─────────────────────────────────────────────────────────
function FlashcardDeck({unitId, language, onComplete}){
  const [cards,setCards]=useState([]); const [loading,setLoading]=useState(true)
  const [idx,setIdx]=useState(0); const [flipped,setFlipped]=useState(false)
  const [known,setKnown]=useState([]); const [hint,setHint]=useState(false)
  useEffect(()=>{
    setLoading(true);setIdx(0);setFlipped(false);setKnown([]);setHint(false)
    supabase.from('flashcards').select('*').eq('unit_id',unitId).eq('language',language).order('order_index')
      .then(({data})=>{
        if(data?.length){setCards(data);setLoading(false)}
        else supabase.from('flashcards').select('*').eq('unit_id',unitId).eq('language','english').order('order_index')
          .then(({data:d})=>{setCards(d||[]);setLoading(false)})
      })
  },[unitId,language])
  if(loading) return <div className="skeleton h-56 rounded-2xl"/>
  if(!cards.length) return(
    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
      <Zap size={32} className="text-gray-300 mb-3"/>
      <p className="font-semibold text-gray-500">No flashcards yet</p>
      <p className="text-sm text-gray-400 mt-1">The teacher hasn't added flashcards for this unit.</p>
      <button onClick={()=>onComplete&&onComplete()} className="btn-sm btn-blue mt-4 gap-1.5">Skip to Quiz <ChevronRight size={13}/></button>
    </div>
  )
  const remaining=cards.filter((_,i)=>!known.includes(i))
  if(!remaining.length) return(
    <div className="flex flex-col items-center justify-center py-10 bg-green-50 rounded-2xl border-2 border-green-200 text-center">
      <div className="text-5xl mb-3">🎉</div>
      <p className="font-bold text-xl text-gray-900">All {cards.length} cards done!</p>
      <div className="flex gap-3 mt-4">
        <button onClick={()=>{setKnown([]);setIdx(0);setFlipped(false)}} className="btn-md btn-white gap-2"><RotateCcw size={15}/> Again</button>
        <button onClick={()=>onComplete&&onComplete()} className="btn-md btn-blue gap-2">Go to Quiz <ChevronRight size={15}/></button>
      </div>
    </div>
  )
  const card=remaining[idx%remaining.length]; const origIdx=cards.indexOf(card)
  const progress=Math.round((known.length/cards.length)*100)
  return(
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/>{known.length} known</span>
        <span>{remaining.length} remaining</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{width:progress+'%'}}/>
      </div>
      <div onClick={()=>{setFlipped(!flipped);setHint(false)}}
        className={clsx('min-h-[180px] sm:min-h-[200px] rounded-2xl flex flex-col items-center justify-center p-6 sm:p-8 text-center cursor-pointer select-none transition-all duration-200',
          flipped?'bg-green-50 border-2 border-green-300 shadow-md':'bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md')}>
        {!flipped?(
          <div className="w-full">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Term</p>
            <p className="font-bold text-xl sm:text-2xl text-gray-900 leading-snug">{card.term}</p>
            {card.hint&&!hint&&<button onClick={e=>{e.stopPropagation();setHint(true)}} className="mt-4 text-xs text-blue-500 hover:underline">Show hint</button>}
            {hint&&<p className="mt-3 text-sm text-blue-700 bg-white/80 rounded-xl px-4 py-2">{card.hint}</p>}
            <p className="text-xs text-gray-400 mt-5">Tap to reveal</p>
          </div>
        ):(
          <div>
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4">Definition</p>
            <p className="text-gray-800 text-base sm:text-lg leading-relaxed">{card.definition}</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={()=>{setKnown(k=>[...k,origIdx]);setIdx(i=>i+1);setFlipped(false);setHint(false)}}
          className="btn-lg btn-green flex-1 gap-2"><CheckCircle2 size={18}/> Got it!</button>
        <button onClick={()=>{setIdx(i=>i+1);setFlipped(false);setHint(false)}}
          className="btn-lg btn-white flex-1 gap-2"><ChevronRight size={18}/> Skip</button>
      </div>
    </div>
  )
}

// ── Floating progress (mobile popup) ──────────────────────────────────────
function FloatingProgress({tabs, currentTab, show, onClose}){
  if(!show) return null
  const tabIdx=tabs.findIndex(t=>t.key===currentTab)
  const pct=Math.round(((tabIdx+1)/tabs.length)*100)
  return(
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 min-w-[260px]">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-300">{tabs[tabIdx]?.label}</span>
            <span className="text-blue-400 font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{width:pct+'%'}}/>
          </div>
          <div className="flex gap-1 mt-2">
            {tabs.map((_,i)=>(
              <div key={i} className={clsx('rounded-full transition-all',
                i<tabIdx?'h-1.5 w-4 bg-blue-400':i===tabIdx?'h-1.5 w-6 bg-blue-500':'h-1.5 w-1.5 bg-gray-600')}/>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 shrink-0"><X size={14}/></button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SubjectDetailPage(){
  const {subjectId}=useParams(); const {user}=useAuthStore(); const navigate=useNavigate()
  const [subject,setSubject]=useState(null); const [chapters,setChapters]=useState([])
  const [expanded,setExpanded]=useState({}); const [activeUnit,setActiveUnit]=useState(null)
  const [tab,setTab]=useState('video'); const [activeLang,setActiveLang]=useState('english')
  const [unitContent,setUnitContent]=useState([]); const [quiz,setQuiz]=useState(null)
  const [loading,setLoading]=useState(true); const [contentLoading,setContentLoading]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [showProgress,setShowProgress]=useState(false)
  const [completed,setCompleted]=useState(()=>{try{return JSON.parse(localStorage.getItem('q_done_'+subjectId)||'[]')}catch{return[]}})
  const contentAreaRef=useRef(null)

  const allUnits=chapters.flatMap(c=>c.units)
  const unitIdx=allUnits.findIndex(u=>u.id===activeUnit)

  useEffect(()=>{fetchSubject()},[subjectId])
  useEffect(()=>{if(activeUnit)fetchUnit(activeUnit)},[activeUnit])

  // Show floating progress briefly on tab change
  useEffect(()=>{
    setShowProgress(true)
    const t=setTimeout(()=>setShowProgress(false),3000)
    return ()=>clearTimeout(t)
  },[tab])

  const fetchSubject=async()=>{
    setLoading(true)
    const [sRes,cRes]=await Promise.all([
      supabase.from('subjects').select('*').eq('id',subjectId).single(),
      supabase.from('chapters').select('id,title,order_index,units(id,title,order_index,is_active)')
        .eq('subject_id',subjectId).eq('is_active',true).order('order_index'),
    ])
    if(sRes.data) setSubject(sRes.data)
    const chaps=(cRes.data||[]).map(c=>({...c,units:(c.units||[]).filter(u=>u.is_active).sort((a,b)=>a.order_index-b.order_index)}))
    setChapters(chaps)
    const allExpanded={}; chaps.forEach(c=>{allExpanded[c.id]=true}); setExpanded(allExpanded)
    setLoading(false)
  }

  const fetchUnit=async(unitId)=>{
    setContentLoading(true)
    const [cRes,qRes]=await Promise.all([
      supabase.from('unit_content').select('*').eq('unit_id',unitId),
      supabase.from('quizzes').select('id,pass_mark_percent,time_limit_seconds,is_active,questions(id)').eq('unit_id',unitId).eq('is_active',true).maybeSingle(),
    ])
    setUnitContent(cRes.data||[]); setQuiz(qRes.data||null)
    const hasVideo=cRes.data?.some(c=>c.video_url?.trim())
    setTab(hasVideo?'video':'notes')
    setContentLoading(false)
    if(contentAreaRef.current) contentAreaRef.current.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const toggleDone=(id)=>{
    const next=completed.includes(id)?completed.filter(x=>x!==id):[...completed,id]
    setCompleted(next); localStorage.setItem('q_done_'+subjectId,JSON.stringify(next))
  }
  const goUnit=(unit)=>{
    setActiveUnit(unit.id)
    const ch=chapters.find(c=>c.units.some(u=>u.id===unit.id))
    if(ch) setExpanded(p=>({...p,[ch.id]:true}))
    setSidebarOpen(false)
  }

  const cur=unitContent.find(c=>c.language===activeLang)||unitContent.find(c=>c.language==='english')||unitContent[0]
  const langs=unitContent.map(c=>c.language)
  const unitTitle=allUnits.find(u=>u.id===activeUnit)?.title
  const donePct=allUnits.length?Math.round((completed.filter(id=>allUnits.some(u=>u.id===id)).length/allUnits.length)*100):0

  const TABS=[
    {key:'video',icon:Play,label:'Video',show:!!cur?.video_url},
    {key:'notes',icon:BookOpen,label:'Notes'},
    {key:'flashcards',icon:Zap,label:'Cards'},
    {key:'quiz',icon:HelpCircle,label:'Quiz',badge:quiz?.questions?.length,disabled:!quiz},
  ].filter(t=>t.show!==false)

  const tabIdx=TABS.findIndex(t=>t.key===tab)
  const nextTab=TABS[tabIdx+1]
  const goNextTab=()=>{ if(nextTab&&!nextTab.disabled){setTab(nextTab.key); if(contentAreaRef.current) contentAreaRef.current.scrollIntoView({behavior:'smooth',block:'start'})} }

  const SidebarContent=()=>(
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
        <h1 className="font-bold text-lg mb-1">{subject?.name}</h1>
        <div className="flex gap-3 text-sm text-blue-200 mb-3"><span>{chapters.length} chapters</span><span>{allUnits.length} units</span></div>
        <div>
          <div className="flex justify-between text-xs text-blue-200 mb-1"><span>Progress</span><span>{donePct}%</span></div>
          <div className="h-2 bg-blue-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{width:donePct+'%'}}/>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chapters.map((ch,ci)=>(
          <div key={ch.id} className="rounded-xl overflow-hidden border border-gray-100">
            <button onClick={()=>setExpanded(p=>({...p,[ch.id]:!p[ch.id]}))}
              className="w-full flex items-center gap-3 px-3 py-3 text-left bg-white hover:bg-gray-50 transition-colors">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{ci+1}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{ch.title}</p><p className="text-xs text-gray-400">{ch.units.length} units</p></div>
              <ChevronDown size={14} className={clsx('text-gray-400 transition-transform shrink-0',expanded[ch.id]&&'rotate-180')}/>
            </button>
            {expanded[ch.id]&&(
              <div className="bg-gray-50 border-t border-gray-100">
                {ch.units.map((unit,ui)=>{
                  const isActive=activeUnit===unit.id; const isDone=completed.includes(unit.id)
                  return(
                    <button key={unit.id} onClick={()=>goUnit(unit)}
                      className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2',
                        isActive?'bg-blue-50 border-blue-600':'border-transparent hover:bg-white hover:border-gray-300')}>
                      <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center shrink-0',isDone?'bg-green-500':isActive?'bg-blue-600':'bg-gray-200')}>
                        {isDone?<CheckCircle2 size={11} className="text-white"/>:<span className={clsx('text-xs font-bold',isActive?'text-white':'text-gray-500')}>{ui+1}</span>}
                      </div>
                      <span className={clsx('text-sm flex-1 leading-snug',isActive?'text-blue-700 font-medium':isDone?'text-green-700':'text-gray-600')}>{unit.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  if(loading) return(
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex gap-6">
        <div className="hidden lg:block w-72 space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="skeleton h-12"/>)}</div>
        <div className="flex-1 space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-24"/>)}</div>
      </div>
    </div>
  )

  return(
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
        <button onClick={()=>navigate(-1)} className="flex items-center gap-1 hover:text-blue-600 transition-colors"><ArrowLeft size={14}/> Subjects</button>
        <ChevronRight size={14}/><span className="text-gray-900 font-medium">{subject?.name}</span>
        <Badge color="blue">Grade {subject?.grade}</Badge>
      </div>

      {/* Mobile unit bar */}
      <div className="lg:hidden flex items-center justify-between mb-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-xs text-gray-400">Current unit</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{unitTitle||'Select a unit'}</p>
        </div>
        <button onClick={()=>setSidebarOpen(true)} className="btn-sm btn-white gap-2 shrink-0">
          <BookOpen size={14}/> Units
        </button>
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen&&(
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setSidebarOpen(false)}/>
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
              <span className="font-bold text-gray-900">Units</span>
              <button onClick={()=>setSidebarOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-hidden"><SidebarContent/></div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{maxHeight:'calc(100vh - 120px)',position:'sticky',top:'80px'}}>
          <SidebarContent/>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0" ref={contentAreaRef}>
          {!activeUnit?(
            /* Chapter overview */
            <div className="space-y-4 animate-fade-in">
              <div className="card p-5">
                <h2 className="font-bold text-xl text-gray-900 mb-1">{subject?.name}</h2>
                <p className="text-gray-500 text-sm">Grade {subject?.grade} · {chapters.length} chapters · {allUnits.length} units</p>
              </div>
              {chapters.map((ch,ci)=>(
                <div key={ch.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-blue-50 border-b border-blue-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">{ci+1}</div>
                    <div><p className="font-bold text-gray-900">{ch.title}</p><p className="text-xs text-gray-500">{ch.units.length} units</p></div>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ch.units.map((unit,ui)=>(
                      <button key={unit.id} onClick={()=>goUnit(unit)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group">
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 text-gray-500 group-hover:text-blue-700 font-bold text-sm flex items-center justify-center shrink-0 transition-colors">{ui+1}</div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 flex-1 leading-snug">{unit.title}</span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors"/>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ):contentLoading?(
            <div className="space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-20"/>)}</div>
          ):(
            <div className="space-y-3">
              {/* Unit header — compact */}
              <div className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{chapters.find(c=>c.units.some(u=>u.id===activeUnit))?.title}</p>
                    <h2 className="font-bold text-lg text-gray-900 leading-snug">{unitTitle}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Language — compact pills */}
                    {langs.length>1&&(
                      <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
                        {langs.map(lang=>(
                          <button key={lang} onClick={()=>setActiveLang(lang)}
                            className={clsx('px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                              activeLang===lang?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
                            {lang==='english'?'EN':lang==='sinhala'?'SI':'TA'}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Mark done */}
                    <button onClick={()=>toggleDone(activeUnit)}
                      className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all',
                        completed.includes(activeUnit)?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {completed.includes(activeUnit)?<><CheckCircle2 size={11}/> Done</>:<><Circle size={11}/> Done?</>}
                    </button>
                  </div>
                </div>

                {/* Tab bar — compact with step numbers */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                  {TABS.map((t,ti)=>(
                    <button key={t.key} onClick={()=>!t.disabled&&setTab(t.key)} disabled={t.disabled}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all',
                        tab===t.key?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700',
                        t.disabled&&'opacity-40 cursor-not-allowed'
                      )}>
                      <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        tab===t.key?'bg-blue-600 text-white':'bg-gray-300 text-gray-600')}>{ti+1}</div>
                      <t.icon size={13} className="shrink-0"/>
                      <span className="hidden xs:inline sm:inline truncate">{t.label}</span>
                      {t.badge>0&&<span className="bdg-blue text-xs hidden sm:inline">{t.badge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video */}
              {tab==='video'&&cur?.video_url&&(
                <div className="space-y-3 animate-fade-in">
                  <div className="card p-1 overflow-hidden"><VideoPlayer url={cur.video_url}/></div>
                  <div className="flex justify-end">
                    <button onClick={goNextTab} className="btn-md btn-blue gap-2">Next: Notes <ChevronRight size={15}/></button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {tab==='notes'&&(
                <div className="card p-4 sm:p-5 animate-fade-in">
                  <NotesViewer content={cur?.note_content||''} onComplete={()=>{ if(nextTab&&!nextTab.disabled) setTab(nextTab.key) }}/>
                </div>
              )}

              {/* Flashcards */}
              {tab==='flashcards'&&(
                <div className="card p-4 sm:p-6 animate-fade-in">
                  <FlashcardDeck unitId={activeUnit} language={activeLang} onComplete={()=>{ if(nextTab&&!nextTab.disabled) setTab(nextTab.key) }}/>
                </div>
              )}

              {/* Quiz */}
              {tab==='quiz'&&quiz&&(
                <div className="card p-4 sm:p-6 animate-fade-in">
                  <h3 className="font-bold text-xl text-gray-900 mb-1">Quiz</h3>
                  <p className="text-gray-500 text-sm mb-4">{unitTitle}</p>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[{label:'Questions',value:quiz.questions?.length||0},{label:'Pass mark',value:`${quiz.pass_mark_percent}%`},{label:'Time',value:quiz.time_limit_seconds?`${Math.round(quiz.time_limit_seconds/60)} min`:'Unlimited'}].map(i=>(
                      <div key={i.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                        <div className="font-bold text-xl text-gray-900">{i.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{i.label}</div>
                      </div>
                    ))}
                  </div>
                  {user
                    ?<Link to={`/quiz/${quiz.id}`} className="btn-lg btn-blue w-full justify-center gap-2">Start Quiz <ChevronRight size={18}/></Link>
                    :<div className="text-center space-y-3">
                      <p className="text-sm text-gray-500">Login to take the quiz and save your score</p>
                      <Link to="/login" className="btn-lg btn-blue gap-2 inline-flex"><Lock size={16}/> Login to Start</Link>
                    </div>
                  }
                  {/* Prev/Next unit — only in quiz */}
                  {allUnits.length>1&&(
                    <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                      {unitIdx>0&&(
                        <button onClick={()=>goUnit(allUnits[unitIdx-1])} className="btn-md btn-white gap-2 flex-1 justify-center min-w-0">
                          <ChevronLeft size={15}/><span className="truncate text-xs sm:text-sm">{allUnits[unitIdx-1].title}</span>
                        </button>
                      )}
                      {unitIdx<allUnits.length-1&&(
                        <button onClick={()=>{toggleDone(activeUnit);goUnit(allUnits[unitIdx+1])}} className="btn-md btn-blue gap-2 flex-1 justify-center min-w-0">
                          <span className="truncate text-xs sm:text-sm">{allUnits[unitIdx+1].title}</span><ChevronRight size={15}/>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating progress — shows briefly on tab change */}
      <FloatingProgress tabs={TABS} currentTab={tab} show={showProgress&&!!activeUnit} onClose={()=>setShowProgress(false)}/>
    </div>
  )
}
