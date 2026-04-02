import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const blank = () => ({ slug:'', name:'', name_si:'', name_ta:'', description:'', color_hex:'#7c3aed', order_index:0, is_active:true })

export default function ALAdminStreams() {
  const navigate = useNavigate()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(blank())
  // Subject assignment modal
  const [subjectModal, setSubjectModal] = useState(null) // stream row
  const [allSubjects, setAllSubjects] = useState([])
  const [streamSubjects, setStreamSubjects] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [sRes, subRes] = await Promise.all([
      supabaseAdmin.from('al_streams').select('*, al_stream_subjects(al_subjects(id,name,name_si))').order('order_index'),
      supabaseAdmin.from('al_subjects').select('id,name,name_si').order('name'),
    ])
    setStreams(sRes.data||[])
    setAllSubjects(subRes.data||[])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm(blank()); setModalOpen(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ slug:s.slug, name:s.name, name_si:s.name_si||'', name_ta:s.name_ta||'', description:s.description||'', color_hex:s.color_hex||'#7c3aed', order_index:s.order_index, is_active:s.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug required'); return }
    setSaving(true)
    const payload = { slug:form.slug.trim().toLowerCase().replace(/\s+/g,'_'), name:form.name.trim(), name_si:form.name_si||null, name_ta:form.name_ta||null, description:form.description||null, color_hex:form.color_hex, order_index:parseInt(form.order_index)||0, is_active:form.is_active }
    const { error } = editing
      ? await supabaseAdmin.from('al_streams').update(payload).eq('id',editing.id)
      : await supabaseAdmin.from('al_streams').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editing ? 'Stream updated' : 'Stream created')
    setSaving(false); setModalOpen(false); fetchAll()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('al_streams').delete().eq('id',id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchAll()
  }

  const openSubjectModal = async (stream) => {
    setSubjectModal(stream)
    const { data } = await supabaseAdmin.from('al_stream_subjects').select('subject_id, is_core').eq('stream_id', stream.id)
    setStreamSubjects(data||[])
  }

  const toggleSubject = async (subjectId) => {
    const existing = streamSubjects.find(s => s.subject_id === subjectId)
    if (existing) {
      await supabaseAdmin.from('al_stream_subjects').delete().eq('stream_id',subjectModal.id).eq('subject_id',subjectId)
      setStreamSubjects(p => p.filter(s => s.subject_id !== subjectId))
    } else {
      await supabaseAdmin.from('al_stream_subjects').insert({ stream_id:subjectModal.id, subject_id:subjectId, is_core:false })
      setStreamSubjects(p => [...p, { subject_id:subjectId, is_core:false }])
    }
  }

  const toggleCore = async (subjectId) => {
    const existing = streamSubjects.find(s => s.subject_id === subjectId)
    if (!existing) return
    const newCore = !existing.is_core
    await supabaseAdmin.from('al_stream_subjects').update({ is_core:newCore }).eq('stream_id',subjectModal.id).eq('subject_id',subjectId)
    setStreamSubjects(p => p.map(s => s.subject_id===subjectId ? {...s,is_core:newCore} : s))
  }

  return (
    <div>
      <PageHead title="A/L Streams" sub={`${streams.length} streams`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/>Add Stream</Btn>}/>

      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>
      : streams.length===0 ? <EmptyState icon={Layers} title="No streams yet" desc="Add A/L streams."/>
      : <div className="space-y-3">
          {streams.map(s => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{backgroundColor:s.color_hex+'22'}}>
                  <Layers size={18} style={{color:s.color_hex}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.name_si} · {s.al_stream_subjects?.length||0} subjects</p>
                </div>
                <Badge color={s.is_active?'green':'gray'}>{s.is_active?'Active':'Hidden'}</Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={()=>openSubjectModal(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all text-xs px-2">Subjects</button>
                  <button onClick={()=>navigate('/admin/al/content')} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><ChevronRight size={15}/></button>
                  <button onClick={()=>openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={14}/></button>
                  <button onClick={()=>setDeleteConfirm(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Stream':'Add Stream'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug (unique key)" placeholder="science" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}/>
            <Field label="Order" type="number" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
          </div>
          <Field label="Name (English) *" placeholder="Science Stream" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <Field label="Name (Sinhala)" placeholder="විද්‍යා දාර" value={form.name_si} onChange={e=>setForm(f=>({...f,name_si:e.target.value}))}/>
          <Field label="Name (Tamil)" placeholder="அறிவியல் பிரிவு" value={form.name_ta} onChange={e=>setForm(f=>({...f,name_ta:e.target.value}))}/>
          <Txt label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="min-h-[60px]"/>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Color</label>
              <input type="color" value={form.color_hex} onChange={e=>setForm(f=>({...f,color_hex:e.target.value}))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"/>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-4">
              <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-violet-600"/> Active
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{editing?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Subject Assignment Modal */}
      <Modal open={!!subjectModal} onClose={()=>{setSubjectModal(null);fetchAll()}} title={`Subjects for ${subjectModal?.name}`} size="md">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allSubjects.map(sub => {
            const assigned = streamSubjects.find(s=>s.subject_id===sub.id)
            return (
              <div key={sub.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border-2 transition-all', assigned?'border-violet-300 bg-violet-50':'border-gray-200')}>
                <input type="checkbox" checked={!!assigned} onChange={()=>toggleSubject(sub.id)} className="w-4 h-4 accent-violet-600"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                  {sub.name_si && <p className="text-xs text-gray-400">{sub.name_si}</p>}
                </div>
                {assigned && (
                  <button onClick={()=>toggleCore(sub.id)}
                    className={clsx('text-xs px-2 py-1 rounded-lg font-medium transition-all', assigned.is_core?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500 hover:bg-amber-50')}>
                    {assigned.is_core ? '⭐ Core' : 'Optional'}
                  </button>
                )}
              </div>
            )
          })}
          {allSubjects.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No subjects yet. Add subjects first.</p>}
        </div>
        <div className="pt-4">
          <Btn variant="blue" className="w-full" onClick={()=>{setSubjectModal(null);fetchAll()}}>Done</Btn>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Stream" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.name}</strong>? All content in this stream will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
