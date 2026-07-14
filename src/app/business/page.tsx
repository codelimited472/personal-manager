'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Search, Filter, MoreVertical, Copy, Archive, Trash2, ArrowDownUp, Pin, Lightbulb, ChevronRight } from 'lucide-react';
import { getDB, type LocalBusinessWorkspace } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import { formatRelativeDate } from '@/lib/utils';
import styles from './business.module.css';

export default function BusinessHubPage() {
  const router = useRouter();
  const db = getDB();
  const [workspaces, setWorkspaces] = useState<LocalBusinessWorkspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals / Bottom Sheets
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<'business' | 'idea'>('business');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Active item for 3-dot menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspaces() {
      const list = await db.businessWorkspaces.toArray();
      // Default sort by created_at descending
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
      description: newDesc.trim() || undefined,
      type: createType, 
      status: createType === 'idea' ? 'Idea' : 'Planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' 
    };
    
    await db.businessWorkspaces.add(newWs);
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
    setShowFabMenu(false);
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (wsId: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this workspace?'))) return;
    await deleteRecord('businessWorkspaces', wsId);
    setActiveMenuId(null);
    setRefreshKey(k => k + 1);
  };

  const handleDuplicate = async (ws: LocalBusinessWorkspace) => {
    const newWs = {
      ...ws,
      id: crypto.randomUUID(),
      name: `${ws.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' as const
    };
    await db.businessWorkspaces.add(newWs);
    setActiveMenuId(null);
    setRefreshKey(k => k + 1);
  };

  const filters = ['All', 'Business', 'Ideas', 'Active', 'Archived'];

  const filteredWorkspaces = workspaces.filter(ws => {
    if (searchQuery && !ws.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(ws.description || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeFilter === 'Business' && ws.type !== 'business') return false;
    if (activeFilter === 'Ideas' && ws.type !== 'idea') return false;
    if (activeFilter === 'Archived' && ws.status === 'Archived') return true;
    if (activeFilter === 'Active' && ws.status === 'Archived') return false;
    if (activeFilter !== 'Archived' && ws.status === 'Archived') return false; // Hide archived from main views
    return true;
  });

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      
      {/* Search Bar */}
      <div style={{ position: 'sticky', top: 'calc(var(--header-height, 0px))', zIndex: 10, background: 'var(--bg-primary)', paddingBottom: 'var(--space-3)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', 
          borderRadius: 'var(--radius-xl)', padding: 'var(--space-3) var(--space-4)',
          border: '1px solid var(--border-primary)'
        }}>
          <Search size={20} color="var(--text-tertiary)" style={{ marginRight: 'var(--space-2)' }} />
          <input 
            type="text" 
            placeholder="Search workspaces..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 'var(--text-md)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 'var(--space-4)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === f ? 'var(--accent-primary)' : 'var(--border-secondary)',
              background: activeFilter === f ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeFilter === f ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {filteredWorkspaces.length} {filteredWorkspaces.length === 1 ? 'WORKSPACE' : 'WORKSPACES'}
        </span>
        <button style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}>
          <ArrowDownUp size={14} /> Sort
        </button>
      </div>

      {/* Workspace List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {filteredWorkspaces.map(ws => (
          <div 
            key={ws.id}
            onClick={() => router.push(`/business/${ws.id}`)}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              border: '1px solid var(--border-primary)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: ws.type === 'idea' ? 'var(--accent-secondary-muted)' : 'var(--accent-primary-muted)',
                  color: ws.type === 'idea' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {ws.type === 'idea' ? <Lightbulb size={20} /> : <Briefcase size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{ws.name}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ws.description || (ws.type === 'idea' ? 'New Idea' : 'Business Workspace')}
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === ws.id ? null : ws.id); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', padding: '4px' }}
              >
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Tags / Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                  background: ws.status === 'Live' ? 'var(--accent-success-muted)' : 'var(--bg-surface)',
                  color: ws.status === 'Live' ? 'var(--accent-success)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-secondary)'
                }}>
                  {ws.status || 'Draft'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Edited {formatRelativeDate(ws.updated_at || ws.created_at)}
                </span>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </div>

            {/* Menu Dropdown */}
            {activeMenuId === ws.id && (
              <div style={{
                position: 'absolute', top: '40px', right: '16px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)', zIndex: 20, width: '180px', overflow: 'hidden'
              }}>
                <button onClick={(e) => { e.stopPropagation(); handleDuplicate(ws); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-secondary)', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left' }}>
                  <Copy size={16} /> Duplicate
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--accent-danger)', fontSize: '14px', textAlign: 'left' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredWorkspaces.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-tertiary)' }}>
            <Briefcase size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>No workspaces found</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>Tap + to create a new business or idea.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className={styles.fabWrapper}>
        <button 
          className={styles.fab} 
          onClick={() => setShowFabMenu(true)}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Create Bottom Sheet */}
      {showFabMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowFabMenu(false)} />
          <div className="bottom-sheet" style={{ display: 'block', padding: 'var(--space-5)' }}>
            <div className="bottom-sheet-handle" />
            
            {!isCreating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Create New</h3>
                
                <button onClick={() => { setCreateType('business'); setIsCreating(true); }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={20} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>New Business</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Start a new venture or project</div>
                  </div>
                </button>
                
                <button onClick={() => { setCreateType('idea'); setIsCreating(true); }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-secondary-muted)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lightbulb size={20} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>New Idea</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Capture a concept to explore later</div>
                  </div>
                </button>

                <button disabled style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'left', opacity: 0.5 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-surface)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy size={20} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Import Template</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Coming soon</div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>New {createType === 'idea' ? 'Idea' : 'Business'}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Name</label>
                  <input type="text" autoFocus placeholder="e.g. Acme Corp" value={newName} onChange={e => setNewName(e.target.value)} className="input" required />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description (Optional)</label>
                  <textarea placeholder="Brief summary..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="textarea" rows={2} style={{ minHeight: '60px' }} />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCreating(false)}>Back</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Create Workspace</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
