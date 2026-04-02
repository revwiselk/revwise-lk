import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ArrowLeft, X, Image as ImageIcon, CheckCircle2,
         Upload, Download, AlertCircle, Video, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import ExcelJS from 'exceljs'

const emptyOpt = (i) => ({
  _id: Math.random().toString(36).slice(2),
  order_index:i, option_text:'', option_si:'', option_ta:'', is_correct:false, image_url:''
})

const emptyQ = () => ({
  question_text:'', question_si:'', question_ta:'', image_url:'',
  marks:1, question_type:'mcq', model_answer:'', order_index:1,
  hint:'', hint_si:'', hint_ta:'',
  explanation:'', explanation_si:'', explanation_ta:'', video_link:'', video_link_si:'', video_link_ta:'',
  options:[emptyOpt(1),emptyOpt(2),emptyOpt(3),emptyOpt(4)],
})

function ImgField({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1"><ImageIcon size={11} className="text-gray-400"/><label className="text-xs text-gray-500">{label}</label></div>
      <input type="url" value={value} onChange={e=>onChange(e.target.value)} placeholder="https://..." className="inp text-xs py-1.5 w-full"/>
      {value?.trim()&&<img src={value} alt="" className="h-12 rounded-lg border border-gray-200 mt-1 object-cover" onError={e=>e.target.style.display='none'}/>}
    </div>
  )
}

// Excel: question_en/si/ta, marks, question_type, model_answer,
//        hint_en/si/ta, explanation_en/si/ta, video_link,
//        opt1-4 _en/_si/_ta/_correct
function parseExcelRows(rows, sectionType) {
  return rows.map((row, i) => {
    const opts = [1,2,3,4].map(n => ({
      _id: Math.random().toString(36).slice(2), order_index:n, image_url:'',
      is_correct: String(row[`opt${n}_correct`]||'').toLowerCase()==='true'||row[`opt${n}_correct`]===1||row[`opt${n}_correct`]===true,
      option_text:String(row[`opt${n}_en`]||''), option_si:String(row[`opt${n}_si`]||''), option_ta:String(row[`opt${n}_ta`]||''),
    })).filter(o=>o.option_text.trim())
    return {
      order_index:i+1, marks:parseInt(row.marks)||1,
      question_type:row.question_type||sectionType||'mcq',
      question_text:String(row.question_en||''), question_si:String(row.question_si||''), question_ta:String(row.question_ta||''),
      image_url:'', model_answer:String(row.model_answer||''),
      hint:String(row.hint_en||''), hint_si:String(row.hint_si||''), hint_ta:String(row.hint_ta||''),
      explanation:String(row.explanation_en||''), explanation_si:String(row.explanation_si||''), explanation_ta:String(row.explanation_ta||''),
      video_link:String(row.video_link||''), video_link_si:String(row.video_link_si||''), video_link_ta:String(row.video_link_ta||''), options:opts,
    }
  }).filter(q=>q.question_text.trim())
}

