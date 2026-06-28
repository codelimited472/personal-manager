'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ChevronDown, CheckSquare, Target, Lightbulb, Clock, Layout, List as ListIcon, Calendar, Flag, Trash2, Edit3, Check, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { getDB, type LocalBusinessWorkspace, type LocalBusinessTask, type LocalBusinessChecklist, type LocalBusinessFuturePlan, type LocalBusinessGoal, type LocalBusinessNote, type LocalBusinessIdea, type LocalTask } from '@/lib/db';
import styles from '../business.module.css';

type Tab = 'dashboard' | 'checklists' | 'todo' | 'plans' | 'ideas' | 'notes' | 'goals';

export default function BusinessDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const db = getDB();
  const [workspace, setWorkspace] = useState<LocalBusinessWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  // Data
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [legacyTasks, setLegacyTasks] = useState<LocalBusinessTask[]>([]);
  const [checklists, setChecklists] = useState<LocalBusinessChecklist[]>([]);
  const [plans, setPlans] = useState<LocalBusinessFuturePlan[]>([]);
  const [ideas, setIdeas] = useState<LocalBusinessIdea[]>([]);
  const [notes, setNotes] = useState<LocalBusinessNote[]>([]);
  const [goals, setGoals] = useState<LocalBusinessGoal[]>([]);

  // Modals
  const [modalType, setModalType] = useState<Tab | null>(null);
  
  // Generic Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [formDate, setFormDate] = useState('');
  const [formTags, setFormTags] = useState('');

  // Specific States
  const [kanbanView, setKanbanView] = useState(true);
  const [activeNote, setActiveNote] = useState<LocalBusinessNote | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [noteBlocks, setNoteBlocks] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const ws = await db.businessWorkspaces.get(id);
      if (ws) {
        setWorkspace(ws);
        
        // Load legacy business tasks
        const lTasks = await db.businessTasks.where('workspace_id').equals(id).toArray();
        setLegacyTasks(lTasks);

        // Load new generic tasks categorized under this business
        const gTasks = await db.tasks.where('category').equals(ws.name).toArray();
        setTasks(gTasks);

        setChecklists(await db.businessChecklists.where('workspace_id').equals(id).toArray());
        setPlans(await db.businessFuturePlans.where('workspace_id').equals(id).toArray());
        setIdeas(await db.businessIdeas.where('workspace_id').equals(id).toArray());
        setNotes(await db.businessNotes.where('workspace_id').equals(id).toArray());
        setGoals(await db.businessGoals.where('workspace_id').equals(id).toArray());
      }
    }
    loadData();
  }, [id, refreshKey]);

  if (!workspace) return <div className="page" style={{ paddingTop: 'var(--space-4)' }}>Loading...</div>;

  // -------------------------------------------------------------
  // Creation Handlers
  // -------------------------------------------------------------
  const handleCreate = async () => {
    if (!formTitle.trim()) return;

    if (modalType === 'todo') {
      await db.tasks.add({ 
        id: crypto.randomUUID(), 
        user_id: 'local-user', 
        title: formTitle, 
        description: formDesc,
        status: 'pending', 
        priority: formPriority === 'critical' ? 'urgent' : formPriority, 
        category: workspace.name,
        due_date: formDate || undefined, 
        is_recurring: false,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
        _syncStatus: 'pending' 
      });
    } else if (modalType === 'checklists') {
      await db.businessChecklists.add({ id: crypto.randomUUID(), workspace_id: id, title: formTitle, tasks: '[]', progress: 0, created_at: new Date().toISOString(), _syncStatus: 'pending' });
    } else if (modalType === 'plans') {
      await db.businessFuturePlans.add({ id: crypto.randomUUID(), workspace_id: id, title: formTitle, timeline: formDate || undefined, priority: formPriority, notes: formDesc, tags: formTags.split(',').map(t=>t.trim()).filter(Boolean), created_at: new Date().toISOString(), _syncStatus: 'pending' });
    } else if (modalType === 'ideas') {
      await db.businessIdeas.add({ id: crypto.randomUUID(), workspace_id: id, title: formTitle, description: formDesc, status: 'new', tags: formTags.split(',').map(t=>t.trim()).filter(Boolean), created_at: new Date().toISOString(), _syncStatus: 'pending' });
    } else if (modalType === 'notes') {
      const newNote = { id: crypto.randomUUID(), workspace_id: id, title: formTitle, content: JSON.stringify([{ id: crypto.randomUUID(), type: 'text', content: '' }]), created_at: new Date().toISOString(), _syncStatus: 'pending' as const };
      await db.businessNotes.add(newNote);
      setActiveNote(newNote);
      setNoteBlocks([{ id: crypto.randomUUID(), type: 'text', content: '' }]);
    } else if (modalType === 'goals') {
      await db.businessGoals.add({ id: crypto.randomUUID(), workspace_id: id, title: formTitle, target_date: formDate || undefined, progress: 0, status: 'active', milestones: '[]', created_at: new Date().toISOString(), _syncStatus: 'pending' });
    }
    
    setModalType(null);
    setFormTitle(''); setFormDesc(''); setFormDate(''); setFormTags('');
    setRefreshKey(k => k + 1);
  };

  // -------------------------------------------------------------
  // Drag and Drop (Kanban)
  // -------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, id: string, type: 'legacy' | 'generic') => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.setData('taskType', type);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const taskType = e.dataTransfer.getData('taskType');
    
    if (taskId) {
      if (taskType === 'legacy' && ['not_started', 'in_progress', 'waiting', 'completed'].includes(newStatus)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.businessTasks.update(taskId, { status: newStatus as any });
      } else if (taskType === 'generic' && ['pending', 'in_progress', 'completed'].includes(newStatus)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.tasks.update(taskId, { status: newStatus as any });
      }
      setRefreshKey(k => k + 1);
    }
  };

  // -------------------------------------------------------------
  // Rendering Helpers
  // -------------------------------------------------------------
  const renderDashboard = () => {
    const totalLegacy = legacyTasks.length;
    const completedLegacy = legacyTasks.filter(t => t.status === 'completed').length;
    
    const totalGeneric = tasks.length;
    const completedGeneric = tasks.filter(t => t.status === 'completed').length;

    const totalTasks = totalLegacy + totalGeneric;
    const completedTasks = completedLegacy + completedGeneric;

    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
      <div className={styles.dashboardGrid}>
        <div className={styles.widget} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.widgetLabel}>Overall Progress</div>
          <div className={styles.widgetValue}>{progress}%</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={styles.widget}>
          <div className={styles.widgetLabel}>Total Tasks</div>
          <div className={styles.widgetValue}>{totalTasks}</div>
        </div>
        <div className={styles.widget}>
          <div className={styles.widgetLabel}>Pending</div>
          <div className={styles.widgetValue}>{totalTasks - completedTasks}</div>
        </div>
        <div className={styles.widget}>
          <div className={styles.widgetLabel}>Active Goals</div>
          <div className={styles.widgetValue}>{goals.filter(g => g.status === 'active').length}</div>
        </div>
        <div className={styles.widget}>
          <div className={styles.widgetLabel}>New Ideas</div>
          <div className={styles.widgetValue}>{ideas.filter(i => i.status === 'new').length}</div>
        </div>
      </div>
    );
  };

  const renderKanban = () => {
    // We map legacy status + new status into consolidated columns
    const columns = [
      { id: 'pending', legacyIds: ['not_started', 'waiting'], label: 'To Do' },
      { id: 'in_progress', legacyIds: ['in_progress'], label: 'In Progress' },
      { id: 'completed', legacyIds: ['completed'], label: 'Completed' }
    ];

    return (
      <div className={styles.kanbanBoard}>
        {columns.map(col => {
          const colLegacyTasks = legacyTasks.filter(t => col.legacyIds.includes(t.status));
          const colGenericTasks = tasks.filter(t => t.status === col.id);
          const totalColTasks = colLegacyTasks.length + colGenericTasks.length;

          return (
            <div 
              key={col.id} 
              className={styles.kanbanColumn}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className={styles.kanbanHeader}>
                {col.label} <span className={styles.kanbanCount}>{totalColTasks}</span>
              </div>
              
              {/* Legacy Tasks */}
              {colLegacyTasks.map(t => (
                <div 
                  key={t.id} 
                  className={styles.taskCard}
                  draggable
                  onDragStart={e => handleDragStart(e, t.id, 'legacy')}
                >
                  <div className={styles.taskTitle} style={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{t.title}</div>
                  <div className={styles.taskMeta}>
                    <span className={`${styles.badge} ${t.priority === 'critical' ? styles.badgeCritical : t.priority === 'high' ? styles.badgeHigh : t.priority === 'medium' ? styles.badgeMedium : styles.badgeLow}`}>
                      {t.priority}
                    </span>
                    {t.due_date && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}><Calendar size={10} style={{ display: 'inline', marginRight: 2 }}/>{t.due_date}</span>}
                  </div>
                </div>
              ))}

              {/* Generic Tasks */}
              {colGenericTasks.map(t => (
                <div 
                  key={t.id} 
                  className={styles.taskCard}
                  draggable
                  onDragStart={e => handleDragStart(e, t.id, 'generic')}
                >
                  <div className={styles.taskTitle} style={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{t.title}</div>
                  <div className={styles.taskMeta}>
                    <span className={`${styles.badge} ${t.priority === 'urgent' ? styles.badgeCritical : t.priority === 'high' ? styles.badgeHigh : t.priority === 'medium' ? styles.badgeMedium : styles.badgeLow}`}>
                      {t.priority}
                    </span>
                    {t.due_date && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}><Calendar size={10} style={{ display: 'inline', marginRight: 2 }}/>{t.due_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const toggleChecklistTask = async (checklist: LocalBusinessChecklist, taskIdx: number) => {
    try {
      const parsed = JSON.parse(checklist.tasks);
      parsed[taskIdx].checked = !parsed[taskIdx].checked;
      const completedCount = parsed.filter((t: {checked: boolean}) => t.checked).length;
      const progress = parsed.length > 0 ? Math.round((completedCount / parsed.length) * 100) : 0;
      await db.businessChecklists.update(checklist.id, { tasks: JSON.stringify(parsed), progress });
      setRefreshKey(k => k + 1);
    } catch (e) {}
  };

  const addChecklistTask = async (checklist: LocalBusinessChecklist, taskTitle: string) => {
    try {
      const parsed = JSON.parse(checklist.tasks || '[]');
      parsed.push({ id: crypto.randomUUID(), content: taskTitle, checked: false });
      const progress = parsed.length > 0 ? Math.round((parsed.filter((t:{checked:boolean})=>t.checked).length / parsed.length) * 100) : 0;
      await db.businessChecklists.update(checklist.id, { tasks: JSON.stringify(parsed), progress });
      setRefreshKey(k => k + 1);
    } catch (e) {}
  };

  const renderNotesEditor = () => {
    if (!activeNote) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-body)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <header className={styles.header} style={{ justifyContent: 'space-between' }}>
          <button className={styles.iconBtn} onClick={() => setActiveNote(null)}><ChevronDown size={24} /></button>
          <div style={{ fontWeight: 600 }}>{activeNote.title}</div>
          <button className={styles.iconBtn}><MoreHorizontal size={24} /></button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
          {noteBlocks.map((b, idx) => (
            <textarea
              key={b.id}
              className={styles.textarea}
              style={{ border: 'none', background: 'transparent', fontSize: 'var(--text-md)', minHeight: 40 }}
              value={b.content}
              onChange={e => {
                const nw = [...noteBlocks]; nw[idx].content = e.target.value; setNoteBlocks(nw);
                e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={async () => {
                await db.businessNotes.update(activeNote.id, { content: JSON.stringify(noteBlocks) });
                setRefreshKey(k => k+1);
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className={styles.iconBtn} onClick={() => router.push('/business')}>
            <ChevronLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {workspace.name}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        {(['dashboard', 'checklists', 'todo', 'plans', 'ideas', 'notes', 'goals'] as Tab[]).map(t => (
          <div 
            key={t}
            className={activeTab === t ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(t)}
          >
            {t === 'dashboard' && <Layout size={14} />}
            {t === 'checklists' && <CheckSquare size={14} />}
            {t === 'todo' && <ListIcon size={14} />}
            {t === 'plans' && <Clock size={14} />}
            {t === 'ideas' && <Lightbulb size={14} />}
            {t === 'notes' && <Edit3 size={14} />}
            {t === 'goals' && <Target size={14} />}
            <span style={{ textTransform: 'capitalize' }}>{t.replace('-', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'todo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -16 }}>
              <button className={styles.iconBtn} onClick={() => setKanbanView(!kanbanView)}>
                {kanbanView ? <ListIcon size={18} /> : <Layout size={18} />}
              </button>
            </div>
            {kanbanView ? renderKanban() : (
              <div className={styles.listCard}>
                {legacyTasks.map(t => (
                  <div key={t.id} className={styles.listItem}>
                    <div className={t.status === 'completed' ? styles.checkboxChecked : styles.checkbox} onClick={async () => {
                      await db.businessTasks.update(t.id, { status: t.status === 'completed' ? 'not_started' : 'completed' });
                      setRefreshKey(k=>k+1);
                    }}>
                      {t.status === 'completed' && <Check size={14} />}
                    </div>
                    <div className={styles.listItemContent}>
                      <div className={t.status === 'completed' ? styles.listItemTitleChecked : styles.listItemTitle}>{t.title}</div>
                    </div>
                  </div>
                ))}
                {tasks.map(t => (
                  <div key={t.id} className={styles.listItem}>
                    <div className={t.status === 'completed' ? styles.checkboxChecked : styles.checkbox} onClick={async () => {
                      await db.tasks.update(t.id, { status: t.status === 'completed' ? 'pending' : 'completed' });
                      setRefreshKey(k=>k+1);
                    }}>
                      {t.status === 'completed' && <Check size={14} />}
                    </div>
                    <div className={styles.listItemContent}>
                      <div className={t.status === 'completed' ? styles.listItemTitleChecked : styles.listItemTitle}>{t.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'checklists' && checklists.map(cl => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any[] = [];
          try { parsed = JSON.parse(cl.tasks || '[]'); } catch(e){}
          return (
            <div key={cl.id} className={styles.listCard}>
              <div className={styles.listHeader}>
                <div className={styles.listTitle}>{cl.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{cl.progress}%</div>
              </div>
              {parsed.map((t, idx) => (
                <div key={t.id} className={styles.listItem}>
                  <div className={t.checked ? styles.checkboxChecked : styles.checkbox} onClick={() => toggleChecklistTask(cl, idx)}>
                    {t.checked && <Check size={14} />}
                  </div>
                  <div className={t.checked ? styles.listItemTitleChecked : styles.listItemTitle}>{t.content}</div>
                </div>
              ))}
              <div className={styles.listItem}>
                <input 
                  placeholder="Add sub-task..." 
                  className={styles.input} 
                  style={{ border: 'none', background: 'transparent', padding: 0 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { addChecklistTask(cl, e.currentTarget.value); e.currentTarget.value = ''; }
                  }}
                />
              </div>
            </div>
          );
        })}

        {activeTab === 'ideas' && ideas.map(idea => (
          <div key={idea.id} className={styles.ideaCard}>
            <div className={styles.ideaTime}>{new Date(idea.created_at).toLocaleDateString()}</div>
            <div className={styles.ideaTitle}>{idea.title}</div>
            {idea.description && <div className={styles.ideaDesc}>{idea.description}</div>}
            <div className={styles.tagList}>
              {idea.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
            </div>
          </div>
        ))}

        {activeTab === 'plans' && plans.map(plan => (
          <div key={plan.id} className={styles.taskCard}>
            <div className={styles.taskTitle}>{plan.title}</div>
            {plan.notes && <div className={styles.ideaDesc} style={{ marginBottom: 4, marginTop: 4 }}>{plan.notes}</div>}
            <div className={styles.taskMeta}>
              <span className={`${styles.badge} ${plan.priority === 'critical' ? styles.badgeCritical : plan.priority === 'high' ? styles.badgeHigh : plan.priority === 'medium' ? styles.badgeMedium : styles.badgeLow}`}>{plan.priority}</span>
              {plan.timeline && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{plan.timeline}</span>}
            </div>
          </div>
        ))}

        {activeTab === 'notes' && (
          <div className={styles.dashboardGrid}>
            {notes.map(note => (
              <div key={note.id} className={styles.widget} style={{ cursor: 'pointer' }} onClick={() => {
                setActiveNote(note);
                try { setNoteBlocks(JSON.parse(note.content)); } catch(e) { setNoteBlocks([{id: crypto.randomUUID(), type: 'text', content: note.content}]); }
              }}>
                <div style={{ fontWeight: 600 }}>{note.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(note.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'goals' && goals.map(goal => (
          <div key={goal.id} className={styles.widgetFull} style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{goal.title}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}>{goal.progress}%</div>
            </div>
            {goal.target_date && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}><Flag size={12} style={{ display: 'inline', marginRight: 4 }}/>Target: {goal.target_date}</div>}
            <div className={styles.progressBar} style={{ height: 8 }}>
              <div className={styles.progressFill} style={{ width: `${goal.progress}%` }} />
            </div>
          </div>
        ))}
      </main>

      {/* Full Screen Note Editor */}
      {renderNotesEditor()}

      {/* Global FAB */}
      {!activeNote && activeTab !== 'dashboard' && (
        <button className={styles.fab} onClick={() => setModalType(activeTab)}>
          <Plus size={24} />
        </button>
      )}

      {/* Add Modal */}
      {modalType && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>New {modalType.replace('-', ' ')}</div>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Title / Name</label>
              <input className={styles.input} value={formTitle} onChange={e => setFormTitle(e.target.value)} autoFocus />
            </div>

            {(modalType === 'todo' || modalType === 'plans') && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Priority</label>
                <select className={styles.select} value={formPriority} onChange={e => setFormPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            )}

            {(modalType === 'todo' || modalType === 'goals' || modalType === 'plans') && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>{modalType === 'goals' ? 'Target Date' : modalType === 'plans' ? 'Timeline (e.g. Q3 2026)' : 'Due Date'}</label>
                <input type={modalType === 'plans' ? 'text' : 'date'} className={styles.input} value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            )}

            {(modalType === 'ideas' || modalType === 'plans' || modalType === 'todo') && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Notes / Description</label>
                <textarea className={styles.textarea} value={formDesc} onChange={e => setFormDesc(e.target.value)} />
              </div>
            )}

            {(modalType === 'ideas' || modalType === 'plans') && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Tags (comma separated)</label>
                <input className={styles.input} value={formTags} onChange={e => setFormTags(e.target.value)} />
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModalType(null)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
