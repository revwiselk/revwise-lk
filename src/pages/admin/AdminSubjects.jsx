import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GRADES = [6,7,8,9,10,11]
const SLUGS = ['science','mathematics','sinhala','english','tamil','history','geography','health','civics','religion','ict','art']

export default function AdminSubjects() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ slug:'science', grade:6, name:'', description:'', color_hex:'#2563eb', is_active:true, order_index:0 })

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabaseAdmin.from('subjects')
      .select('id, slug, grade, name, description, color_hex, order_index, is_active, created_at, chapters(id)')
      .order('grade').order('order_index')
    setSubjects(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ slug:'science', grade:6, name:'', description:'', color_hex:'#2563eb', is_active:true, order_index: subjects.length })
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ slug:s.slug, grade:s.grade, name:s.name, description:s.description||'', color_hex:s.color_hex||'#2563eb', is_active:s.is_active, order_index:s.order_index })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { slug:form.slug, grade:parseInt(form.grade), name:form.name.trim(),
      description:form.description||null, color_hex:form.color_hex, is_active:form.is_active,
      order_index:parseInt(form.order_index)||0 }

    if (editing) {
      const { error } = await supabaseAdmin.from('subjects').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Subject updated')
    } else {
      const { error } = await supabaseAdmin.from('subjects').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Subject created')
    }
    setSaving(false); setModalOpen(false); fetch()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('subjects').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetch()
  }

  const filtered = filterGrade === 'all' ? subjects : subjects.filter(s => s.grade === parseInt(filterGrade))

  return (
    <div>
      <PageHead title="Subjects" sub="Manage subjects across all grades"
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Subject</Btn>}/>

      {/* Grade filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', ...GRADES.map(String)].map(g => (
          <button key={g} onClick={() => setFilterGrade(g)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filterGrade === g ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600')}>
            {g === 'all' ? 'All' : `Grade ${g}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(6).fill(0).map((_,i) => <div key={i} className="p-4 h-16 skeleton"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects" description="Add your first subject."/>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Subject','Grade','Slug','Chapters','Status','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: s.color_hex }}/>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge color="blue">Grade {s.grade}</Badge></td>
                    <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.slug}</code></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.chapters?.length || 0}</td>
                    <td className="px-4 py-3"><Badge variant={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Active' : 'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/subjects/${s.id}/chapters`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Chapters">
                          <ChevronRight size={15}/>
                        </button>
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                        <button onClick={() => setDeleteConfirm(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug:e.target.value }))}>
              {SLUGS.map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
            <Sel label="Grade" value={form.grade} onChange={e => setForm(f => ({ ...f, grade:e.target.value }))}>
              {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </Sel>
          </div>
          <Field label="Subject Name *" placeholder="e.g. Science" value={form.name}
            onChange={e => setForm(f => ({ ...f, name:e.target.value }))}/>
          <Txt label="Description (optional)" placeholder="Brief description"
            value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
            className="min-h-[80px]"/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_hex}
                  onChange={e => setForm(f => ({ ...f, color_hex:e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"/>
                <Field value={form.color_hex} onChange={e => setForm(f => ({ ...f, color_hex:e.target.value }))} className="flex-1"/>
              </div>
            </div>
            <Field label="Order" type="number" value={form.order_index}
              onChange={e => setForm(f => ({ ...f, order_index:e.target.value }))}/>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active:e.target.checked }))}
              className="w-4 h-4 accent-blue-600"/>
            Active (visible to students)
          </label>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create Subject'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Subject" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.name}</strong>? All chapters, units and questions will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={() => handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
