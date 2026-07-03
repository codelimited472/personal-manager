'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Trash2 } from 'lucide-react';
import { getDB, type LocalBusinessWorkspace } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import styles from './business.module.css';

export default function BusinessHubPage() {
  const router = useRouter();
  const db = getDB();
  const [workspaces, setWorkspaces] = useState<LocalBusinessWorkspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadWorkspaces() {
      const list = await db.businessWorkspaces.toArray();
      setWorkspaces(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
    loadWorkspaces();
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newWs: LocalBusinessWorkspace = { 
      id: crypto.randomUUID(), 
      user_id: 'local-user', 
      name: newName.trim(), 
      type: 'other', 
      created_at: new Date().toISOString(), 
      _syncStatus: 'pending' 
    };
    
    await db.businessWorkspaces.add(newWs);
    setNewName('');
    setIsCreating(false);
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (e: React.MouseEvent, wsId: string) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Are you sure you want to delete this workspace? This will not delete the tasks associated with it.'))) return;
    await deleteRecord('businessWorkspaces', wsId);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
      <main>
        {/* New Workspace Action */}
        {!isCreating && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-2)', boxShadow: '0px 4px 20px rgba(0,0,0,0.04)' }}>
              <button 
                onClick={() => setIsCreating(true)}
                style={{ 
                  width: '100%', 
                  background: 'var(--accent-primary)', 
                  color: 'white', 
                  padding: 'var(--space-3) var(--space-4)', 
                  borderRadius: 'var(--radius-lg)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 'var(--space-2)', 
                  fontWeight: 600, 
                  fontSize: '1.1rem',
                  border: 'none', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(var(--accent-primary-rgb, 70, 72, 212), 0.4)'
                }}
              >
                <Plus size={20} />
                <span>New Workspace</span>
              </button>
            </div>
          </section>
        )}

        {isCreating && (
          <div className={styles.listCard} style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)', fontWeight: 600 }}>Create New Workspace</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <input
                type="text"
                autoFocus
                placeholder="Name (e.g. Next Big Startup, YouTube Channel...)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="input"
                required
              />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Stats / Header Subtitle */}
        {!isCreating && workspaces.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Active Workspaces</h2>
            <span style={{ background: 'rgba(var(--accent-primary-rgb, 70, 72, 212), 0.1)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
              {workspaces.length} TOTAL
            </span>
          </div>
        )}

        {workspaces.length === 0 && !isCreating ? (
          <div className={styles.emptyState} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Briefcase size={48} color="var(--border-primary)" style={{ margin: '0 auto 1rem' }} />
            <p>You haven&apos;t added any businesses or ideas yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {workspaces.map(ws => (
              <div 
                key={ws.id} 
                onClick={() => router.push(`/business/${ws.id}`)}
                style={{
                  background: 'var(--bg-surface)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  aspectRatio: '1 / 1',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 'var(--space-2)' }}>
                    {ws.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Created {new Date(ws.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={(e) => handleDelete(e, ws.id)}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-tertiary)', 
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
