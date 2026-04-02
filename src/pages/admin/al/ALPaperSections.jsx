import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const S_TYPES = ['mcq','short_answer','essay','structured','fill_blank','true_false']
const S_LABELS = { mcq:'MCQ', short_answer:'Short Answer', essay:'Essay', structured:'Structured', fill_blank:'Fill Blank', true_false:'True/False' }
const S_COLORS = { mcq:'blue', short_answer:'green', essay:'purple', structured:'amber', fill_blank:'gray', true_false:'cyan' }

const blank = (n=1) => ({ order_index:n, title:'', section_type:'mcq', marks:'25', instructions:'' })

export default function ALPaperSections() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(blank())

  useEffect(() => { fetchData() }, [paperId])

  const fetchData = async () => {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      supabaseAdmin.from('al_papers').select('id,title,al_streams(name),al_subjects(name)').eq('id',paperId).single(),
      supabaseAdmin.from('al_paper_sections').select('id,order_index,title,section_type,marks,instructions,al_paper_questions(id)').eq('paper_id',paperId).order('order_index'),
    ])
    if (pRes.data) setPaper(pRes.data)
    setSections(sRes.data||[])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm(blank(sections.length+1)); setModalOpen(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ order_index:s.order_index, title:s.title, section_type:s.section_type, marks:s.marks, instructions:s.instructions||'' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { paper_id:paperId, order_index:parseInt(form.order_index)||1, title:form.title.trim(), section_type:form.section_type, marks:parseInt(form.marks)||0, instructions:form.instructions||null }
    const { error } = editing
      ? await supabaseAdmin.from('al_paper_sections').update(payload).eq('id',editing.id)
      : await supabaseAdmin.from('al_paper_sections').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editing?'Updated':'Created')
    setSaving(false); setModalOpen(false); fetchData()
  }

  const handleDelete = async (id) => {
    await supabaseAdmin.from('al_paper_sections').delete().eq('id',id)
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  return (
    <div>
      <button onClick={()=>navigate('/admin/al/papers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={16}/> Back to A/L Papers
      </button>
      <PageHead
        crumb={`${paper?.al_streams?.name||''} · ${paper?.al_subjects?.name||''}`}
        title={paper?.title||'Sections'}
        sub={`${sections.length} sections`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/>Add Section</Btn>}/>

      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      : sections.length===0 ? <EmptyState icon={null} title="No sections yet" desc="Add sections like Part A (MCQ), Part B (Essay)…"/>
      : <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">{['#','Section','Type','Questions','Marks','Actions'].map(h=><th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {sections.map(s=>(
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 font-bold text-sm flex items-center justify-center">{String.fromCharCode(64+s.order_index)}</div></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                  <td className="px-4 py-3"><Badge color={S_COLORS[s.section_type]||'gray'}>{S_LABELS[s.section_type]}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.al_paper_questions?.length||0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.marks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>navigate(`/admin/al/paper-sections/${s.id}/questions`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><ChevronRight size={15}/></button>
                      <button onClick={()=>openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={15}/></button>
                      <button onClick={()=>setDeleteConfirm(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Section':'Add Section'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <Sel label="Type" value={form.section_type} onChange={e=>setForm(f=>({...f,section_type:e.target.value}))}>
              {S_TYPES.map(t=><option key={t} value={t}>{S_LABELS[t]}</option>)}
            </Sel>
          </div>
          <Field label="Section Title *" placeholder="Part A – Multiple Choice" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          <Field label="Marks" type="number" value={form.marks} onChange={e=>setForm(f=>({...f,marks:e.target.value}))}/>
          <Txt label="Instructions (optional)" value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))} className="min-h-[60px]"/>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{editing?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Section" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>?</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
