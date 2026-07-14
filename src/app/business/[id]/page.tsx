'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MoreHorizontal, FileText, CheckSquare, List as ListIcon, Clock, Link as LinkIcon, Paperclip, Plus, ChevronDown, ChevronRight, Check, Lightbulb } from 'lucide-react';
import { getDB, type LocalBusinessWorkspace, type LocalBusinessChecklistItem, type LocalBusinessNote, type LocalBusinessTimelineEvent, type LocalBusinessLink, type LocalBusinessIdea, type LocalTask } from '@/lib/db';
import styles from '../business.module.css';
import SwipeableItem from '@/components/SwipeableItem';
import TaskForm from '@/features/tasks/components/TaskForm';
import { deleteRecord } from '@/lib/sync';

export default function WorkspaceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const db = getDB();
  const [workspace, setWorkspace] = useState<LocalBusinessWorkspace | null>(null);
  
  // Data State
  const [notes, setNotes] = useState<LocalBusinessNote[]>([]);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [checklists, setChecklists] = useState<LocalBusinessChecklistItem[]>([]);
  const [timeline, setTimeline] = useState<LocalBusinessTimelineEvent[]>([]);
  const [links, setLinks] = useState<LocalBusinessLink[]>([]);
  const [ideas, setIdeas] = useState<LocalBusinessIdea[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Task Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<LocalTask | null>(null);

  // UI State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true, notes: true, tasks: true, checklist: true, timeline: true, links: true, ideas: true
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const ws = await db.businessWorkspaces.get(id);
      if (ws) {
        setWorkspace(ws);
        setNotes(await db.businessNotes.where('workspace_id').equals(id).toArray());
        setTasks(await db.tasks.filter(t => t.workspace_id === id || t.category === ws.name).toArray());
        setChecklists(await db.businessChecklistItems.where('workspace_id').equals(id).toArray());
        setTimeline((await db.businessTimelineEvents.where('workspace_id').equals(id).toArray()).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLinks(await db.businessLinks.where('workspace_id').equals(id).toArray());
        setIdeas(await db.businessIdeas.where('workspace_id').equals(id).toArray());
      }
    }
    loadData();
  }, [id, refreshKey]);

  if (!workspace) return <div className="page" style={{ paddingTop: 'var(--space-4)', paddingLeft: 'var(--space-4)' }}>Loading Workspace...</div>;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const recordEvent = async (type: string, description: string) => {
    await db.businessTimelineEvents.add({
      id: crypto.randomUUID(),
      workspace_id: workspace.id,
      type,
      description,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });
  };

  // --- Actions ---
  const handleUpdateOverview = async (field: Partial<LocalBusinessWorkspace>) => {
    await db.businessWorkspaces.update(workspace.id, { ...field, updated_at: new Date().toISOString(), _syncStatus: 'pending' });
    await recordEvent('status_changed', `Updated workspace details`);
    setRefreshKey(k => k + 1);
  };

  const handleAddNote = async () => {
    const title = prompt('Note Title:');
    if (!title) return;
    await db.businessNotes.add({ id: crypto.randomUUID(), workspace_id: workspace.id, title, content: JSON.stringify([{ id: crypto.randomUUID(), type: 'text', content: '' }]), created_at: new Date().toISOString(), _syncStatus: 'pending' as const });
    await recordEvent('note_added', `Added note: ${title}`);
    setRefreshKey(k => k + 1);
  };

  const handleOpenTaskForm = (task?: LocalTask) => {
    setEditingTask(task || null);
    setShowTaskForm(true);
  };

  const handleToggleTask = async (task: LocalTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await db.tasks.update(task.id, { 
      status: newStatus as any,
      updated_at: new Date().toISOString(),
      completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      _syncStatus: 'pending'
    });
    if (newStatus === 'completed') {
      await recordEvent('task_completed', `Completed task: ${task.title}`);
    }
    setRefreshKey(k => k + 1);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteRecord('tasks', taskId);
    setRefreshKey(k => k + 1);
  };

  const handleAddChecklist = async () => {
    const content = prompt('Checklist Item:');
    if (!content) return;
    await db.businessChecklistItems.add({ id: crypto.randomUUID(), workspace_id: workspace.id, content, checked: false, created_at: new Date().toISOString(), _syncStatus: 'pending' });
    setRefreshKey(k => k + 1);
  };

  const handleToggleChecklist = async (item: LocalBusinessChecklistItem) => {
    await db.businessChecklistItems.update(item.id, { checked: !item.checked, _syncStatus: 'pending' });
    setRefreshKey(k => k + 1);
  };

  const handleAddLink = async () => {
    const title = prompt('Link Title (e.g. Website, Figma):');
    if (!title) return;
    const url = prompt('URL:');
    if (!url) return;
    await db.businessLinks.add({ id: crypto.randomUUID(), workspace_id: workspace.id, title, url, created_at: new Date().toISOString(), _syncStatus: 'pending' });
    setRefreshKey(k => k + 1);
  };

  const handleAddIdea = async () => {
    const title = prompt('Idea Title:');
    if (!title) return;
    const description = prompt('Description (Optional):') || '';
    await db.businessIdeas.add({
      id: crypto.randomUUID(),
      workspace_id: workspace.id,
      title,
      description,
      status: 'new',
      tags: [],
      created_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });
    await recordEvent('edited', `Added idea: ${title}`);
    setRefreshKey(k => k + 1);
  };

  // --- Render Sections ---
  const renderSectionHeader = (id: string, title: string, icon: React.ReactNode, count?: number) => (
    <div onClick={() => toggleSection(id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-secondary)', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600, color: 'var(--text-primary)' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        {title} {count !== undefined && <span style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>{count}</span>}
      </div>
      {expandedSections[id] ? <ChevronDown size={18} color="var(--text-tertiary)" /> : <ChevronRight size={18} color="var(--text-tertiary)" />}
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 'var(--space-6)', background: 'var(--bg-body)' }}>
      {/* Main Content Area */}
      <main style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {workspace.description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
            {workspace.description}
          </p>
        )}
        
        {/* Overview Section */}
        <section>
          {renderSectionHeader('overview', 'Overview', <ListIcon size={16} />)}
            {expandedSections.overview && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px' }}>Type</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, textTransform: 'capitalize' }}>{workspace.type}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }} onClick={() => {
                  const s = prompt('Stage (e.g. Idea, Building, Live):', workspace.status);
                  if (s) handleUpdateOverview({ status: s });
                }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px' }}>Stage</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{workspace.status || '-'}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }} onClick={() => {
                  const p = prompt('Priority (Low, Medium, High, Urgent):', workspace.priority);
                  if (p) handleUpdateOverview({ priority: p });
                }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px' }}>Priority</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{workspace.priority || '-'}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }} onClick={() => {
                  const el = prompt('Expected Launch:', workspace.expected_launch);
                  if (el !== null) handleUpdateOverview({ expected_launch: el });
                }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px' }}>Expected Launch</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{workspace.expected_launch || '-'}</div>
                </div>
              </div>
            )}
          </section>

        {/* Notes Section */}
        <section>
          {renderSectionHeader('notes', 'Notes', <FileText size={16} />, notes.length)}
            {expandedSections.notes && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: '4px' }}>{note.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Edited {new Date(note.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
                {notes.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No notes yet.</div>}
                <button onClick={handleAddNote} style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Note
                </button>
              </div>
            )}
          </section>

        {/* Tasks Section */}
        <section>
          {renderSectionHeader('tasks', 'Tasks', <CheckSquare size={16} />, tasks.length)}
            {expandedSections.tasks && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {tasks.sort((a,b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0)).map(t => (
                  <SwipeableItem 
                    key={t.id}
                    onSwipeLeft={() => handleDeleteTask(t.id)}
                    onSwipeRight={() => handleToggleTask(t)}
                    leftActions={<span style={{ color: 'white', fontWeight: 600, fontSize: '12px' }}>Delete</span>}
                    rightActions={<span style={{ color: 'white', fontWeight: 600, fontSize: '12px' }}>{t.status === 'completed' ? 'Undo' : 'Complete'}</span>}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-secondary)' }}>
                      <div onClick={() => handleToggleTask(t)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid', borderColor: t.status === 'completed' ? 'var(--accent-success)' : 'var(--border-primary)', background: t.status === 'completed' ? 'var(--accent-success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', cursor: 'pointer' }}>
                        {t.status === 'completed' && <Check size={12} color="white" />}
                      </div>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleOpenTaskForm(t)}>
                        <div style={{ fontSize: 'var(--text-sm)', color: t.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</div>
                      </div>
                    </div>
                  </SwipeableItem>
                ))}
                {tasks.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No tasks.</div>}
                <button onClick={() => handleOpenTaskForm()} style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Task
                </button>
              </div>
            )}
          </section>

        {/* Checklist Section */}
        <section>
          {renderSectionHeader('checklist', 'Checklist', <ListIcon size={16} />, checklists.length)}
            {expandedSections.checklist && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {checklists.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)' }}>
                     <div onClick={() => handleToggleChecklist(c)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: '2px solid', borderColor: c.checked ? 'var(--accent-primary)' : 'var(--border-secondary)', background: c.checked ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {c.checked && <Check size={12} color="white" />}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: c.checked ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: c.checked ? 'line-through' : 'none' }}>{c.content}</div>
                  </div>
                ))}
                <button onClick={handleAddChecklist} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Checklist Item
                </button>
              </div>
            )}
          </section>

        {/* Ideas Backlog Section */}
        <section>
          {renderSectionHeader('ideas', 'Ideas Backlog', <Lightbulb size={16} />, ideas.length)}
            {expandedSections.ideas && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {ideas.map(idea => (
                  <div key={idea.id} style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: '4px' }}>{idea.title}</div>
                    {idea.description && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{idea.description}</div>}
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Added {new Date(idea.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
                {ideas.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No ideas logged yet.</div>}
                <button onClick={handleAddIdea} style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Log Idea
                </button>
              </div>
            )}
          </section>

        {/* Important Links Section */}
        <section>
          {renderSectionHeader('links', 'Important Links', <LinkIcon size={16} />, links.length)}
            {expandedSections.links && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {links.map(l => (
                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)', textDecoration: 'none' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><LinkIcon size={16} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{l.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.url}</div>
                    </div>
                  </a>
                ))}
                <button onClick={handleAddLink} style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Link
                </button>
              </div>
            )}
          </section>

        {/* Timeline Section */}
        <section>
          {renderSectionHeader('timeline', 'Timeline', <Clock size={16} />, timeline.length)}
            {expandedSections.timeline && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--border-secondary)', marginLeft: '8px' }}>
                {timeline.map(event => (
                  <div key={event.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ position: 'absolute', left: '-13px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-secondary)', border: '2px solid var(--bg-body)' }} />
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginLeft: 'var(--space-3)' }}>{event.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'var(--space-3)' }}>{new Date(event.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {timeline.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-3)' }}>No recent activity.</div>}
              </div>
            )}
          </section>
      </main>

      {/* Task Form Sheet */}
      {showTaskForm && (
        <>
          <div className="modal-backdrop" onClick={() => setShowTaskForm(false)} />
          <TaskForm 
            onClose={() => setShowTaskForm(false)} 
            onCreated={() => setRefreshKey(k => k + 1)}
            initialData={editingTask || { category: workspace.name } as any} 
          />
        </>
      )}
    </div>
  );
}
