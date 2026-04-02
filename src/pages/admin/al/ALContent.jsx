import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, ArrowLeft, BookMarked, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Reusable item row ──────────────────────────────────────────────────────
function ItemRow({ number, title, titleSi, subCount, subLabel, onEdit, onDelete, onNavigate, indent=0, extra }) {
  return (
    <div className={clsx('flex items-center gap-3 py-3 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors', indent>0&&'pl-'+String(4+indent*4))}>
      <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0">{number}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        {titleSi && <p className="text-xs text-gray-400 truncate">{titleSi}</p>}
        {subCount !== undefined && <p className="text-xs text-gray-400">{subCount} {subLabel}</p>}
      </div>
      {extra}
      <div className="flex items-center gap-1 shrink-0">
        {onNavigate && <button onClick={onNavigate} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><ChevronRight size={14}/></button>}
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={13}/></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

export default function ALAdminContent() {
  const navigate = useNavigate()
  // Subject list
  const [subjects, setSubjects] = useState([])
  const [selSubjectId, setSelSubjectId] = useState(null)
  const [chapters, setChapters] = useState([])
  const [expandedChapters, setExpandedChapters] = useState({})
  const [expandedUnits, setExpandedUnits] = useState({})
  const [loading, setLoading] = useState(true)

  // Modals
  const [modal, setModal] = useState(null) // {type:'chapter'|'unit'|'subunit', editing, parentId}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchSubjects() }, [])
  useEffect(() => { if (selSubjectId) fetchChapters(selSubjectId) }, [selSubjectId])

  const fetchSubjects = async () => {
    const { data } = await supabaseAdmin.from('al_subjects').select('id,name,name_si').eq('is_active',true).order('name')
    setSubjects(data||[])
    if (!selSubjectId && data?.length) setSelSubjectId(data[0].id)
    setLoading(false)
  }

  const fetchChapters = async (subjectId) => {
    setLoading(true)
    const { data } = await supabaseAdmin.from('al_chapters')
      .select('*, al_units(*, al_sub_units(id,order_index,title,title_si,is_active))')
      .eq('subject_id', subjectId).order('order_index')
    setChapters(data||[])
    setLoading(false)
  }

  // ── Chapter CRUD ────────────────────────────────────────────────
  const openChapterCreate = () => { setModal({type:'chapter',editing:null,parentId:selSubjectId}); setForm({title:'',title_si:'',title_ta:'',description:'',order_index:chapters.length+1,is_active:true}) }
  const openChapterEdit = (c) => { setModal({type:'chapter',editing:c,parentId:selSubjectId}); setForm({title:c.title,title_si:c.title_si||'',title_ta:c.title_ta||'',description:c.description||'',order_index:c.order_index,is_active:c.is_active}) }

  const saveChapter = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { subject_id:modal.parentId, order_index:parseInt(form.order_index)||1, title:form.title.trim(), title_si:form.title_si||null, title_ta:form.title_ta||null, description:form.description||null, is_active:form.is_active }
    const { error } = modal.editing
      ? await supabaseAdmin.from('al_chapters').update(payload).eq('id',modal.editing.id)
      : await supabaseAdmin.from('al_chapters').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(modal.editing?'Chapter updated':'Chapter created')
    setSaving(false); setModal(null); fetchChapters(selSubjectId)
  }

  // ── Unit CRUD ───────────────────────────────────────────────────
  const openUnitCreate = (chapterId, chUnits) => { setModal({type:'unit',editing:null,parentId:chapterId}); setForm({title:'',title_si:'',title_ta:'',order_index:chUnits.length+1,is_active:true}) }
  const openUnitEdit = (u, chapterId) => { setModal({type:'unit',editing:u,parentId:chapterId}); setForm({title:u.title,title_si:u.title_si||'',title_ta:u.title_ta||'',order_index:u.order_index,is_active:u.is_active}) }

  const saveUnit = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { chapter_id:modal.parentId, order_index:parseInt(form.order_index)||1, title:form.title.trim(), title_si:form.title_si||null, title_ta:form.title_ta||null, is_active:form.is_active }
    const { error } = modal.editing
      ? await supabaseAdmin.from('al_units').update(payload).eq('id',modal.editing.id)
      : await supabaseAdmin.from('al_units').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(modal.editing?'Unit updated':'Unit created')
    setSaving(false); setModal(null); fetchChapters(selSubjectId)
  }

  // ── Sub-Unit CRUD ───────────────────────────────────────────────
  const openSubUnitCreate = (unitId, subUnits) => { setModal({type:'subunit',editing:null,parentId:unitId}); setForm({title:'',title_si:'',title_ta:'',order_index:subUnits.length+1,is_active:true}) }
  const openSubUnitEdit = (su, unitId) => { setModal({type:'subunit',editing:su,parentId:unitId}); setForm({title:su.title,title_si:su.title_si||'',title_ta:su.title_ta||'',order_index:su.order_index,is_active:su.is_active}) }

  const saveSubUnit = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { unit_id:modal.parentId, order_index:parseInt(form.order_index)||1, title:form.title.trim(), title_si:form.title_si||null, title_ta:form.title_ta||null, is_active:form.is_active }
    const { error } = modal.editing
      ? await supabaseAdmin.from('al_sub_units').update(payload).eq('id',modal.editing.id)
      : await supabaseAdmin.from('al_sub_units').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(modal.editing?'Sub-unit updated':'Sub-unit created')
    setSaving(false); setModal(null); fetchChapters(selSubjectId)
  }

  const handleSave = () => {
    if (modal?.type==='chapter') return saveChapter()
    if (modal?.type==='unit') return saveUnit()
    if (modal?.type==='subunit') return saveSubUnit()
  }

  const handleDelete = async () => {
    const { table, id } = deleteConfirm
    const { error } = await supabaseAdmin.from(table).delete().eq('id',id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchChapters(selSubjectId)
  }

  const MODAL_TITLES = { chapter:'Chapter', unit:'Unit', subunit:'Sub-Unit' }

  return (
    <div>
      <PageHead title="A/L Content" sub="Chapters → Units → Sub-Units"
        action={<Btn variant="blue" onClick={openChapterCreate} className="gap-2"><Plus size={16}/>Add Chapter</Btn>}/>

      {/* Subject selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {subjects.map(s => (
          <button key={s.id} onClick={()=>setSelSubjectId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all border-2',
              selSubjectId===s.id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            {s.name}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      : chapters.length===0 ? <EmptyState icon={BookMarked} title="No chapters" desc="Add a chapter to get started."/>
      : <div className="card overflow-hidden">
          {chapters.map((ch,ci) => {
            const chOpen = expandedChapters[ch.id]
            const units = (ch.al_units||[]).sort((a,b)=>a.order_index-b.order_index)
            return (
              <div key={ch.id} className="border-b border-gray-100 last:border-0">
                {/* Chapter row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <button onClick={()=>setExpandedChapters(p=>({...p,[ch.id]:!p[ch.id]}))} className="shrink-0">
                    <ChevronDown size={14} className={clsx('text-gray-400 transition-transform',chOpen&&'rotate-180')}/>
                  </button>
                  <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">{ci+1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{ch.title}</p>
                    {ch.title_si && <p className="text-xs text-gray-400">{ch.title_si}</p>}
                    <p className="text-xs text-gray-400">{units.length} units</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>openUnitCreate(ch.id,units)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-all">+ Unit</button>
                    <button onClick={()=>openChapterEdit(ch)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={13}/></button>
                    <button onClick={()=>setDeleteConfirm({table:'al_chapters',id:ch.id,name:ch.title})} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13}/></button>
                  </div>
                </div>

                {/* Units */}
                {chOpen && units.map((unit,ui) => {
                  const unitOpen = expandedUnits[unit.id]
                  const subUnits = (unit.al_sub_units||[]).sort((a,b)=>a.order_index-b.order_index)
                  return (
                    <div key={unit.id} className="border-t border-gray-50">
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/50 hover:bg-gray-100 pl-12">
                        <button onClick={()=>setExpandedUnits(p=>({...p,[unit.id]:!p[unit.id]}))} className="shrink-0">
                          <ChevronDown size={12} className={clsx('text-gray-400 transition-transform',unitOpen&&'rotate-180')}/>
                        </button>
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{ui+1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{unit.title}</p>
                          {unit.title_si && <p className="text-xs text-gray-400">{unit.title_si}</p>}
                          <p className="text-xs text-gray-400">{subUnits.length} sub-units</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={()=>openSubUnitCreate(unit.id,subUnits)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-all">+ Sub-Unit</button>
                          <button onClick={()=>openUnitEdit(unit,ch.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={12}/></button>
                          <button onClick={()=>setDeleteConfirm({table:'al_units',id:unit.id,name:unit.title})} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={12}/></button>
                        </div>
                      </div>

                      {/* Sub-units */}
                      {unitOpen && subUnits.map((su,si) => (
                        <div key={su.id} className="flex items-center gap-3 px-4 py-2 bg-blue-50/30 hover:bg-blue-50 border-t border-gray-50 pl-20">
                          <div className="w-5 h-5 rounded bg-cyan-100 text-cyan-700 font-bold text-xs flex items-center justify-center shrink-0">{si+1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800">{su.title}</p>
                            {su.title_si && <p className="text-xs text-gray-400">{su.title_si}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>navigate(`/admin/al/sub-units/${su.id}`)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700">Content</button>
                            <button onClick={()=>openSubUnitEdit(su,unit.id)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit2 size={11}/></button>
                            <button onClick={()=>setDeleteConfirm({table:'al_sub_units',id:su.id,name:su.title})} className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={11}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>}

      {/* Create/Edit modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)} title={`${modal?.editing?'Edit':'Add'} ${MODAL_TITLES[modal?.type||'chapter']}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order" type="number" min="1" value={form.order_index} onChange={e=>setForm(f=>({...f,order_index:e.target.value}))}/>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-violet-600"/> Active
              </label>
            </div>
          </div>
          <Field label="Title (English) *" placeholder="Title…" value={form.title||''} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          <Field label="Title (Sinhala)" placeholder="සිංහල…" value={form.title_si||''} onChange={e=>setForm(f=>({...f,title_si:e.target.value}))}/>
          <Field label="Title (Tamil)" placeholder="தமிழ்…" value={form.title_ta||''} onChange={e=>setForm(f=>({...f,title_ta:e.target.value}))}/>
          {modal?.type==='chapter' && <Txt label="Description" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="min-h-[60px]"/>}
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>{modal?.editing?'Save':'Create'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.name}</strong>? All content inside will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={handleDelete}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
