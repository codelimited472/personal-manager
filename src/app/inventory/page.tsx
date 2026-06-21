'use client';

import { useState, useEffect } from 'react';
import { Archive, Plus, Trash2, Calendar, ShoppingCart, Check, Heart } from 'lucide-react';
import { getDB, type LocalInventoryItem, type LocalExpiryItem, type LocalBuyItem } from '@/lib/db';
import styles from './inventory.module.css';

export default function InventoryPage() {
  const db = getDB();
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiries' | 'buylist'>('inventory');

  // Inventory Things
  const [items, setItems] = useState<LocalInventoryItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Electronics');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCondition, setItemCondition] = useState<'new' | 'good' | 'fair' | 'poor'>('good');

  // Expiries
  const [expiries, setExpiries] = useState<LocalExpiryItem[]>([]);
  const [expName, setExpName] = useState('');
  const [expCategory, setExpCategory] = useState<'medicine' | 'food' | 'cosmetics' | 'supplements'>('medicine');
  const [expDate, setExpDate] = useState('');
  const [expQty, setExpQty] = useState('1');

  // Buy List
  const [buyItems, setBuyItems] = useState<LocalBuyItem[]>([]);
  const [buyName, setBuyName] = useState('');
  const [buyType, setBuyType] = useState<'shopping' | 'wishlist'>('shopping');
  const [buyPriority, setBuyPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const allItems = await db.inventoryItems.toArray();
      setItems(allItems);

      const allExpiries = await db.expiryItems.toArray();
      setExpiries(allExpiries);

      const allBuy = await db.buyItems.toArray();
      setBuyItems(allBuy);
    }
    loadData();
  }, [refreshKey]);

  const addInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    await db.inventoryItems.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: itemName,
      category: itemCategory,
      purchase_price: itemPrice ? parseFloat(itemPrice) : undefined,
      condition: itemCondition,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setItemName('');
    setItemPrice('');
    setRefreshKey(prev => prev + 1);
  };

  const deleteInventoryItem = async (id: string) => {
    await db.inventoryItems.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  // Expiry Actions
  const addExpiryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName || !expDate) return;

    await db.expiryItems.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: expName,
      category: expCategory,
      expiry_date: expDate,
      quantity: expQty,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    // Register a notification for the expiry alert
    await db.notifications.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      title: `Expiry Warning: ${expName}`,
      body: `This ${expCategory} expires on ${expDate}. Remaining quantity: ${expQty}.`,
      type: 'item_expiry',
      due_date: expDate,
      read: false,
      dismissed: false,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setExpName('');
    setExpDate('');
    setExpQty('1');
    setRefreshKey(prev => prev + 1);
  };

  const deleteExpiryItem = async (id: string) => {
    await db.expiryItems.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  // Buy List Actions
  const addBuyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyName) return;

    await db.buyItems.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: buyName,
      list_type: buyType,
      priority: buyPriority,
      purchased: false,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setBuyName('');
    setRefreshKey(prev => prev + 1);
  };

  const togglePurchasedBuy = async (id: string, currentPurchased: boolean) => {
    await db.buyItems.update(id, { purchased: !currentPurchased });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      <div className={styles.tabBar}>
        <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? styles.tabActive : styles.tab}>Inventory</button>
        <button onClick={() => setActiveTab('expiries')} className={activeTab === 'expiries' ? styles.tabActive : styles.tab}>Expiries</button>
        <button onClick={() => setActiveTab('buylist')} className={activeTab === 'buylist' ? styles.tabActive : styles.tab}>Buy List</button>
      </div>

      {activeTab === 'inventory' && (
        <div>
          <form onSubmit={addInventoryItem} className={styles.formCard}>
            <h4 className={styles.formTitle}>Add Item I Own</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Item Name (e.g. MacBook Pro, Leather Wallet)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <input
                type="text"
                placeholder="Category (e.g. Electronics, Bags)"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className={styles.input}
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <select
                value={itemCondition}
                onChange={(e: any) => setItemCondition(e.target.value)}
                className={styles.input}
              >
                <option value="new">Condition: New</option>
                <option value="good">Condition: Good</option>
                <option value="fair">Condition: Fair</option>
                <option value="poor">Condition: Poor</option>
              </select>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Plus size={16} /> Save to Inventory
            </button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Personal Inventory</h3>
          <div className={styles.inventoryList}>
            {items.map(item => (
              <div key={item.id} className={styles.itemCard}>
                <div>
                  <strong className={styles.itemName}>{item.name}</strong>
                  <span className={styles.itemSub}>Category: {item.category} | Condition: {item.condition}</span>
                </div>
                <div className={styles.rightInfo}>
                  {item.purchase_price && <span className={styles.priceTag}>₹{item.purchase_price}</span>}
                  <button onClick={() => deleteInventoryItem(item.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'expiries' && (
        <div>
          <form onSubmit={addExpiryItem} className={styles.formCard}>
            <h4 className={styles.formTitle}>Log Consumable / Medicine Expiry</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Product Name (e.g. Vitamin C, Paracetamol)"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <select
                value={expCategory}
                onChange={(e: any) => setExpCategory(e.target.value)}
                className={styles.input}
              >
                <option value="medicine">Medicine</option>
                <option value="supplements">Supplements</option>
                <option value="food">Food Product</option>
                <option value="cosmetics">Cosmetics</option>
              </select>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Quantity (e.g., 2 bottles, 10 tablets)"
                value={expQty}
                onChange={(e) => setExpQty(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Calendar size={16} /> Log Expiry Alert
            </button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Active Expiries</h3>
          <div className={styles.expiriesList}>
            {expiries.map(exp => (
              <div key={exp.id} className={styles.expiryCard}>
                <div>
                  <strong className={styles.expNameText}>{exp.name}</strong>
                  <span className={styles.expSub}>Qty: {exp.quantity} | Category: {exp.category}</span>
                </div>
                <div className={styles.rightInfo}>
                  <span className={styles.expDateText}>{exp.expiry_date}</span>
                  <button onClick={() => deleteExpiryItem(exp.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'buylist' && (
        <div>
          <form onSubmit={addBuyItem} className={styles.formCard}>
            <h4 className={styles.formTitle}>Add to Buy List</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Item Name (e.g. Milk, Keyboard)"
                value={buyName}
                onChange={(e) => setBuyName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <select
                value={buyType}
                onChange={(e: any) => setBuyType(e.target.value)}
                className={styles.input}
              >
                <option value="shopping">Shopping List (Needs)</option>
                <option value="wishlist">Wishlist (Wants)</option>
              </select>
              <select
                value={buyPriority}
                onChange={(e: any) => setBuyPriority(e.target.value)}
                className={styles.input}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <ShoppingCart size={16} /> Save Item
            </button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Buy Lists</h3>
          <div className={styles.buyList}>
            {buyItems.map(item => (
              <div
                key={item.id}
                onClick={() => togglePurchasedBuy(item.id, item.purchased)}
                className={item.purchased ? styles.purchasedCard : styles.buyCard}
              >
                <div className={styles.checkbox}>
                  {item.purchased && <Check size={16} color="white" />}
                </div>
                <div className={styles.buyDetails}>
                  <strong className={item.purchased ? styles.purchasedText : styles.buyNameText}>{item.name}</strong>
                  <span className={styles.buySub}>List: {item.list_type} • Priority: {item.priority}</span>
                </div>
                {item.list_type === 'wishlist' && <Heart size={14} color="var(--accent-danger)" fill="var(--accent-danger)" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
