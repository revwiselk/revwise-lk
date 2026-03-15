import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Sel, Modal, Badge, PageHead, EmptyState, Field } from '@/components/ui'
import {
  Plus, Edit2, Trash2, ChevronRight, ArrowLeft,
  Bold, Italic, Heading2, Heading3, List, Quote, Code,
  Eye, EyeOff, GripVertical, X, Save, Video, FileText, Zap
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LANGS = ['english', 'sinhala', 'tamil']
const LANG_LABELS = { english: 'English', sinhala: 'සිංහල', tamil: 'தமிழ்' }

function MarkdownEditor({ value, onChange, placeholder, minH = 220 }) {
  const [preview, setPreview] = useState(false)
  const ref = useRef(null)
  const wrap = (b, a='', ph='text') => {
    const el=ref.current; if(!el) return
    const s=el.selectionStart,e=el.selectionEnd
    const sel=value.slice(s,e)||ph
    onChange(value.slice(0,s)+b+sel+a+value.slice(e))
    setTimeout(()=>{el.focus();el.setSelectionRange(s+b.length,s+b.length+sel.length)},0)
  }
  const line = (prefix) => {
    const el=ref.current; if(!el) return
    const s=el.selectionStart
    const ls=value.lastIndexOf('\n',s-1)+1
    onChange(value.slice(0,ls)+prefix+value.slice(ls))
    setTimeout(()=>el.focus(),0)
  }
  const tools = [
    {icon:Heading2,title:'Topic (## )',fn:()=>line('## ')},
    {icon:Heading3,title:'Sub heading (### )',fn:()=>line('### ')},
    {icon:Bold,title:'Bold',fn:()=>wrap('**','**','bold')},
    {icon:Italic,title:'Italic',fn:()=>wrap('*','*','italic')},
    {icon:Code,title:'Code',fn:()=>wrap('`','`','code')},
    {icon:List,title:'List',fn:()=>line('- ')},
    {icon:Quote,title:'Callout',fn:()=>line('> ')},
  ]
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
        <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 font-mono text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset resize-y"
          style={{minHeight:minH}}/>
      )}
    </div>
  )
}

