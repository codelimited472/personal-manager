'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Plus, Trash2, CheckSquare, FileText, Lightbulb, Users, ShieldAlert, FolderOpen } from 'lucide-react';
import { getDB, type LocalBusinessWorkspace, type LocalBusinessTask, type LocalBusinessNote, type LocalBusinessContact } from '@/lib/db';
import styles from './business.module.css';

export default function BusinessPage() {
  const db = getDB();
  const [workspaces, setWorkspaces] = useState<LocalBusinessWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');

  // Forms
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<'clinic' | 'school' | 'annotation' | 'other'>('clinic');

  // Active Workspace Sub-Entities
  const [tasks, setTasks] = useState<LocalBusinessTask[]>([]);
  const [notes, setNotes] = useState<LocalBusinessNote[]>([]);
  const [contacts, setContacts] = useState<LocalBusinessContact[]>([]);

  // Sub-Entity Add Forms
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<'client' | 'vendor' | 'employee'>('client');
  const [contactEmail, setContactEmail] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadWorkspaces() {
      const list = await db.businessWorkspaces.toArray();
      setWorkspaces(list);
      if (list.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(list[0].id);
      }
    }
    loadWorkspaces();
  }, [refreshKey]);

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!activeWorkspaceId) return;
      const tList = await db.businessTasks.where('workspace_id').equals(activeWorkspaceId).toArray();
      setTasks(tList);
      const nList = await db.businessNotes.where('workspace_id').equals(activeWorkspaceId).toArray();
      setNotes(nList);
      const cList = await db.businessContacts.where('workspace_id').equals(activeWorkspaceId).toArray();
      setContacts(cList);
    }
    loadWorkspaceData();
  }, [activeWorkspaceId, refreshKey]);

  const addWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) return;

    const newWs = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: workspaceName,
      type: workspaceType,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.businessWorkspaces.add(newWs);
    setActiveWorkspaceId(newWs.id);
    setWorkspaceName('');
    setRefreshKey(prev => prev + 1);
  };

  const deleteWorkspace = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    await db.businessWorkspaces.delete(id);
    if (activeWorkspaceId === id) setActiveWorkspaceId('');
    setRefreshKey(prev => prev + 1);
  };

  // Workspace sub-items additions
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !activeWorkspaceId) return;

    await db.businessTasks.add({
      id: crypto.randomUUID(),
      workspace_id: activeWorkspaceId,
      title: taskTitle,
      due_date: taskDate || undefined,
      status: 'pending',
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setTaskTitle('');
    setTaskDate('');
    setRefreshKey(prev => prev + 1);
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await db.businessTasks.update(id, { status: nextStatus });
    setRefreshKey(prev => prev + 1);
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !activeWorkspaceId) return;

    await db.businessNotes.add({
      id: crypto.randomUUID(),
      workspace_id: activeWorkspaceId,
      title: noteTitle,
      content: noteContent,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setNoteTitle('');
    setNoteContent('');
    setRefreshKey(prev => prev + 1);
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !activeWorkspaceId) return;

    await db.businessContacts.add({
      id: crypto.randomUUID(),
      workspace_id: activeWorkspaceId,
      name: contactName,
      type: contactType,
      email: contactEmail || undefined,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setContactName('');
    setContactEmail('');
    setRefreshKey(prev => prev + 1);
  };

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <div className="page">
      {/* Workspace Creator */}
      <form onSubmit={addWorkspace} className={styles.formCard}>
        <h4 className={styles.formTitle}>New Workspace</h4>
        <div className={styles.formGroupRow}>
          <input
            type="text"
            placeholder="Workspace Name (e.g. School Portal)"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className={styles.input}
            required
          />
          <select
            value={workspaceType}
            onChange={(e: any) => setWorkspaceType(e.target.value)}
            className={styles.input}
          >
            <option value="clinic">Clinic Manager</option>
            <option value="school">School Manager</option>
            <option value="annotation">Annotation Biz</option>
            <option value="other">Other Venture</option>
          </select>
          <button type="submit" className={styles.smallSubmitBtn}>Create</button>
        </div>
      </form>

      {workspaces.length > 0 ? (
        <div className={styles.dashboardContainer}>
          {/* Workspace Select tabbar */}
          <div className={styles.selectorBar}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setActiveWorkspaceId(ws.id)}
                className={activeWorkspaceId === ws.id ? styles.selectorBtnActive : styles.selectorBtn}
              >
                <Briefcase size={14} /> {ws.name}
              </button>
            ))}
          </div>

          <div className={styles.workspaceBody}>
            {/* 1. Workspace specific tasks */}
            <div className={styles.card}>
              <h4 className={styles.cardHeader}><CheckSquare size={16} /> Tasks & Deadlines</h4>
              <form onSubmit={addTask} className={styles.subForm}>
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className={styles.subInput}
                  required
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className={styles.subInput}
                />
                <button type="submit" className={styles.addBtn}>Add</button>
              </form>
              <div className={styles.subList}>
                {tasks.map(t => (
                  <div key={t.id} className={styles.subItem} onClick={() => toggleTask(t.id, t.status)}>
                    <span className={t.status === 'completed' ? styles.taskTextDone : styles.taskText}>
                      {t.title} {t.due_date && <span className={styles.dateLabel}>({t.due_date})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Workspace Meeting Notes */}
            <div className={styles.card}>
              <h4 className={styles.cardHeader}><FileText size={16} /> Operational Notes</h4>
              <form onSubmit={addNote} className={styles.subFormCol}>
                <input
                  type="text"
                  placeholder="Note Title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className={styles.subInput}
                  required
                />
                <textarea
                  placeholder="Meeting details, processes, operational SOPs..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className={styles.subTextArea}
                  required
                />
                <button type="submit" className={styles.addBtnCol}>Save Note</button>
              </form>
              <div className={styles.subList}>
                {notes.map(n => (
                  <div key={n.id} className={styles.noteItem}>
                    <strong>{n.title}</strong>
                    <p>{n.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Workspace Contacts */}
            <div className={styles.card}>
              <h4 className={styles.cardHeader}><Users size={16} /> Workspace Contacts</h4>
              <form onSubmit={addContact} className={styles.subFormCol}>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={styles.subInput}
                  required
                />
                <div className={styles.formGroupRow}>
                  <select
                    value={contactType}
                    onChange={(e: any) => setContactType(e.target.value)}
                    className={styles.subInput}
                  >
                    <option value="client">Client</option>
                    <option value="vendor">Vendor</option>
                    <option value="employee">Employee</option>
                  </select>
                  <input
                    type="email"
                    placeholder="Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={styles.subInput}
                  />
                </div>
                <button type="submit" className={styles.addBtnCol}>Add Contact</button>
              </form>
              <div className={styles.subList}>
                {contacts.map(c => (
                  <div key={c.id} className={styles.contactItem}>
                    <div>
                      <strong>{c.name}</strong>
                      <span>{c.type} {c.email && `• ${c.email}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {activeWs && (
              <button
                onClick={() => deleteWorkspace(activeWs.id)}
                className={styles.deleteWorkspaceBtn}
              >
                <Trash2 size={16} /> Delete "{activeWs.name}" Workspace
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className={styles.emptyState}>Create a workspace above to manage your business units (Clinic, School, etc.).</p>
      )}
    </div>
  );
}
