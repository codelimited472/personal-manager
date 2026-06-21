'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Check, Heart, Plus, Trash2 } from 'lucide-react';
import { getDB, type LocalBuyItem } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import styles from './shopping.module.css';

export default function ShoppingPage() {
  const db = getDB();

  // Data State
  const [buyItems, setBuyItems] = useState<LocalBuyItem[]>([]);
  const [availableLists, setAvailableLists] = useState<string[]>(['Shopping List', 'Wishlist']);
  const [activeList, setActiveList] = useState<string>('Shopping List');

  // Form State
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPriority, setItemPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [listSelect, setListSelect] = useState('Shopping List');
  const [customListName, setCustomListName] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const allBuy = await db.buyItems.toArray();
      setBuyItems(allBuy);

      // Extract unique list types to populate the tabs/options
      const uniqueLists = Array.from(new Set(allBuy.map(item => item.list_type)));
      
      // Ensure default lists always exist
      const defaultLists = ['Shopping List', 'Wishlist'];
      uniqueLists.forEach(list => {
        if (!defaultLists.includes(list)) {
          defaultLists.push(list);
        }
      });
      setAvailableLists(defaultLists);

      // Auto-switch active list if current active list has no items and wasn't manually selected
      // Actually, just let it be.
    }
    loadData();
  }, [refreshKey]);

  const addBuyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    const finalListName = listSelect === 'new_custom' ? customListName.trim() : listSelect;
    if (!finalListName) return;

    await db.buyItems.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: itemName,
      list_type: finalListName,
      quantity: itemQuantity || undefined,
      price: itemPrice ? parseFloat(itemPrice) : undefined,
      priority: itemPriority,
      purchased: false,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setItemName('');
    setItemQuantity('');
    setItemPrice('');
    if (listSelect === 'new_custom') {
      setListSelect(finalListName);
      setActiveList(finalListName);
    }
    setCustomListName('');
    setRefreshKey(prev => prev + 1);
  };

  const togglePurchased = async (e: React.MouseEvent, id: string, currentPurchased: boolean) => {
    e.stopPropagation(); // prevent opening details if we had any
    await db.buyItems.update(id, { 
      purchased: !currentPurchased,
      _syncStatus: 'pending'
    });
    setRefreshKey(prev => prev + 1);
  };

  const deleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteRecord('buyItems', id);
    setRefreshKey(prev => prev + 1);
  };

  const activeItems = buyItems.filter(item => item.list_type === activeList);

  return (
    <div className={styles.container}>
      {/* Lists Tab Bar */}
      <div className={styles.tabBar}>
        {availableLists.map(listName => (
          <button
            key={listName}
            onClick={() => setActiveList(listName)}
            className={activeList === listName ? styles.tabActive : styles.tab}
          >
            {listName}
          </button>
        ))}
      </div>

      {/* Add Item Form */}
      <form onSubmit={addBuyItem} className={styles.formCard}>
        <h4 className={styles.formTitle}>Add New Item</h4>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Item Name (e.g. Milk, Keyboard)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroupRow}>
          <select
            value={listSelect}
            onChange={(e) => setListSelect(e.target.value)}
            className={styles.input}
          >
            {availableLists.map(listName => (
              <option key={listName} value={listName}>{listName}</option>
            ))}
            <option value="new_custom">+ Create New List...</option>
          </select>

          {listSelect === 'new_custom' && (
            <input
              type="text"
              placeholder="Custom List Name"
              value={customListName}
              onChange={(e) => setCustomListName(e.target.value)}
              className={styles.input}
              required
            />
          )}
        </div>

        <div className={styles.formGroupRow}>
          <input
            type="text"
            placeholder="Quantity (e.g. 2L, 1 box) - Optional"
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
            className={styles.input}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Estimated Price (₹) - Optional"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            className={styles.input}
          />
          <select
            value={itemPriority}
            onChange={(e: any) => setItemPriority(e.target.value)}
            className={styles.input}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <button type="submit" className={styles.submitBtn}>
          <Plus size={16} /> Add to List
        </button>
      </form>

      {/* Current List Items */}
      <div className={styles.listSection}>
        <h3 className={styles.sectionHeader}>{activeList}</h3>
        {activeItems.length === 0 ? (
          <div className={styles.emptyState}>
            No items in {activeList} yet. Add something above!
          </div>
        ) : (
          <div className={styles.buyList}>
            {activeItems.map(item => (
              <div
                key={item.id}
                onClick={(e) => togglePurchased(e, item.id, item.purchased)}
                className={item.purchased ? styles.purchasedCard : styles.buyCard}
              >
                <div className={styles.checkbox}>
                  {item.purchased && <Check size={16} color="white" />}
                </div>
                <div className={styles.buyDetails}>
                  <strong className={item.purchased ? styles.purchasedText : styles.buyNameText}>
                    {item.name}
                  </strong>
                  <span className={styles.buySub}>
                    {item.quantity && `Qty: ${item.quantity}`} 
                    {item.quantity && item.price && ' • '}
                    {item.price && `Price: ₹${item.price}`}
                  </span>
                </div>
                
                <div className={styles.rightActions}>
                  <span className={`${styles.priorityBadge} ${
                    item.priority === 'high' ? styles.priorityHigh :
                    item.priority === 'medium' ? styles.priorityMedium :
                    styles.priorityLow
                  }`}>
                    {item.priority}
                  </span>
                  {activeList.toLowerCase().includes('wish') && !item.purchased && (
                    <Heart size={16} color="var(--accent-danger)" fill="var(--accent-danger)" />
                  )}
                  <button onClick={(e) => deleteItem(e, item.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
