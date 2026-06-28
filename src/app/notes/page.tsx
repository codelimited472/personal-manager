'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Folder, ChevronRight, Search, Mic, Plus, Edit, MoreHorizontal, Share, Check, Camera, PenTool, Edit3, CheckSquare, Trash2 } from 'lucide-react';
import { getDB, type LocalNote, type LocalNoteFolder } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import styles from './notes.module.css';

type ViewState = 'folders' | 'notes' | 'editor';

type NoteBlock = {
  id: string;
  type: 'text' | 'checklist';
  content: string;
  checked?: boolean;
};

export default function NotesPage() {
  const db = getDB();

  const [view, setView] = useState<ViewState>('notes');
  const [folders, setFolders] = useState<LocalNoteFolder[]>([]);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<LocalNote | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBlocks, setEditorBlocks] = useState<NoteBlock[]>([]);
  const editorBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      const fList = await db.noteFolders.toArray();
      setFolders(fList);

      if (activeFolderId) {
        const nList = await db.notes.where('folder_id').equals(activeFolderId).toArray();
        setNotes(nList.filter(n => !n.is_deleted));
      } else {
        const nList = await db.notes.toArray();
        setNotes(nList.filter(n => !n.is_deleted));
      }
    }
    loadData();
  }, [refreshKey, activeFolderId]);

  // Folder Actions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.noteFolders.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: newFolderName.trim(),
      created_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });
    setNewFolderName('');
    setShowNewFolder(false);
    setRefreshKey(k => k + 1);
  };

  const handleFolderClick = (id: string) => {
    setActiveFolderId(id);
    setView('notes');
  };

  const deleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Delete this folder and all its notes?'))) return;
    const folderNotes = await db.notes.where('folder_id').equals(id).toArray();
    for (const n of folderNotes) {
      await deleteRecord('notes', n.id);
    }
    await deleteRecord('noteFolders', id);
    setRefreshKey(k => k + 1);
  };

  // Note Actions
  const handleCreateNote = async () => {
    const newNoteId = crypto.randomUUID();
    const newNote: LocalNote = {
      id: newNoteId,
      user_id: 'local-user',
      folder_id: activeFolderId || undefined,
      title: '',
      content: JSON.stringify([{ id: crypto.randomUUID(), type: 'text', content: '' }]),
      tags: [],
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    };
    await db.notes.add(newNote);
    setActiveNote(newNote);
    setEditorTitle('');
    setEditorBlocks([{ id: crypto.randomUUID(), type: 'text', content: '' }]);
    setView('editor');
    setRefreshKey(k => k + 1);
  };

  const openNote = (note: LocalNote) => {
    setActiveNote(note);
    setEditorTitle(note.title);
    try {
      const blocks = JSON.parse(note.content);
      if (Array.isArray(blocks)) {
        setEditorBlocks(blocks);
      } else {
        setEditorBlocks([{ id: crypto.randomUUID(), type: 'text', content: note.content }]);
      }
    } catch {
      setEditorBlocks([{ id: crypto.randomUUID(), type: 'text', content: note.content }]);
    }
    setView('editor');
  };

  const saveActiveNote = async () => {
    if (!activeNote) return;
    await db.notes.update(activeNote.id, {
      title: editorTitle,
      content: JSON.stringify(editorBlocks),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });
    setRefreshKey(k => k + 1);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Delete this note?'))) return;
    await db.notes.update(id, { is_deleted: true, _syncStatus: 'pending' });
    setRefreshKey(k => k + 1);
  };

  // Editor Actions
  const addChecklistBlock = () => {
    setEditorBlocks([...editorBlocks, { id: crypto.randomUUID(), type: 'checklist', content: '', checked: false }]);
  };

  const updateBlock = (index: number, content: string) => {
    const updated = [...editorBlocks];
    updated[index].content = content;
    setEditorBlocks(updated);
  };

  const toggleChecklist = (index: number) => {
    const updated = [...editorBlocks];
    if (updated[index].type === 'checklist') {
      updated[index].checked = !updated[index].checked;
    }
    setEditorBlocks(updated);
  };

  const handleEditorDone = async () => {
    await saveActiveNote();
    setView('notes');
    setActiveNote(null);
  };

  // Formatting helpers
  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPreview = (note: LocalNote) => {
    try {
      const blocks = JSON.parse(note.content) as NoteBlock[];
      return blocks.map(b => b.content).join(' ').substring(0, 50) || 'No additional text';
    } catch {
      return note.content.substring(0, 50) || 'No additional text';
    }
  };

  // Removed Folders View

  if (view === 'notes') {
    const filteredNotes = notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null;

    return (
      <div className={styles.container}>
        <header className={styles.header} style={{ justifyContent: 'space-between', backgroundColor: 'var(--bg-body)', borderBottom: 'none' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginLeft: 8 }}>Notes</div>
          <button className={styles.headerBtn} onClick={handleCreateNote}>
            <Edit3 size={24} color="var(--accent-primary)" />
          </button>
        </header>

        <main className={styles.main}>
          <div className={styles.listContainer}>
            {filteredNotes.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No Notes Found
              </div>
            ) : (
              filteredNotes.map((note, idx) => (
                <div key={note.id}>
                  {idx > 0 && <div className={styles.separator} style={{ marginLeft: 16 }} />}
                  <div className={styles.noteItem} onClick={() => openNote(note)}>
                    <div className={styles.noteItemContent}>
                      <h3 className={styles.noteTitle}>{note.title || 'New Note'}</h3>
                      <div className={styles.noteMeta}>
                        <span className={styles.noteDate}>{formatTime(note.updated_at)}</span>
                        <span className={styles.notePreview}>{getPreview(note)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteNote(note.id, e)} 
                      className={styles.headerBtn} 
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 20 }}>
            {filteredNotes.length} Notes
          </div>
        </main>
      </div>
    );
  }

  if (view === 'editor' && activeNote) {
    return (
      <div className={styles.container} style={{ backgroundColor: '#ffffff' }}>
        <div className={styles.editorToolbar}>
          <div className={styles.editorToolbarInner}>
            <div style={{ display: 'flex', gap: 24 }}>
              <button className={styles.footerActionIcon} onClick={addChecklistBlock}>
                <CheckSquare size={24} />
              </button>
              <button className={styles.footerActionIcon}>
                <Camera size={24} />
              </button>
              <button className={styles.footerActionIcon}>
                <PenTool size={24} />
              </button>
            </div>
            <button className={styles.headerBtn} style={{ fontWeight: 600 }} onClick={handleEditorDone}>
              Done
            </button>
          </div>
        </div>

        <main className={styles.main} style={{ paddingTop: 20, paddingBottom: 120 }}>
          <div className={styles.editorTimestamp}>
            Today at {formatTime(activeNote.updated_at)}
          </div>

          <input
            className={styles.editorTitle}
            placeholder="Title"
            value={editorTitle}
            onChange={e => setEditorTitle(e.target.value)}
            onBlur={saveActiveNote}
          />

          <div className={styles.editorBody} ref={editorBodyRef}>
            {editorBlocks.map((block, idx) => {
              if (block.type === 'checklist') {
                return (
                  <div key={block.id} className={styles.checklistItem}>
                    <button 
                      className={`${styles.checklistBtn} ${block.checked ? styles.checklistBtnChecked : ''}`}
                      onClick={() => { toggleChecklist(idx); saveActiveNote(); }}
                    >
                      {block.checked && <Check size={14} strokeWidth={3} />}
                    </button>
                    <input
                      className={`${styles.checklistText} ${block.checked ? styles.checklistTextChecked : ''}`}
                      style={{ border: 'none', background: 'transparent', fontSize: 'var(--text-md)', width: '100%' }}
                      placeholder="List item"
                      value={block.content}
                      onChange={e => updateBlock(idx, e.target.value)}
                      onBlur={saveActiveNote}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newBlocks = [...editorBlocks];
                          newBlocks.splice(idx + 1, 0, { id: crypto.randomUUID(), type: 'checklist', content: '', checked: false });
                          setEditorBlocks(newBlocks);
                          setTimeout(() => saveActiveNote(), 50);
                        }
                      }}
                    />
                  </div>
                );
              }

              // Text block
              return (
                <textarea
                  key={block.id}
                  style={{ width: '100%', border: 'none', background: 'transparent', resize: 'none', minHeight: '60px', outline: 'none' }}
                  placeholder="Start typing..."
                  value={block.content}
                  onChange={e => {
                    updateBlock(idx, e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onBlur={saveActiveNote}
                />
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return null;
}
