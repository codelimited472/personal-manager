'use client';

import { useState, useEffect } from 'react';
import { FileText, Lightbulb, Plus, Trash2, Tag, BookOpen } from 'lucide-react';
import { getDB, type LocalNote, type LocalIdea } from '@/lib/db';
import styles from './notes.module.css';

export default function NotesPage() {
  const db = getDB();
  const [activeTab, setActiveTab] = useState<'notes' | 'ideas'>('notes');

  // Notes KB State
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // Ideas State
  const [ideas, setIdeas] = useState<LocalIdea[]>([]);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('Business');
  const [ideaTags, setIdeaTags] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const nList = await db.notes.toArray();
      setNotes(nList);
      const iList = await db.ideas.toArray();
      setIdeas(iList);
    }
    loadData();
  }, [refreshKey]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;

    const tags = noteTags.split(',').map(t => t.trim()).filter(Boolean);

    await db.notes.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      title: noteTitle,
      content: noteContent,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setNoteTitle('');
    setNoteContent('');
    setNoteTags('');
    setRefreshKey(prev => prev + 1);
  };

  const deleteNote = async (id: string) => {
    await db.notes.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle) return;

    const tags = ideaTags.split(',').map(t => t.trim()).filter(Boolean);

    await db.ideas.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      title: ideaTitle,
      description: ideaDesc || undefined,
      category: ideaCategory,
      tags,
      status: 'new',
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setIdeaTitle('');
    setIdeaDesc('');
    setIdeaTags('');
    setRefreshKey(prev => prev + 1);
  };

  const updateIdeaStatus = async (id: string, currentStatus: string) => {
    const statuses: ('new' | 'exploring' | 'in_progress' | 'implemented')[] = ['new', 'exploring', 'in_progress', 'implemented'];
    const nextIdx = (statuses.indexOf(currentStatus as any) + 1) % statuses.length;
    await db.ideas.update(id, { status: statuses[nextIdx] });
    setRefreshKey(prev => prev + 1);
  };

  const deleteIdea = async (id: string) => {
    await db.ideas.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab('notes')}
          className={activeTab === 'notes' ? styles.tabActive : styles.tab}
        >
          <FileText size={16} /> Knowledge Notes
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={activeTab === 'ideas' ? styles.tabActive : styles.tab}
        >
          <Lightbulb size={16} /> Idea Hub
        </button>
      </div>

      {activeTab === 'notes' && (
        <div>
          <form onSubmit={addNote} className={styles.formCard}>
            <h4 className={styles.formTitle}>New Knowledge Base / SOP Note</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Note Title (e.g. Server Setup SOP, Cooking Lessons)"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <textarea
                placeholder="Enter rich details, instructions, reference material..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className={styles.textArea}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Tags (separated by comma)"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <BookOpen size={16} /> Save to KB
            </button>
          </form>

          {/* Notes List */}
          <h3 className={styles.sectionHeader}>Saved Knowledge Notes</h3>
          <div className={styles.notesList}>
            {notes.length === 0 ? (
              <p className={styles.emptyState}>No notes saved in your Knowledge Base.</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className={styles.noteCard}>
                  <div className={styles.noteHeader}>
                    <strong className={styles.noteTitleText}>{note.title}</strong>
                    <button onClick={() => deleteNote(note.id)} className={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className={styles.noteBodyText}>{note.content}</p>
                  <div className={styles.tagGrid}>
                    {note.tags.map(tag => (
                      <span key={tag} className={styles.tagBadge}><Tag size={10} /> {tag}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'ideas' && (
        <div>
          <form onSubmit={addIdea} className={styles.formCard}>
            <h4 className={styles.formTitle}>Log New Idea</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Idea Summary (e.g. Smart Wardrobe App)"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <select
                value={ideaCategory}
                onChange={(e) => setIdeaCategory(e.target.value)}
                className={styles.input}
              >
                <option value="Business">Business Venture</option>
                <option value="Product">Product Feature</option>
                <option value="Travel">Travel Adventure</option>
                <option value="Self Improvement">Self Improvement</option>
                <option value="Other">Other Ideas</option>
              </select>

              <input
                type="text"
                placeholder="Tags"
                value={ideaTags}
                onChange={(e) => setIdeaTags(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Additional description/context"
                value={ideaDesc}
                onChange={(e) => setIdeaDesc(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Plus size={16} /> Record Idea
            </button>
          </form>

          {/* Ideas List */}
          <h3 className={styles.sectionHeader}>Recorded Ideas</h3>
          <div className={styles.ideasList}>
            {ideas.length === 0 ? (
              <p className={styles.emptyState}>No ideas logged. Start capturing your thoughts!</p>
            ) : (
              ideas.map(idea => (
                <div key={idea.id} className={styles.ideaCard}>
                  <div className={styles.ideaHeader}>
                    <div>
                      <strong className={styles.ideaTitleText}>{idea.title}</strong>
                      <span className={styles.ideaCategory}>{idea.category}</span>
                    </div>
                    <button onClick={() => deleteIdea(idea.id)} className={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {idea.description && <p className={styles.ideaDescText}>{idea.description}</p>}
                  <div className={styles.ideaFooter}>
                    <button
                      onClick={() => updateIdeaStatus(idea.id, idea.status)}
                      className={styles.statusBtn}
                    >
                      Status: {idea.status}
                    </button>
                    <div className={styles.tagGrid}>
                      {idea.tags.map(tag => (
                        <span key={tag} className={styles.tagBadge}><Tag size={10} /> {tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
