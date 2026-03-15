import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, Layers, ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const LANGS = ['english','sinhala','tamil']

export default function AdminChapters() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ order_index:1, title:'', description:'', is_active:true })

  useEffect(() => { fetchData() }, [subjectId])

  const fetchData = async () => {
    setLoading(true)
    const [sRes, cRes] = await Promise.all([
      supabaseAdmin.from('subjects').select('id, name, grade').eq('id', subjectId).single(),
      supabaseAdmin.from('chapters')
        .select('id, order_index, title, description, is_active, units(id)')
        .eq('subject_id', subjectId).order('order_index'),
    ])
    if (sRes.data) setSubject(sRes.data)
    setChapters(cRes.data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ order_index: chapters.length + 1, title:'', description:'', is_active:true })
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ order_index:c.order_index, title:c.title, description:c.description||'', is_active:c.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const payload = { subject_id: subjectId, order_index: parseInt(form.order_index)||1,
      title: form.title.trim(), description: form.description||null, is_active: form.is_active }

    if (editing) {
      const { error } = await supabaseAdmin.from('chapters').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Chapter updated')
    } else {
      const { error } = await supabaseAdmin.from('chapters').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Chapter created')
    }
    setSaving(false); setModalOpen(false); fetchData()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('chapters').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  return (
    <div>
      <button onClick={() => navigate('/admin/subjects')}
        className="flex items-center gap-1.5 text-sm text-gray-500 card-lift:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Subjects
      </button>

      <PageHead
        crumb={`Grade ${subject?.grade}`}
        title={subject?.name || 'Chapters'}
        sub={`${chapters.length} chapters`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Chapter</Btn>}/>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_,i) => <div key={i} className="p-4 h-16 skeleton" />)}</div>
      ) : chapters.length === 0 ? (
        <EmptyState icon={Layers} title="No chapters" description="Add your first chapter."/>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#','Title','Units','Status','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chapters.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 card-lift:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {c.order_index}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.units?.length || 0}</td>
                    <td className="px-4 py-3"><Badge variant={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Active' : 'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/chapters/${c.id}/units`)}
                          className="p-1.5 rounded-lg text-gray-400 card-lift:text-blue-600 card-lift:bg-blue-50 transition-all" title="Units">
                          <ChevronRight size={15}/>
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 card-lift:text-gray-700 card-lift:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                        <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded-lg text-gray-400 card-lift:text-red-600 card-lift:bg-red-50 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Chapter' : 'Add Chapter'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index}
              onChange={e => setForm(f => ({ ...f, order_index: e.target.value }))}/>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"/>
                Active
              </label>
            </div>
          </div>
          <Field label="Title *" placeholder="Chapter title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
          <Txt label="Description (optional)" placeholder="Brief description"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="min-h-[80px]"/>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create Chapter'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Chapter" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>? All units will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={() => handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
