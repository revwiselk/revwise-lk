import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Txt, Modal, Badge } from '@/components/ui'
import { ArrowLeft, Video, BookOpen, Zap, HelpCircle, Plus, Edit2, Trash2, CheckCircle2, X, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import ExcelJS from 'exceljs'

const LANGS = ['english','sinhala','tamil']
const LANG_L = {english:'EN',sinhala:'SI',tamil:'TA'}

export default function ALAdminSubUnitDetail() {
  const { subUnitId } = useParams()
  const navigate = useNavigate()
  const [subUnit, setSubUnit] = useState(null)
  const [content, setContent] = useState({english:{video_url:'',note_content:'',status:'draft'},sinhala:{video_url:'',note_content:'',status:'draft'},tamil:{video_url:'',note_content:'',status:'draft'}})
  const [flashcards, setFlashcards] = useState({english:[],sinhala:[],tamil:[]})
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('notes')
  const [activeLang, setActiveLang] = useState('english')
  const [qModal, setQModal] = useState(false)
  const [editingQ, setEditingQ] = useState(null)
  const fileRef = useRef()

  const blankQ = () => ({ order_index:1, marks:1, question_type:'mcq', image_url:'',
    translations:{english:{text:'',explanation:''},sinhala:{text:'',explanation:''},tamil:{text:'',explanation:''}},
    options:[{_id:'a',order_index:1,is_correct:true,translations:{english:'',sinhala:'',tamil:''}},
             {_id:'b',order_index:2,is_correct:false,translations:{english:'',sinhala:'',tamil:''}},
             {_id:'c',order_index:3,is_correct:false,translations:{english:'',sinhala:'',tamil:''}},
             {_id:'d',order_index:4,is_correct:false,translations:{english:'',sinhala:'',tamil:''}}] })
  const [qForm, setQForm] = useState(blankQ())
  const [qLang, setQLang] = useState('english')

  useEffect(() => { fetchAll() }, [subUnitId])

  const fetchAll = async () => {
    setLoading(true)
    const [suRes, cRes, fcRes, qzRes] = await Promise.all([
      supabaseAdmin.from('al_sub_units').select('*, al_units(title,al_chapters(title,al_subjects(name)))').eq('id',subUnitId).single(),
      supabaseAdmin.from('al_unit_content').select('*').eq('sub_unit_id',subUnitId),
      supabaseAdmin.from('al_flashcards').select('*').eq('sub_unit_id',subUnitId).order('order_index'),
      supabaseAdmin.from('al_quizzes').select('*').eq('sub_unit_id',subUnitId).maybeSingle(),
    ])
    if (suRes.data) setSubUnit(suRes.data)
    const cnt = {english:{video_url:'',note_content:'',status:'draft'},sinhala:{video_url:'',note_content:'',status:'draft'},tamil:{video_url:'',note_content:'',status:'draft'}}
    ;(cRes.data||[]).forEach(c=>{cnt[c.language]={video_url:c.video_url||'',note_content:c.note_content||'',status:c.status||'draft'}})
    setContent(cnt)
    const fc={english:[],sinhala:[],tamil:[]}
    ;(fcRes.data||[]).forEach(c=>{if(fc[c.language])fc[c.language].push(c)})
    setFlashcards(fc)
    let qz = qzRes.data
    if(!qz){
      const {data:newQz}=await supabaseAdmin.from('al_quizzes').insert({sub_unit_id:subUnitId,pass_mark_percent:50,is_active:true}).select().single()
      qz=newQz
    }
    setQuiz(qz)
    if(qz){
      const{data:qData}=await supabaseAdmin.from('al_questions')
        .select('*,al_question_translations(*),al_answer_options(*,al_answer_option_translations(*))')
        .eq('quiz_id',qz.id).order('order_index')
      setQuestions(qData||[])
    }
    setLoading(false)
  }

  const saveContent = async () => {
    setSaving(true)
    for(const lang of LANGS){
      await supabaseAdmin.from('al_unit_content').upsert({sub_unit_id:subUnitId,language:lang,...content[lang]},{onConflict:'sub_unit_id,language'})
    }
    // Flashcards
    await supabaseAdmin.from('al_flashcards').delete().eq('sub_unit_id',subUnitId)
    const all=[]
    for(const lang of LANGS) (flashcards[lang]||[]).forEach((fc,i)=>{if(fc.term?.trim()&&fc.definition?.trim())all.push({sub_unit_id:subUnitId,language:lang,...fc,order_index:i})})
    if(all.length) await supabaseAdmin.from('al_flashcards').insert(all)
    toast.success('Content saved!'); setSaving(false)
  }

  const openCreateQ = () => { setEditingQ(null); setQForm({...blankQ(),order_index:questions.length+1}); setQLang('english'); setQModal(true) }
  const openEditQ = (q) => {
    setEditingQ(q); setQLang('english')
    const trans={english:{text:'',explanation:''},sinhala:{text:'',explanation:''},tamil:{text:'',explanation:''}}
    ;(q.al_question_translations||[]).forEach(t=>{trans[t.language]={text:t.question_text||'',explanation:t.explanation||''}})
    const opts=[...(q.al_answer_options||[])].sort((a,b)=>a.order_index-b.order_index).map(o=>({
      _id:o.id,id:o.id,order_index:o.order_index,is_correct:o.is_correct,image_url:o.image_url||'',
      translations:{english:'',sinhala:'',tamil:''},
    }))
    ;(q.al_answer_options||[]).forEach(o=>{const opt=opts.find(x=>x._id===o.id);if(opt)(o.al_answer_option_translations||[]).forEach(t=>{opt.translations[t.language]=t.option_text})})
    setQForm({order_index:q.order_index,marks:q.marks,question_type:q.question_type,image_url:q.image_url||'',translations:trans,options:opts})
    setQModal(true)
  }

  const saveQuestion = async () => {
    if(!qForm.translations.english.text.trim()){toast.error('English text required');return}
    if(!qForm.options.some(o=>o.is_correct)){toast.error('Mark a correct answer');return}
    setSaving(true)
    const qPayload={quiz_id:quiz.id,order_index:parseInt(qForm.order_index)||1,marks:parseInt(qForm.marks)||1,question_type:qForm.question_type,image_url:qForm.image_url||null,status:'published'}
    let qId=editingQ?.id
    if(editingQ){await supabaseAdmin.from('al_questions').update(qPayload).eq('id',editingQ.id)}
    else{const{data}=await supabaseAdmin.from('al_questions').insert(qPayload).select().single();qId=data.id}
    for(const lang of LANGS){const t=qForm.translations[lang];if(t.text.trim())await supabaseAdmin.from('al_question_translations').upsert({question_id:qId,language:lang,question_text:t.text.trim(),explanation:t.explanation||null},{onConflict:'question_id,language'})}
    await supabaseAdmin.from('al_answer_options').delete().eq('question_id',qId)
    for(const opt of qForm.options){const{data:newOpt}=await supabaseAdmin.from('al_answer_options').insert({question_id:qId,is_correct:opt.is_correct,order_index:opt.order_index,image_url:opt.image_url||null}).select().single()
      if(newOpt){const rows=LANGS.filter(l=>opt.translations[l]?.trim()).map(l=>({answer_option_id:newOpt.id,language:l,option_text:opt.translations[l].trim()}));if(rows.length)await supabaseAdmin.from('al_answer_option_translations').insert(rows)}}
    toast.success(editingQ?'Updated':'Created'); setSaving(false); setQModal(false); fetchAll()
  }

  const deleteQuestion = async (id) => {
    await supabaseAdmin.from('al_questions').delete().eq('id',id); fetchAll()
  }

  const setCorrect = (_id) => setQForm(f=>({...f,options:f.options.map(o=>({...o,is_correct:o._id===_id}))}))

  if(loading) return <div className="space-y-3 p-4">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>

  const crumb = `${subUnit?.al_units?.al_chapters?.al_subjects?.name} › ${subUnit?.al_units?.al_chapters?.title} › ${subUnit?.al_units?.title}`

  return (
    <div>
      <button onClick={()=>navigate('/admin/al/content')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16}/> Back to Content
      </button>
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">{crumb}</p>
        <h1 className="font-bold text-xl text-gray-900">{subUnit?.title}</h1>
        {subUnit?.title_si && <p className="text-sm text-gray-400">{subUnit.title_si}</p>}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
        {[{key:'notes',icon:BookOpen,label:'Notes & Video'},{key:'flashcards',icon:Zap,label:'Flashcards'},{key:'quiz',icon:HelpCircle,label:`Quiz (${questions.length})`}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',activeTab===t.key?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      {/* Language selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        {LANGS.map(l=>(
          <button key={l} onClick={()=>setActiveLang(l)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',activeLang===l?'bg-white text-gray-900 shadow-sm':'text-gray-500')}>
            {LANG_L[l]}
          </button>
        ))}
      </div>

      {/* Notes & Video Tab */}
      {activeTab==='notes' && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Video size={15}/>Video URL ({LANG_L[activeLang]})</p>
            <Field placeholder="https://youtube.com/..." value={content[activeLang].video_url} onChange={e=>setContent(p=>({...p,[activeLang]:{...p[activeLang],video_url:e.target.value}}))}/>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BookOpen size={15}/>Notes ({LANG_L[activeLang]})</p>
            <Txt placeholder="Write notes in Markdown…" value={content[activeLang].note_content} onChange={e=>setContent(p=>({...p,[activeLang]:{...p[activeLang],note_content:e.target.value}}))} className="min-h-[200px] font-mono text-sm"/>
            <div className="flex items-center gap-3 mt-3">
              <select value={content[activeLang].status} onChange={e=>setContent(p=>({...p,[activeLang]:{...p[activeLang],status:e.target.value}}))} className="inp text-sm py-1.5 w-32">
                <option value="draft">Draft</option><option value="published">Published</option>
              </select>
            </div>
          </div>
          <Btn variant="blue" loading={saving} onClick={saveContent} className="gap-2">Save All Content</Btn>
        </div>
      )}

      {/* Flashcards Tab */}
      {activeTab==='flashcards' && (
        <div className="space-y-3">
          {(flashcards[activeLang]||[]).map((fc,i)=>(
            <div key={i} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Term" value={fc.term||''} onChange={e=>setFlashcards(p=>({...p,[activeLang]:p[activeLang].map((c,j)=>j===i?{...c,term:e.target.value}:c)}))}/>
              <Field label="Definition" value={fc.definition||''} onChange={e=>setFlashcards(p=>({...p,[activeLang]:p[activeLang].map((c,j)=>j===i?{...c,definition:e.target.value}:c)}))}/>
              <Field label="Hint (optional)" className="sm:col-span-2" value={fc.hint||''} onChange={e=>setFlashcards(p=>({...p,[activeLang]:p[activeLang].map((c,j)=>j===i?{...c,hint:e.target.value}:c)}))}/>
              <button onClick={()=>setFlashcards(p=>({...p,[activeLang]:p[activeLang].filter((_,j)=>j!==i)}))} className="sm:col-span-2 text-xs text-red-500 hover:underline text-left">Remove</button>
            </div>
          ))}
          <div className="flex gap-3">
            <Btn variant="white" onClick={()=>setFlashcards(p=>({...p,[activeLang]:[...(p[activeLang]||[]),{term:'',definition:'',hint:''}]}))} className="gap-2"><Plus size={14}/>Add Card</Btn>
            <Btn variant="blue" loading={saving} onClick={saveContent}>Save Flashcards</Btn>
          </div>
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab==='quiz' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{questions.length} questions</p>
            <Btn variant="blue" onClick={openCreateQ} className="gap-2"><Plus size={14}/>Add Question</Btn>
          </div>
          <div className="space-y-3">
            {questions.map((q,i)=>{
              const engTrans=q.al_question_translations?.find(t=>t.language==='english')
              const correct=q.al_answer_options?.find(o=>o.is_correct)
              const correctText=correct?.al_answer_option_translations?.find(t=>t.language==='english')?.option_text||'—'
              return(
                <div key={q.id} className="card p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{engTrans?.question_text||'—'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge color="gray">{q.marks}m</Badge>
                      <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={11}/>{correctText}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>openEditQ(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                    <button onClick={()=>deleteQuestion(q.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Question Modal */}
      <Modal open={qModal} onClose={()=>setQModal(false)} title={editingQ?'Edit Question':'Add Question'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" value={qForm.order_index} onChange={e=>setQForm(f=>({...f,order_index:e.target.value}))}/>
            <Field label="Marks" type="number" value={qForm.marks} onChange={e=>setQForm(f=>({...f,marks:e.target.value}))}/>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Question Text</p>
              <div className="flex gap-1 bg-gray-200 p-0.5 rounded-lg">
                {LANGS.map(l=>(
                  <button key={l} type="button" onClick={()=>setQLang(l)} className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold transition-all',qLang===l?'bg-white text-gray-900 shadow-sm':'text-gray-500')}>
                    {LANG_L[l]}
                  </button>
                ))}
              </div>
            </div>
            <Txt label={`Question (${qLang}) ${qLang==='english'?'*':''}`} placeholder="Enter question…" value={qForm.translations[qLang].text} onChange={e=>setQForm(f=>({...f,translations:{...f.translations,[qLang]:{...f.translations[qLang],text:e.target.value}}}))} className="min-h-[70px]"/>
            <Field label="Explanation (optional)" placeholder="Why is this correct?" value={qForm.translations[qLang].explanation} onChange={e=>setQForm(f=>({...f,translations:{...f.translations,[qLang]:{...f.translations[qLang],explanation:e.target.value}}}))} className="mt-2"/>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Answer Options</p>
            {qForm.options.map((opt,oi)=>(
              <div key={opt._id} className={clsx('p-3 rounded-xl border-2',opt.is_correct?'border-green-400 bg-green-50':'border-gray-200')}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={()=>setCorrect(opt._id)} className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',opt.is_correct?'border-green-500 bg-green-500':'border-gray-300')}>
                    {opt.is_correct&&<div className="w-2 h-2 rounded-full bg-white"/>}
                  </button>
                  <span className={clsx('text-xs font-semibold',opt.is_correct?'text-green-700':'text-gray-500')}>Option {oi+1}{opt.is_correct?' ✓':''}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LANGS.map(l=>(
                    <Field key={l} label={LANG_L[l]} value={opt.translations[l]||''} onChange={e=>setQForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,translations:{...o.translations,[l]:e.target.value}}:o)}))}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Btn variant="white" className="flex-1" onClick={()=>setQModal(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={saveQuestion}>{editingQ?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