function FlashcardRow({ card, onChange, onDelete, index }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="text-gray-300 mt-2 shrink-0"><GripVertical size={16}/></div>
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-1.5">{index+1}</div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Term / Concept</label>
          <input value={card.term} onChange={e=>onChange({...card,term:e.target.value})}
            placeholder="e.g. Photosynthesis" className="inp text-sm py-2"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Definition</label>
          <input value={card.definition} onChange={e=>onChange({...card,definition:e.target.value})}
            placeholder="e.g. Process plants use to make food..." className="inp text-sm py-2"/>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Hint (optional)</label>
          <input value={card.hint||''} onChange={e=>onChange({...card,hint:e.target.value})}
            placeholder="Memory aid or extra context..." className="inp text-sm py-2"/>
        </div>
      </div>
      <button onClick={onDelete} className="mt-1.5 p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"><X size={15}/></button>
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
    order_index:1, title:'', is_active:true,
    content:{
      english:{note_content:'',video_url:'',status:'published'},
      sinhala:{note_content:'',video_url:'',status:'draft'},
      tamil:  {note_content:'',video_url:'',status:'draft'},
    },
    flashcards:{english:[],sinhala:[],tamil:[]},
  })

  useEffect(()=>{fetchData()},[chapterId])

  const fetchData = async () => {
    setLoading(true)
    const [cRes,uRes] = await Promise.all([
      supabaseAdmin.from('chapters').select('id,title,order_index,subjects(id,name,grade)').eq('id',chapterId).single(),
      supabaseAdmin.from('units')
        .select('id,order_index,title,is_active,unit_content(language,note_content,video_url,status),quizzes!quizzes_unit_id_fkey(id,is_active)')
        .eq('chapter_id',chapterId).order('order_index'),
    ])
    if(cRes.data) setChapter(cRes.data)
    setUnits(uRes.data||[])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null); setActiveLang('english'); setActiveSection('notes')
    setForm({
      order_index:units.length+1, title:'', is_active:true,
      content:{english:{note_content:'',video_url:'',status:'published'},sinhala:{note_content:'',video_url:'',status:'draft'},tamil:{note_content:'',video_url:'',status:'draft'}},
      flashcards:{english:[],sinhala:[],tamil:[]},
    })
    setModalOpen(true)
  }

  const openEdit = async (u) => {
    setEditing(u); setActiveLang('english'); setActiveSection('notes')
    const content={
      english:{note_content:'',video_url:'',status:'published'},
      sinhala:{note_content:'',video_url:'',status:'draft'},
      tamil:  {note_content:'',video_url:'',status:'draft'},
    }
    ;(u.unit_content||[]).forEach(c=>{content[c.language]={note_content:c.note_content||'',video_url:c.video_url||'',status:c.status||'draft'}})
    const {data:fcData} = await supabaseAdmin.from('flashcards').select('*').eq('unit_id',u.id).order('order_index')
    const flashcards={english:[],sinhala:[],tamil:[]}
    ;(fcData||[]).forEach(fc=>{if(flashcards[fc.language]) flashcards[fc.language].push({id:fc.id,term:fc.term,definition:fc.definition,hint:fc.hint||''})})
    setForm({order_index:u.order_index,title:u.title,is_active:u.is_active,content,flashcards})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if(!form.title.trim()){toast.error('Title is required');return}
    setSaving(true)
    try {
      let unitId = editing?.id
      if(editing){
        await supabaseAdmin.from('units').update({order_index:parseInt(form.order_index),title:form.title.trim(),is_active:form.is_active}).eq('id',editing.id)
      } else {
        const {data:newUnit,error} = await supabaseAdmin.from('units')
          .insert({chapter_id:chapterId,order_index:parseInt(form.order_index),title:form.title.trim(),is_active:form.is_active})
          .select().single()
        if(error) throw error
        unitId = newUnit.id
        await supabaseAdmin.from('quizzes').insert({unit_id:unitId,quiz_type:'practice',pass_mark_percent:50,is_active:true})
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
    } catch(err){ toast.error(err.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const {error} = await supabaseAdmin.from('units').delete().eq('id',id)
    if(error){toast.error(error.message);return}
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  const setContent=(lang,key,val)=>setForm(f=>({...f,content:{...f.content,[lang]:{...f.content[lang],[key]:val}}}))
  const addFlashcard=(lang)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:[...(f.flashcards[lang]||[]),{term:'',definition:'',hint:''}]}}))
  const updateFlashcard=(lang,idx,card)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:f.flashcards[lang].map((c,i)=>i===idx?card:c)}}))
  const deleteFlashcard=(lang,idx)=>setForm(f=>({...f,flashcards:{...f.flashcards,[lang]:f.flashcards[lang].filter((_,i)=>i!==idx)}}))

  const cur=form.content[activeLang]
  const curCards=form.flashcards[activeLang]||[]

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
                {['#','Title','Video','Notes','Flashcards','Quiz','Status','Actions'].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u=>{
                const hasVideo=u.unit_content?.some(c=>c.video_url?.trim())
                const hasNotes=u.unit_content?.some(c=>c.note_content?.trim()&&c.status==='published')
                const hasQuiz=u.quizzes&&(Array.isArray(u.quizzes)?u.quizzes.some(q=>q.is_active):u.quizzes?.is_active)
                return(
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center">{u.order_index}</div></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.title}</td>
                    <td className="px-4 py-3"><Badge color={hasVideo?'blue':'gray'}>{hasVideo?'✓':'–'}</Badge></td>
                    <td className="px-4 py-3"><Badge color={hasNotes?'green':'gray'}>{hasNotes?'✓':'–'}</Badge></td>
                    <td className="px-4 py-3"><FlashcardCountBadge unitId={u.id}/></td>
                    <td className="px-4 py-3"><Badge color={hasQuiz?'cyan':'gray'}>{hasQuiz?'✓':'–'}</Badge></td>
                    <td className="px-4 py-3"><Badge color={u.is_active?'green':'gray'}>{u.is_active?'Active':'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>navigate(`/admin/units/${u.id}/questions`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Questions"><ChevronRight size={15}/></button>
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

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?`Edit: ${editing.title}`:'Add Unit'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Order" type="number" min="1" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <div className="col-span-2">
              <Field label="Unit Title *" placeholder="e.g. Characteristics of Living Things" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-blue-600"/>
            Active (visible to students)
          </label>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {LANGS.map(lang=>(
              <button key={lang} type="button" onClick={()=>setActiveLang(lang)}
                className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  activeLang===lang?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-b border-gray-200 pb-3">
            {[{key:'notes',icon:FileText,label:'Video + Notes'},{key:'flashcards',icon:Zap,label:'Flashcards'}].map(s=>(
              <button key={s.key} type="button" onClick={()=>setActiveSection(s.key)}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2',
                  activeSection===s.key?'border-blue-500 bg-blue-50 text-blue-700':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                <s.icon size={15}/>{s.label}
                {s.key==='flashcards'&&curCards.length>0&&<span className="bdg-blue">{curCards.length}</span>}
              </button>
            ))}
          </div>

          {activeSection==='notes'&&(
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2"><Video size={15}/> Lesson Video URL</label>
                <Field placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                  value={cur.video_url} onChange={e=>setContent(activeLang,'video_url',e.target.value)}/>
                <p className="text-xs text-blue-600 mt-1">Supports YouTube links and direct video files.</p>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={14}/> Study Notes (Markdown)</label>
                <Sel className="w-36" value={cur.status} onChange={e=>setContent(activeLang,'status',e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Sel>
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                💡 <strong>Tip:</strong> Use <code className="bg-amber-100 px-1 rounded">## Topic Name</code> to create expandable cards. Each ## heading becomes one clickable topic card for students.
              </div>
              <MarkdownEditor value={cur.note_content} onChange={val=>setContent(activeLang,'note_content',val)}
                placeholder={`## What is Photosynthesis?\nPlants make their own food using sunlight...\n\n## The Process\n- Step 1: Light absorbed by chlorophyll\n- Step 2: CO₂ enters through leaves\n\n## Key Formula\n**6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂**`}
                minH={280}/>
            </div>
          )}

          {activeSection==='flashcards'&&(
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Flashcards — {LANG_LABELS[activeLang]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Students flip cards to memorise key terms.</p>
                </div>
                <Btn variant="white" size="sm" onClick={()=>addFlashcard(activeLang)} className="gap-1.5"><Plus size={14}/> Add Card</Btn>
              </div>
              {curCards.length===0?(
                <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Zap size={28} className="text-gray-300 mx-auto mb-2"/>
                  <p className="text-sm text-gray-500 font-medium">No flashcards yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add cards to help students memorise key terms</p>
                  <Btn variant="blue" size="sm" className="mt-3 gap-1.5" onClick={()=>addFlashcard(activeLang)}><Plus size={14}/> Add First Card</Btn>
                </div>
              ):(
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin pr-1">
                  {curCards.map((card,i)=>(
                    <FlashcardRow key={i} card={card} index={i}
                      onChange={c=>updateFlashcard(activeLang,i,c)}
                      onDelete={()=>deleteFlashcard(activeLang,i)}/>
                  ))}
                </div>
              )}
              {curCards.length>0&&(
                <Btn variant="white" size="sm" onClick={()=>addFlashcard(activeLang)} className="gap-1.5 w-full justify-center"><Plus size={14}/> Add Another Card</Btn>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1 gap-2" loading={saving} onClick={handleSave}>
              <Save size={15}/> {editing?'Save Changes':'Create Unit'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Unit" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>? All content, flashcards and questions will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}

function FlashcardCountBadge({ unitId }) {
  const [count,setCount] = useState(null)
  useEffect(()=>{
    supabaseAdmin.from('flashcards').select('id',{count:'exact',head:true}).eq('unit_id',unitId).eq('language','english')
      .then(({count:c})=>setCount(c||0))
  },[unitId])
  if(count===null) return <span className="bdg-gray text-xs">…</span>
  return <Badge color={count>0?'amber':'gray'}>{count>0?count:'–'}</Badge>
}
