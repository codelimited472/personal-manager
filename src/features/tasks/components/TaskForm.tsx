'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createTask } from '../services/taskService';
import { TASK_PRIORITIES, TASK_CATEGORIES } from '../constants';
import { useToast } from '@/components/ui/Toast';
import type { TaskFormData, TaskPriority, TaskCategory } from '../types';
import { X } from 'lucide-react';
import styles from './TaskForm.module.css';

interface TaskFormProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function TaskForm({ onClose, onCreated }: TaskFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TaskFormData>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category: 'personal',
    is_recurring: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const userId = user?.id || 'local-user';
      await createTask(userId, {
        ...form,
        title: form.title.trim(),
        due_date: form.due_date || undefined,
      });
      showToast('Task created!', 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bottom-sheet" id="task-form-sheet">
      <div className="bottom-sheet-handle" />
      <div className="bottom-sheet-content">
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>New Task</h2>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* Title */}
          <div className="input-group">
            <input
              className="input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              autoFocus
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
              {TASK_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`${styles.chip} ${form.category === c.value ? styles.chipActive : ''}`}
                  onClick={() => setForm({ ...form, category: c.value as TaskCategory })}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || !form.title.trim()}
            id="task-submit-btn"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
