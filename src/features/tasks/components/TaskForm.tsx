'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createTask, updateTask } from '../services/taskService';
import { TASK_PRIORITIES, TASK_CATEGORIES } from '../constants';
import { useToast } from '@/components/ui/Toast';
import type { Task, TaskFormData, TaskPriority, TaskCategory } from '../types';
import { getDB, type LocalBusinessWorkspace } from '@/lib/db';
import { X, Briefcase } from 'lucide-react';
import styles from './TaskForm.module.css';

interface TaskFormProps {
  onClose: () => void;
  onCreated?: () => void;
  initialData?: Task;
}

export default function TaskForm({ onClose, onCreated, initialData }: TaskFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<LocalBusinessWorkspace[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  const [form, setForm] = useState<TaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    due_date: initialData?.due_date || '',
    priority: initialData?.priority || 'medium',
    category: initialData?.category || 'personal',
    is_recurring: initialData?.is_recurring || false,
  });

  useEffect(() => {
    async function loadWorkspaces() {
      const db = getDB();
      const ws = await db.businessWorkspaces.toArray();
      setWorkspaces(ws);
    }
    loadWorkspaces();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const userId = user?.id || 'local-user';
      if (initialData) {
        await updateTask(initialData.id, {
          ...form,
          title: form.title.trim(),
          due_date: form.due_date || undefined,
        });
        showToast('Task updated!', 'success');
      } else {
        await createTask(userId, {
          ...form,
          title: form.title.trim(),
          due_date: form.due_date || undefined,
        });
        showToast('Task created!', 'success');
      }
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(initialData ? 'Failed to update task' : 'Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bottom-sheet" id="task-form-sheet">
      <div className="bottom-sheet-handle" />
      <div className="bottom-sheet-content">
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{initialData ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* Title */}
          <div className="input-group">
            <input
              ref={titleInputRef}
              className="input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              id="task-title-input"
            />
          </div>

          {/* Description */}
          <div className="input-group">
            <textarea
              className="input textarea"
              placeholder="Add details (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              id="task-desc-input"
            />
          </div>

          {/* Due Date */}
          <div className="input-group">
            <label className="input-label">Due Date</label>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              id="task-date-input"
            />
          </div>

          {/* Priority */}
          <div className="input-group">
            <label className="input-label">Priority</label>
            <div className={styles.chipGroup}>
              {TASK_PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`${styles.chip} ${form.priority === p.value ? styles.chipActive : ''}`}
                  style={form.priority === p.value ? { background: p.color, borderColor: p.color } : {}}
                  onClick={() => setForm({ ...form, priority: p.value as TaskPriority })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="input-group">
            <label className="input-label">Category</label>
            <div className={styles.chipGroup}>
              {TASK_CATEGORIES.map(c => {
                if (c.value === 'business') return null; // We hide the default 'business' category since we use dynamic workspaces
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`${styles.chip} ${form.category === c.value ? styles.chipActive : ''}`}
                    onClick={() => setForm({ ...form, category: c.value as TaskCategory })}
                  >
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
            
            {workspaces.length > 0 && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="input-label" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Businesses & Ideas</label>
                <select
                  className="input"
                  style={{ marginTop: '4px', cursor: 'pointer' }}
                  value={workspaces.some(w => w.name === form.category) ? form.category : ''}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="" disabled>Select a business or idea...</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || !form.title.trim()}
            id="task-submit-btn"
          >
            {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Task' : 'Create Task')}
          </button>
        </form>
      </div>
    </div>
  );
}
