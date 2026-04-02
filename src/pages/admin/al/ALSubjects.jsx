import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, BookOpen, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const blank = () => ({ slug:'', name:'', name_si:'', name_ta:'', description:'', desc_si:'', desc_ta:'', color_hex:'#2563eb', order_index:0, is_active:true })

export default function ALAdminSubjects() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(blank())

  useEffect(() => { fetchSubjects() }, [])

  const fetchSubjects = async () => {
    setLoading(true)
    const { data } = await supabaseAdmin.from('al_subjects')
      .select('*, al_stream_subjects(al_streams(id,name,color_hex)), al_chapters(id)')
      .order('name')
    setSubjects(data||[])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm(blank()); setModalOpen(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ slug:s.slug, name:s.name, name_si:s.name_si||'', name_ta:s.name_ta||'', description:s.description||'', desc_si:s.desc_si||'', desc_ta:s.desc_ta||'', color_hex:s.color_hex||'#2563eb', order_index:s.order_index, is_active:s.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug required'); return }
    setSaving(true)
    const payload = { slug:form.slug.trim().toLowerCase().replace(/\s+/g,'_'), name:form.name.trim(), name_si:form.name_si||null, name_ta:form.name_ta||null, description:form.description||null, desc_si:form.desc_si||null, desc_ta:form.desc_ta||null, color_hex:form.color_hex, order_index:parseInt(form.order_index)||0, is_active:form.is_active }
    const { error } = editing
      ? await supabaseAdmin.from('al_subjects').update(payload).eq('id',editing.id)
      : await supabaseAdmin.from('al_subjects').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editing?'Subject updated':'Subject created')
    setSaving(false); setModalOpen(false); fetchSubjects()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('al_subjects').delete().eq('id',id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchSubjects()
  }

  return (
    <div>
      <PageHead title="A/L Subjects" sub={`${subjects.length} subjects`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/>Add Subject</Btn>}/>

      {loading ? <div className="space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      : subjects.length===0 ? <EmptyState icon={BookOpen} title="No subjects yet" desc="Add A/L subjects then assign them to streams."/>
      : <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">{['Subject','Streams','Chapters','Status','Actions'].map(h=><th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {subjects.map(s=>(
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{backgroundColor:s.color_hex+'22'}}>
                        <BookOpen size={14} style={{color:s.color_hex}}/>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                        {s.name_si && <p className="text-xs text-gray-400">{s.name_si}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.al_stream_subjects||[]).map(ss=>(
                        <span key={ss.al_streams?.id} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:(ss.al_streams?.color_hex||'#888')+'22',color:ss.al_streams?.color_hex||'#888'}}>
                          {ss.al_streams?.name?.split(' ')[0]}
                        </span>
                      ))}
                      {!s.al_stream_subjects?.length && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.al_chapters?.length||0}</td>
                  <td className="px-4 py-3"><Badge color={s.is_active?'green':'gray'}>{s.is_active?'Active':'Hidden'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>navigate(`/al-admin/subjects/${s.id}/chapters`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><ChevronRight size={15}/></button>
                      <button onClick={()=>openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                      <button onClick={()=>setDeleteConfirm(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Subject':'Add Subject'} size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug *" placeholder="physics" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}/>
            <Field label="Order" type="number" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
          </div>
          <Field label="Name (English) *" placeholder="Physics" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (Sinhala)" placeholder="භෞතික විද්‍යාව" value={form.name_si} onChange={e=>setForm(f=>({...f,name_si:e.target.value}))}/>
            <Field label="Name (Tamil)" placeholder="இயற்பியல்" value={form.name_ta} onChange={e=>setForm(f=>({...f,name_ta:e.target.value}))}/>
          </div>
          <Txt label="Description (English)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="min-h-[50px]"/>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Color</label>
              <input type="color" value={form.color_hex} onChange={e=>setForm(f=>({...f,color_hex:e.target.value}))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"/>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
              <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-blue-600"/> Active
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{editing?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Subject" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.name}</strong>?</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
