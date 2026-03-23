import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Sel, Modal, Badge, PageHead, EmptyState, Field } from '@/components/ui'
import {
  Plus, Edit2, Trash2, ChevronRight, ArrowLeft,
  Bold, Italic, Heading2, Heading3, List, Quote, Code,
  Eye, EyeOff, X, Save, Video, FileText, Zap, Upload, Download, CheckCircle2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LANGS = ['english','sinhala','tamil']
const LANG_LABELS = { english:'English', sinhala:'සිංහල', tamil:'தமிழ்' }

function MarkdownEditor({ value, onChange, placeholder, minH=200 }) {
  const [preview, setPreview] = useState(false)
  const ref = useRef(null)
  const wrap=(b,a='',ph='text')=>{const el=ref.current;if(!el)return;const s=el.selectionStart,e=el.selectionEnd;const sel=value.slice(s,e)||ph;onChange(value.slice(0,s)+b+sel+a+value.slice(e));setTimeout(()=>{el.focus();el.setSelectionRange(s+b.length,s+b.length+sel.length)},0)}
  const line=(prefix)=>{const el=ref.current;if(!el)return;const s=el.selectionStart;const ls=value.lastIndexOf('\n',s-1)+1;onChange(value.slice(0,ls)+prefix+value.slice(ls));setTimeout(()=>el.focus(),0)}
  const tools=[{icon:Heading2,title:'## Topic',fn:()=>line('## ')},{icon:Heading3,title:'### Sub',fn:()=>line('### ')},{icon:Bold,title:'Bold',fn:()=>wrap('**','**','bold')},{icon:Italic,title:'Italic',fn:()=>wrap('*','*','italic')},{icon:Code,title:'Code',fn:()=>wrap('`','`','code')},{icon:List,title:'List',fn:()=>line('- ')},{icon:Quote,title:'Callout',fn:()=>line('> ')}]
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        {tools.map((t,i)=>(
          <button key={i} type="button" title={t.title} onClick={t.fn}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
            <t.icon size={14}/>
          </button>
        ))}
        <div className="flex-1"/>
        <button type="button" onClick={()=>setPreview(!preview)}
          className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
            preview?'bg-blue-100 text-blue-700':'text-gray-500 hover:bg-gray-200')}>
          {preview?<><EyeOff size={12}/> Edit</>:<><Eye size={12}/> Preview</>}
        </button>
      </div>
      {preview?(
        <div className="p-4 overflow-auto prose-sm text-gray-700 leading-relaxed" style={{minHeight:minH}}>
          {value?<ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            :<p className="text-gray-400 italic text-sm">Nothing to preview yet...</p>}
        </div>
      ):(
        <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-4 py-3 font-mono text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset resize-y"
          style={{minHeight:minH}}/>
      )}
    </div>
  )
}

function FlashcardRow({ card, onChange, onDelete, index }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-1">{index+1}</div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Term</label>
          <input value={card.term} onChange={e=>onChange({...card,term:e.target.value})}
            placeholder="e.g. Photosynthesis" className="inp text-sm py-2"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Definition</label>
          <input value={card.definition} onChange={e=>onChange({...card,definition:e.target.value})}
            placeholder="e.g. Process plants use..." className="inp text-sm py-2"/>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Hint (optional)</label>
          <input value={card.hint||''} onChange={e=>onChange({...card,hint:e.target.value})}
            placeholder="Memory aid..." className="inp text-sm py-2"/>
        </div>
      </div>
      <button onClick={onDelete} className="mt-1 p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"><X size={14}/></button>
    </div>
  )
}

// Completion dot indicator
function LangDots({ content, flashcards }) {
  return (
    <div className="flex gap-1.5 mt-1">
      {LANGS.map(lang=>{
        const hasContent = content[lang]?.note_content?.trim() || content[lang]?.video_url?.trim()
        const hasCards = (flashcards[lang]||[]).some(c=>c.term.trim())
        const done = hasContent || hasCards
        return <div key={lang} title={LANG_LABELS[lang]} className={clsx('w-2 h-2 rounded-full',done?'bg-green-500':'bg-gray-300')}/>
      })}
    </div>
  )
}

