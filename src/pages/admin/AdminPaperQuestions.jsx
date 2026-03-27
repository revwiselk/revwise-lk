import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ArrowLeft, X, Image, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const emptyOpt = (i) => ({ _id: Math.random().toString(36).slice(2), order_index:i, option_text:'', option_si:'', option_ta:'', is_correct:false, image_url:'' })

const emptyQ = () => ({
  question_text:'', question_si:'', question_ta:'', image_url:'',
  marks:1, question_type:'mcq', model_answer:'', order_index:1,
  options:[emptyOpt(1),emptyOpt(2),emptyOpt(3),emptyOpt(4)],
})

function ImageField({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1"><Image size={11} className="text-gray-400"/><label className="text-xs text-gray-500">{label}</label></div>
      <input type="url" value={value} onChange={e=>onChange(e.target.value)} placeholder="https://..." className="inp text-xs py-1.5 w-full"/>
      {value?.trim()&&<img src={value} alt="" className="h-12 rounded-lg border border-gray-200 mt-1 object-cover" onError={e=>e.target.style.display='none'}/>}
    </div>
  )
}

export default function AdminPaperQuestions() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const [section, setSection] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(emptyQ())

  useEffect(() => { fetchData() }, [sectionId])

  const fetchData = async () => {
    setLoading(true)
    const [sRes, qRes] = await Promise.all([
      supabaseAdmin.from('paper_sections').select('id,title,section_type,marks,paper_id,papers(title,grade,subject)').eq('id',sectionId).single(),
      supabaseAdmin.from('paper_questions').select('*,paper_options(*)').eq('section_id',sectionId).order('order_index'),
    ])
    if (sRes.data) setSection(sRes.data)
    setQuestions((qRes.data||[]).map(q=>({...q,paper_options:(q.paper_options||[]).sort((a,b)=>a.order_index-b.order_index)})))
    setLoading(false)
  }

  const isMCQ = section?.section_type === 'mcq' || section?.section_type === 'true_false'

  const openCreate = () => {
    setEditing(null)
    const q = emptyQ()
    q.order_index = questions.length+1
    q.question_type = section?.section_type||'mcq'
    if (section?.section_type === 'true_false') {
      q.options = [
        {_id:'tf1',order_index:1,option_text:'True',option_si:'සත්‍ය',option_ta:'உண்மை',is_correct:true,image_url:''},
        {_id:'tf2',order_index:2,option_text:'False',option_si:'අසත්‍ය',option_ta:'பொய்',is_correct:false,image_url:''},
      ]
    }
    setForm(q); setModalOpen(true)
  }

  const openEdit = (q) => {
    setEditing(q)
    const opts = [...(q.paper_options||[])].map(o=>({
      _id:o.id, id:o.id, order_index:o.order_index,
      option_text:o.option_text||'', option_si:o.option_si||'', option_ta:o.option_ta||'',
      is_correct:o.is_correct, image_url:o.image_url||''
    }))
    setForm({ question_text:q.question_text||'', question_si:q.question_si||'', question_ta:q.question_ta||'',
      image_url:q.image_url||'', marks:q.marks||1, question_type:q.question_type||'mcq',
      model_answer:q.model_answer||'', order_index:q.order_index, options:opts })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question_text.trim()) { toast.error('Question text (English) required'); return }
    if (isMCQ && !form.options.some(o=>o.is_correct)) { toast.error('Mark one correct answer'); return }
    setSaving(true)
    const payload = {
      section_id: sectionId, order_index: parseInt(form.order_index)||1,
      question_text: form.question_text.trim(), question_si: form.question_si||null, question_ta: form.question_ta||null,
      image_url: form.image_url?.trim()||null, marks: parseInt(form.marks)||1,
      question_type: form.question_type||section?.section_type||'mcq',
      model_answer: form.model_answer?.trim()||null,
    }
    let qId = editing?.id
    if (editing) {
      const {error} = await supabaseAdmin.from('paper_questions').update(payload).eq('id',editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
    } else {
      const {data,error} = await supabaseAdmin.from('paper_questions').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      qId = data.id
    }
    // Recreate options
    if (isMCQ) {
      await supabaseAdmin.from('paper_options').delete().eq('question_id',qId)
      for (const opt of form.options) {
        if (!opt.option_text.trim()) continue
        await supabaseAdmin.from('paper_options').insert({
          question_id:qId, order_index:opt.order_index,
          option_text:opt.option_text.trim(), option_si:opt.option_si||null, option_ta:opt.option_ta||null,
          is_correct:opt.is_correct, image_url:opt.image_url?.trim()||null,
        })
      }
    }
    toast.success(editing?'Updated!':'Created!')
    setSaving(false); setModalOpen(false); fetchData()
  }

  const handleDelete = async (id) => {
    await supabaseAdmin.from('paper_questions').delete().eq('id',id)
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  const setCorrect = (_id) => setForm(f=>({...f,options:f.options.map(o=>({...o,is_correct:o._id===_id}))}))

  return (
    <div>
      <button onClick={()=>navigate(`/admin/papers/${section?.paper_id}/sections`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16}/> Back to Sections
      </button>
      <PageHead
        crumb={`${section?.papers?.title} · ${section?.title}`}
        title="Questions"
        sub={`${questions.length} questions · ${section?.marks||0} marks`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Question</Btn>}/>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      ) : questions.length === 0 ? (
        <EmptyState icon={null} title="No questions yet" desc="Add questions to this section."/>
      ) : (
        <div className="space-y-3">
          {questions.map((q,i)=>(
            <div key={q.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  {q.image_url&&<img src={q.image_url} alt="" className="h-14 rounded-lg border border-gray-200 object-cover mb-1" onError={e=>e.target.style.display='none'}/>}
                  <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge color="gray">{q.marks}m</Badge>
                    {q.paper_options?.length>0&&<span className="text-xs text-gray-400">{q.paper_options.length} options</span>}
                    {q.paper_options?.find(o=>o.is_correct)&&(
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={11}/>{q.paper_options.find(o=>o.is_correct).option_text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={()=>openEdit(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                  <button onClick={()=>setDeleteConfirm(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Question':'Add Question'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <Field label="Marks" type="number" min="1" value={form.marks} onChange={e=>setForm(f=>({...f,marks:e.target.value}))}/>
          </div>

          {/* Question texts */}
          <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
            <Txt label="Question (English) *" placeholder="Enter question…" value={form.question_text}
              onChange={e=>setForm(f=>({...f,question_text:e.target.value}))} className="min-h-[70px]"/>
            <Txt label="Question (Sinhala)" placeholder="සිංහල ප්‍රශ්නය…" value={form.question_si}
              onChange={e=>setForm(f=>({...f,question_si:e.target.value}))} className="min-h-[60px]"/>
            <Txt label="Question (Tamil)" placeholder="தமிழ் கேள்வி…" value={form.question_ta}
              onChange={e=>setForm(f=>({...f,question_ta:e.target.value}))} className="min-h-[60px]"/>
          </div>

          {/* Question image */}
          <ImageField label="Question Image (optional)" value={form.image_url} onChange={v=>setForm(f=>({...f,image_url:v}))}/>

          {/* MCQ options */}
          {isMCQ && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Options</p>
                {section?.section_type==='mcq'&&(
                  <Btn variant="ghost" size="sm" onClick={()=>setForm(f=>({...f,options:[...f.options,emptyOpt(f.options.length+1)]}))} className="gap-1 text-xs">
                    <Plus size={11}/> Add
                  </Btn>
                )}
              </div>
              <div className="space-y-3">
                {form.options.map((opt,oi)=>(
                  <div key={opt._id} className={clsx('p-3 rounded-xl border-2',opt.is_correct?'border-green-400 bg-green-50':'border-gray-200 bg-white')}>
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" onClick={()=>setCorrect(opt._id)}
                        className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',opt.is_correct?'border-green-500 bg-green-500':'border-gray-300 hover:border-blue-400')}>
                        {opt.is_correct&&<div className="w-2 h-2 rounded-full bg-white"/>}
                      </button>
                      <span className={clsx('text-xs font-semibold',opt.is_correct?'text-green-700':'text-gray-500')}>
                        Option {oi+1}{opt.is_correct?' ✓ Correct':''}
                      </span>
                      {section?.section_type==='mcq'&&form.options.length>2&&(
                        <button type="button" onClick={()=>setForm(f=>({...f,options:f.options.filter(o=>o._id!==opt._id)}))} className="ml-auto p-1 text-gray-300 hover:text-red-500"><X size={12}/></button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <Field label="EN *" placeholder="Option…" value={opt.option_text} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_text:e.target.value}:o)}))}/>
                      <Field label="SI" placeholder="විකල්පය…" value={opt.option_si} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_si:e.target.value}:o)}))}/>
                      <Field label="TA" placeholder="விருப்பம்…" value={opt.option_ta} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_ta:e.target.value}:o)}))}/>
                    </div>
                    <ImageField label="Option Image" value={opt.image_url} onChange={v=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,image_url:v}:o)}))}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model answer for written */}
          {!isMCQ && (
            <Txt label="Model Answer / Marking Scheme (optional)" placeholder="Expected answer…"
              value={form.model_answer} onChange={e=>setForm(f=>({...f,model_answer:e.target.value}))} className="min-h-[100px]"/>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing?'Save Changes':'Create Question'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Question" size="sm">
        <p className="text-gray-600 mb-5">Delete this question?</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