export default function AdminPaperQuestions() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [section, setSection] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(emptyQ())
  const [importPreview, setImportPreview] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [langTab, setLangTab] = useState('english')

  useEffect(()=>{ fetchData() },[sectionId])

  const fetchData = async () => {
    setLoading(true)
    const [sRes,qRes] = await Promise.all([
      supabaseAdmin.from('al_paper_sections').select('id,title,section_type,marks,paper_id,al_papers(title,al_streams(name),al_subjects(name))').eq('id',sectionId).single(),
      supabaseAdmin.from('al_paper_questions').select('*,paper_options(*)').eq('section_id',sectionId).order('order_index'),
    ])
    if(sRes.data) setSection(sRes.data)
    setQuestions((qRes.data||[]).map(q=>({...q,paper_options:(q.paper_options||[]).sort((a,b)=>a.order_index-b.order_index)})))
    setLoading(false)
  }

  const isMCQ = (t) => t==='mcq'||t==='true_false'

  const openCreate = () => {
    setEditing(null); setLangTab('english')
    const q=emptyQ(); q.order_index=questions.length+1; q.question_type=section?.section_type||'mcq'
    if(section?.section_type==='true_false') q.options=[
      {_id:'tf1',order_index:1,option_text:'True',option_si:'සත්‍ය',option_ta:'உண்மை',is_correct:true,image_url:''},
      {_id:'tf2',order_index:2,option_text:'False',option_si:'අසත්‍ය',option_ta:'பொய்',is_correct:false,image_url:''},
    ]
    setForm(q); setModalOpen(true)
  }

  const openEdit = (q) => {
    setEditing(q); setLangTab('english')
    const opts=[...(q.paper_options||[])].map(o=>({_id:o.id,id:o.id,order_index:o.order_index,option_text:o.option_text||'',option_si:o.option_si||'',option_ta:o.option_ta||'',is_correct:o.is_correct,image_url:o.image_url||''}))
    setForm({
      question_text:q.question_text||'',question_si:q.question_si||'',question_ta:q.question_ta||'',
      image_url:q.image_url||'',marks:q.marks||1,question_type:q.question_type||section?.section_type||'mcq',
      model_answer:q.model_answer||'',order_index:q.order_index,
      hint:q.hint||'',hint_si:q.hint_si||'',hint_ta:q.hint_ta||'',
      explanation:q.explanation||'',explanation_si:q.explanation_si||'',explanation_ta:q.explanation_ta||'',
      video_link:q.video_link||'', video_link_si:q.video_link_si||'', video_link_ta:q.video_link_ta||'', options:opts,
    })
    setModalOpen(true)
  }

  const saveOneQuestion = async (f, qId=null) => {
    if(!f.question_text.trim()) throw new Error('Question text (English) required')
    const isM=isMCQ(f.question_type)
    if(isM&&!f.options.some(o=>o.is_correct)) throw new Error('Mark one correct answer')
    const payload = {
      section_id:sectionId, order_index:parseInt(f.order_index)||1,
      question_text:f.question_text.trim(), question_si:f.question_si?.trim()||null, question_ta:f.question_ta?.trim()||null,
      image_url:f.image_url?.trim()||null, marks:parseInt(f.marks)||1, question_type:f.question_type||'mcq',
      model_answer:f.model_answer?.trim()||null,
      hint:f.hint?.trim()||null, hint_si:f.hint_si?.trim()||null, hint_ta:f.hint_ta?.trim()||null,
      explanation:f.explanation?.trim()||null, explanation_si:f.explanation_si?.trim()||null,
      explanation_ta:f.explanation_ta?.trim()||null, video_link:f.video_link?.trim()||null, video_link_si:f.video_link_si?.trim()||null, video_link_ta:f.video_link_ta?.trim()||null,
    }
    let qId2=qId
    if(qId){const{error}=await supabaseAdmin.from('al_paper_questions').update(payload).eq('id',qId);if(error)throw new Error(error.message)}
    else{const{data,error}=await supabaseAdmin.from('al_paper_questions').insert(payload).select().single();if(error)throw new Error(error.message);qId2=data.id}
    if(isM){
      await supabaseAdmin.from('al_paper_options').delete().eq('question_id',qId2)
      for(const opt of f.options){
        if(!opt.option_text.trim()) continue
        await supabaseAdmin.from('al_paper_options').insert({
          question_id:qId2,order_index:opt.order_index,option_text:opt.option_text.trim(),
          option_si:opt.option_si?.trim()||null,option_ta:opt.option_ta?.trim()||null,
          is_correct:opt.is_correct,image_url:opt.image_url?.trim()||null,
        })
      }
    }
    return qId2
  }

  const handleSave = async () => {
    setSaving(true)
    try{await saveOneQuestion(form,editing?.id);toast.success(editing?'Updated!':'Created!');setModalOpen(false);fetchData()}
    catch(e){toast.error(e.message)}
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabaseAdmin.from('al_paper_questions').delete().eq('id',id)
    toast.success('Deleted');setDeleteConfirm(null);fetchData()
  }

  const downloadTemplate = async () => {
    const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Questions')
    const isM=isMCQ(section?.section_type||'mcq')
    const base=['question_en','question_si','question_ta','marks','question_type','model_answer',
                'hint_en','hint_si','hint_ta','explanation_en','explanation_si','explanation_ta','video_link']
    const mcqH=['opt1_en','opt1_si','opt1_ta','opt1_correct','opt2_en','opt2_si','opt2_ta','opt2_correct',
                'opt3_en','opt3_si','opt3_ta','opt3_correct','opt4_en','opt4_si','opt4_ta','opt4_correct']
    const headers=isM?[...base,...mcqH]:base
    ws.columns=headers.map(h=>({header:h,key:h,width:22}))
    ws.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}}})
    if(isM) ws.addRow({question_en:'What is H2O?',marks:1,question_type:'mcq',hint_en:'Think about water.',
      explanation_en:'Water is H2O.',video_link:'https://youtube.com/watch?v=example',
      opt1_en:'Water',opt1_correct:'true',opt2_en:'Fire',opt2_correct:'false',opt3_en:'Air',opt3_correct:'false',opt4_en:'Earth',opt4_correct:'false'})
    else ws.addRow({question_en:'Explain photosynthesis.',marks:5,question_type:section?.section_type||'essay',
      hint_en:'Think about how plants make food.',
      model_answer:'Plants use sunlight to make food.',explanation_en:'Photosynthesis uses chlorophyll.'})
    const buf=await wb.xlsx.writeBuffer()
    const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))
    const a=document.createElement('a');a.href=url;a.download='paper_questions_template.xlsx';a.click();URL.revokeObjectURL(url)
  }

  const handleFileChange = async (e) => {
    const file=e.target.files?.[0];if(!file) return
    try{
      const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer())
      const ws=wb.worksheets[0];const headerRow=ws.getRow(1).values
      const headers=Array.isArray(headerRow)?headerRow.slice(1):[]
      const rows=[];ws.eachRow((row,rowNum)=>{if(rowNum===1)return;const obj={};row.values.forEach((val,ci)=>{if(ci===0)return;const h=headers[ci-1];if(h)obj[h]=val===null||val===undefined?'':val});rows.push(obj)})
      const parsed=parseExcelRows(rows,section?.section_type)
      if(!parsed.length){toast.error('No valid questions found. Check column names.');return}
      setImportPreview(parsed);setImportModal(true)
    }catch(err){toast.error('Failed to read file: '+err.message)}
    e.target.value=''
  }

  const handleImport = async () => {
    if(!importPreview?.length) return
    setImporting(true);let ok=0,fail=0
    for(const q of importPreview){try{await saveOneQuestion({...q,order_index:questions.length+ok+1});ok++}catch(e){console.error(e);fail++}}
    toast.success(`Imported ${ok} questions${fail?`, ${fail} failed`:''}`)
    setImporting(false);setImportModal(false);setImportPreview(null);fetchData()
  }

  const setCorrect=(_id)=>setForm(f=>({...f,options:f.options.map(o=>({...o,is_correct:o._id===_id}))}))
  const isM=isMCQ(form.question_type||section?.section_type)
  const LANGS=['english','sinhala','tamil'];const LANG_L={english:'EN',sinhala:'SI',tamil:'TA'}

  return (
    <div>
      <button onClick={()=>navigate(`/admin/papers/${section?.paper_id}/sections`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16}/> Back to Sections
      </button>
      <PageHead crumb={`${section?.al_papers?.al_subjects?.name||''} · ${section?.title}`} title="Questions"
        sub={`${questions.length} questions · ${section?.marks||0} marks`}
        action={<div className="flex flex-wrap gap-2">
          <Btn variant="white" onClick={downloadTemplate} className="gap-2"><Download size={14}/> Template</Btn>
          <Btn variant="white" onClick={()=>fileRef.current?.click()} className="gap-2"><Upload size={14}/> Excel</Btn>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange}/>
          <Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={15}/> Add Question</Btn>
        </div>}/>

      {loading?(<div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>)
      :questions.length===0?(<EmptyState icon={null} title="No questions yet" desc="Add manually or import from Excel."/>)
      :(<div className="space-y-3">
        {questions.map((q,i)=>(
          <div key={q.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                {q.image_url&&<img src={q.image_url} alt="" className="h-12 rounded-lg border border-gray-200 object-cover mb-1" onError={e=>e.target.style.display='none'}/>}
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{q.question_text}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge color="gray">{q.marks}m</Badge><Badge color="blue">{q.question_type}</Badge>
                  {q.paper_options?.find(o=>o.is_correct)&&<span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={11}/>{q.paper_options.find(o=>o.is_correct).option_text}</span>}
                  {q.hint&&<span className="text-xs text-amber-500 flex items-center gap-1"><Lightbulb size={10}/>Hint</span>}
                  {q.explanation&&<span className="text-xs text-purple-500">Explanation ✓</span>}
                  {q.video_link&&<span className="text-xs text-blue-400 flex items-center gap-1"><Video size={10}/>Video</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={()=>openEdit(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                <button onClick={()=>setDeleteConfirm(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>)}

      {/* Question Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit A/L Question':'Add A/L Question'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <Field label="Marks" type="number" min="1" value={form.marks} onChange={e=>setForm(f=>({...f,marks:e.target.value}))}/>
          </div>

          {/* Question text — language tabs */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question Text</p>
              <div className="flex gap-1 bg-gray-200 p-0.5 rounded-lg">
                {LANGS.map(l=>(
                  <button key={l} type="button" onClick={()=>setLangTab(l)}
                    className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold transition-all',langTab===l?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
                    {LANG_L[l]}{l==='english'&&form.question_text?' ✓':l==='sinhala'&&form.question_si?' ✓':l==='tamil'&&form.question_ta?' ✓':''}
                  </button>
                ))}
              </div>
            </div>
            {langTab==='english'&&<Txt label="English *" placeholder="Enter question…" value={form.question_text} onChange={e=>setForm(f=>({...f,question_text:e.target.value}))} className="min-h-[70px]"/>}
            {langTab==='sinhala'&&<Txt label="Sinhala" placeholder="සිංහල ප්‍රශ්නය…" value={form.question_si} onChange={e=>setForm(f=>({...f,question_si:e.target.value}))} className="min-h-[70px]"/>}
            {langTab==='tamil'&&<Txt label="Tamil" placeholder="தமிழ் கேள்வி…" value={form.question_ta} onChange={e=>setForm(f=>({...f,question_ta:e.target.value}))} className="min-h-[70px]"/>}
          </div>

          <ImgField label="Question Image (optional)" value={form.image_url} onChange={v=>setForm(f=>({...f,image_url:v}))}/>

          {/* Hint */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1"><Lightbulb size={12}/>Hint (shown while answering)</p>
            <Field label="Hint (English)" placeholder="Give a clue without revealing the answer…" value={form.hint} onChange={e=>setForm(f=>({...f,hint:e.target.value}))}/>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hint (Sinhala)" placeholder="힌트…" value={form.hint_si} onChange={e=>setForm(f=>({...f,hint_si:e.target.value}))}/>
              <Field label="Hint (Tamil)" placeholder="குறிப்பு…" value={form.hint_ta} onChange={e=>setForm(f=>({...f,hint_ta:e.target.value}))}/>
            </div>
          </div>

          {/* MCQ Options */}
          {isM&&(
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Options</p>
                {section?.section_type==='mcq'&&(<Btn variant="ghost" size="sm" onClick={()=>setForm(f=>({...f,options:[...f.options,emptyOpt(f.options.length+1)]}))} className="gap-1 text-xs"><Plus size={11}/> Add</Btn>)}
              </div>
              <div className="space-y-3">
                {form.options.map((opt,oi)=>(
                  <div key={opt._id} className={clsx('p-3 rounded-xl border-2',opt.is_correct?'border-green-400 bg-green-50':'border-gray-200 bg-white')}>
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" onClick={()=>setCorrect(opt._id)} className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',opt.is_correct?'border-green-500 bg-green-500':'border-gray-300 hover:border-blue-400')}>
                        {opt.is_correct&&<div className="w-2 h-2 rounded-full bg-white"/>}
                      </button>
                      <span className={clsx('text-xs font-semibold',opt.is_correct?'text-green-700':'text-gray-500')}>Option {oi+1}{opt.is_correct?' ✓':''}</span>
                      {section?.section_type==='mcq'&&form.options.length>2&&(<button type="button" onClick={()=>setForm(f=>({...f,options:f.options.filter(o=>o._id!==opt._id)}))} className="ml-auto p-1 text-gray-300 hover:text-red-500"><X size={12}/></button>)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <Field label="EN *" placeholder="Option…" value={opt.option_text} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_text:e.target.value}:o)}))}/>
                      <Field label="SI" placeholder="විකල්පය…" value={opt.option_si} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_si:e.target.value}:o)}))}/>
                      <Field label="TA" placeholder="விருப்பம்…" value={opt.option_ta} onChange={e=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,option_ta:e.target.value}:o)}))}/>
                    </div>
                    <ImgField label="Option Image" value={opt.image_url} onChange={v=>setForm(f=>({...f,options:f.options.map(o=>o._id===opt._id?{...o,image_url:v}:o)}))}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Written model answer */}
          {!isM&&(<Txt label="Model Answer / Marking Scheme (optional)" placeholder="Expected answer…" value={form.model_answer} onChange={e=>setForm(f=>({...f,model_answer:e.target.value}))} className="min-h-[80px]"/>)}

          {/* Explanation + Video (shown AFTER submission) */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide flex items-center gap-1"><Video size={12}/>Explanation & Video (shown in Answer Review after submission)</p>
            <Txt label="Explanation (English)" placeholder="Why is this the correct answer?" value={form.explanation} onChange={e=>setForm(f=>({...f,explanation:e.target.value}))} className="min-h-[60px]"/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Txt label="Explanation (Sinhala)" placeholder="සිංහල පැහැදිලි කිරීම…" value={form.explanation_si} onChange={e=>setForm(f=>({...f,explanation_si:e.target.value}))} className="min-h-[50px]"/>
              <Txt label="Explanation (Tamil)" placeholder="தமிழ் விளக்கம்…" value={form.explanation_ta} onChange={e=>setForm(f=>({...f,explanation_ta:e.target.value}))} className="min-h-[50px]"/>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">🎬 Explanation Videos (per language)</p>
              <Field label="🇬🇧 English Video URL" placeholder="YouTube or direct video link" value={form.video_link} onChange={e=>setForm(f=>({...f,video_link:e.target.value}))}/>
              <Field label="🇱🇰 Sinhala Video URL" placeholder="YouTube or direct video link" value={form.video_link_si} onChange={e=>setForm(f=>({...f,video_link_si:e.target.value}))}/>
              <Field label="🇮🇳 Tamil Video URL" placeholder="YouTube or direct video link" value={form.video_link_ta} onChange={e=>setForm(f=>({...f,video_link_ta:e.target.value}))}/>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{editing?'Save Changes':'Create Question'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Excel Import Preview */}
      <Modal open={importModal} onClose={()=>{setImportModal(false);setImportPreview(null)}} title="Import Questions from Excel" size="xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <AlertCircle size={15} className="text-blue-600 shrink-0"/>
            <p className="text-sm text-blue-700">Found <strong>{importPreview?.length||0} questions</strong>. Review then confirm.</p>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {(importPreview||[]).slice(0,20).map((q,i)=>(
              <div key={i} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge color="gray">{q.marks}m</Badge><Badge color="blue">{q.question_type}</Badge>
                  {q.options?.length>0&&<span className="text-xs text-gray-400">{q.options.length} opts</span>}
                  {!q.options?.some(o=>o.is_correct)&&isMCQ(q.question_type)&&<Badge color="red">⚠ No correct</Badge>}
                  {q.hint&&<span className="text-xs text-amber-500">Hint ✓</span>}
                  {q.explanation&&<span className="text-xs text-purple-500">Expl ✓</span>}
                  {q.video_link&&<span className="text-xs text-blue-400">Video ✓</span>}
                </div>
                <p className="text-sm text-gray-800 truncate">{q.question_text}</p>
              </div>
            ))}
            {(importPreview?.length||0)>20&&<p className="text-xs text-gray-400 text-center">+{importPreview.length-20} more</p>}
          </div>
          <div className="flex gap-3">
            <Btn variant="white" className="flex-1" onClick={()=>{setImportModal(false);setImportPreview(null)}}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={importing} onClick={handleImport}>Import {importPreview?.length||0} Questions</Btn>
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
