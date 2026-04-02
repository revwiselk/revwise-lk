import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TYPES = ['past_paper','model_paper','term_test','mock_exam','sample']
const TYPE_L = { past_paper:'Past Paper', model_paper:'Model Paper', term_test:'Term Test', mock_exam:'Mock Exam', sample:'Sample' }
const TYPE_C = { past_paper:'blue', model_paper:'green', term_test:'amber', mock_exam:'red', sample:'gray' }

const blank = (streams, subjects) => ({ stream_id:streams[0]?.id||'', subject_id:subjects[0]?.id||'', paper_type:'past_paper', year:'', title:'', description:'', duration_mins:'', total_marks:'100', pdf_url:'', is_active:true })

export default function ALAdminPapers() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [streams, setStreams] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStream, setFilterStream] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [pRes, sRes, subRes] = await Promise.all([
      supabaseAdmin.from('al_papers').select('*, al_streams(name,color_hex), al_subjects(name), al_paper_sections(id)').order('created_at',{ascending:false}),
      supabaseAdmin.from('al_streams').select('id,name,color_hex').order('order_index'),
      supabaseAdmin.from('al_subjects').select('id,name').order('name'),
    ])
    setPapers(pRes.data||[]); setStreams(sRes.data||[]); setSubjects(subRes.data||[])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm(blank(streams,subjects)); setModalOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ stream_id:p.stream_id||'', subject_id:p.subject_id||'', paper_type:p.paper_type, year:p.year||'', title:p.title, description:p.description||'', duration_mins:p.duration_mins||'', total_marks:p.total_marks||100, pdf_url:p.pdf_url||'', is_active:p.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { stream_id:form.stream_id||null, subject_id:form.subject_id||null, paper_type:form.paper_type, year:form.year?parseInt(form.year):null, title:form.title.trim(), description:form.description||null, duration_mins:form.duration_mins?parseInt(form.duration_mins):null, total_marks:parseInt(form.total_marks)||100, pdf_url:form.pdf_url?.trim()||null, is_active:form.is_active }
    const { error } = editing
      ? await supabaseAdmin.from('al_papers').update(payload).eq('id',editing.id)
      : await supabaseAdmin.from('al_papers').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editing?'Updated':'Created')
    setSaving(false); setModalOpen(false); fetchAll()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('al_papers').delete().eq('id',id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchAll()
  }

  const filtered = filterStream==='all' ? papers : papers.filter(p=>p.stream_id===filterStream)

  return (
    <div>
      <PageHead title="A/L Papers" sub={`${papers.length} papers`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/>Add Paper</Btn>}/>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setFilterStream('all')} className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all',filterStream==='all'?'border-violet-500 bg-violet-50 text-violet-700':'border-gray-200 text-gray-600')}>All</button>
        {streams.map(s=>(
          <button key={s.id} onClick={()=>setFilterStream(s.id)} className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all',filterStream===s.id?'border-violet-500 bg-violet-50 text-violet-700':'border-gray-200 text-gray-600')}>
            {s.name}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      : filtered.length===0 ? <EmptyState icon={FileText} title="No papers" desc="Add A/L past papers."/>
      : <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">{['Title','Stream','Type','Year','PDF','Sections','Actions'].map(h=><th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-medium text-gray-900 text-sm truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">{p.al_subjects?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor:(p.al_streams?.color_hex||'#888')+'22',color:p.al_streams?.color_hex||'#888'}}>
                        {p.al_streams?.name?.split(' ')[0]||'—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge color={TYPE_C[p.paper_type]||'gray'}>{TYPE_L[p.paper_type]}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.year||'—'}</td>
                    <td className="px-4 py-3">{p.pdf_url?<span className="bdg-blue text-xs">✓ PDF</span>:<span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.al_paper_sections?.length||0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>navigate(`/admin/al/papers/${p.id}/sections`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><ChevronRight size={15}/></button>
                        <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                        <button onClick={()=>setDeleteConfirm(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Paper':'Add Paper'} size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Stream" value={form.stream_id||''} onChange={e=>setForm(f=>({...f,stream_id:e.target.value}))}>
              <option value="">— No stream —</option>
              {streams.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
            <Sel label="Subject" value={form.subject_id||''} onChange={e=>setForm(f=>({...f,subject_id:e.target.value}))}>
              <option value="">— No subject —</option>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Paper Type" value={form.paper_type||'past_paper'} onChange={e=>setForm(f=>({...f,paper_type:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{TYPE_L[t]}</option>)}
            </Sel>
            <Field label="Year" type="number" placeholder="2023" value={form.year||''} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/>
          </div>
          <Field label="Title *" placeholder="2023 A/L Physics Paper I" value={form.title||''} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Marks" type="number" value={form.total_marks||100} onChange={e=>setForm(f=>({...f,total_marks:e.target.value}))}/>
            <Field label="Duration (min)" type="number" value={form.duration_mins||''} onChange={e=>setForm(f=>({...f,duration_mins:e.target.value}))}/>
          </div>
          <Txt label="Description" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="min-h-[60px]"/>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Field label="PDF URL (optional)" placeholder="https://drive.google.com/..." value={form.pdf_url||''} onChange={e=>setForm(f=>({...f,pdf_url:e.target.value}))}/>
            <p className="text-xs text-gray-500 mt-1">Students can download this PDF.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-violet-600"/> Active
          </label>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{editing?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Paper" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>?</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