export default function AdminUnits() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeLang, setActiveLang] = useState('english')
  const [activeSection, setActiveSection] = useState('notes')
  const [form, setForm] = useState({
    order_index:1, is_active:true,
    titles:{ english:'', sinhala:'', tamil:'' },
    content:{ english:{note_content:'',video_url:'',status:'published'}, sinhala:{note_content:'',video_url:'',status:'draft'}, tamil:{note_content:'',video_url:'',status:'draft'} },
    flashcards:{ english:[], sinhala:[], tamil:[] },
  })
  const fcFileRef = useRef(null)

  useEffect(()=>{fetchData()},[chapterId])

  const fetchData = async () => {
    setLoading(true)
    const [cRes,uRes] = await Promise.all([
      supabaseAdmin.from('chapters').select('id,title,order_index,subjects(id,name,grade)').eq('id',chapterId).single(),
      supabaseAdmin.from('units')
        .select('id,order_index,title,is_active,unit_content(language,note_content,video_url,status),quizzes!quizzes_unit_id_fkey(id,is_active,questions(id,status)),unit_translations(language,title)')
        .eq('chapter_id',chapterId).order('order_index'),
    ])
    if(cRes.data) setChapter(cRes.data)
    setUnits(uRes.data||[])
    setLoading(false)
  }

  const blankForm = (n=0) => ({
    order_index:n, is_active:true,
    titles:{english:'',sinhala:'',tamil:''},
    content:{english:{note_content:'',video_url:'',status:'published'},sinhala:{note_content:'',video_url:'',status:'draft'},tamil:{note_content:'',video_url:'',status:'draft'}},
    flashcards:{english:[],sinhala:[],tamil:[]},
  })

  const openCreate = () => {
    setEditing(null); setActiveLang('english'); setActiveSection('notes')
    setForm(blankForm(units.length+1)); setModalOpen(true)
  }

  const openEdit = async (u) => {
    setEditing(u); setActiveLang('english'); setActiveSection('notes')
    const titles={english:u.title||'',sinhala:'',tamil:''}
    // Load ALL existing translations from translation table
    ;(u.unit_translations||[]).forEach(tr=>{
      titles[tr.language] = tr.title || ''
    })
    // Always ensure english fallback from main column
    if (!titles.english) titles.english = u.title || ''
    const content={english:{note_content:'',video_url:'',status:'published'},sinhala:{note_content:'',video_url:'',status:'draft'},tamil:{note_content:'',video_url:'',status:'draft'}}
    ;(u.unit_content||[]).forEach(c=>{content[c.language]={note_content:c.note_content||'',video_url:c.video_url||'',status:c.status||'draft'}})
    const {data:fcData}=await supabaseAdmin.from('flashcards').select('*').eq('unit_id',u.id).order('order_index')
    const flashcards={english:[],sinhala:[],tamil:[]}
    ;(fcData||[]).forEach(fc=>{if(flashcards[fc.language]) flashcards[fc.language].push({id:fc.id,term:fc.term,definition:fc.definition,hint:fc.hint||''})})
    setForm({order_index:u.order_index,is_active:u.is_active,titles,content,flashcards})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if(!form.titles.english.trim()){toast.error('English title is required');return}
    setSaving(true)
    try {
      let unitId=editing?.id
      if(editing){
        await supabaseAdmin.from('units').update({order_index:parseInt(form.order_index),title:form.titles.english.trim(),is_active:form.is_active}).eq('id',editing.id)
      } else {
        const {data:newUnit,error}=await supabaseAdmin.from('units')
          .insert({chapter_id:chapterId,order_index:parseInt(form.order_index),title:form.titles.english.trim(),is_active:form.is_active})
          .select().single()
        if(error) throw error
        unitId=newUnit.id
        await supabaseAdmin.from('quizzes').insert({unit_id:unitId,quiz_type:'practice',pass_mark_percent:50,is_active:true})
      }
      // Save unit translations for all 3 languages
      for(const lang of LANGS){
        if(form.titles[lang]?.trim()){
          await supabaseAdmin.from('unit_translations').upsert(
            {unit_id:unitId, language:lang, title:form.titles[lang].trim()},
            {onConflict:'unit_id,language'}
          )
        }
      }
      for(const lang of LANGS){
        const c=form.content[lang]
        await supabaseAdmin.from('unit_content').upsert(
          {unit_id:unitId,language:lang,note_content:c.note_content||null,video_url:c.video_url||null,status:c.status},
          {onConflict:'unit_id,language'}
        )
      }
      await supabaseAdmin.from('flashcards').delete().eq('unit_id',unitId)
      const allCards=[]
      for(const lang of LANGS){
        ;(form.flashcards[lang]||[]).forEach((card,i)=>{
          if(card.term.trim()&&card.definition.trim())
            allCards.push({unit_id:unitId,language:lang,term:card.term.trim(),definition:card.definition.trim(),hint:card.hint?.trim()||null,order_index:i})
        })
      }
      if(allCards.length) await supabaseAdmin.from('flashcards').insert(allCards)
      toast.success(editing?'Unit updated!':'Unit created!')
      setModalOpen(false); fetchData()
    } catch(err){toast.error(err.message)}
    setSaving(false)
  }

  const setContent=(lang,key,val)=>setForm(f=>({...f,content:{...f.content,[lang]:{...f.content[lang],[key]:val}}}))
  const addFC=(lang)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:[...(f.flashcards[lang]||[]),{term:'',definition:'',hint:''}]}}))
  const updateFC=(lang,idx,card)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:f.flashcards[lang].map((c,i)=>i===idx?card:c)}}))
  const deleteFC=(lang,idx)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:f.flashcards[lang].filter((_,i)=>i!==idx)}}))

  // Excel upload for flashcards
  const handleFCExcel = async (e) => {
    const file = e.target.files?.[0]; if(!file) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      const headerRow = ws.getRow(1).values
      const headers = Array.isArray(headerRow) ? headerRow.slice(1) : []
      const newCards = {english:[],sinhala:[],tamil:[]}
      ws.eachRow((row,rowNum)=>{
        if(rowNum===1) return
        const obj={}
        row.values.forEach((val,ci)=>{ if(ci>0&&headers[ci-1]) obj[headers[ci-1]]=val===null||val===undefined?'':String(val) })
        const term_en=obj.term_en||obj.term||''
        const def_en=obj.definition_en||obj.definition||''
        if(term_en.trim()&&def_en.trim()){
          newCards.english.push({term:term_en.trim(),definition:def_en.trim(),hint:obj.hint_en||''})
          if(obj.term_si) newCards.sinhala.push({term:obj.term_si,definition:obj.definition_si||def_en,hint:obj.hint_si||''})
          if(obj.term_ta) newCards.tamil.push({term:obj.term_ta,definition:obj.definition_ta||def_en,hint:obj.hint_ta||''})
        }
      })
      setForm(f=>({...f,flashcards:{...f.flashcards,...Object.fromEntries(LANGS.map(l=>[l,[...(f.flashcards[l]||[]),...(newCards[l]||[])]])) }}))
      const total = Object.values(newCards).reduce((s,a)=>s+a.length,0)
      toast.success(`Imported ${total} flashcards from Excel`)
    } catch(err){ toast.error('Excel error: '+err.message) }
    e.target.value=''
  }

  const downloadFCTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Flashcards')
    ws.columns = [
      {header:'term_en',key:'term_en',width:25},{header:'definition_en',key:'definition_en',width:40},{header:'hint_en',key:'hint_en',width:25},
      {header:'term_si',key:'term_si',width:25},{header:'definition_si',key:'definition_si',width:40},{header:'hint_si',key:'hint_si',width:25},
      {header:'term_ta',key:'term_ta',width:25},{header:'definition_ta',key:'definition_ta',width:40},{header:'hint_ta',key:'hint_ta',width:25},
    ]
    ws.getRow(1).eachCell(cell=>{ cell.font={bold:true,color:{argb:'FFFFFFFF'}}; cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}} })
    ws.addRow({term_en:'Photosynthesis',definition_en:'Process plants use to make food',hint_en:'Photo=light',term_si:'ප්‍රකාශ සංශ්ලේෂණය',definition_si:'ශාක ආහාර සාදාගන්නා ක්‍රියාවලිය',hint_si:'',term_ta:'ஒளிச்சேர்க்கை',definition_ta:'தாவரங்கள் உணவு தயாரிக்கும் செயல்முறை',hint_ta:''})
    const buf=await wb.xlsx.writeBuffer()
    const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))
    const a=document.createElement('a'); a.href=url; a.download='flashcard_template.xlsx'; a.click(); URL.revokeObjectURL(url)
  }

  const cur=form.content[activeLang]
  const curCards=form.flashcards[activeLang]||[]

  // Content completion check
  const contentDone = LANGS.filter(l=>form.content[l].note_content?.trim()||form.content[l].video_url?.trim()).length
  const cardsDone = LANGS.filter(l=>(form.flashcards[l]||[]).some(c=>c.term.trim())).length

  return (
    <div>
      <button onClick={()=>navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Chapters
      </button>
      <PageHead crumb={`${chapter?.subjects?.name} · ${chapter?.title}`} title="Units" sub={`${units.length} units`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Unit</Btn>}/>

      {loading?(
        <div className="space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      ):units.length===0?(
        <EmptyState icon={null} title="No units yet" desc="Add your first unit."/>
      ):(
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['#','Title','Video','Notes','Cards','Quiz','Status','Actions'].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u=>{
                // Per-language completion
                const LANG_SHORT = {english:'EN',sinhala:'SI',tamil:'TA'}
                const langs3 = ['english','sinhala','tamil']
                const videoLangs = langs3.filter(l=>u.unit_content?.find(c=>c.language===l)?.video_url?.trim())
                const notesLangs = langs3.filter(l=>{const c=u.unit_content?.find(x=>x.language===l);return c?.note_content?.trim()&&c?.status==='published'})
                const quizActive=u.quizzes&&(Array.isArray(u.quizzes)?u.quizzes.some(q=>q.is_active):u.quizzes?.is_active)
                // Count published questions via separate query — use quizId from quizzes
                const quizId=u.quizzes&&(Array.isArray(u.quizzes)?u.quizzes.find(q=>q.is_active)?.id:u.quizzes?.id)
                const hasQuiz=quizActive&&u.quizzes&&(Array.isArray(u.quizzes)?u.quizzes.some(q=>q.is_active&&(q.questions_count||0)>0):((u.quizzes?.questions_count||0)>0))
                const allVideoOk = videoLangs.length===3
                const allNotesOk = notesLangs.length===3
                return(
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center">{u.order_index}</div></td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px]">
                      <p className="truncate">{u.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {langs3.map(l=><span key={l} title={l} className={clsx('text-xs px-1 py-0.5 rounded font-bold',videoLangs.includes(l)?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-400')}>{LANG_SHORT[l]}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {langs3.map(l=><span key={l} title={l} className={clsx('text-xs px-1 py-0.5 rounded font-bold',notesLangs.includes(l)?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400')}>{LANG_SHORT[l]}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3"><FCCount unitId={u.id}/></td>
                    <td className="px-4 py-3">{(() => {
                      const qz = Array.isArray(u.quizzes) ? u.quizzes.find(q=>q.is_active) : u.quizzes
                      const qCount = qz?.questions?.filter(q=>q.status==='published').length || 0
                      return <Badge color={qCount>0?'cyan':'gray'}>{qCount>0?qCount:'–'}</Badge>
                    })()}</td>
                    <td className="px-4 py-3"><Badge color={u.is_active?'green':'gray'}>{u.is_active?'Active':'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>navigate(`/admin/units/${u.id}/questions`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><ChevronRight size={15}/></button>
                        <button onClick={()=>openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                        <button onClick={()=>setDeleteConfirm(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Unit Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`Edit: ${editing.title}`:'Add Unit'} size="xl">
        <div className="space-y-4">
          {/* Order + Active */}
          <div className="flex items-center gap-4">
            <Field label="Order" type="number" min="1" value={form.order_index} className="w-24"
              onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-5">
              <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-blue-600"/>
              Active
            </label>
          </div>

          {/* Language selector ON TOP */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {LANGS.map(lang=>{
                const hasTitleOrContent = form.titles[lang]?.trim()||form.content[lang]?.note_content?.trim()||form.content[lang]?.video_url?.trim()||(form.flashcards[lang]||[]).some(c=>c.term.trim())
                return (
                  <button key={lang} type="button" onClick={()=>setActiveLang(lang)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      activeLang===lang?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
                    {LANG_LABELS[lang]}
                    {hasTitleOrContent && <CheckCircle2 size={12} className="text-green-500"/>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Unit title per language */}
          <Field label={`Unit Title (${LANG_LABELS[activeLang]})${activeLang==='english'?' *':''}`}
            placeholder={`Unit title in ${LANG_LABELS[activeLang]}`}
            value={form.titles[activeLang]}
            onChange={e=>setForm(f=>({...f,titles:{...f.titles,[activeLang]:e.target.value}}))}/>

          {/* Section switcher */}
          <div className="flex gap-2 border-b border-gray-200 pb-3">
            {[{key:'notes',icon:FileText,label:'Video + Notes'},{key:'flashcards',icon:Zap,label:'Flashcards'}].map(s=>(
              <button key={s.key} type="button" onClick={()=>setActiveSection(s.key)}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2',
                  activeSection===s.key?'border-blue-500 bg-blue-50 text-blue-700':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                <s.icon size={14}/>{s.label}
                {s.key==='flashcards'&&curCards.length>0&&<span className="bdg-blue text-xs">{curCards.length}</span>}
                {/* Completion tick */}
                {s.key==='notes'&&(cur.note_content?.trim()||cur.video_url?.trim())&&<CheckCircle2 size={12} className="text-green-500"/>}
                {s.key==='flashcards'&&curCards.some(c=>c.term.trim())&&<CheckCircle2 size={12} className="text-green-500"/>}
              </button>
            ))}
          </div>

          {/* Notes section */}
          {activeSection==='notes'&&(
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2"><Video size={14}/> Video URL</label>
                <Field placeholder="https://youtube.com/watch?v=... or direct MP4"
                  value={cur.video_url} onChange={e=>setContent(activeLang,'video_url',e.target.value)}/>
                <p className="text-xs text-blue-600 mt-1">YouTube links auto-convert to embed.</p>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={14}/> Study Notes</label>
                <div className="flex items-center gap-2">
                  {cur.note_content?.trim() && <CheckCircle2 size={14} className="text-green-500"/>}
                  <Sel className="w-32" value={cur.status} onChange={e=>setContent(activeLang,'status',e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published ✓</option>
                  </Sel>
                </div>
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                💡 Use <code className="bg-amber-100 px-1 rounded">## Topic Name</code> — each ## becomes a clickable topic card for students.
              </div>
              <MarkdownEditor value={cur.note_content} onChange={val=>setContent(activeLang,'note_content',val)}
                placeholder={`## What is ${form.titles.english||'this topic'}?\nExplain here...\n\n## Key Points\n- Point 1\n- Point 2`}
                minH={260}/>
            </div>
          )}

          {/* Flashcards section */}
          {activeSection==='flashcards'&&(
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Flashcards — {LANG_LABELS[activeLang]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Students flip to memorise key terms.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input ref={fcFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFCExcel}/>
                  <Btn variant="white" size="sm" onClick={downloadFCTemplate} className="gap-1.5"><Download size={13}/> Template</Btn>
                  <Btn variant="white" size="sm" onClick={()=>fcFileRef.current?.click()} className="gap-1.5"><Upload size={13}/> Excel</Btn>
                  <Btn variant="white" size="sm" onClick={()=>addFC(activeLang)} className="gap-1.5"><Plus size={13}/> Add Card</Btn>
                </div>
              </div>
              {curCards.length===0?(
                <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Zap size={28} className="text-gray-300 mx-auto mb-2"/>
                  <p className="text-sm text-gray-500">No flashcards yet for {LANG_LABELS[activeLang]}</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <Btn variant="blue" size="sm" onClick={()=>addFC(activeLang)} className="gap-1.5"><Plus size={13}/> Add Manually</Btn>
                    <Btn variant="white" size="sm" onClick={()=>fcFileRef.current?.click()} className="gap-1.5"><Upload size={13}/> Upload Excel</Btn>
                  </div>
                </div>
              ):(
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {curCards.map((card,i)=>(
                    <FlashcardRow key={i} card={card} index={i}
                      onChange={c=>updateFC(activeLang,i,c)} onDelete={()=>deleteFC(activeLang,i)}/>
                  ))}
                </div>
              )}
              {curCards.length>0&&(
                <Btn variant="white" size="sm" onClick={()=>addFC(activeLang)} className="gap-1.5 w-full justify-center"><Plus size={13}/> Add More</Btn>
              )}
            </div>
          )}

          {/* Overall completion status */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl flex-wrap">
            <span className="text-xs font-medium text-gray-500">Content:</span>
            {LANGS.map(lang=>{
              const c=form.content[lang]; const fcs=form.flashcards[lang]||[]
              const hasNotes=c.note_content?.trim()||c.video_url?.trim()
              const hasCards=fcs.some(x=>x.term.trim())
              return (
                <div key={lang} className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{LANG_LABELS[lang]}</span>
                  {hasNotes?<CheckCircle2 size={13} className="text-green-500"/>:<div className="w-3 h-3 rounded-full border-2 border-gray-300"/>}
                  {hasCards?<Zap size={11} className="text-amber-500"/>:<Zap size={11} className="text-gray-300"/>}
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1 gap-2" loading={saving} onClick={handleSave}>
              <Save size={14}/> {editing?'Save Changes':'Create Unit'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Unit" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>? All content and questions will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={async()=>{ const{error}=await supabaseAdmin.from('units').delete().eq('id',deleteConfirm?.id); if(error){toast.error(error.message);return} toast.success('Deleted');setDeleteConfirm(null);fetchData() }}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}

function FCCount({unitId}){
  const [counts,setCounts]=useState(null)
  useEffect(()=>{
    Promise.all([
      supabaseAdmin.from('flashcards').select('id',{count:'exact',head:true}).eq('unit_id',unitId).eq('language','english'),
      supabaseAdmin.from('flashcards').select('id',{count:'exact',head:true}).eq('unit_id',unitId).eq('language','sinhala'),
      supabaseAdmin.from('flashcards').select('id',{count:'exact',head:true}).eq('unit_id',unitId).eq('language','tamil'),
    ]).then(([en,si,ta])=>setCounts({english:en.count||0,sinhala:si.count||0,tamil:ta.count||0}))
  },[unitId])
  if(!counts) return <span className="text-xs text-gray-300">…</span>
  const LANG_SHORT={english:'EN',sinhala:'SI',tamil:'TA'}
  return(
    <div className="flex gap-0.5">
      {['english','sinhala','tamil'].map(l=>(
        <span key={l} className={"text-xs px-1 py-0.5 rounded font-bold "+(counts[l]>0?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-400')}>
          {LANG_SHORT[l]}
        </span>
      ))}
    </div>
  )
}
