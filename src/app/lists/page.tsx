'use client';

import { useState, useEffect, useRef } from 'react';
import { ListIcon, Plus, Trash2, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDB, type LocalAppList, type LocalAppListItem } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import styles from './lists.module.css';

export default function ListsPage() {
  const db = getDB();
  const [lists, setLists] = useState<LocalAppList[]>([]);
  const [selectedList, setSelectedList] = useState<LocalAppList | null>(null);
  const [items, setItems] = useState<LocalAppListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const newItemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadLists() {
      const listData = await db.appLists.toArray();
      setLists(listData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
    loadLists();
  }, [refreshKey]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedList) return;
      const listItems = await db.appListItems.where('list_id').equals(selectedList.id).toArray();
      setItems(listItems.sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }));
    }
    loadItems();
  }, [selectedList, refreshKey]);

  useEffect(() => {
    if (selectedList && !selectedList.name) {
      titleRef.current?.focus();
    }
  }, [selectedList]);

  const handleNewListClick = async () => {
    const list: LocalAppList = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: '',
      created_at: new Date().toISOString(),
      _syncStatus: 'pending'
    };

    await db.appLists.add(list);
    setSelectedList(list);
    setRefreshKey(k => k + 1);
  };

  const handleBack = async () => {
    if (selectedList && !selectedList.name.trim()) {
      const listItems = await db.appListItems.where('list_id').equals(selectedList.id).toArray();
      if (listItems.length === 0) {
        await deleteRecord('appLists', selectedList.id);
      } else {
        await db.appLists.update(selectedList.id, { name: 'Untitled List', _syncStatus: 'pending' });
      }
    }
    setSelectedList(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteList = async (e: React.MouseEvent, list: LocalAppList) => {
    e.stopPropagation();
    if (!(await window.appConfirm(`Delete list "${list.name}"?`))) return;

    // Delete items first
    const listItems = await db.appListItems.where('list_id').equals(list.id).toArray();
    for (const item of listItems) {
      await deleteRecord('appListItems', item.id);
    }
    
    // Delete list
    await deleteRecord('appLists', list.id);
    if (selectedList?.id === list.id) {
      setSelectedList(null);
    }
    setRefreshKey(k => k + 1);
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedList || !newItemName.trim()) return;

    const item: LocalAppListItem = {
      id: crypto.randomUUID(),
      list_id: selectedList.id,
      user_id: 'local-user',
      name: newItemName.trim(),
      checked: false,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending'
    };

    await db.appListItems.add(item);
    setNewItemName('');
    setRefreshKey(k => k + 1);
  };

  const handleToggleItem = async (item: LocalAppListItem) => {
    if (!item.checked) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    await db.appListItems.update(item.id, {
      checked: !item.checked,
      _syncStatus: 'pending'
    });
    setRefreshKey(k => k + 1);
  };

  const handleDeleteItem = async (item: LocalAppListItem) => {
    await deleteRecord('appListItems', item.id);
    setRefreshKey(k => k + 1);
  };

  // --- Views ---

  if (selectedList) {
    return (
      <div className="page">
        <button className={styles.backBtn} onClick={handleBack}>
          <ChevronLeft size={16} /> Back to Lists
        </button>
        
        <div className={styles.header}>
          <input
            ref={titleRef}
            type="text"
            className={styles.titleInput}
            value={selectedList.name}
            placeholder="List Title"
            onChange={(e) => {
              const newName = e.target.value;
              setSelectedList({...selectedList, name: newName});
              db.appLists.update(selectedList.id, { name: newName, _syncStatus: 'pending' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                newItemRef.current?.focus();
              }
            }}
          />
        </div>

        <div className={styles.itemsContainer}>
          {items.map(item => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemLeft} onClick={() => handleToggleItem(item)}>
                <input 
                  type="checkbox" 
                  checked={item.checked} 
                  onChange={() => {}} 
                  className={styles.checkbox}
                />
                <span className={`${styles.itemName} ${item.checked ? styles.checked : ''}`}>
                  {item.name}
                </span>
              </div>
              <button 
                className={styles.btnIcon} 
                onClick={() => handleDeleteItem(item)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className={styles.emptyState}>No items in this list yet.</div>
          )}
        </div>

        <form onSubmit={handleAddItem} className={styles.addItemForm}>
          <input
            ref={newItemRef}
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder="Add a new item..."
            className={styles.addItemInput}
          />
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <ListIcon size={24} color="var(--accent-warning)" />
          My Lists
        </h2>
        <button className={styles.btnPrimary} onClick={handleNewListClick}>
          <Plus size={16} /> New List
        </button>
      </div>

      <div className={styles.listGrid}>
        {lists.map(list => (
          <div key={list.id} className={styles.card} onClick={() => setSelectedList(list)}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>{list.name}</div>
              <button 
                className={styles.btnIcon} 
                onClick={(e) => handleDeleteList(e, list)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {lists.length === 0 && (
          <div className={styles.emptyState}>
            <ListIcon size={48} color="var(--border-primary)" style={{ marginBottom: 'var(--space-3)' }} />
            <p>You haven&apos;t created any lists yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
