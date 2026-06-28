'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { getDB } from '@/lib/db';
import { getToday } from '@/lib/utils';
import styles from '@/app/page.module.css';

interface Props {
  onExpenseAdded: () => void;
}

export default function QuickExpenseLog({ onExpenseAdded }: Props) {
  const [payAmount, setPayAmount] = useState('');
  const [payCategory, setPayCategory] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payBank, setPayBank] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'Credit Card']);
  const [showNewBankInput, setShowNewBankInput] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  
  const [savedCategories, setSavedCategories] = useState<string[]>(['Food', 'Transport', 'Shopping', 'Bills']);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const db = getDB();
        const savedBank = await db.settings.get('preferredBank');
        if (savedBank) setPayBank(savedBank.value);

        const storedMethods = await db.settings.get('paymentMethods');
        if (storedMethods) {
          try {
            setPaymentMethods(JSON.parse(storedMethods.value));
          } catch {}
        }

        const allExpenses = await db.expenses.toArray();
        const catCounts: Record<string, number> = {};
        allExpenses.forEach(e => {
          catCounts[e.category] = (catCounts[e.category] || 0) + 1;
        });

        const storedCats = await db.settings.get('savedCategories');
        if (storedCats) {
          try {
            const parsed = JSON.parse(storedCats.value);
            parsed.sort((a: string, b: string) => (catCounts[b] || 0) - (catCounts[a] || 0));
            setSavedCategories(parsed);
          } catch {}
        } else {
          const defaultCats = ['Food', 'Transport', 'Shopping', 'Bills'];
          defaultCats.sort((a: string, b: string) => (catCounts[b] || 0) - (catCounts[a] || 0));
          setSavedCategories(defaultCats);
        }
      } catch (err) {
        console.error('Error loading settings for QuickExpenseLog:', err);
      }
    }
    loadSettings();
  }, []);

  const handleQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || isNaN(Number(payAmount))) return;

    const db = getDB();
    const todayStr = getToday();
    const trimmedBank = payBank.trim();

    await db.expenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      amount: Number(payAmount),
      category: payCategory || 'General',
      description: payDescription.trim() || undefined,
      payment_method: trimmedBank,
      date: todayStr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    if (trimmedBank) {
      await db.settings.put({ key: 'preferredBank', value: trimmedBank, user_id: 'local-user', _syncStatus: 'pending' });
    }

    if (trimmedBank && !paymentMethods.includes(trimmedBank)) {
      setPaymentMethods(prev => {
        const updated = Array.from(new Set([...prev, trimmedBank]));
        db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
    }

    const trimmedCat = payCategory.trim();
    if (trimmedCat && !savedCategories.includes(trimmedCat)) {
      setSavedCategories(prev => {
        const updated = Array.from(new Set([...prev, trimmedCat]));
        db.settings.put({ key: 'savedCategories', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
    }

    setPayAmount('');
    setPayCategory('');
    setPayDescription('');
    onExpenseAdded();
  };

  const handleAddBank = async () => {
    const trimmed = newBankName.trim();
    const db = getDB();
    if (trimmed && !paymentMethods.includes(trimmed)) {
      setPaymentMethods(prev => {
        const updated = [...prev, trimmed];
        db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
      setPayBank(trimmed);
      await db.settings.put({ key: 'preferredBank', value: trimmed, user_id: 'local-user', _syncStatus: 'pending' });
    } else if (trimmed) {
      setPayBank(trimmed);
      await db.settings.put({ key: 'preferredBank', value: trimmed, user_id: 'local-user', _syncStatus: 'pending' });
    }
    setNewBankName('');
    setShowNewBankInput(false);
  };

  const handleDeleteMethod = async (methodToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    const db = getDB();
    const updated = paymentMethods.filter(m => m !== methodToDelete);
    setPaymentMethods(updated);
    if (payBank === methodToDelete) setPayBank('');
    await db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
  };

  return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Wallet className={styles.sectionIcon} /> Quick Expense Log
          </h3>
        </div>
        <form onSubmit={handleQuickPayment} className={styles.quickPaymentForm}>
          <div className={styles.qpInputGroup}>
            <span className={styles.currencySymbol}>₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={styles.qpAmountInput}
              autoFocus
              required
            />
          </div>
          <div className={styles.qpRow} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Category (e.g., Food)"
              value={payCategory}
              onChange={(e) => {
                setPayCategory(e.target.value);
                setShowCatDropdown(true);
              }}
              onFocus={() => setShowCatDropdown(true)}
              onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
              className={styles.qpInput}
            />
            {showCatDropdown && savedCategories.filter(c => c.toLowerCase().includes(payCategory.toLowerCase())).length > 0 && (
              <ul className={styles.qpDropdown}>
                {savedCategories.filter(c => c.toLowerCase().includes(payCategory.toLowerCase())).map(cat => (
                  <li 
                    key={cat} 
                    className={styles.qpDropdownItem}
                    onClick={() => {
                      setPayCategory(cat);
                      setShowCatDropdown(false);
                    }}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.qpRow}>
            <input
              type="text"
              placeholder="Description (Optional)"
              value={payDescription}
              onChange={(e) => setPayDescription(e.target.value)}
              className={styles.qpInput}
            />
          </div>
          <div className={styles.qpChipsRow}>
            {paymentMethods.map(method => (
              <div 
                key={method} 
                className={payBank === method ? styles.qpChipActive : styles.qpChip} 
                onClick={() => setPayBank(method)}
              >
                {method}
                <span 
                  className={styles.qpChipDelete} 
                  onClick={(e) => handleDeleteMethod(method, e)}
                  title="Remove"
                >
                  &times;
                </span>
              </div>
            ))}
            
            {showNewBankInput ? (
              <input
                type="text"
                autoFocus
                placeholder="New Bank"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                onBlur={handleAddBank}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBank()}
                className={styles.qpChipInput}
              />
            ) : (
              <button 
                type="button" 
                className={styles.qpChipAdd} 
                onClick={() => setShowNewBankInput(true)}
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>
          <button type="submit" className={styles.qpSubmitBtn}>
            Log Payment
          </button>
        </form>
      </div>
  );
}
