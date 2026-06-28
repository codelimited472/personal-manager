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
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Briefcase size={24} color="var(--accent-primary)" />
          Businesses & Ideas
        </h2>
        {!isCreating && (
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }} 
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} /> New Workspace
          </button>
        )}
      </header>

      <main>
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

        {workspaces.length === 0 && !isCreating ? (
          <div className={styles.emptyState} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Briefcase size={48} color="var(--border-primary)" style={{ margin: '0 auto 1rem' }} />
            <p>You haven&apos;t added any businesses or ideas yet.</p>
          </div>
        ) : (
          <div className={styles.dashboardGrid}>
            {workspaces.map(ws => (
              <div 
                key={ws.id} 
                className={styles.widget} 
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => router.push(`/business/${ws.id}`)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{ws.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Created {new Date(ws.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  className="btn-icon" 
                  onClick={(e) => handleDelete(e, ws.id)}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
