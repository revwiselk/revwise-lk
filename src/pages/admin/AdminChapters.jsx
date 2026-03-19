import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LANGS = ['english','sinhala','tamil']
const LANG_LABELS = { english:'English', sinhala:'සිංහල', tamil:'தமிழ்' }

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
  const [activeLang, setActiveLang] = useState('english')
  const [form, setForm] = useState({
    order_index: 1, is_active: true,
    titles: { english:'', sinhala:'', tamil:'' },
    descs:  { english:'', sinhala:'', tamil:'' },
  })

  useEffect(() => { fetchData() }, [subjectId])

  const fetchData = async () => {
    setLoading(true)
    const [sRes, cRes] = await Promise.all([
      supabaseAdmin.from('subjects').select('id,name,grade').eq('id',subjectId).single(),
      supabaseAdmin.from('chapters')
        .select('id,order_index,title,description,is_active,units(id)')
        .eq('subject_id',subjectId).order('order_index'),
    ])
    if (sRes.data) setSubject(sRes.data)
    setChapters(cRes.data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null); setActiveLang('english')
    setForm({ order_index: chapters.length+1, is_active:true,
      titles:{english:'',sinhala:'',tamil:''}, descs:{english:'',sinhala:'',tamil:''} })
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c); setActiveLang('english')
    setForm({ order_index:c.order_index, is_active:c.is_active,
      titles:{english:c.title||'',sinhala:'',tamil:''},
      descs:{english:c.description||'',sinhala:'',tamil:''} })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.titles.english.trim()) { toast.error('English title is required'); return }
    setSaving(true)
    // Use English title as main title (stored in title column)
    const payload = { subject_id:subjectId, order_index:parseInt(form.order_index)||1,
      title:form.titles.english.trim(), description:form.descs.english||null, is_active:form.is_active }
    if (editing) {
      const { error } = await supabaseAdmin.from('chapters').update(payload).eq('id',editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Chapter updated')
    } else {
      const { error } = await supabaseAdmin.from('chapters').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Chapter created in 3 languages')
    }
    setSaving(false); setModalOpen(false); fetchData()
  }

  const handleDelete = async (id) => {
    const { error } = await supabaseAdmin.from('chapters').delete().eq('id',id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  return (
    <div>
      <button onClick={() => navigate('/admin/subjects')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Subjects
      </button>
      <PageHead crumb={`Grade ${subject?.grade}`} title={subject?.name||'Chapters'}
        sub={`${chapters.length} chapters`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Chapter</Btn>}/>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      ) : chapters.length === 0 ? (
        <EmptyState icon={null} title="No chapters" desc="Add your first chapter."/>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#','Title','Units','Status','Actions'].map(h=>(
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chapters.map(c=>(
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">{c.order_index}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.units?.length||0}</td>
                    <td className="px-4 py-3"><Badge color={c.is_active?'green':'gray'}>{c.is_active?'Active':'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>navigate(`/admin/chapters/${c.id}/units`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><ChevronRight size={15}/></button>
                        <button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                        <button onClick={()=>setDeleteConfirm(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Chapter':'Add Chapter'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index}
              onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}
                  className="w-4 h-4 accent-blue-600"/> Active
              </label>
            </div>
          </div>

          {/* Language tabs */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Chapter title in each language</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3 w-fit">
              {LANGS.map(lang=>(
                <button key={lang} type="button" onClick={()=>setActiveLang(lang)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    activeLang===lang?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>
            <Field label={`Title (${LANG_LABELS[activeLang]})${activeLang==='english'?' *':''}`}
              placeholder={`Chapter title in ${LANG_LABELS[activeLang]}`}
              value={form.titles[activeLang]}
              onChange={e=>setForm(f=>({...f,titles:{...f.titles,[activeLang]:e.target.value}}))}/>
            <div className="mt-3">
              <Txt label={`Description (${LANG_LABELS[activeLang]})`} placeholder="Optional description"
                value={form.descs[activeLang]}
                onChange={e=>setForm(f=>({...f,descs:{...f.descs,[activeLang]:e.target.value}}))}
                className="min-h-[60px]"/>
            </div>
            {/* Show completion status */}
            <div className="flex gap-2 mt-2">
              {LANGS.map(lang=>(
                <span key={lang} className={clsx('bdg text-xs',form.titles[lang].trim()?'bdg-green':'bdg-gray')}>
                  {LANG_LABELS[lang]} {form.titles[lang].trim()?'✓':'–'}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing?'Save Changes':'Create Chapter'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Chapter" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>? All units will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
